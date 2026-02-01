import { Note, Key } from 'tonal';

export const transposeMusicXML = (xmlString: string, interval: string): string => {
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
    
    // We assume the first key found sets the context for the whole part (simplification).
    if (keys.length > 0) {
        const fifths = parseInt(keys[0].getElementsByTagName('fifths')[0]?.textContent || '0');
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
        // If key already has number="2", skip it (it's already specific to staff 2)
        if (key.getAttribute('number') === '2') return;

        // If key has number="1", update it.
        // If key has NO number, it's global. We need to split it.
        // But simply updating it makes it apply to BOTH (if global).
        // Solution: Make it specific to Staff 1.
        
        // If Global (no number), we need to Preserve Original Key for Staff 2
        if (!key.hasAttribute('number')) {
            // Clone the key to create the Staff 2 version (Original)
            const staff2Key = key.cloneNode(true) as Element;
            staff2Key.setAttribute('number', '2');
            
            // Insert it after the current key
            key.insertAdjacentElement('afterend', staff2Key);
            
            // Convert current key to Staff 1
            key.setAttribute('number', '1');
        }
        
        // Now update the Key (which is comfortably number="1" or was global and now "1")
        if (key.getAttribute('number') === '1' || !key.hasAttribute('number')) { // Redundant check but safe
             const newFifths = Key.majorKey(targetKeyRoot).alteration;
             const fifthsEl = key.getElementsByTagName('fifths')[0];
             if (fifthsEl) fifthsEl.textContent = newFifths.toString();
        }
        
        // Inject <transpose> element to Attributes
        // Only if it's the first key (simplification) or if we are iterating attributes.
        // Wait, 'keys' iteration is local. We need access to the parent <attributes>.
        const attributes = key.parentElement;
        if (attributes && (key.getAttribute('number') === '1' || !key.hasAttribute('number'))) {
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
             
             const diatonicEl = doc.createElement('diatonic');
             diatonicEl.textContent = '-1'; // Fixed for Trumpet (Bb)
             const chromaticEl = doc.createElement('chromatic');
             chromaticEl.textContent = '-2';
             
             transposeEl.appendChild(diatonicEl);
             transposeEl.appendChild(chromaticEl);
        }
    });

    // 2. Transpose Notes
    const notes = Array.from(part.getElementsByTagName('note'));
    
    notes.forEach(note => {
        // --- STAFF CHECK ---
        // If this note belongs to Staff 2 (Piano LH), we skip it!
        // <note> ... <staff>2</staff> ... </note>
        const staffEl = note.getElementsByTagName('staff')[0];
        if (staffEl && staffEl.textContent === '2') return;

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
        // alter 1 -> #, -1 -> b
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
        // Note.pitchClass("F#4") -> "F#"
        const dstPC = Note.pitchClass(dstPitch);
        const dstStep = dstPC.charAt(0);
        const dstAccidStr = dstPC.slice(1);
        // Robust octave extraction:
        const octaveMatch = dstPitch.match(/\d+$/);
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
        // This is crucial for display (e.g. forcing a natural or sharp when the key implies otherwise)
        const getKeyAlteration = (keyRoot: string, step: string): string => { 
             const scale = Key.majorKey(keyRoot).scale;
             const match = scale.find(n => n.startsWith(step));
             // For Chromatic notes not in scale, we might get undefined match
             if (!match) return ''; // Assume natural
             return match.slice(1);
        };

        const targetKeyAlt = getKeyAlteration(targetKeyRoot, dstStep);
        let neededAccid = '';
        
        // dstAccidStr is '#', 'b', etc from Tonal
        // targetKeyAlt is '#', 'b', etc from Key Sig
        
        if (dstAccidStr !== targetKeyAlt) {
             // We need an explicit accidental
             if (dstAccidStr === '') neededAccid = 'natural';
             else if (dstAccidStr === '#') neededAccid = 'sharp';
             else if (dstAccidStr === 'b') neededAccid = 'flat';
             else if (dstAccidStr === '##') neededAccid = 'double-sharp';
             else if (dstAccidStr === 'bb') neededAccid = 'flat-flat';
        }

        let accidEl = note.getElementsByTagName('accidental')[0];
        
        if (neededAccid) {
            if (!accidEl) {
                accidEl = doc.createElement('accidental');
                note.appendChild(accidEl); 
                
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

    return new XMLSerializer().serializeToString(doc);
};

