const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

async function inspectMxl() {
    // Take from args
    const targetFile = process.argv[2] || '../public/i_get_around.mxl';
    const filePath = path.resolve(process.cwd(), targetFile);
    console.log("Inspecting:", filePath);
    
    try {
        const data = fs.readFileSync(filePath);
        const zip = new JSZip();
        await zip.loadAsync(data);
        
        // Find .xml file
        console.log("Files in Zip:", Object.keys(zip.files));
        const xmlFile = Object.keys(zip.files).find(name => (name.endsWith('.xml') || name.endsWith('.musicxml')) && !name.includes('META-INF'));
        
        if (!xmlFile) {
            console.error("No XML file found in MXL");
            return;
        }
        
        const xmlContent = await zip.files[xmlFile].async('string');
        const debugPath = path.join(__dirname, '../temp/debug_score.xml');
        fs.writeFileSync(debugPath, xmlContent);
        console.log("Extracted XML to:", debugPath);
        
        // Print head of XML to check metadata
        console.log(xmlContent.substring(0, 2000));
        
    } catch (e) {
        console.error("Error:", e);
    }
}

inspectMxl();
