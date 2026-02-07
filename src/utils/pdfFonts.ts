import { jsPDF } from 'jspdf';

export async function loadFonts(doc: jsPDF): Promise<void> {
  const fonts = [
    { name: 'Leipzig', url: 'https://www.verovio.org/fonts/Leipzig.ttf' },
    { name: 'Bravura', url: 'https://www.verovio.org/fonts/Bravura.ttf' }
  ];

  const fetchAndLoadFont = async (name: string, url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch font: ${name} from ${url}`);
        return;
      }
      const buffer = await response.arrayBuffer();
      
      // Convert ArrayBuffer to Base64
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const filename = `${name}.ttf`;
      doc.addFileToVFS(filename, base64);
      doc.addFont(filename, name, 'normal');
      
    } catch (e) {
      console.warn(`Error loading font ${name}:`, e);
    }
  };

  await Promise.all(fonts.map(f => fetchAndLoadFont(f.name, f.url)));
}
