export interface Song {
    id: string;
    filename: string;
    title: string;
    composer: string;
    arranger: string;
    instruments: string[];
    difficulty: string;
    style: string;
}

export interface PartState {
    id: number;
    instrument: string;
    originalInstrument: string;
    octave: number;
}
