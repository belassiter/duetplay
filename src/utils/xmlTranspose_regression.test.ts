import { describe, it, expect } from 'vitest';
import { transposeMusicXML } from './xmlTranspose';

describe('XML Transpose Regressions', () => {
    
    it('should NOT create a duplicate key for Staff 2 if the part only has 1 staff (Single Staff Key Splitting Bug)', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
          <score-partwise version="3.1">
            <part-list>
              <score-part id="P1"><part-name>Trumpet</part-name></score-part>
            </part-list>
            <part id="P1">
              <measure number="1">
                <attributes>
                    <staves>1</staves>
                    <key><fifths>0</fifths></key>
                </attributes>
                <note><pitch><step>C</step><octave>4</octave></pitch></note>
              </measure>
            </part>
          </score-partwise>`;
    
        // Transpose P1 to Trumpet (M2)
        const result = transposeMusicXML(xml, 'M2', 'treble', '1', 'P1');
    
        const parser = new DOMParser();
        const doc = parser.parseFromString(result, "application/xml");
    
        const part = doc.querySelector('part[id="P1"]');
        if (!part) throw new Error('Part P1 not found');
        
        const keys = part.getElementsByTagName('key');
    
        // EXPECTATION: Should only have 1 key (the transposed one)
        // BUG WAS: It had 2 keys (one transposed, one original "staff 2")
        expect(keys.length).toBe(1);
    
        const key = keys[0];
        expect(key.querySelector('fifths')?.textContent).toBe('2'); // C -> D (2 sharps)
        expect(key.getAttribute('number')).toBeNull(); // Should remain global
      });

});
