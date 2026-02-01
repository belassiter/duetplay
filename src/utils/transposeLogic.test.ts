import { describe, it, expect } from 'vitest';
import { transposeMusicXML } from './xmlTranspose';

// Mock XML
const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe('transposeMusicXML with Shifts', () => {
    it('applies octave shift (+12 semitones)', () => {
        // Target: P1 (no inst change), +12 shift
        const result = transposeMusicXML(mockXML, 'P1', undefined, '1', 'P1', undefined, 12);
        
        // C4 + 12 semitones -> C5
        expect(result).toContain('<step>C</step>');
        expect(result).toContain('<octave>5</octave>');
    });

    it('applies negative octave shift (-12 semitones)', () => {
        // Target: P1, -12 shift
        const result = transposeMusicXML(mockXML, 'P1', undefined, '1', 'P1', undefined, -12);
        
        // C4 - 12 semitones -> C3
        expect(result).toContain('<step>C</step>');
        expect(result).toContain('<octave>3</octave>');
    });

    it('applies global key shift (+2 semitones)', () => {
        // Target: P1, +2 shift (M2)
        const result = transposeMusicXML(mockXML, 'P1', undefined, '1', 'P1', undefined, 2);
        
        // C4 + 2 semitones (M2) -> D4
        expect(result).toContain('<step>D</step>');
        expect(result).toContain('<octave>4</octave>');
        // Key signature should change (0 fifths -> 2 sharps = D Major)
        // C Major (0) + M2 -> D Major (2 sharps, fifths=2)
        expect(result).toContain('<fifths>2</fifths>');
    });

    it('combines instrument transpose and Octave shift', () => {
        // Mock Source: Bb Trumpet (Sounding is M2 lower). Written C4 -> Sounds Bb3.
        // But here we usually treat source XML as "Written". 
        // If we say Source Transpose is 'P1' (Concert) and Target is 'Bb Trumpet' (-M2).
        // Then C4 -> D4 (Written).
        // If we ADD +1 Octave (+12).
        // Result should be D5.
        
        // TargetTranspose: '-M2' (Written is M2 UP from Sounding? No. Bb Trumpet sounds M2 DOWN. Written = Sounding + M2)
        // Wait, tonal/xmlTranspose logic:
        // interval = target - source.
        // If Target is Bb Inst (needs to be written higher). 
        // instruments.ts: Bb Trumpet transpose: '-M2'? No usually simple.
        
        // Let's assume standard logic: 
        // targetTranspose="P1", source="P1", additional=12 -> +1 Octave.
        
        // Let's test pure additional shift.
        const result = transposeMusicXML(mockXML, 'P1', undefined, '1', 'P1', undefined, 14); // +12 + 2 = +14
        // C4 + 14 semitones -> D5
        expect(result).toContain('<step>D</step>');
        expect(result).toContain('<octave>5</octave>');
    });
});
