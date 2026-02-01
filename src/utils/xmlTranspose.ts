import { Note, Key, Interval } from 'tonal';

const normalizeInterval = (interval: string): string => {
    // Handle user-friendly interval notation (e.g., "8va", "M6+8va")
    if (interval === 'P1') return 'P1';

    let base = interval;
    let direction = 1;
    if (base.startsWith('-')) {
        direction = -1;
        base = base.substring(1);
    } else if (base.startsWith('+')) {
         base = base.substring(1);
    }
    
    let shiftOctaves = 0;
    if (base.endsWith('8va')) {
        shiftOctaves = 1;
        base = base.replace('+8va', '').replace('8va', '');
    } else if (base.endsWith('15ma')) {
        shiftOctaves = 2;
        base = base.replace('+15ma', '').replace('15ma', '');
    }

    // If base is empty (e.g. from "+8va"), treat as P1
    if (!base) base = 'P1';
    
    // Add intervals using Tonal
    try {
        let result = base;
        if (shiftOctaves > 0) {
            const octInt = shiftOctaves === 1 ? 'P8' : 'P15';
            const added = Interval.add(base, octInt);
            // Handling possibility that Interval.add returns undefined/null for invalid inputs
            result = added || base; 
        }
        
        // Re-apply direction
        if (direction === -1) {
             // Invert or simplify? Interval.val(result) * -1?
             // Tonal's simplified way: just prepend '-' if not there? 
             // Note: Interval.add('M2', 'P8') -> 'M9'. '-M9' is valid.
             return '-' + result;
        }
        return result;
    } catch (e) {
        console.warn(`Failed to normalize interval: ${interval}`, e);
        return interval; // Fallback
    }
};

export const transposeMusicXML = (xmlString: string, rawInterval: string, targetClef?: string, targetStaff: string = '1'): string => {
    const interval = normalizeInterval(rawInterval);
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");

    // MusicXML logic is different from MEI
    // 1. Find Part 1 ("P1")
    // Parts are defined in <part-list> -> <score-part id="P1">
    // Then the music is in <part id="P1">
    
    // We assume the first part in the file is the one to transpose if P1 isn't standard?
    // Usually P1 is standard for first part.
    const part = doc.querySelector('part[id="P1"]') || doc.querySelector('part'); 
    
    if (!part) return xmlString; // Fail safe

    // Attribute: <attributes><key><fifths>...</fifths></key></attributes>
    // Note: <note><pitch><step>C</step><alter>1</alter><octave>4</octave></pitch></note>

    // 1. Transpose Key Signatures
    // MusicXML uses "fifths" (number of sharps/flats). -1 = 1 flat (F), 1 = 1 sharp (G).
    // Source Key Tracking
    const keys = Array.from(part.getElementsByTagName('key'));
    
    let sourceKeyRoot = 'C'; // Default
    
    // Find the Source Key for this specific staff
    let sourceKeyNode = keys.find(k => k.getAttribute('number') === targetStaff);
    // Fallback: Global key (no number)
    if (!sourceKeyNode) sourceKeyNode = keys.find(k => !k.hasAttribute('number'));
    // Fallback: Any key (simplistic)
    if (!sourceKeyNode && keys.length > 0) sourceKeyNode = keys[0];

    if (sourceKeyNode) {
        const fifths = parseInt(sourceKeyNode.getElementsByTagName('fifths')[0]?.textContent || '0');
        // Convert fifths to Root
        // 0 -> C
        // 1 -> G
        // -1 -> F
        // -2 -> Bb
        sourceKeyRoot = Note.transposeFifths('C', fifths);
    }
    
    // Calculate new Key Root
    const targetKeyRoot = Note.transpose(sourceKeyRoot, interval);
    
    // Update Keys
    // We must handle splitting global key into <key number="1"> and <key number="2">
    // if the part has 2 staves.
    keys.forEach(key => {
        // Validation: Check if this key belongs to our target staff
        const keyNumber = key.getAttribute('number');

        // Logic A: Key is explicitly for OTHER staff -> Skip
        if (keyNumber && keyNumber !== targetStaff) return;
        
        // Logic B: Key is Global (no number).
        // If we are targeting Staff 2, and key is global -> We must Split it?
        // Or if we are targeting Staff 1, and key is global -> We must Split it?
        // YES. If we transpose a global key, it affects BOTH staves. We don't want that.
        // We only want to affect targetStaff.
        
        if (!keyNumber) {
            // It's global. We need to split it so we can modify ONE copy.
            // Create a copy for the "Other" staff (which keeps original key)
            // Assuming 2 staves...
            const otherStaff = targetStaff === '1' ? '2' : '1';
            
            const otherKey = key.cloneNode(true) as Element;
            otherKey.setAttribute('number', otherStaff);
            
            // Insert after
            key.insertAdjacentElement('afterend', otherKey);
            
            // Assign current key to targetStaff
            key.setAttribute('number', targetStaff);
            
            // Now 'key' is specific to our targetStaff.
        }
        
        // Now update the Key (it matches targetStaff)
        if (key.getAttribute('number') === targetStaff) { 
             const newFifths = Key.majorKey(targetKeyRoot).alteration;
             const fifthsEl = key.getElementsByTagName('fifths')[0];
             if (fifthsEl) fifthsEl.textContent = newFifths.toString();
        }
        
        // Inject <transpose> element to Attributes
        // Only if it's the first key (simplification) or if we are iterating attributes.
        // Wait, 'keys' iteration is local. We need access to the parent <attributes>.
        const attributes = key.parentElement;
        if (attributes && key.getAttribute('number') === targetStaff) {
             // Check if <transpose> exists
             let transposeEl = attributes.getElementsByTagName('transpose')[0];
             if (!transposeEl) {
                 transposeEl = doc.createElement('transpose');
                 attributes.appendChild(transposeEl);
             }
             
             // Set diatonic/chromatic
             // interval "M2" -> chromatic 2, diatonic 1.
             // But we are transposing UP.
             // If we write Trumpet part (M2 up), we usually want "Sounding Pitch" to be preserved?
             // No, file provided by user is "Transposed Part".
             // The <transpose> tag says:
             // <diatonic>-1</diatonic><chromatic>-2</chromatic>
             // This means "To get sounding pitch, go DOWN M2".
             // So if we write Written Pitch (Up M2), we must add Transpose (-2).
             
             // Clean transpose children
             while (transposeEl.firstChild) {
                 transposeEl.removeChild(transposeEl.firstChild);
             }
             
             // Dynamic Transpose Tag Logic
             // If Transposition is UP M2, we write -1 diatonic, -2 chromatic (Sounding pitch is lower)
             // Tonal intervals: "M2" -> 2 semitones. "P1" -> 0.
             // We need to invert the interval to describe "Sounding Pitch relative to Written".
             // If we write UP, Sounding is DOWN.
             
             // Simple lookup or calculation?
             // Tonal.Interval.semitones('M2') -> 2.
             // Target Chromatic = -1 * semitones.
             // Target Diatonic = -1 * (step distance).
             // M2 step distance is 1 (C->D).
             // P5 step distance is 4 (C->G).
             // P8 step distance is 7.
             
             // Note.transpose('C', 'M2') -> 'D'. Step index C=0, D=1.
             // Note.transpose('C', 'P5') -> 'G'. Step index 4.
             // Note.transpose('C', '-P8') -> 'C'. Step index -7.
             
             // We can use Tonal to parse the interval.
             // But actually, we just need to invert the operation.
             // If interval is 'M2', we put Sounding pitch is 'M-2'.
             
             // Let's implement robust inversion for the XML tag
             const semitones = Note.transpose('C4', interval).endsWith('4') 
                ? Interval.semitones(Interval.distance('C4', Note.transpose('C4', interval))) // Simple interval
                : Interval.semitones(interval) || 0;
             
             // Diatonic steps:
             // get interval size number. M2 -> 2. P5 -> 5.
             // Diatonic difference = number - 1. M2 -> 1. P5 -> 4.
             // If descending, make negative.
             const isDescending = interval.startsWith('-');
             const intervalNum = parseInt(interval.replace(/\D/g, '') || '1');
             const diaStep = (intervalNum - 1) * (isDescending ? -1 : 1);
             
             // Invert for <transpose> tag (Written -> Sounding)
             const xmlChrom = -1 * (semitones || 0);
             const xmlDia = -1 * diaStep;

             const diatonicEl = doc.createElement('diatonic');
             diatonicEl.textContent = xmlDia.toString();
             const chromaticEl = doc.createElement('chromatic');
             chromaticEl.textContent = xmlChrom.toString();
             
             transposeEl.appendChild(diatonicEl);
             transposeEl.appendChild(chromaticEl);
        }
        
        // --- 1b. Update Clef if Requested ---
        if (targetClef) {
             const attributes = key.parentElement;
             if (attributes) {
                 // Clefs can also be numbered. <clef number="1">.
                 // We only want to update the clef for OUR staff.
                 const clefs = Array.from(attributes.getElementsByTagName('clef'));
                 let clefEl = clefs.find(c => c.getAttribute('number') === targetStaff);
                 
                 // If no numbered clef found, maybe it's global (which implies Staff 1 usually, or implicit).
                 // If target is 1 and we find unnumbered, use it.
                 // If target is 2 and we find unnumbered, check if there's another one?
                 if (!clefEl && targetStaff === '1') {
                     clefEl = clefs.find(c => !c.hasAttribute('number'));
                 }
                 
                 // If still not found, we create it
                 if (!clefEl) {
                     clefEl = doc.createElement('clef');
                     clefEl.setAttribute('number', targetStaff);
                     attributes.appendChild(clefEl);
                 }
                 
                 // Update sign/line
                 // Treble: G 2. Bass: F 4. Alto: C 3. Tenor: C 4.
                 let sign = 'G';
                 let line = '2';
                 // Clef Octave Change unused for now, potentially for Tenor voice or Piccolo
                 // const clefOctaveChange = 0;
                 
                 if (targetClef === 'bass') { sign = 'F'; line = '4'; }
                 else if (targetClef === 'alto') { sign = 'C'; line = '3'; }
                 else if (targetClef === 'tenor') { sign = 'C'; line = '4'; }
                 else if (targetClef === 'treble') { sign = 'G'; line = '2'; }
                 
                 // Handle specific instrument logic if encoded in clef string?
                 // No, standard clefs only for now.
                 
                 // Clear children
                 while (clefEl.firstChild) clefEl.removeChild(clefEl.firstChild);
                 
                 const signEl = doc.createElement('sign');
                 signEl.textContent = sign;
                 const lineEl = doc.createElement('line');
                 lineEl.textContent = line;
                 
                 clefEl.appendChild(signEl);
                 clefEl.appendChild(lineEl);
             }
        }
    });

    // 2. Transpose Notes (Iterate by Measure to track accidentals)
    const measures = Array.from(part.getElementsByTagName('measure'));

    // Helper to get scale alteration from Key Signature
    const getKeyAlteration = (keyRoot: string, step: string): number => { 
            const scale = Key.majorKey(keyRoot).scale;
            const match = scale.find(n => n.startsWith(step));
            if (!match) return 0; // Natural
            // Ex: "F#" -> 1, "Eb" -> -1
            const acc = match.slice(1);
            if (acc === '#') return 1;
            if (acc === 'b') return -1;
            if (acc === '##') return 2;
            if (acc === 'bb') return -2;
            return 0;
    };

    measures.forEach(measure => {
        const measureState = new Map<string, number>(); // Key: "${step}${octave}", Value: alter (int)

        const notes = Array.from(measure.getElementsByTagName('note'));
        
        notes.forEach(note => {
            // --- STAFF CHECK ---
            const staffEl = note.getElementsByTagName('staff')[0];
            const noteStaff = staffEl ? staffEl.textContent : '1';
            
            if (noteStaff !== targetStaff) return;

            const pitch = note.getElementsByTagName('pitch')[0];
            if (!pitch) return; // unpitched (rest)
            
            const stepEl = pitch.getElementsByTagName('step')[0];
            const alterEl = pitch.getElementsByTagName('alter')[0];
            const octaveEl = pitch.getElementsByTagName('octave')[0];
            
            if (!stepEl || !octaveEl) return;
            
            const step = stepEl.textContent || 'C';
            const oct = octaveEl.textContent || '4';
            const alter = alterEl ? parseInt(alterEl.textContent || '0') : 0;
            
            // Construct Pitch String for Tonal
            let accidSym = '';
            if (alter === 1) accidSym = '#';
            else if (alter === -1) accidSym = 'b';
            else if (alter === 0) accidSym = ''; // Natural
            else if (alter === 2) accidSym = '##';
            else if (alter === -2) accidSym = 'bb';
            
            const srcPitch = step + accidSym + oct;
            
            // Transpose
            const dstPitch = Note.transpose(srcPitch, interval);
            
            // Parse Result
            const dstPC = Note.pitchClass(dstPitch);
            const dstStep = dstPC.charAt(0);
            const dstAccidStr = dstPC.slice(1);
            // Robust octave extraction:
            const octaveMatch = dstPitch.match(/-?\d+$/);
            const numericOctave = octaveMatch ? octaveMatch[0] : oct;
            
            // Calculate new Alter
            let newAlter = 0;
            if (dstAccidStr === '#') newAlter = 1;
            else if (dstAccidStr === 'b') newAlter = -1;
            else if (dstAccidStr === '##') newAlter = 2;
            else if (dstAccidStr === 'bb') newAlter = -2;
            // else 0
            
            // Write Back
            stepEl.textContent = dstStep;
            octaveEl.textContent = numericOctave;
            
            if (newAlter !== 0) {
                if (!alterEl) { // Create if missing
                    const newAlterEl = doc.createElement('alter');
                    newAlterEl.textContent = newAlter.toString();
                    // Insert after step
                    stepEl.insertAdjacentElement('afterend', newAlterEl);
                } else {
                    alterEl.textContent = newAlter.toString();
                }
            } else {
                // New Alter is 0 (Natural)
                if (alterEl) {
                    // Remove to standardize on natural default
                    pitch.removeChild(alterEl);
                }
            }
            
            // Update <accidental> ELEMENT (not attribute!) based on context
            const stateKey = dstStep + numericOctave;
            
            let currentCtxAlter = measureState.get(stateKey);
            if (currentCtxAlter === undefined) {
                // Fallback to Key Signature
                currentCtxAlter = getKeyAlteration(targetKeyRoot, dstStep);
            }

            let neededAccid = '';
            
            if (newAlter !== currentCtxAlter) {
                 // We need an explicit accidental
                 if (newAlter === 0) neededAccid = 'natural';
                 else if (newAlter === 1) neededAccid = 'sharp';
                 else if (newAlter === -1) neededAccid = 'flat';
                 else if (newAlter === 2) neededAccid = 'double-sharp';
                 else if (newAlter === -2) neededAccid = 'flat-flat';
            }

            // Update Measure State
            measureState.set(stateKey, newAlter);

            let accidEl = note.getElementsByTagName('accidental')[0];
            
            if (neededAccid) {
                if (!accidEl) {
                    accidEl = doc.createElement('accidental');
                    // Try to keep order somewhat clean (e.g. after type)
                    const typeEl = note.getElementsByTagName('type')[0];
                    if (typeEl) {
                        typeEl.insertAdjacentElement('afterend', accidEl);
                    } else {
                        note.appendChild(accidEl);
                    }
                }
                accidEl.textContent = neededAccid;
            } else {
                // Remove if not needed (let context decide)
                if (accidEl) note.removeChild(accidEl);
            }
        });
    });

    return new XMLSerializer().serializeToString(doc);
};

