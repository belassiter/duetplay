const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

async function inspectMxl() {
    const filePath = path.join(__dirname, '../public/i_get_around.mxl');
    const data = fs.readFileSync(filePath);
    const zip = new JSZip();
    await zip.loadAsync(data);
    
    // Find .xml file
    console.error("Files in Zip:", Object.keys(zip.files));
    // Filter out META-INF things
    const xmlFile = Object.keys(zip.files).find(name => (name.endsWith('.xml') || name.endsWith('.musicxml')) && !name.includes('META-INF'));
    if (!xmlFile) {
        console.error("No XML file found in MXL");
        return;
    }
    
    const xmlContent = await zip.files[xmlFile].async('string');
    // console.log(xmlContent);
    fs.writeFileSync('temp_extracted.xml', xmlContent);
}

inspectMxl();
