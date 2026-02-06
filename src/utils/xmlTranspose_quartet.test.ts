import { describe, it, expect } from 'vitest';
import { transposeMusicXML } from './xmlTranspose';

// Mock DOMParser (Simulating Browser Environment for Vitest/JSDOM)
// Note: verify that jsdom is enabled in vitest config or via comment

describe('XML Transpose - Quartet Support', () => {

    // Helper to generate a dummy N-part score
    const generateNPartScore = (n: number) => {
        let partsList = '';
        let partsContent = '';
        for (let i = 1; i <= n; i++) {
            partsList += `<score-part id="P${i}"><part-name>Part ${i}</part-name></score-part>`;
            partsContent += `
            <part id="P${i}">
              <measure number="1">
                <note><pitch><step>C</step><octave>4</octave></pitch></note>
              </measure>
            </part>`;
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
          <score-partwise version="3.1">
            <part-list>
              ${partsList}
            </part-list>
            ${partsContent}
          </score-partwise>`;
    };

    it('should identify and transpose Part 4 independently in a Quartet', () => {
        const xml = generateNPartScore(4);

        // Transpose Part 4 (index 4) up a Major 2nd (C -> D)
        // targetStaff="4" implies Part Index 4
        // 'M2' is interval
        // 'P1' is source key (C)
        // undefined clears clef logic if not critical
        const result = transposeMusicXML(
            xml, 
            'M2', // Target Interval (Bb instrument reading concert C -> sees D?) No, wait. 
                 // If I want to transpose C up to D, interval is M2.
            undefined, 
            '4', // Target Part 4
            'P1'
        );

        const parser = new DOMParser();
        const doc = parser.parseFromString(result, "application/xml");

        // Check Part 4
        const p4 = doc.querySelector('part[id="P4"]');
        expect(p4).not.toBeNull();
        const note4 = p4?.querySelector('step')?.textContent;
        // Should be D
        expect(note4).toBe('D');

        // Check Part 1 (Should be unchanged C)
        const p1 = doc.querySelector('part[id="P1"]');
        const note1 = p1?.querySelector('step')?.textContent;
        expect(note1).toBe('C');
    });

    it('should handle out of bounds part index gracefully', () => {
        const xml = generateNPartScore(2);
        // Try to transpose Part 3 in a Duet
        const result = transposeMusicXML(xml, 'M2', undefined, '3', 'P1');
        
        // Should return roughly original XML or at least NOT crash
        // And NOT modify existing parts
        const parser = new DOMParser();
        const doc = parser.parseFromString(result, "application/xml");
        
        const p1 = doc.querySelector('part[id="P1"]');
        const note1 = p1?.querySelector('step')?.textContent;
        expect(note1).toBe('C');
    });

});
