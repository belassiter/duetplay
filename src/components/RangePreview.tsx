import React, { useEffect, useMemo, useRef } from 'react';
import { getPartRange } from '../utils/scoreAnalysis';
import VexFlow from 'vexflow';

interface RangePreviewProps {
    xmlString: string;
    staffId: string;
    clef?: string;
    label: string;
}

const RangePreview: React.FC<RangePreviewProps> = ({ xmlString, staffId, clef = 'treble', label }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const range = useMemo(() => {
        if (!xmlString) return null;
        return getPartRange(xmlString, staffId);
    }, [xmlString, staffId]);

    const rangeText = range ? `${range.min} - ${range.max}` : 'N/A';

    useEffect(() => {
        if (!containerRef.current || !range) return;

        // Clear previous
        containerRef.current.innerHTML = '';

        // Safe VexFlow Initialization (Explicit API)
        // VexFlow 5 exports everything flat or via VexFlow object 
        const VF = VexFlow;
        const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);
        
        // Size
        renderer.resize(200, 160);
        const context = renderer.getContext();
        context.scale(0.8, 0.8);

        // Stave
        // x=0, y=30, width=250 (Scaled space)
        const stave = new VF.Stave(0, 30, 250);
        stave.addClef(clef);
        stave.setContext(context).draw();

        // Convert scientific notation (C#5) to VexFlow keys (c#/5)
        const toVexKey = (noteStr: string) => {
            const match = noteStr.match(/^([A-Ga-g])(.*?)([0-9]+)$/);
            if (!match) return 'c/4';
            const step = match[1].toLowerCase();
            const acc = match[2];
            const oct = match[3];
            return `${step}${acc}/${oct}`;
        };

        const key1 = toVexKey(range.min);
        const key2 = toVexKey(range.max);

        // Helper to Check for Accidentals
        // VexFlow 5 StaveNote requires explicit accidental modifier attachment
        const createNote = (key: string) => {
            // key is like "c#/5"

            const note = new VF.StaveNote({ 
                keys: [key], 
                duration: "h",
                clef: clef 
            });

            // Check if accidental is needed
            // The key format is "c#/5". "c#" needs accidental.
            // But VexFlow keys are "c/5", "c#/5". StaveNote parses this.
            // HOWEVER, we must explicitly .addModifier(new VF.Accidental(...)) 
            // StaveNote does NOT auto-add accidentals just from keys!
            
            // Parse accidental from key string
            // key: "c#/5" -> noteName: "c", acc: "#"
            const notePart = key.split('/')[0];
            if (notePart.length > 1) {
                const acc = notePart.substring(1);
                 note.addModifier(new VF.Accidental(acc));
            }
            return note;
        };

        const notes = [
            createNote(key1),
            createNote(key2)
        ];

        // Voice
        const voice = new VF.Voice({ numBeats: 4, beatValue: 4 });
        voice.addTickables(notes);
        voice.setStrict(false); // Relax validation

        // Format and Draw
        new VF.Formatter().joinVoices([voice]).format([voice], 150);
        voice.draw(context, stave);

    }, [range, clef]);

    return (
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px' }}>{label} Range: {rangeText}</div>
            {range && (
                <div 
                    ref={containerRef}
                    style={{ 
                        border: '1px solid #ddd', 
                        borderRadius: '4px', 
                        padding: '4px',
                        background: 'white',
                        textAlign: 'left',
                        height: '140px',
                        overflow: 'hidden',
                        display: 'block'
                    }} 
                />
            )}
        </div>
    );
};

export default RangePreview;
