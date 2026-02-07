import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { loadFonts } from '../../utils/pdfFonts';
import { jsPDF } from 'jspdf';

// Mock jsPDF
vi.mock('jspdf', () => {
  return {
    jsPDF: class {
      addFileToVFS = vi.fn();
      addFont = vi.fn();
    }
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('loadFonts', () => {
    let mockDoc: jsPDF;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDoc = new jsPDF();
    });

    it('should fetch fonts and add them to VFS and document', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        const mockResponse = {
            ok: true,
            arrayBuffer: () => Promise.resolve(mockArrayBuffer),
        };
        (global.fetch as Mock).mockResolvedValue(mockResponse);

        await loadFonts(mockDoc);

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(global.fetch).toHaveBeenCalledWith('https://www.verovio.org/fonts/Leipzig.ttf');
        expect(global.fetch).toHaveBeenCalledWith('https://www.verovio.org/fonts/Bravura.ttf');

        // Check 2 calls to addFileToVFS
        expect(mockDoc.addFileToVFS).toHaveBeenCalledTimes(2);
        expect(mockDoc.addFileToVFS).toHaveBeenCalledWith('Leipzig.ttf', expect.any(String)); // Base64 string
        expect(mockDoc.addFileToVFS).toHaveBeenCalledWith('Bravura.ttf', expect.any(String));

        // Check 2 calls to addFont
        expect(mockDoc.addFont).toHaveBeenCalledTimes(2);
        expect(mockDoc.addFont).toHaveBeenCalledWith('Leipzig.ttf', 'Leipzig', 'normal');
        expect(mockDoc.addFont).toHaveBeenCalledWith('Bravura.ttf', 'Bravura', 'normal');
    });

    it('should handle fetch errors gracefully', async () => {
        // Mock fetch failure
        (global.fetch as Mock).mockResolvedValue({
            ok: false,
            status: 404,
        });

        // Should not throw
        await expect(loadFonts(mockDoc)).resolves.not.toThrow();
        
        // Should verify no fonts added if fetch failed
        expect(mockDoc.addFileToVFS).not.toHaveBeenCalled();
    });
    
    it('should handle network errors gracefully', async () => {
        (global.fetch as Mock).mockRejectedValue(new Error('Network error'));
        
         // Should not throw
        await expect(loadFonts(mockDoc)).resolves.not.toThrow();
        
         // Should verify no fonts added if fetch failed
        expect(mockDoc.addFileToVFS).not.toHaveBeenCalled();
    })
});
