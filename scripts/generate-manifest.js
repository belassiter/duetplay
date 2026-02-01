import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const DATA_FILE = path.join(__dirname, '../src/data/songs.json');

async function parseMxl(filePath) {
    try {
        const content = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(content);
        
        // Find the root .xml file (usually in META-INF/container.xml pointing to it, or just the first .xml)
        // Simplification: Look for the first file ending in .xml or .musicxml that isn't container.xml
        const files = Object.keys(zip.files);
        const xmlFile = files.find(f => (f.endsWith('.xml') || f.endsWith('.musicxml')) && !f.includes('META-INF'));
        
        if (!xmlFile) return null;
        
        const xmlContent = await zip.files[xmlFile].async('string');
        return parseXmlMetadata(xmlContent);
    } catch (e) {
        console.error(`Error parsing ${filePath}:`, e);
        return null;
    }
}

function parseXmlMetadata(xml) {
    // Simple regex extraction
    const extract = (pattern) => {
        const match = xml.match(pattern);
        return match && match[1] ? match[1].trim() : null;
    };

    // 1. Title
    // Try <work-title>, then <movement-title>
    const title = extract(/<work-title[^>]*>([\s\S]*?)<\/work-title>/) || 
                  extract(/<movement-title[^>]*>([\s\S]*?)<\/movement-title>/) || 
                  'Untitled';

    // 2. Composer
    const composer = extract(/<creator[^>]*type="composer"[^>]*>([\s\S]*?)<\/creator>/) || 
                     extract(/<creator[^>]*>([\s\S]*?)<\/creator>/) || 
                     'Unknown';

    // 3. Arranger
    const arranger = extract(/<creator[^>]*type="arranger"[^>]*>([\s\S]*?)<\/creator>/) || '';

    // 4. Instruments
    // <part-name>Trumpet</part-name>
    const partNames = [];
    const partNameRegex = /<part-name[^>]*>([\s\S]*?)<\/part-name>/g;
    let match;
    while ((match = partNameRegex.exec(xml)) !== null) {
        if (match[1]) partNames.push(match[1].trim());
    }

    // Cleanup HTML entities (basic)
    const cleanup = (str) => str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');

    return { 
        title: cleanup(title), 
        composer: cleanup(composer),
        arranger: cleanup(arranger),
        instruments: partNames.map(cleanup)
    };
}

async function generateManifest() {
    console.log('🎵 Generating Song Manifest...');
    
    // 1. Read existing data to preserve manual fields
    let existingData = {};
    try {
        const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
        const json = JSON.parse(fileContent);
        // Index by filename for easy lookup
        json.forEach(song => {
            existingData[song.filename] = song;
        });
    } catch (e) {
        // File doesn't exist or is empty, start fresh
    }

    // 2. Scan Public Directory
    const files = await fs.readdir(PUBLIC_DIR);
    const mxlFiles = files.filter(f => f.endsWith('.mxl') || f.endsWith('.musicxml'));
    
    const songs = [];

    for (const file of mxlFiles) {
        const filePath = path.join(PUBLIC_DIR, file);
        
        // Try to get metadata from XML
        let meta = { title: null, composer: '', arranger: '', instruments: [] };
        
        if (file.endsWith('.mxl')) {
            const extracted = await parseMxl(filePath);
            if (extracted) meta = extracted;
        } else {
             // Plain XML support if needed
             const content = await fs.readFile(filePath, 'utf-8');
             meta = parseXmlMetadata(content);
        }

        // Merge with existing data
        const existing = existingData[file] || {};
        
        const id = existing.id || file.replace(/\.(mxl|xml|musicxml)$/, '');
        
        // Respect existing manual edits for instruments
        const mergedInstruments = (existing.instruments && existing.instruments.length > 0) 
            ? existing.instruments 
            : (meta.instruments || []);

        songs.push({
            id: id,
            filename: file,
            title: meta.title && meta.title !== 'Untitled' ? meta.title : id, // Fallback to ID if title missing/untitled
            composer: meta.composer && meta.composer !== 'Unknown' ? meta.composer : '', // Blank default
            arranger: meta.arranger || '',
            instruments: mergedInstruments,
            difficulty: existing.difficulty || '', // Blank default
            style: existing.style || '', // Blank default
        });
    }

    // 3. Write Manifest
    await fs.writeFile(DATA_FILE, JSON.stringify(songs, null, 2));
    console.log(`✅ Manifest generated with ${songs.length} songs at src/data/songs.json`);
}

generateManifest();
