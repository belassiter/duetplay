import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default Paths
const DEFAULT_INPUT_DIR = path.join(__dirname, '../public_duet');
const DEFAULT_OUTPUT_FILE = path.join(__dirname, '../public_duet/songs.json');

// Parse Arguments
const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');

if (help) {
    console.log(`
Usage: node generate-manifest.js [options]

Options:
  --input, -i <dir>    Input directory containing .mxl files (default: public/)
  --output, -o <file>  Output path for songs.json (default: public/songs.json)
  --help, -h           Show this help message
`);
    process.exit(0);
}

const getArg = (flags) => {
    for (const flag of flags) {
        const index = args.indexOf(flag);
        if (index !== -1 && index + 1 < args.length) {
            return args[index + 1];
        }
    }
    return null;
};

const inputDir = getArg(['--input', '-i']) || DEFAULT_INPUT_DIR;
const outputFile = getArg(['--output', '-o']) || DEFAULT_OUTPUT_FILE;
const isOptional = args.includes('--optional');

console.log(`Scanning directory: ${inputDir}`);
console.log(`Output file: ${outputFile}`);

async function parseMxl(filePath) {
    try {
        const content = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(content);
        
        // Find the root .xml file
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

function parseXmlMetadata(xmlString) {
    // Basic Regex parsing to avoid DOM dependency in Node environment
    const getTag = (tag) => {
        const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 's');
        const match = xmlString.match(regex);
        return match ? match[1].trim() : '';
    };

    const getCreator = (type) => {
        // Matches <creator type="composer">Name</creator> handling loose whitespace and quotes
        // Using [\s\S]*? for content to handle potential newlines, though unlikely in creator names
        const regex = new RegExp(`<creator[^>]*type=["']${type}["'][^>]*>([\\s\\S]*?)<\/creator>`, 'i');
        const match = xmlString.match(regex);
        return match ? match[1].trim() : '';
    };

    const title = getTag('work-title') || getTag('movement-title') || 'Untitled';
    const composer = getCreator('composer');
    const arranger = getCreator('arranger');
    
    // Instruments
    const instruments = [];
    const partNameRegex = /<part-name[^>]*>(.*?)<\/part-name>/g;
    let match;
    while ((match = partNameRegex.exec(xmlString)) !== null) {
        instruments.push(match[1]);
    }

    return {
        title,
        composer: composer, 
        arranger: arranger,
        instruments
    };
}

async function generate() {
    try {
        // Ensure input dir exists
        try {
            await fs.access(inputDir);
        } catch {
            if (isOptional) {
                console.log(`Input directory ${inputDir} not found. Skipping generation (Optional mode).`);
                process.exit(0);
            }
            console.error(`Input directory does not exist: ${inputDir}`);
            process.exit(1);
        }

        // 1. Read Existing JSON (for preservation)
        let existingSongs = [];
        try {
            const existingData = await fs.readFile(outputFile, 'utf-8');
            existingSongs = JSON.parse(existingData);
            console.log(`Loaded ${existingSongs.length} existing songs to preserve metadata.`);
        } catch (e) {
            console.log("No existing manifest found (" + outputFile + "), creating new one.");
        }

        // 2. Scan Files
        const files = await fs.readdir(inputDir);
        const mxlFiles = files.filter(f => f.endsWith('.mxl'));
        
        const songs = [];

        for (const file of mxlFiles) {
            // Check if we already have this file in our DB
            // Preservation Strategy: Match by filename
            const existingEntry = existingSongs.find(s => s.filename === file);

            if (existingEntry) {
                // KEEP EXISTING DATA EXACTLY AS IS
                // This preserves manual edits to difficulty, style, AND instruments
                songs.push(existingEntry);
            } else {
                // NEW FILE: Parse it
                console.log(`New file detected, parsing: ${file}...`);
                const meta = await parseMxl(path.join(inputDir, file));
                
                if (meta) {
                    const id = file.replace('.mxl', '').replace(/\s+/g, '_').toLowerCase();
                    
                    songs.push({
                        id: id,
                        filename: file,
                        title: meta.title || file.replace('.mxl', ''),
                        composer: meta.composer,
                        arranger: meta.arranger,
                        instruments: meta.instruments,
                        difficulty: "Medium", // Default
                        style: "Classical"   // Default
                    });
                }
            }
        }

        // Write Output
        await fs.writeFile(outputFile, JSON.stringify(songs, null, 2));
        console.log(`Successfully generated manifest with ${songs.length} songs at ${outputFile}`);

    } catch (e) {
        console.error('Fatal error:', e);
        process.exit(1);
    }
}

generate();
