import { describe, it, expect } from 'vitest';
import { transposeMusicXML } from './xmlTranspose';

describe('Mid-Song Modulation Transposition', () => {
    // 2 measures. 
    // M1: Key C Major (0 fifths). Note C4.
    // M2: Key G Major (1 fifth). Note G4.
    const modXml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="3.1">
      <part-list>
        <score-part id="P1">
          <part-name>Piano</part-name>
        </score-part>
      </part-list>
      <part id="P1">
        <measure number="1">
          <attributes>
            <key>
              <fifths>0</fifths>
            </key>
          </attributes>
          <note>
            <pitch>
              <step>C</step>
              <octave>4</octave>
            </pitch>
          </note>
        </measure>
        <measure number="2">
          <attributes>
            <key>
              <fifths>1</fifths>
            </key>
          </attributes>
          <note>
             <pitch>
              <step>G</step>
              <octave>4</octave>
            </pitch>
          </note>
        </measure>
      </part>
    </score-partwise>`;

    it('should correctly transpose key changes relative to their original key', () => {
        // Transpose UP Major 2nd (e.g. for Trumpet)
        // M1: C Major -> D Major (2 sharps). Note C -> D.
        // M2: G Major -> A Major (3 sharps). Note G -> A.
        const result = transposeMusicXML(modXml, 'M2', 'treble', '1');
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(result, "application/xml");
        
        // The tranposer splits global keys into specific staff keys (1 & 2) ONLY for multi-staff parts.
        // For single-staff parts, it keeps them global (no number).
        // We care about keys that apply to Staff 1 (explicit '1' or global).
        const allKeys = Array.from(doc.getElementsByTagName('key'));
        const keys = allKeys.filter(k => k.getAttribute('number') === '1' || !k.hasAttribute('number'));
        
        expect(keys.length).toBe(2);
        
        // Key 1: 0 fifths -> 2 fifths
        const k1 = keys[0];
        const k1Fifths = k1.getElementsByTagName('fifths')[0].textContent;
        expect(k1Fifths).toBe('2');
        
        // Key 2: 1 sharp -> G + M2 = A (3 sharps)
        const k2 = keys[1];
        const k2Fifths = k2.getElementsByTagName('fifths')[0].textContent;
        expect(k2Fifths).toBe('3'); 
        // Before logic fix, this would have been '2' (D Major applied everywhere)
    });
});
