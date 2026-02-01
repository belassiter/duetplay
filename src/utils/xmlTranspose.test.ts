import { describe, it, expect } from 'vitest';
import { transposeMusicXML } from './xmlTranspose';

describe('transposeMusicXML', () => {
  it('should transpose a simple XML snippet by M2', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="3.1">
      <part-list>
        <score-part id="P1">
          <part-name>Trumpet</part-name>
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
            <duration>1</duration>
            <type>quarter</type>
          </note>
          <note>
            <pitch>
              <step>F</step>
              <octave>4</octave>
            </pitch>
            <duration>1</duration>
            <type>quarter</type>
          </note>
        </measure>
      </part>
    </score-partwise>`;

    const result = transposeMusicXML(xml, 'M2');
    
    // Check Key
    // C Major (0 fifths) -> D Major (2 fifths, F# C#)
    expect(result).toContain('<fifths>2</fifths>');

    // Check Transpose Element Injection
    expect(result).toContain('<transpose>');
    expect(result).toContain('<chromatic>-2</chromatic>');
    
    // Check Notes
    // C4 -> D4
    expect(result).toContain('<step>D</step>');
    // F4 -> G4 (F natural to G natural, M2 up)
    expect(result).toContain('<step>G</step>');
  });

  it('should transpose chromatic notes correctly', () => {
    // F#4 in C Major (0 sharps) - Chromatic note
    const xml = `
      <part id="P1">
          <attributes><key><fifths>0</fifths></key></attributes>
          <note>
            <pitch>
              <step>F</step>
              <alter>1</alter>
              <octave>4</octave>
            </pitch>
            <accidental>sharp</accidental>
          </note>
      </part>`;
      
    // Transpose M2 up to D Major (2 sharps: F#, C#)
    // F#4 -> G#4
    // key of D Major has G natural. So G# needs an accidental.
    
    const result = transposeMusicXML(xml, 'M2');
    
    // Key should be 2 (D Major)
    expect(result).toContain('<fifths>2</fifths>');
    
    // Note should be G#4
    expect(result).toContain('<step>G</step>');
    expect(result).toContain('<accidental>sharp</accidental>');
    expect(result).toContain('<octave>4</octave>');
  });
  
  it('should ignore other parts', () => {
    const xml = `
    <score-partwise>
      <part id="P1">
         <note><pitch><step>C</step><octave>4</octave></pitch></note>
      </part>
      <part id="P2">
         <note><pitch><step>C</step><octave>4</octave></pitch></note>
      </part>
    </score-partwise>
    `;
    const result = transposeMusicXML(xml, 'M2');
    
    // Helper to check content by part
    const p2Index = result.indexOf('id="P2"');
    const p1Part = result.substring(0, p2Index);
    const p2Part = result.substring(p2Index);
    
    expect(p1Part).toContain('<step>D</step>');
    expect(p2Part).toContain('<step>C</step>');
    expect(p2Part).not.toContain('<step>D</step>');
  });
});
