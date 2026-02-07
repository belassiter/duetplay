import { jsPDF } from "jspdf";

/**
 * Loads Verovio SMuFL fonts (Leipzig and Bravura) into the jsPDF instance.
 * This ensures that special characters (like metronome marks) render correctly.
 */
export async function loadVerovioFonts(doc: jsPDF): Promise<void> {
    const fonts = [
        { name: 'Leipzig', url: 'https://www.verovio.org/css/fonts/Leipzig.ttf' },
        { name: 'Bravura', url: 'https://www.verovio.org/css/fonts/Bravura.ttf' }
    ];

    const loadFont = async (name: string, url: string) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`Failed to fetch font: ${name} from ${url}`);
                return;
            }
            
            const blob = await response.blob();
            
            return new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    // result is "data:font/ttf;base64,....."
                    const base64 = result.split(',')[1];
                    
                    if (base64) {
                        const filename = `${name}.ttf`;
                        doc.addFileToVFS(filename, base64);
                        doc.addFont(filename, name, "normal");
                        // console.log(`Font ${name} loaded successfully for PDF.`);
                    }
                    resolve();
                };
                reader.onerror = () => {
                    console.error(`Error reading font blob for ${name}`);
                    resolve();
                };
                reader.readAsDataURL(blob);
            });

        } catch (error) {
            console.warn(`Error loading font ${name}:`, error);
        }
    };

    // Load fonts in parallel
    await Promise.all(fonts.map(f => loadFont(f.name, f.url)));
}
