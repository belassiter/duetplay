import { Note, Key, Interval } from 'tonal';

const normalizeInterval = (interval: string): string => {
    // Handle user-friendly interval notation (e.g., "8va", "M6+8va")
    // Tonal may return 1P for unison
    if (interval === 'P1' || interval === '1P') return 'P1';

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

// Helper: Explode Grand Staff (1 Part, 2 Staves) into 2 Parts (1 Staff each)
// This standardizes the XML structure so that "Piano RH" and "Piano LH" are treated as distinct parts P1 and P2.
const explodeGrandStaff = (doc: Document): void => {
    const partElements = Array.from(doc.getElementsByTagName('part'));
    const scoreParts = Array.from(doc.getElementsByTagName('score-part'));

    // Check conditions: 1 Part, 1 Score Part, Multi-Staves
    if (partElements.length !== 1 || scoreParts.length !== 1) return;

    const originalPart = partElements[0];
    const originalScorePart = scoreParts[0];

    // Check Staves count
    const stavesEl = originalPart.getElementsByTagName('staves')[0];
    const stavesCount = stavesEl ? parseInt(stavesEl.textContent || '1') : 1;
    
    if (stavesCount <= 1) return;

    // --- EXECUTE EXPLOSION ---
    
    // 1. Create New Part IDs
    const idBase = originalPart.getAttribute('id') || 'P1';
    const id1 = `${idBase}-Staff1`;
    const id2 = `${idBase}-Staff2`;

    // 2. Clone Score Parts (Metadata)
    const scorePart1 = originalScorePart.cloneNode(true) as Element;
    scorePart1.setAttribute('id', id1);
    const name1 = scorePart1.getElementsByTagName('part-name')[0];
    if (name1) name1.textContent = (name1.textContent || '') + ' (High)';

    const scorePart2 = originalScorePart.cloneNode(true) as Element;
    scorePart2.setAttribute('id', id2);
    const name2 = scorePart2.getElementsByTagName('part-name')[0];
    if (name2) name2.textContent = (name2.textContent || '') + ' (Low)';

    // Update <part-list>
    originalScorePart.parentElement?.insertBefore(scorePart1, originalScorePart);
    originalScorePart.parentElement?.insertBefore(scorePart2, originalScorePart);
    originalScorePart.remove(); // Remove original "Piano" definition

    // 3. Create New Parts (Content)
    // We clone the original part twice, then filter down to the specific staff for each.
    
    // --- Helper to Filter a Part to a Single Staff ---
    const filterToStaff = (part: Element, targetStaff: number) => {
        // Set staves to 1
        const sEl = part.getElementsByTagName('staves')[0];
        if (sEl) sEl.textContent = '1';

        const measures = Array.from(part.getElementsByTagName('measure'));
        measures.forEach(measure => {
             // Remove explicitly other-staff notes
             const notes = Array.from(measure.getElementsByTagName('note'));
             notes.forEach(note => {
                 const staff = note.getElementsByTagName('staff')[0];
                 const staffNum = staff ? parseInt(staff.textContent || '1') : 1;
                 
                 // If default (no staff tag), assume it belongs to Staff 1
                 // So if we want Staff 2, we remove notes without tag (assuming they are Staff 1)
                 // NOTE: This is heuristic.
                 const effectiveStaff = staff ? staffNum : 1;

                 if (effectiveStaff !== targetStaff) {
                     note.remove();
                 } else {
                     // Normalize staff tag to 1
                     if (staff) staff.textContent = '1';
                 }
             });

             // Attributes / Clefs
             const attributes = Array.from(measure.getElementsByTagName('attributes'));
             attributes.forEach(attr => {
                 const clefs = Array.from(attr.getElementsByTagName('clef'));
                 
                 // Remove clefs not for this staff
                 clefs.forEach(clef => {
                     const num = clef.getAttribute('number');
                     const numInt = num ? parseInt(num) : 1;
                     if (numInt !== targetStaff) {
                         clef.remove();
                     } else {
                         clef.setAttribute('number', '1');
                     }
                 });
                 // If no clef left, maybe we should've kept one? 
                 // Usually attributes has multiple children.
             });
             
             // Remove Backups/Forwards (Linearize)
             Array.from(measure.getElementsByTagName('backup')).forEach(el => el.remove());
             Array.from(measure.getElementsByTagName('forward')).forEach(el => el.remove());
             
             // Remove Directions (Dynamics etc) not for this staff
              const directions = Array.from(measure.getElementsByTagName('direction'));
              directions.forEach(dir => {
                    const staff = dir.getElementsByTagName('staff')[0];
                    if (staff) {
                         if (parseInt(staff.textContent || '1') !== targetStaff) {
                             dir.remove();
                         } else {
                             staff.textContent = '1';
                         }
                    } else {
                        // If no staff, it's ambiguous. Keep it usually? 
                        // Or assume Staff 1. 
                        // For now, keep.
                    }
              });
        });
    };

    const part1 = originalPart.cloneNode(true) as Element;
    part1.setAttribute('id', id1);
    filterToStaff(part1, 1);

    const part2 = originalPart.cloneNode(true) as Element;
    part2.setAttribute('id', id2);
    filterToStaff(part2, 2);

    // Inject New Parts
    originalPart.parentElement?.insertBefore(part1, originalPart);
    originalPart.parentElement?.insertBefore(part2, originalPart);
    originalPart.remove();
};

export const transposeMusicXML = (
    xmlString: string, 
    targetTranspose: string, 
    targetClef?: string, 
    targetStaff: string = '1',
    sourceTranspose: string = 'P1',
    targetPartName?: string,
    additionalSemitones: number = 0
): string => {
    // ... Interval Logic ...
    let interval = 'P1';
    if (targetTranspose !== sourceTranspose) {
        interval = getRelativeInterval(targetTranspose, sourceTranspose);
    } else {
        interval = normalizeInterval('P1');
    }

    if (additionalSemitones !== 0) {
        try {
            const extra = Interval.fromSemitones(additionalSemitones);
            const sum = Interval.add(interval, extra);
            if (sum) interval = sum;
        } catch (e) {
            console.warn("Error adding semitone shift", e);
        }
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    
    // --- STEP 0: NORMALIZE GRAND STAFF ---
    // If we detect a Grand Staff (Single Part, Multi Staves), we explode it into 2 separate parts.
    // This allows them to be targeted and labeled individually.
    explodeGrandStaff(doc);

    // DETERMINE TARGET PART vs STAFF
    const partElements = Array.from(doc.getElementsByTagName('part')); 
    
    let targetPart: Element | null = null;
    let internalTargetStaff = '1';

    if (partElements.length >= 2) {
        // Multi-Part Score (Standard or Exploded Grand Staff)
        // targetStaff refers to the Part Index in the UI (1, 2)
        const partIndex = parseInt(targetStaff) - 1;
        if (partIndex >= 0 && partIndex < partElements.length) {
            targetPart = partElements[partIndex];
        }
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

    // 4. Optimization: If Interval is P1 and no extra semitones, skip Notes and Key Modifictions
    // This preserves original XML structures (like explicit <transpose> tags) which might be critical for display.
    // Tonal.js might return '1P' or 'P1' for perfect unison.
    const isIdentityTransposition = (interval === 'P1' || interval === '1P') && additionalSemitones === 0;

    // Attribute: <attributes><key><fifths>...</fifths></key></attributes>
    // Note: <note><pitch><step>C</step><alter>1</alter><octave>4</octave></pitch></note>

    // 1. Transpose Key Signatures
    // MusicXML uses "fifths" (number of sharps/flats). -1 = 1 flat (F), 1 = 1 sharp (G).

    const keys = Array.from(part.getElementsByTagName('key'));

    // Determine Initial Target Key Root (for Note Accidental Context)
    // We default to the first key found, or C if none.
    // As we iterate measures properly, we should update this, but having a default prevents crashes.
    let sourceKeyRoot = 'C';
    let sourceKeyNode = keys.find(k => k.getAttribute('number') === internalTargetStaff);
    if (!sourceKeyNode) sourceKeyNode = keys.find(k => !k.hasAttribute('number'));
    if (!sourceKeyNode && keys.length > 0) sourceKeyNode = keys[0];

    if (sourceKeyNode) {
        const fifths = parseInt(sourceKeyNode.getElementsByTagName('fifths')[0]?.textContent || '0');
        sourceKeyRoot = Note.transposeFifths('C', fifths);
    }
    const targetKeyRoot = Note.transpose(sourceKeyRoot, interval);
    
    // Instead of calculating one target key for the whole piece,
    // we must iterate through EACH key change and transpose it individually relative to itself.
    // keys array contains all key signatures for the part.
    
    if (!isIdentityTransposition) {
    keys.forEach(key => {
        // Validation: Check if this key belongs to our target staff
        const keyNumber = key.getAttribute('number');


        // Logic A: Key is explicitly for OTHER staff -> Skip
        if (keyNumber && keyNumber !== internalTargetStaff) return;
        
        // Logic B: Key is Global (no number).
        // If we are targeting Staff 2, and key is global -> We must Split it
        // ONLY if the part actually has multiple staves. If it's a single staff part, global key applies to it.
        if (!keyNumber && partHasMultipleStaves) {
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
        if (key.getAttribute('number') === internalTargetStaff || (!key.hasAttribute('number') && internalTargetStaff === '1')) { 
             // 1. Get CURRENT fifths
             const currentFifthsStr = key.getElementsByTagName('fifths')[0]?.textContent || '0';
             const currentFifths = parseInt(currentFifthsStr);
             
             // 2. Determine CURRENT Root (e.g. 1 sharp -> G)
             const currentRoot = Note.transposeFifths('C', currentFifths);
             
             // 3. Transpose Root by Interval (e.g. G + M2 -> A)
             const targetRoot = Note.transpose(currentRoot, interval);
             
             // 4. Get NEW Fifths from New Root (e.g. A -> 3 sharps)
             let newFifths = Key.majorKey(targetRoot).alteration;
             
             // Enharmonic simplification for extreme keys
             // e.g. -8 (Fb Major) -> +4 (E Major)
             // e.g. +8 (G# Major) -> -4 (Ab Major)
             if (newFifths < -6) {
                 newFifths += 12;
             } else if (newFifths > 6) {
                 newFifths -= 12;
             }

             const fifthsEl = key.getElementsByTagName('fifths')[0];
             if (fifthsEl) fifthsEl.textContent = newFifths.toString();
        }
        
        // Inject <transpose> element to Attributes
        const attributes = key.parentElement;
        if (attributes && (key.getAttribute('number') === internalTargetStaff || (!key.hasAttribute('number') && internalTargetStaff === '1'))) {
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
             // If we transpose UP (e.g. for Trumpet), the sounding pitch is DOWN.
             const xmlChrom = -1 * (semitones || 0);
             const xmlDia = -1 * diaStep;

             // Create elements
             const chromaticEl = doc.createElement('chromatic');
             chromaticEl.textContent = xmlChrom.toString();
             
             const diatonicEl = doc.createElement('diatonic');
             diatonicEl.textContent = xmlDia.toString();

             transposeEl.appendChild(diatonicEl);
             transposeEl.appendChild(chromaticEl);

             // Octave Change?
             // Add logic if needed
        }
    });
    }

    // --- 1b. Update Clef if Requested ---
    if (targetClef) {
         // Because we might have skipped the Key Loop, we iterate Attributes for Clefs
         const attributesList = Array.from(part.getElementsByTagName('attributes'));
         attributesList.forEach(attributes => {
             // const attributes = key.parentElement; // OLD Logic relied on Key.
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
        }); // End Attributes Loop
    } // End Clef Update

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

    if (!isIdentityTransposition) {
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
    }

    return new XMLSerializer().serializeToString(doc);
};

export const isolatePart = (xmlString: string, partIndexToKeep: number): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    
    // Find all parts
    const partElements = Array.from(doc.getElementsByTagName('part'));
    const scoreParts = Array.from(doc.getElementsByTagName('score-part'));

    // --- GRAND STAFF LOGIC (Single Part with 2 Staves) ---
    // If there is only 1 part, but it has multiple staves, we treat partIndexToKeep as Staff Index (0=Staff 1, 1=Staff 2)
    if (partElements.length === 1 && scoreParts.length === 1) {
         const part = partElements[0];
         // Check if grand staff
         const stavesEl = part.getElementsByTagName('staves')[0];
         const stavesCount = stavesEl ? parseInt(stavesEl.textContent || '1') : 1;

         if (stavesCount > 1) {
             // We need to isolate a STAFF within the part
             // partIndexToKeep: 0 -> Keep Staff 1. 1 -> Keep Staff 2.
             const staffToKeep = partIndexToKeep + 1;
             
             if (staffToKeep > stavesCount || staffToKeep < 1) return xmlString;
             
             // 1. Update <staves> to 1
             stavesEl.textContent = '1';
             
             // 2. Remove Notes not on this staff
             // Also need to handle <backup> and <forward> because removing one staff's notes from a polyphonic measure messes up timing.
             // BUT, Grand Staff usually separates staves via <backup>.
             // Typical: [Staff 1 Notes] <backup> [Staff 2 Notes].
             
             const measures = Array.from(part.getElementsByTagName('measure'));
             
             measures.forEach(measure => {
                  // Strategy: 
                  // If keeping Staff 1: Remove <backup>, <forward>, and any note with staff=2.
                  // If keeping Staff 2: This is harder. We need to remove Staff 1 notes, AND remove the <backup> that rewinds for Staff 2.
                  // Basically:
                  // Staff 1 Notes -> Remove
                  // <backup> -> Remove
                  // Staff 2 Notes -> Keep (and set staff=1)
                  
                  // Helper: identify elements by expected staff context
                  // MusicXML is sequential. "Voice" tracks cursor.
                  // This is complex to do perfectly without a full parser.
                  
                  // AGGRESSIVE APPROACH:
                  // Just remove explicitly tagged elements.
                  
                  const notes = Array.from(measure.getElementsByTagName('note'));
                  notes.forEach(note => {
                      const staff = note.getElementsByTagName('staff')[0];
                      if (staff) {
                          const staffNum = parseInt(staff.textContent || '1');
                          if (staffNum !== staffToKeep) {
                              note.remove();
                          } else {
                              // Relocate to Staff 1
                              staff.textContent = '1';
                          }
                      } else {
                          // No staff tag usually implies Staff 1. Use caution.
                          if (staffToKeep !== 1) {
                               // If we want Staff 2, and this note has no staff tag (defaults to 1), remove it.
                               note.remove();
                          }
                      }
                  });
                  
                  // Remove Clefs for other staves
                  const attributes = measure.getElementsByTagName('attributes');
                  Array.from(attributes).forEach(attr => {
                      const clefs = Array.from(attr.getElementsByTagName('clef'));
                      clefs.forEach(clef => {
                          const num = clef.getAttribute('number');
                          if (num && parseInt(num) !== staffToKeep) {
                              clef.remove();
                          } else if (num) {
                              // Renumber to 1
                              clef.setAttribute('number', '1');
                          }
                      });
                  });
                  
                  // Direction / Dynamics?
                  // Often have <staff> tag too. 
                  const directions = Array.from(measure.getElementsByTagName('direction'));
                  directions.forEach(dir => {
                        const staff = dir.getElementsByTagName('staff')[0];
                        if (staff) {
                             if (parseInt(staff.textContent || '1') !== staffToKeep) {
                                 dir.remove();
                             } else {
                                 staff.textContent = '1';
                             }
                        }
                  });
                  
                  
                  // CRITICAL: TIMING FIX
                  // If we simply remove notes, we might break the timeline if the removed notes were the "primary" timeline 
                  // and the kept notes were on a "backup" timeline.
                  
                  // If Keeping Staff 1:
                  // We remove Staff 2. Staff 2 was likely after a <backup>. 
                  // So we should remove the <backup> too.
                  
                  // If Keeping Staff 2:
                  // We remove Staff 1. Staff 1 was likely FIRST.
                  // If we remove Staff 1, we must ALSO remove the <backup> that followed it (which was meant to rewind).
                  // Because now Staff 2 IS the first thing.
                  
                  // Conclusion: In a standard Grand Staff, simply removing ALL <backup> and <forward> tags 
                  // usually linearizes the remaining staff correctly, assuming each staff sums to the full measure duration.
                  
                  const backups = Array.from(measure.getElementsByTagName('backup'));
                  backups.forEach(el => el.remove());
                  
                  const forwards = Array.from(measure.getElementsByTagName('forward'));
                  forwards.forEach(el => el.remove());
             });
             
             const serializer = new XMLSerializer();
             return serializer.serializeToString(doc);
         }
    }

    // --- STANDARD MULTI-PART LOGIC ---
    if (partIndexToKeep < 0 || partIndexToKeep >= partElements.length) return xmlString;

    const keptPartId = partElements[partIndexToKeep].getAttribute('id');
    
    // Remove unwanted <part> elements from the DOM
    partElements.forEach((el, index) => {
        if (index !== partIndexToKeep) {
            el.remove();
        }
    });

    // Remove unwanted <score-part> definitions
    // Note: score-part ID might not match part ID exactly (usually P1 matches P1, but good to be safe)
    // Actually, in MusicXML, <part id="P1"> refers to <score-part id="P1">. They MUST match.
    scoreParts.forEach(el => {
        if (el.getAttribute('id') !== keptPartId) {
            el.remove();
        }
    });
    
    // Also remove part-groups which might reference removed parts
    const partGroups = Array.from(doc.getElementsByTagName('part-group'));
    partGroups.forEach(el => el.remove());
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
};
