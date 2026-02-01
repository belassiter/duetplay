import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'bach_invention_11.mxl');

async function inspect() {
    try {
        const data = fs.readFileSync(filePath);
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(data);
        console.log("Files in zip:");
        Object.keys(zipContent.files).forEach(filename => {
            console.log(" - " + filename);
        });

        if (zipContent.files['Bach Invention 11.musicxml']) {
            console.log("\nContent of Bach Invention 11.musicxml (first 1000 chars):");
            const content = await zipContent.files['Bach Invention 11.musicxml'].async('string');
            console.log(content.substring(0, 1000));
        }

    } catch (e) {
        console.error(e);
    }
}

inspect();
