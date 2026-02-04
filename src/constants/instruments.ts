export interface InstrumentRange {
    easyLow: string;
    easyHigh: string;
    hardLow: string;
    hardHigh: string;
}

export interface Instrument {
    name: string;
    value: string;
    transpose: string;
    clef: string;
    label: string;
    range?: [string, string]; // Deprecated or for display? Keeping for now if used elsewhere, but maybe user meant the new object.
    instrumentRange?: InstrumentRange;
    family?: string;
    aliases?: string[];
}

export const instruments: Instrument[] = [
    { name: 'None', label: 'None', value: 'none', transpose: 'P1', clef: 'treble' },
    { name: 'Piano RH', label: 'Piano RH', value: 'piano_rh', transpose: 'P1', clef: 'treble', instrumentRange: { easyLow: 'A0', easyHigh: 'C8', hardLow: 'A0', hardHigh: 'C8' } },
    { name: 'Piano LH', label: 'Piano LH', value: 'piano_lh', transpose: 'P1', clef: 'bass', instrumentRange: { easyLow: 'A0', easyHigh: 'C8', hardLow: 'A0', hardHigh: 'C8' } },
    { 
        name: 'Piccolo', 
        label: 'Piccolo (sounds +8va, treble clef)', 
        value: 'piccolo', 
        transpose: '-8va', 
        clef: 'treble',
        instrumentRange: { easyLow: 'D4', easyHigh: 'G6', hardLow: 'C4', hardHigh: 'C7' }
    },
    { 
        name: 'Flute', 
        label: 'Flute', 
        value: 'flute', 
        transpose: 'P1', 
        clef: 'treble',
        instrumentRange: { easyLow: 'F4', easyHigh: 'G6', hardLow: 'C4', hardHigh: 'D7' }
    },
    { name: 'Alto Flute', label: 'Alto Flute (sounds -P4, treble clef)', value: 'alto_flute', transpose: 'P4', clef: 'treble', instrumentRange: { easyLow: 'C4', easyHigh: 'C7', hardLow: 'C4', hardHigh: 'C7' } },
    { name: 'Bass Flute', label: 'Bass Flute (sounds -8va, treble clef)', value: 'bass_flute', transpose: 'P8', clef: 'treble', instrumentRange: { easyLow: 'C4', easyHigh: 'C7', hardLow: 'C4', hardHigh: 'C7' } },
    { name: 'Eb Clarinet', label: 'Eb Clarinet (sounds +m3, treble clef)', value: 'eb_clarinet', transpose: '-m3', clef: 'treble', instrumentRange: { easyLow: 'E3', easyHigh: 'G6', hardLow: 'E3', hardHigh: 'A6' } },
    { 
        name: 'Bb Clarinet', 
        label: 'Bb Clarinet (sounds -M2, treble clef)', 
        value: 'bb_clarinet', 
        transpose: 'M2', 
        clef: 'treble', 
        aliases: ['Clarinet','B♭ Clarinet'],
        instrumentRange: { easyLow: 'E3', easyHigh: 'C6', hardLow: 'E3', hardHigh: 'G6' }
    },
    { name: 'A Clarinet', label: 'A Clarinet (sounds -m3, treble clef)', value: 'a_clarinet', transpose: 'm3', clef: 'treble', instrumentRange: { easyLow: 'E3', easyHigh: 'C6', hardLow: 'E3', hardHigh: 'G6' } },
    { name: 'Bass Clarinet', label: 'Bass Clarinet (sounds -M9, treble clef)', value: 'bass_clarinet', transpose: 'M9', clef: 'treble', instrumentRange: { easyLow: 'Eb3', easyHigh: 'G6', hardLow: 'C3', hardHigh: 'G6' } },
    { name: 'Contra-alto Clarinet', label: 'Contra-alto Clarinet (sounds -M6-8va, treble clef)', value: 'contra_alto_clarinet', transpose: 'M6+8va', clef: 'treble', instrumentRange: { easyLow: 'Eb3', easyHigh: 'G6', hardLow: 'Eb3', hardHigh: 'G6' } },
    { name: 'Contrabass Clarinet', label: 'Contrabass Clarinet (sounds -M9-8va, treble clef)', value: 'contrabass_clarinet', transpose: 'M9+8va', clef: 'treble', instrumentRange: { easyLow: 'Eb3', easyHigh: 'G6', hardLow: 'Eb3', hardHigh: 'G6' } },
    { name: 'Oboe', label: 'Oboe', value: 'oboe', transpose: 'P1', clef: 'treble', instrumentRange: { easyLow: 'D4', easyHigh: 'D6', hardLow: 'Bb3', hardHigh: 'G6' } },
    { name: 'English Horn', label: 'English Horn (sounds -P5, treble clef)', value: 'english_horn', transpose: 'P5', clef: 'treble', instrumentRange: { easyLow: 'B3', easyHigh: 'G6', hardLow: 'B3', hardHigh: 'G6' } },
    { name: 'Bassoon', label: 'Bassoon', value: 'bassoon', transpose: 'P1', clef: 'bass', instrumentRange: { easyLow: 'F2', easyHigh: 'G4', hardLow: 'Bb1', hardHigh: 'Eb5' } },
    { name: 'Contrabassoon', label: 'Contrabassoon (sounds -8va, bass clef)', value: 'contrabassoon', transpose: 'P8', clef: 'bass', instrumentRange: { easyLow: 'Bb1', easyHigh: 'Bb4', hardLow: 'Bb1', hardHigh: 'Bb4' } },
    { 
        name: 'Soprano Sax', 
        label: 'Soprano Sax (sounds -M2, treble clef)', 
        value: 'soprano_sax', 
        transpose: 'M2', 
        clef: 'treble',
        instrumentRange: { easyLow: 'D4', easyHigh: 'D6', hardLow: 'Bb3', hardHigh: 'F#6' }
    },
    { 
        name: 'Alto Sax', 
        label: 'Alto Sax (sounds -M6, treble clef)', 
        value: 'alto_sax', 
        transpose: 'M6', 
        clef: 'treble',
        instrumentRange: { easyLow: 'D4', easyHigh: 'D6', hardLow: 'Bb3', hardHigh: 'F#6' }
    },
    { name: 'Tenor Sax', label: 'Tenor Sax (sounds -M9, treble clef)', value: 'tenor_sax', transpose: 'M9', clef: 'treble', instrumentRange: { easyLow: 'D4', easyHigh: 'D6', hardLow: 'Bb3', hardHigh: 'F#6' } },
    { name: 'Bari Sax', label: 'Bari Sax (sounds -M13, treble clef)', value: 'bari_sax', transpose: 'M6+8va', clef: 'treble', aliases: ['Baritone Sax'], instrumentRange: { easyLow: 'D4', easyHigh: 'D6', hardLow: 'A3', hardHigh: 'F#6' } }, // M13 is M6+8va
    { name: 'Bass Sax', label: 'Bass Sax (sounds -M16, treble clef)', value: 'bass_sax', transpose: 'M9+8va', clef: 'treble', instrumentRange: { easyLow: 'D4', easyHigh: 'D6', hardLow: 'Bb3', hardHigh: 'F#6' } },
    { name: 'C Trumpet', label: 'C Trumpet', value: 'c_trumpet', transpose: 'P1', clef: 'treble', instrumentRange: { easyLow: 'C4', easyHigh: 'G5', hardLow: 'F#3', hardHigh: 'C6' } },
    { 
        name: 'Bb Trumpet', 
        label: 'Bb Trumpet (sounds -M2, treble clef)', 
        value: 'bb_trumpet', 
        transpose: 'M2', 
        clef: 'treble', 
        aliases: ['Trumpet','B♭ Trumpet'],
        instrumentRange: { easyLow: 'C4', easyHigh: 'G5', hardLow: 'F#3', hardHigh: 'C6' }
    },
    { name: 'Horn in F', label: 'Horn in F (sounds -P5, treble clef)', value: 'horn_f', transpose: 'P5', clef: 'treble', instrumentRange: { easyLow: 'C3', easyHigh: 'E5', hardLow: 'F2', hardHigh: 'C6' } },
    { name: 'Euphonium', label: 'Euphonium (bass clef)', value: 'euphonium', transpose: 'P1', clef: 'bass', aliases: ['Baritone BC', 'Baritone Bass Clef'], instrumentRange: { easyLow: 'Bb2', easyHigh: 'F4', hardLow: 'E2', hardHigh: 'Bb4' } },
    { name: 'Baritone', label: 'Baritone (sounds -M9, treble clef)', value: 'baritone', transpose: 'M9', clef: 'treble', aliases: ['Baritone', 'Baritone TC'], instrumentRange: { easyLow: 'C4', easyHigh: 'G5', hardLow: 'F#3', hardHigh: 'C6' } },
    { name: 'Trombone', label: 'Trombone', value: 'trombone', transpose: 'P1', clef: 'bass', instrumentRange: { easyLow: 'Bb2', easyHigh: 'F4', hardLow: 'E2', hardHigh: 'Bb4' } },
    { name: 'Bass Trombone', label: 'Bass Trombone', value: 'bass_trombone', transpose: 'P1', clef: 'bass', instrumentRange: { easyLow: 'Bb1', easyHigh: 'F4', hardLow: 'E1', hardHigh: 'Bb4' } },
    { name: 'Tuba', label: 'Tuba', value: 'tuba', transpose: 'P1', clef: 'bass', instrumentRange: { easyLow: 'Bb1', easyHigh: 'F3', hardLow: 'E1', hardHigh: 'Bb3' } },
    { 
        name: 'Violin', 
        label: 'Violin', 
        value: 'violin', 
        transpose: 'P1', 
        clef: 'treble',
        instrumentRange: { easyLow: 'G3', easyHigh: 'B5', hardLow: 'G3', hardHigh: 'E7' }
    },
    { name: 'Viola', label: 'Viola (alto clef)', value: 'viola', transpose: 'P1', clef: 'alto', instrumentRange: { easyLow: 'C3', easyHigh: 'D5', hardLow: 'C3', hardHigh: 'A6' } },
    { 
        name: 'Cello', 
        label: 'Cello (bass clef)', 
        value: 'cello', 
        transpose: 'P1', 
        clef: 'bass',
        instrumentRange: { easyLow: 'C2', easyHigh: 'A3', hardLow: 'C2', hardHigh: 'E5' },
        aliases: ['Violoncello']
    },
    { name: 'Contrabass', label: 'Contrabass (sounds -8va, bass clef)', value: 'contrabass', transpose: 'P8', clef: 'bass', instrumentRange: { easyLow: 'E2', easyHigh: 'G3', hardLow: 'E1', hardHigh: 'C4' } },
    { name: 'Vibraphone', label: 'Vibraphone', value: 'vibraphone', transpose: 'P1', clef: 'treble', instrumentRange: { easyLow: 'F3', easyHigh: 'F6', hardLow: 'F3', hardHigh: 'F6' } },
    { name: 'Marimba', label: 'Marimba', value: 'marimba', transpose: 'P1', clef: 'treble', instrumentRange: { easyLow: 'C3', easyHigh: 'C7', hardLow: 'C2', hardHigh: 'C7' } },
    { name: 'Glockenspiel', label: 'Glockenspiel (sounds +15ma, treble clef)', value: 'glockenspiel', transpose: '-15ma', clef: 'treble', instrumentRange: { easyLow: 'G3', easyHigh: 'C6', hardLow: 'G3', hardHigh: 'C6' } },
    { name: 'Guitar', label: 'Guitar (sounds -8va, treble clef)', value: 'guitar', transpose: 'P8', clef: 'treble', instrumentRange: { easyLow: 'E3', easyHigh: 'G5', hardLow: 'E3', hardHigh: 'B6' } },
    { name: 'Tenor Clef', label: 'Tenor Clef', value: 'tenor_clef', transpose: 'P1', clef: 'tenor' }
];
