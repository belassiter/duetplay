import { Note } from 'tonal';

interface RangeResult {
    min: string;
    max: string;
}

export const getPartRange = (xmlString: string, staffId: string): RangeResult | null => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    
    // Logic from xmlTranspose.ts to resolve Part vs Staff logic
    // We need to determine if we are targeting a specific Part in a multi-part score,
    // or a specific Staff in a single-part (e.g. Piano) score.
    const partElements = Array.from(doc.getElementsByTagName('part')); 
    
    let targetPart: Element | null = null;
    let internalTargetStaff = '1';

    if (partElements.length >= 2) {
        // Multi-Part Score (e.g. Duet with P1, P2)
        // staffId refers to the Part Index in the UI (1, 2)
        const partIndex = parseInt(staffId) - 1;
        if (partIndex >= 0 && partIndex < partElements.length) {
            targetPart = partElements[partIndex];
        }
        // In multi-part scenario, generally each part has staff 1.
        internalTargetStaff = '1'; 
    } else if (partElements.length === 1) {
        // Single Part Score (e.g. Piano)
        // staffId refers to Staff Number (1=RH, 2=LH)
        targetPart = partElements[0];
        internalTargetStaff = staffId;
    } else {
        return null;
    }

    if (!targetPart) return null;

    // Narrow down search to the correct part
    const allNotes = Array.from(targetPart.getElementsByTagName('note'));
    
    let minMidi = 1000;
    let maxMidi = -1;
    let minNote = '';
    let maxNote = '';
    
    let found = false;

    allNotes.forEach(note => {
        // Check Staff
        const staffEl = note.getElementsByTagName('staff')[0];
        // If internalTargetStaff is needed, checking it here allows filtering RH/LH
        const noteStaff = staffEl ? staffEl.textContent : '1'; // Default to 1 if missing
        
        if (noteStaff !== internalTargetStaff) return;

        // Check Pitch
        const pitch = note.getElementsByTagName('pitch')[0];
        if (!pitch) return; // Skip rests/unpitched

        const step = pitch.getElementsByTagName('step')[0]?.textContent || 'C';
        const octave = pitch.getElementsByTagName('octave')[0]?.textContent || '4';
        const alterEl = pitch.getElementsByTagName('alter')[0];
        const alter = alterEl ? parseInt(alterEl.textContent || '0') : 0;
        
        let acc = '';
        if (alter === 1) acc = '#';
        else if (alter === -1) acc = 'b';
        else if (alter === 2) acc = '##';
        else if (alter === -2) acc = 'bb';
        
        const noteName = `${step}${acc}${octave}`;
        const midi = Note.midi(noteName);
        
        if (midi !== null) {
            found = true;
            if (midi < minMidi) {
                minMidi = midi;
                minNote = noteName;
            }
            if (midi > maxMidi) {
                maxMidi = midi;
                maxNote = noteName;
            }
        }
    });

    if (!found) return null;
    return { min: minNote, max: maxNote };
};

export const generateRangePreviewXML = (minDetail: string, maxDetail: string, clef: string = 'treble', keyFifths: number = 0): string => {
    // Construct simplified MusicXML
    // minDetail e.g. "Ab3"
    // Parse into Step, Alter, Octave
    
    const parseNote = (noteStr: string) => {
        const pc = Note.pitchClass(noteStr); // "Ab"
        const step = pc.charAt(0);
        const altStr = pc.substring(1);
        const oct = Note.octave(noteStr) || 4;
        
        let alter = 0;
        if (altStr === '#') alter = 1;
        if (altStr === 'b') alter = -1;
        if (altStr === '##') alter = 2;
        if (altStr === 'bb') alter = -2;
        
        return { step, alter, oct };
    };

    const n1 = parseNote(minDetail);
    const n2 = parseNote(maxDetail);
    
    // Map clef name to MusicXML sign/line
    let sign = 'G', line = 2;
    if (clef === 'bass') { sign = 'F'; line = 4; }
    else if (clef === 'alto') { sign = 'C'; line = 3; }
    else if (clef === 'tenor') { sign = 'C'; line = 4; }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Range</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>${keyFifths}</fifths>
        </key>
        <clef>
          <sign>${sign}</sign>
          <line>${line}</line>
        </clef>
        <staff-details>
            <staff-lines>5</staff-lines>
        </staff-details>
      </attributes>
      <note>
        <pitch>
          <step>${n1.step}</step>
          <alter>${n1.alter}</alter>
          <octave>${n1.oct}</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
        <stem>up</stem>
        <notations><ornaments/></notations>
      </note>
      <note>
        <pitch>
          <step>${n2.step}</step>
          <alter>${n2.alter}</alter>
          <octave>${n2.oct}</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
        <stem>up</stem>
      </note>
    </measure>
  </part>
</score-partwise>`;
};
