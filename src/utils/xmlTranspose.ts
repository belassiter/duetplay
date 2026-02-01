import { Note, Key, Interval } from 'tonal';

const normalizeInterval = (interval: string): string => {
    // Handle user-friendly interval notation (e.g., "8va", "M6+8va")
    if (interval === 'P1') return 'P1';

    let base = interval;
    let direction = 1;

    // Check for negative sign first
    if (base.startsWith('-')) {
        direction = -1;
        base = base.substring(1);
    } else if (base.startsWith('+')) {
         base = base.substring(1);
    }
    
    // Check for octave shifts
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
    
    // Construct valid Tonal string
    // Tonal expects "M2", "-P5" etc.
    // If we had octave shifts, we return standard interval with octaves, e.g. "M9", "P8"
    // Hacky octave addition for now: P8 = 8va, P15 = 15ma.
    if (shiftOctaves > 0) {
        try {
           const octInt = shiftOctaves === 1 ? 'P8' : 'P15';
           // If base is P1, adding P8 gives P8. 
           // If base is M2, adding P8 gives M9.
           // Tonal Interval.add('M2', 'P8') -> 'M9'.
           const added = Interval.add(base, octInt);
           base = added || base; 
        } catch (e) {
            console.warn("Error adding octave to interval", e);
        }
    }
    
    const tonalInterval = (direction === -1 ? '-' : '') + base;
    return tonalInterval;
}

// Helper to subtract intervals: Target - Source
// Used for relative transposition logic.
const getRelativeInterval = (targetTrans: string, sourceTrans: string): string => {
   const iTarget = normalizeInterval(targetTrans);
   const iSource = normalizeInterval(sourceTrans);
   
   // Use dummy calculation via C4
   const noteSource = Note.transpose('C4', iSource);
   const noteTarget = Note.transpose('C4', iTarget);
   
   return Interval.distance(noteSource, noteTarget);
}

export const transposeMusicXML = (
    xmlString: string, 
    targetTranspose: string, 
    targetClef?: string, 
    targetStaff: string = '1',
    sourceTranspose: string = 'P1',
    targetPartName?: string
): string => {
    // Calculate relative interval
    let interval = 'P1';
    if (targetTranspose !== sourceTranspose) {
        interval = getRelativeInterval(targetTranspose, sourceTranspose);
    } else {
        // Just normalize existing if P1?
        interval = normalizeInterval('P1');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");

    // DETERMINE TARGET PART vs STAFF
    const partElements = Array.from(doc.getElementsByTagName('part')); 
    
    let targetPart: Element | null = null;
    let internalTargetStaff = '1';

    if (partElements.length >= 2) {
        // Multi-Part Score (e.g. Duet with P1, P2)
        // targetStaff refers to the Part Index in the UI (1, 2)
        const partIndex = parseInt(targetStaff) - 1;
        if (partIndex >= 0 && partIndex < partElements.length) {
            targetPart = partElements[partIndex];
        }
        // In a multi-part scenario, each part typically has 1 staff.
        // So we target staff 1 of that specific part.
        internalTargetStaff = '1'; 
    } else if (partElements.length === 1) {
        // Single Part Score (e.g. Piano)
        // targetStaff refers to Staff Number within that part (1=RH, 2=LH)
        targetPart = partElements[0];
        internalTargetStaff = targetStaff;
    } else {
        // No parts found?
        return xmlString;
    }

    if (!targetPart) return xmlString;
    const part = targetPart; 

    // Check for multi-staff part (Grand Staff)
    let partHasMultipleStaves = false;
    const stavesTags = Array.from(part.getElementsByTagName('staves'));
    if (stavesTags.some(s => parseInt(s.textContent || '1') > 1)) {
        partHasMultipleStaves = true;
    }

    // --- Update Part Name in Metadata if provided ---
    if (targetPartName) {
        const partId = part.getAttribute('id');
        if (partId) {
            // Robust search using getElementsByTagName instead of querySelector
            const scoreParts = Array.from(doc.getElementsByTagName('score-part'));
            const scorePart = scoreParts.find(sp => sp.getAttribute('id') === partId);

            if (scorePart) {
                // Update Full Name
                let partNameEl = scorePart.getElementsByTagName('part-name')[0];
                if (!partNameEl) {
                    partNameEl = doc.createElement('part-name');
                    scorePart.appendChild(partNameEl);
                }
                
                // Clear attributes (like print-object="no") BEFORE setting content
                while (partNameEl.attributes.length > 0) {
                    partNameEl.removeAttribute(partNameEl.attributes[0].name);
                }

                if (partHasMultipleStaves) {
                    // GRAND STAFF STRATEGY: 
                    // Since staff-details/label is not rendering reliably in all contexts,
                    // we will manage the <part-name> differently.
                    // If targetStaff is '1', we Replace.
                    // If targetStaff is '2', we Append (if previous text exists and is not same)
                    // Note: This modifies the single label for the bracket system.

                    if (internalTargetStaff === '1') {
                         partNameEl.textContent = targetPartName;
                    } else if (internalTargetStaff === '2') {
                        // Avoid duplicates if user selects same instrument or re-runs
                        const currentText = partNameEl.textContent || '';
                        if (currentText && !currentText.includes(targetPartName)) {
                            // If currentText is generic "Piano", overwrite it? 
                            // Or append "Trumpet / Trombone" logic.
                            // If currentText is "Piano", maybe we just want "TargetName".
                            if (currentText.toLowerCase().includes('piano')) {
                                // If staff 1 wasn't changed (still Piano), we might just want "Piano / Tuba".
                                partNameEl.textContent = currentText + ' / ' + targetPartName;
                            } else {
                                // Staff 1 was likely changed to "Trumpet".
                                partNameEl.textContent = currentText + ' / ' + targetPartName;
                            }
                        } else if (!currentText) {
                            partNameEl.textContent = targetPartName;
                        }
                    } else {
                         partNameEl.textContent = targetPartName;
                    }
                } else {
                    // STANDARD STRATEGY
                    partNameEl.textContent = targetPartName;
                }

                // Update Abbreviation - Hide on subsequent systems (User Request)
                let partAbbrEl = scorePart.getElementsByTagName('part-abbreviation')[0];
                if (!partAbbrEl) {
                    partAbbrEl = doc.createElement('part-abbreviation');
                    scorePart.appendChild(partAbbrEl);
                }
                
                partAbbrEl.textContent = ''; 
                while (partAbbrEl.attributes.length > 0) {
                    partAbbrEl.removeAttribute(partAbbrEl.attributes[0].name);
                }

                // Remove display overrides
                const displayNames = Array.from(scorePart.getElementsByTagName('part-name-display'));
                displayNames.forEach(el => el.remove());
                
                const displayAbbrs = Array.from(scorePart.getElementsByTagName('part-abbreviation-display'));
                displayAbbrs.forEach(el => el.remove());
            }
        }
    }

    // Attribute: <attributes><key><fifths>...</fifths></key></attributes>
    // Note: <note><pitch><step>C</step><alter>1</alter><octave>4</octave></pitch></note>

    // 1. Transpose Key Signatures
    // MusicXML uses "fifths" (number of sharps/flats). -1 = 1 flat (F), 1 = 1 sharp (G).
    // Source Key Tracking
    const keys = Array.from(part.getElementsByTagName('key'));
    
    let sourceKeyRoot = 'C'; // Default
    
    // Find the Source Key for this specific staff
    let sourceKeyNode = keys.find(k => k.getAttribute('number') === internalTargetStaff);
    // Fallback: Global key (no number)
    if (!sourceKeyNode) sourceKeyNode = keys.find(k => !k.hasAttribute('number'));
    // Fallback: Any key (simplistic)
    if (!sourceKeyNode && keys.length > 0) sourceKeyNode = keys[0];

    if (sourceKeyNode) {
        const fifths = parseInt(sourceKeyNode.getElementsByTagName('fifths')[0]?.textContent || '0');
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
        if (keyNumber && keyNumber !== internalTargetStaff) return;
        
        // Logic B: Key is Global (no number).
        // If we are targeting Staff 2, and key is global -> We must Split it?
        if (!keyNumber) {
            // It's global. We need to split it so we can modify ONE copy.
            const otherStaff = internalTargetStaff === '1' ? '2' : '1';
            
            const otherKey = key.cloneNode(true) as Element;
            otherKey.setAttribute('number', otherStaff);
            
            // Insert after
            key.insertAdjacentElement('afterend', otherKey);
            
            // Assign current key to targetStaff
            key.setAttribute('number', internalTargetStaff);
        }
        
        // Now update the Key (it matches internalTargetStaff)
        if (key.getAttribute('number') === internalTargetStaff) { 
             const newFifths = Key.majorKey(targetKeyRoot).alteration;
             const fifthsEl = key.getElementsByTagName('fifths')[0];
             if (fifthsEl) fifthsEl.textContent = newFifths.toString();
        }
        
        // Inject <transpose> element to Attributes
        const attributes = key.parentElement;
        if (attributes && key.getAttribute('number') === internalTargetStaff) {
             // Check if <transpose> exists
             let transposeEl = attributes.getElementsByTagName('transpose')[0];
             if (!transposeEl) {
                 transposeEl = doc.createElement('transpose');
                 attributes.appendChild(transposeEl);
             }
             
             // Clean transpose children
             while (transposeEl.firstChild) {
                 transposeEl.removeChild(transposeEl.firstChild);
             }
             
             // Dynamic Transpose Tag Logic using 'interval' variable
             const semitones = Note.transpose('C4', interval).endsWith('4') 
                ? Interval.semitones(Interval.distance('C4', Note.transpose('C4', interval))) // Simple interval
                : Interval.semitones(interval) || 0;
             
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
                 const clefs = Array.from(attributes.getElementsByTagName('clef'));
                 let clefEl = clefs.find(c => c.getAttribute('number') === internalTargetStaff);
                 
                 // If no numbered clef found
                 if (!clefEl && internalTargetStaff === '1') {
                     clefEl = clefs.find(c => !c.hasAttribute('number'));
                 }
                 
                 // If still not found, we create it
                 if (!clefEl) {
                     clefEl = doc.createElement('clef');
                     clefEl.setAttribute('number', internalTargetStaff);
                     attributes.appendChild(clefEl);
                 }
                 
                 // Update sign/line
                 let sign = 'G';
                 let line = '2';
                 
                 if (targetClef === 'bass') { sign = 'F'; line = '4'; }
                 else if (targetClef === 'alto') { sign = 'C'; line = '3'; }
                 else if (targetClef === 'tenor') { sign = 'C'; line = '4'; }
                 else if (targetClef === 'treble') { sign = 'G'; line = '2'; }
                 
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
            
            if (noteStaff !== internalTargetStaff) return;

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
