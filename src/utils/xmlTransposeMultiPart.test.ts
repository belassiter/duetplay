import { describe, it, expect } from 'vitest';
import { transposeMusicXML } from './xmlTranspose';

describe('transposeMusicXML Multi-Part', () => {
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
            <staff>1</staff>
          </note>
        </measure>
      </part>
      <part id="P2">
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
            <staff>1</staff>
          </note>
        </measure>
      </part>
    </score-partwise>`;

  it('should transpose Part 2 only when targetStaff="2" is passed', () => {
    // Transpose Part 2 UP by M2 (C -> D)
    const result = transposeMusicXML(multiPartXml, 'M2', undefined, '2');

    const parser = new DOMParser();
    const doc = parser.parseFromString(result, "application/xml");
    
    // Check Part 1 (Should be unchanged C4, 0 fifths)
    const p1 = doc.querySelector('part[id="P1"]');
    const p1Note = p1?.getElementsByTagName('step')[0].textContent;
    const p1Fifths = p1?.getElementsByTagName('fifths')[0].textContent;
    
    expect(p1Note).toBe('C');
    expect(p1Fifths).toBe('0');
    
    // Check Part 2 (Should be altered D4, 2 fifths)
    const p2 = doc.querySelector('part[id="P2"]');
    const p2Note = p2?.getElementsByTagName('step')[0].textContent;
    const p2Fifths = p2?.getElementsByTagName('fifths')[0].textContent;
    
    expect(p2Note).toBe('D');
    expect(p2Fifths).toBe('2');
  });

  it('should transpose Part 1 only when targetStaff="1" is passed', () => {
     // Transpose Part 1 UP by P5 (C -> G)
     const result = transposeMusicXML(multiPartXml, 'P5', undefined, '1');
 
     const parser = new DOMParser();
     const doc = parser.parseFromString(result, "application/xml");
     
     // Check Part 1 (Altered C -> G, 1 sharp)
     const p1 = doc.querySelector('part[id="P1"]');
     const p1Note = p1?.getElementsByTagName('step')[0].textContent;
     const p1Fifths = p1?.getElementsByTagName('fifths')[0].textContent;
     
     expect(p1Note).toBe('G');
     expect(p1Fifths).toBe('1');
     
     // Check Part 2 (Unchanged)
     const p2 = doc.querySelector('part[id="P2"]');
     const p2Note = p2?.getElementsByTagName('step')[0].textContent;
     
     expect(p2Note).toBe('C');
  });
});
