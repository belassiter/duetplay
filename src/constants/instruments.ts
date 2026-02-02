export interface Instrument {
    name: string;
    value: string;
    transpose: string;
    clef: string;
    label: string;
    range?: [string, string];
    family?: string;
    aliases?: string[];
}

export const instruments: Instrument[] = [
    { name: 'None', label: 'None', value: 'none', transpose: 'P1', clef: 'treble' },
    { name: 'Piano RH', label: 'Piano RH', value: 'piano_rh', transpose: 'P1', clef: 'treble' },
    { name: 'Piano LH', label: 'Piano LH', value: 'piano_lh', transpose: 'P1', clef: 'bass' },
    { name: 'Piccolo', label: 'Piccolo (sounds +8va, treble clef)', value: 'piccolo', transpose: '-8va', clef: 'treble' },
    { name: 'Flute', label: 'Flute', value: 'flute', transpose: 'P1', clef: 'treble' },
    { name: 'Alto Flute', label: 'Alto Flute (sounds -P4, treble clef)', value: 'alto_flute', transpose: 'P4', clef: 'treble' },
    { name: 'Bass Flute', label: 'Bass Flute (sounds -8va, treble clef)', value: 'bass_flute', transpose: 'P8', clef: 'treble' },
    { name: 'Eb Clarinet', label: 'Eb Clarinet (sounds +m3, treble clef)', value: 'eb_clarinet', transpose: '-m3', clef: 'treble' },
    { name: 'Bb Clarinet', label: 'Bb Clarinet (sounds -M2, treble clef)', value: 'bb_clarinet', transpose: 'M2', clef: 'treble', aliases: ['Clarinet'] },
    { name: 'A Clarinet', label: 'A Clarinet (sounds -m3, treble clef)', value: 'a_clarinet', transpose: 'm3', clef: 'treble' },
    { name: 'Bass Clarinet', label: 'Bass Clarinet (sounds -M9, treble clef)', value: 'bass_clarinet', transpose: 'M9', clef: 'treble' },
    { name: 'Contra-alto Clarinet', label: 'Contra-alto Clarinet (sounds -M6-8va, treble clef)', value: 'contra_alto_clarinet', transpose: 'M6+8va', clef: 'treble' },
    { name: 'Contrabass Clarinet', label: 'Contrabass Clarinet (sounds -M9-8va, treble clef)', value: 'contrabass_clarinet', transpose: 'M9+8va', clef: 'treble' },
    { name: 'Oboe', label: 'Oboe', value: 'oboe', transpose: 'P1', clef: 'treble' },
    { name: 'English Horn', label: 'English Horn (sounds -P5, treble clef)', value: 'english_horn', transpose: 'P5', clef: 'treble' },
    { name: 'Bassoon', label: 'Bassoon', value: 'bassoon', transpose: 'P1', clef: 'bass' },
    { name: 'Contrabassoon', label: 'Contrabassoon (sounds -8va, bass clef)', value: 'contrabassoon', transpose: 'P8', clef: 'bass' },
    { name: 'Soprano Sax', label: 'Soprano Sax (sounds -M2, treble clef)', value: 'soprano_sax', transpose: 'M2', clef: 'treble' },
    { name: 'Alto Sax', label: 'Alto Sax (sounds -M6, treble clef)', value: 'alto_sax', transpose: 'M6', clef: 'treble' },
    { name: 'Tenor Sax', label: 'Tenor Sax (sounds -M9, treble clef)', value: 'tenor_sax', transpose: 'M9', clef: 'treble' },
    { name: 'Bari Sax', label: 'Bari Sax (sounds -M13, treble clef)', value: 'bari_sax', transpose: 'M6+8va', clef: 'treble' }, // M13 is M6+8va
    { name: 'Bass Sax', label: 'Bass Sax (sounds -M16, treble clef)', value: 'bass_sax', transpose: 'M9+8va', clef: 'treble' },
    { name: 'C Trumpet', label: 'C Trumpet', value: 'c_trumpet', transpose: 'P1', clef: 'treble' },
    { name: 'Bb Trumpet', label: 'Bb Trumpet (sounds -M2, treble clef)', value: 'bb_trumpet', transpose: 'M2', clef: 'treble', aliases: ['Trumpet'] },
    { name: 'Horn in F', label: 'Horn in F (sounds -P5, treble clef)', value: 'horn_f', transpose: 'P5', clef: 'treble' },
    { name: 'Trombone', label: 'Trombone', value: 'trombone', transpose: 'P1', clef: 'bass' },
    { name: 'Bass Trombone', label: 'Bass Trombone', value: 'bass_trombone', transpose: 'P1', clef: 'bass' },
    { name: 'Tuba', label: 'Tuba', value: 'tuba', transpose: 'P1', clef: 'bass' },
    { name: 'Violin', label: 'Violin', value: 'violin', transpose: 'P1', clef: 'treble' },
    { name: 'Viola', label: 'Viola (alto clef)', value: 'viola', transpose: 'P1', clef: 'alto' },
    { name: 'Cello', label: 'Cello (bass clef)', value: 'cello', transpose: 'P1', clef: 'bass' },
    { name: 'Contrabass', label: 'Contrabass (sounds -8va, bass clef)', value: 'contrabass', transpose: 'P8', clef: 'bass' },
    { name: 'Vibraphone', label: 'Vibraphone', value: 'vibraphone', transpose: 'P1', clef: 'treble' },
    { name: 'Marimba', label: 'Marimba', value: 'marimba', transpose: 'P1', clef: 'treble' },
    { name: 'Glockenspiel', label: 'Glockenspiel (sounds +15ma, treble clef)', value: 'glockenspiel', transpose: '-15ma', clef: 'treble' }
];
