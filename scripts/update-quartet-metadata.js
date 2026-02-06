import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SONGS_JSON_PATH = path.join(__dirname, '../public/quartet-songs.json');
const HTML_PATH = path.join(__dirname, '../temp/repertoire_reference.html');

async function updateMetadata() {
    try {
        console.log(`Reading songs from: ${SONGS_JSON_PATH}`);
        try {
            await fs.access(SONGS_JSON_PATH);
        } catch {
            console.error(`Error: ${SONGS_JSON_PATH} not found.`);
            process.exit(1);
        }
        
        const songsData = await fs.readFile(SONGS_JSON_PATH, 'utf-8');
        const songs = JSON.parse(songsData);

        console.log(`Reading HTML from: ${HTML_PATH}`);
        const htmlContent = await fs.readFile(HTML_PATH, 'utf-8');

        // Regex to match table rows
        const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
        let match;
        
        // Helper to strip tags and recover text
        const clean = (str) => {
             if (!str) return '';
             let text = str.replace(/<[^>]+>/g, '') // remove tags
                           .replace(/&nbsp;/g, ' ')   // decode nbsp
                           .replace(/&amp;/g, '&')    // decode amp
                           .replace(/&#39;/g, "'")    // decode quote
                           .replace(/\s+/g, ' ')      // collapse whitespace
                           .trim();
             return text;
        };

        const updates = new Map();

        while ((match = rowRegex.exec(htmlContent)) !== null) {
            const row = match[1];
            // Split by </td><td> (approximate, but robust enough if structured consistently)
            // But cells can contain other tags.
            // Better: match <td>...</td> content
            const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
            const cells = [];
            let cellMatch;
            while((cellMatch = cellRegex.exec(row)) !== null) {
                cells.push(cellMatch[1]);
            }

            if (cells.length >= 8) {
                // Column 0: Title (often has link to PDF)
                // Column 1: Instruments (links to PDF)
                // Column 7: MusicXML (explicit MXL links)

                const artist = clean(cells[2]);
                const composer = clean(cells[3]);
                const style = clean(cells[4]);
                const difficulty = clean(cells[5]);
                const rawMxlCell = cells[7];
                const rawTitleCell = cells[0];
                const rawInstCell = cells[1];

                const meta = { artist, composer, style, difficulty };
                
                // Strategy 1: Explicit MXL links in Col 7
                let mxlMatch;
                const mxlRegex = /href="[^"]*\/([^"]+\.mxl)"/g;
                while ((mxlMatch = mxlRegex.exec(rawMxlCell)) !== null) {
                    const filename = mxlMatch[1];
                    updates.set(decodeURIComponent(filename), meta);
                }

                // Strategy 2: Infer from PDF links in Col 0 or 1
                // Many times the mxl has the same base name as the content pdf
                const pdfRegex = /href="[^"]*\/([^"]+\.pdf)"/g;
                
                const processPdfMatches = (str) => {
                     let match;
                     while ((match = pdfRegex.exec(str)) !== null) {
                         const pdfName = match[1];
                         const mxlName = pdfName.replace('.pdf', '.mxl');
                         // Only add if not already present (explicit links take precedence)
                         // Actually, we don't know the order, so let's just add it if missing from map?
                         // Or update it? The metadata should be the same for the row.
                         if (!updates.has(decodeURIComponent(mxlName))) {
                            updates.set(decodeURIComponent(mxlName), meta);
                         }
                     }
                };

                processPdfMatches(rawTitleCell);
                processPdfMatches(rawInstCell);
            }
        }

        console.log(`Found metadata in HTML for ${updates.size} unique filenames.`);

        let updatedCount = 0;
        songs.forEach(song => {
            // Match loosely? Filenames should match exact if extracted correctly.
            // But sometimes URL encoding happens.
            
            if (updates.has(song.filename)) {
                const meta = updates.get(song.filename);
                
                // Update fields
                // User Request: "I want to take the 'Genre' data and put it in the 'Style' field...
                // I also want it to take the Difficulty data...
                // For other fields (Title, Composer, Arranger), I want it to take this data from the mxl files"
                
                // So verify we are NOT overwriting Arranger/Composer if it exists from MXL?
                // Actually, if MXL data is empty strings (common if metadata is missing in XML file),
                // we might want to fall back to HTML data.
                // But the user said: "Take this data from the mxl files, not the html file."
                
                // Let's implement strict adherence: Only update Style and Difficulty.
                // UNLESS the MXL data is completely missing (empty string)? 
                // No, user instruction was explicit: "take this data from the mxl files".
                // If MXL is empty, it stays empty (or we assume MXL is the source of truth even if blank).
                // However, I will comment out the composer/arranger updates to follow instructions strictly.

                /*
                if (meta.artist) song.arranger = meta.artist;
                if (meta.composer) song.composer = meta.composer;
                */

                if (meta.style) song.style = meta.style;
                if (meta.difficulty) song.difficulty = meta.difficulty;
                
                updatedCount++;
            }
        });

        await fs.writeFile(SONGS_JSON_PATH, JSON.stringify(songs, null, 2));
        console.log(`Successfully updated ${updatedCount} songs in ${SONGS_JSON_PATH}`);

    } catch (e) {
        console.error("Error updating metadata:", e);
        process.exit(1);
    }
}

updateMetadata();
