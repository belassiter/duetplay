import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');
const targetFile = 'happy_birthday_dennis.mxl';

async function debugMxl() {
    const filePath = path.join(PUBLIC_DIR, targetFile);
    console.log(`Checking ${filePath}...`);
    
    try {
        const content = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(content);
        
        console.log("Files found in zip:");
        Object.keys(zip.files).forEach(f => console.log(` - ${f}`));
        
        const files = Object.keys(zip.files);
        const xmlFile = files.find(f => f.endsWith('.xml') && !f.includes('META-INF'));
        
        if (xmlFile) {
            console.log(`\nSelected XML file: ${xmlFile}`);
            const xmlContent = await zip.files[xmlFile].async('string');
            console.log(`\nXML Content Preview (First 500 chars):`);
            console.log(xmlContent.substring(0, 500));
            
            // Test extraction
            const extract = (pattern) => {
                const match = xmlContent.match(pattern);
                return match && match[1] ? match[1].trim() : null;
            };

            const title = extract(/<work-title[^>]*>([\s\S]*?)<\/work-title>/) || 
                          extract(/<movement-title[^>]*>([\s\S]*?)<\/movement-title>/);
            
            const composer = extract(/<creator[^>]*type="composer"[^>]*>([\s\S]*?)<\/creator>/);
            
            console.log('\nExtracted Data:');
            console.log({ title, composer });
            
        } else {
            console.log("No non-META-INF .xml file found!");
        }
        
    } catch (e) {
        console.error("Error:", e);
    }
}

debugMxl();