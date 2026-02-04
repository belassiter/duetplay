import React, { useEffect, useMemo, useRef } from 'react';
import { getPartRange } from '../utils/scoreAnalysis';
import VexFlow from 'vexflow';
import { instruments } from '../constants/instruments';

interface RangePreviewProps {
    xmlString: string;
    staffId: string;
    clef?: string;
    label: string;
    instrumentValue?: string; // To look up range limits
}

// Minimal helper to estimate MIDI number from scientific pitch (C4 = 60)
const pitchToMidi = (pitch: string): number => {
    // Basic mapping: C=0, D=2, E=4, F=5, G=7, A=9, B=11
    const notes: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
    
    // Parse: e.g. "C#4", "Bb3", "F4"
    const match = pitch.toLowerCase().match(/^([a-g])(.*?)([0-9]+)$/);
    if (!match) return 0;
    
    const [, name, acc, octStr] = match;
    const octave = parseInt(octStr, 10);
    
    let base = notes[name];
    if (acc === '#') base += 1;
    if (acc === 'b') base -= 1;
    if (acc === '##') base += 2;
    if (acc === 'bb') base -= 2;
    // VexFlow sometimes uses 'n' for natural, ignore or handle? Usually implicit.

    return base + (octave + 1) * 12;
};

// Colors - High Contrast Accessible Palette
const COLOR_EASY = '#0077BB'; // Blue (Accessible "Good")
const COLOR_HARD = '#EE7733'; // Orange (Accessible "Warning")
const COLOR_OUT = '#CC3311';  // Red/Vermilion (Accessible "Bad")

const RangePreview: React.FC<RangePreviewProps> = ({ xmlString, staffId, clef = 'treble', label, instrumentValue }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const range = useMemo(() => {
        if (!xmlString) return null;
        return getPartRange(xmlString, staffId);
    }, [xmlString, staffId]);

    // Calculate Colors
    const rangeAnalysis = useMemo(() => {
        if (!range || !instrumentValue) return { minColor: 'black', maxColor: 'black' };
        
        const inst = instruments.find(i => i.value === instrumentValue);
        if (!inst || !inst.instrumentRange) return { minColor: 'black', maxColor: 'black' };

        const r = inst.instrumentRange;
        const minMidi = pitchToMidi(range.min);
        const maxMidi = pitchToMidi(range.max);

        // Analyze Min
        let minColor = COLOR_OUT;
        if (minMidi >= pitchToMidi(r.easyLow) && minMidi <= pitchToMidi(r.easyHigh)) {
            minColor = COLOR_EASY;
        } else if (minMidi >= pitchToMidi(r.hardLow) && minMidi <= pitchToMidi(r.hardHigh)) {
            minColor = COLOR_HARD;
        }

        // Analyze Max
        let maxColor = COLOR_OUT;
        if (maxMidi >= pitchToMidi(r.easyLow) && maxMidi <= pitchToMidi(r.easyHigh)) {
            maxColor = COLOR_EASY;
        } else if (maxMidi >= pitchToMidi(r.hardLow) && maxMidi <= pitchToMidi(r.hardHigh)) {
            maxColor = COLOR_HARD;
        }

        return { minColor, maxColor };

    }, [range, instrumentValue]);

    useEffect(() => {
        if (!containerRef.current || !range) return;

        // Clear previous
        containerRef.current.innerHTML = '';

        // Safe VexFlow Initialization
        const VF = VexFlow;
        const renderer = new VF.Renderer(containerRef.current, VF.Renderer.Backends.SVG);
        
        renderer.resize(200, 160);
        const context = renderer.getContext();
        context.scale(0.8, 0.8);

        const stave = new VF.Stave(0, 30, 200);
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

        const createNote = (key: string, color: string) => {
            const note = new VF.StaveNote({ 
                keys: [key], 
                duration: "h",
                clef: clef 
            });

            const notePart = key.split('/')[0];
            if (notePart.length > 1) {
                const acc = notePart.substring(1);
                 note.addModifier(new VF.Accidental(acc));
            }
            
            // Apply Color
            note.setStyle({ fillStyle: color, strokeStyle: color });
            
            return note;
        };

        const notes = [
            createNote(key1, rangeAnalysis.minColor),
            createNote(key2, rangeAnalysis.maxColor)
        ];

        const voice = new VF.Voice({ numBeats: 4, beatValue: 4 });
        voice.addTickables(notes);
        voice.setStrict(false);

        new VF.Formatter().joinVoices([voice]).format([voice], 150);
        voice.draw(context, stave);

    }, [range, clef, rangeAnalysis]);

    if (!range) return null;

    return (
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px' }}>
                {label} Range: 
                <span style={{ color: rangeAnalysis.minColor, marginLeft: '4px' }}>{range.min}</span>
                <span style={{ color: '#666', margin: '0 4px' }}>-</span>
                <span style={{ color: rangeAnalysis.maxColor }}>{range.max}</span>
            </div>
            <div 
                ref={containerRef}
                style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    padding: '4px',
                    background: 'white',
                    textAlign: 'left',
                    height: '140px',
                    width: '180px',
                    overflow: 'hidden',
                    display: 'block'
                }} 
            />
        </div>
    );
};

export default RangePreview;
