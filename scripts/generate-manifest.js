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

export function cleanComposer(text) {
    if (!text) return '';
    return text
        // Remove parenthetical dates/years like (1772), (1914), (16th century), (c. 1849)
        .replace(/\s*\([^)]*\d{2,4}[^)]*\)/gi, '')
        .replace(/\s*\([^)]*century[^)]*\)/gi, '')
        // Clean whitespace and line endings
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\r\n')
        .trim();
}

export function cleanArranger(text) {
    if (!text) return '';
    return text
        // Strip leading "Arr.", "Arr ", "Arranged by", "Arr. by"
        .replace(/^arr(?:anged)?\.?\s*(?:by\s+)?/i, '')
        // Strip parenthetical dates like (1980), (12/1997), (10/16/1996)
        .replace(/\s*\([^)]*\d{2,4}[^)]*\)/gi, '')
        // Clean whitespace and line endings
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\r\n')
        .trim();
}

async function loadRepertoireMetadata() {
    const repertoirePath = path.join(__dirname, '../../esquartet/repertoire.html');
    try {
        const html = await fs.readFile(repertoirePath, 'utf8');
        const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];
        const mxlMap = new Map();
        for (const row of rows) {
            const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1]);
            if (cells.length >= 7) {
                const title = cells[0].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
                const composer = cells[3].replace(/<[^>]+>/g, '').trim();
                let style = cells[4].replace(/<[^>]+>/g, '').trim();
                let difficulty = cells[5].replace(/<[^>]+>/g, '').trim();
                
                if (style.toLowerCase().includes('christmas') || style.toLowerCase().includes('holiday')) {
                    style = 'Holiday';
                }
                if (/^medium-hard$/i.test(difficulty)) difficulty = 'Medium-Hard';
                else if (/^medium-easy$/i.test(difficulty)) difficulty = 'Medium-Easy';
                else if (/^medium$/i.test(difficulty)) difficulty = 'Medium';
                else if (/^easy$/i.test(difficulty)) difficulty = 'Easy';
                else if (/^hard$/i.test(difficulty)) difficulty = 'Hard';

                const mxlHrefs = [...row.matchAll(/href=["']([^"']+\.mxl)["']/g)].map(m => m[1]);
                for (const href of mxlHrefs) {
                    const fn = path.basename(href);
                    mxlMap.set(fn, { title, composer, style, difficulty });
                }
            }
        }
        return mxlMap;
    } catch {
        return new Map();
    }
}

function normalizeInstruments(rawInstruments, filename) {
    const fn = filename.toLowerCase();

    // 4-Baritone Saxophone Quartets
    if (fn.includes('4bari') || fn.includes('4-bari') || fn.includes('4_bari')) {
        return ['Bari Sax 1', 'Bari Sax 2', 'Bari Sax 3', 'Bari Sax 4'];
    }

    // 3-Baritone Saxophone Trios
    if (fn.includes('3bari') || fn.includes('3-bari') || fn.includes('3_bari')) {
        return ['Bari Sax 1', 'Bari Sax 2', 'Bari Sax 3'];
    }

    // Standard normalization for SATB / AATB / other ensembles
    return rawInstruments.map(raw => {
        const name = (raw || '').trim();
        if (/^soprano$/i.test(name)) return 'Soprano Sax';
        if (/^alto$/i.test(name)) return 'Alto Sax';
        if (/^alto\s*1$/i.test(name)) return 'Alto Sax 1';
        if (/^alto\s*2$/i.test(name)) return 'Alto Sax 2';
        if (/^tenor$/i.test(name)) return 'Tenor Sax';
        if (/^tenor\s*1$/i.test(name)) return 'Tenor Sax 1';
        if (/^tenor\s*2$/i.test(name)) return 'Tenor Sax 2';
        if (/^bari$/i.test(name) || /^baritone$/i.test(name) || /^baritone\s*sax$/i.test(name)) return 'Bari Sax';
        if (/^bari\s*(\d+)$/i.test(name)) return `Bari Sax ${name.match(/\d+/)[0]}`;
        return name;
    });
}

async function generate() {
    try {
        console.log(`Scanning directory: ${inputDir}`);
        console.log(`Output file: ${outputFile}`);

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

        const isQuartetMode = outputFile.includes('quartet');
        const repertoireMap = isQuartetMode ? await loadRepertoireMetadata() : new Map();
        if (repertoireMap.size > 0) {
            console.log(`Loaded metadata for ${repertoireMap.size} songs from repertoire.html.`);
        }

        // Known exclusions for QuartetPlay (non-quartets, incomplete scores, duplicate files, or non-sax trios)
        const exclusions = new Set([
            'star_wars_stripes_forever_sax_quartet_sax_choir.mxl', // 13-part sax choir
            'super_mario_world_ending_sax_quartet_SATB.mxl',       // 1-part incomplete
            'dudley_do_right_sax_quartet_SATB.mxl',               // raw xml format error
            'the_christmas_song_3-bari.mxl',                      // 4-part duplicate of the_christmas_song_4-bari.mxl
            // Category 4 mixed trios (excluded from quartet catalog)
            'adusty_fi_3bari.mxl',
            'adusty_fi_trio.mxl',
            'joy_to_the_world_trio.mxl',
            'o_little_town_trio.mxl',
            'silent_night_trio.mxl',
            'silver_bells_trio.mxl'
        ]);

        // 2. Scan Files
        const files = await fs.readdir(inputDir);
        const mxlFiles = files.filter(f => f.endsWith('.mxl'));
        
        const songs = [];
        const addedSongs = [];

        for (const file of mxlFiles) {
            if (isQuartetMode && exclusions.has(file)) {
                console.log(`Skipping excluded file: ${file}`);
                continue;
            }

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
                    if (isQuartetMode && (meta.instruments.length < 3 || meta.instruments.length > 4)) {
                        console.log(`Skipping ${file}: ${meta.instruments.length} parts (outside 3-4 part ensemble range).`);
                        continue;
                    }

                    const normalizedInst = normalizeInstruments(meta.instruments, file);
                    const repMeta = repertoireMap.get(file);

                    const id = file.replace('.mxl', '').replace(/\s+/g, '_').toLowerCase();
                    
                    let composer = meta.composer || '';
                    let arranger = meta.arranger || '';

                    // If composer field holds arranger attribution (e.g. "Arr. AEL"), remap it
                    if (!arranger && /^arr\.?\s*ael/i.test(composer)) {
                        arranger = 'Albert Einstein Lassiter';
                        composer = repMeta?.composer || '';
                    } else if (!composer) {
                        composer = repMeta?.composer || '';
                    }

                    const newSong = {
                        id: id,
                        filename: file,
                        title: repMeta?.title || meta.title || file.replace('.mxl', ''),
                        composer: cleanComposer(composer),
                        arranger: cleanArranger(arranger),
                        instruments: normalizedInst,
                        difficulty: repMeta?.difficulty || "Medium",
                        style: repMeta?.style || "Classical"
                    };

                    songs.push(newSong);
                    addedSongs.push(newSong);
                }
            }
        }

        // Write Output
        await fs.writeFile(outputFile, JSON.stringify(songs, null, 2));
        console.log(`Successfully generated manifest with ${songs.length} songs at ${outputFile}`);
        if (addedSongs.length > 0) {
            console.log(`Added ${addedSongs.length} new songs.`);
        }

    } catch (e) {
        console.error('Fatal error:', e);
        process.exit(1);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    generate();
}
