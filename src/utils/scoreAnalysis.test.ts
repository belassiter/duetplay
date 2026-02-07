import { describe, it, expect } from 'vitest';
import { getPartRange } from './scoreAnalysis';

describe('scoreAnalysis - getPartRange', () => {
  const multiPartXml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="3.1">
      <part-list>
        <score-part id="P1">
          <part-name>Flute</part-name>
        </score-part>
        <score-part id="P2">
          <part-name>Clarinet</part-name>
        </score-part>
      </part-list>
      <part id="P1">
        <measure number="1">
          <note>
            <pitch>
              <step>C</step>
              <octave>4</octave>
            </pitch>
            <staff>1</staff>
          </note>
          <note>
            <pitch>
              <step>G</step>
              <octave>4</octave>
            </pitch>
            <staff>1</staff>
          </note>
        </measure>
      </part>
      <part id="P2">
        <measure number="1">
          <note>
            <pitch>
              <step>C</step>
              <octave>5</octave>
            </pitch>
            <staff>1</staff>
          </note>
          <note>
            <pitch>
              <step>G</step>
              <octave>5</octave>
            </pitch>
            <staff>1</staff>
          </note>
        </measure>
      </part>
    </score-partwise>`;

  it('should get correct range for Part 1 (staffId="1")', () => {
     const range = getPartRange(multiPartXml, "1");
     expect(range).not.toBeNull();
     if (range) {
         expect(range.min).toBe('C4');
         expect(range.max).toBe('G4');
     }
  });

  it('should get correct range for Part 2 (staffId="2")', () => {
    // Before fix, this would fail or return Part 1 notes if logic was flawed
    // Or return null if it looked for staff=2
    const range = getPartRange(multiPartXml, "2");
    expect(range).not.toBeNull();
    if (range) {
        expect(range.min).toBe('C5');
        expect(range.max).toBe('G5');
    }
 });

  it('should transpose range correctly when semitones provided', () => {
    // Original: C4 to G4
    // Transpose +2 (Major 2nd) -> D4 to A4
    const range = getPartRange(multiPartXml, '1', 2);
    expect(range?.min).toBe('D4');
    expect(range?.max).toBe('A4');
  });
});
