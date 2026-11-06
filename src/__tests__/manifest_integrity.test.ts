import { describe, it, expect } from 'vitest';
import { instruments } from '../constants/instruments';
import fs from 'fs';
import path from 'path';

function mapInstrumentNameToValue(name: string): string {
    if (!name) return 'none';
    const cleanName = name.replace(/\s*\([^)]*\)/g, '').replace(/\s*\d+$/, '').trim().toLowerCase();
    
    let inst = instruments.find(i => i.value.toLowerCase() === cleanName);
    if (inst) return inst.value;

    inst = instruments.find(i => i.name.toLowerCase() === cleanName);
    if (inst) return inst.value;

    inst = instruments.find(i => i.aliases && i.aliases.some(a => a.toLowerCase() === cleanName));
    if (inst) return inst.value;

    return 'none';
}

describe('Manifest Integrity & Instrument Resolution', () => {
    const quartetManifestPath = path.resolve(__dirname, '../../public/quartet-songs.json');
    const duetManifestPath = path.resolve(__dirname, '../../public_duet/songs.json');

    it('resolves every instrument in quartet-songs.json to a valid instrument in instruments.ts', () => {
        expect(fs.existsSync(quartetManifestPath)).toBe(true);
        const quartetSongs = JSON.parse(fs.readFileSync(quartetManifestPath, 'utf-8'));
        expect(quartetSongs.length).toBeGreaterThan(0);

        const errors: string[] = [];

        for (const song of quartetSongs) {
            if (!song.instruments || song.instruments.length === 0) {
                errors.push(`${song.filename}: Missing instruments array`);
                continue;
            }

            song.instruments.forEach((instName: string, index: number) => {
                const resolved = mapInstrumentNameToValue(instName);
                if (resolved === 'none') {
                    errors.push(
                        `${song.filename} Part ${index + 1} ("${instName}") failed to resolve (returned 'none')`
                    );
                }
            });
        }

        expect(errors).toEqual([]);
    });

    it('resolves every instrument in duet public_duet/songs.json if present', () => {
        if (!fs.existsSync(duetManifestPath)) return;
        const duetSongs = JSON.parse(fs.readFileSync(duetManifestPath, 'utf-8'));

        const errors: string[] = [];
        for (const song of duetSongs) {
            if (!song.instruments || song.instruments.length === 0) continue;
            song.instruments.forEach((instName: string, index: number) => {
                const resolved = mapInstrumentNameToValue(instName);
                if (resolved === 'none') {
                    errors.push(
                        `${song.filename} Part ${index + 1} ("${instName}") failed to resolve (returned 'none')`
                    );
                }
            });
        }

        expect(errors).toEqual([]);
    });

    it('cleans dates and years from composer names', async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { cleanComposer } = await import('../../scripts/generate-manifest.js');
        expect(cleanComposer('Wolfgang Amadeus Mozart (1772)')).toBe('Wolfgang Amadeus Mozart');
        expect(cleanComposer('Hugh Martin/Ralph Blane (1943)')).toBe('Hugh Martin/Ralph Blane');
        expect(cleanComposer('Traditional (16th century)')).toBe('Traditional');
    });

    it('cleans Arr. prefix and parenthetical dates from arranger names', async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const { cleanArranger } = await import('../../scripts/generate-manifest.js');
        expect(cleanArranger('Arr. Brian Einstein Lassiter')).toBe('Brian Einstein Lassiter');
        expect(cleanArranger('Arr. Tom Antles (12/1997)')).toBe('Tom Antles');
        expect(cleanArranger('Arranged by Albert Einstein Lassiter (1980)')).toBe('Albert Einstein Lassiter');
        expect(cleanArranger('Arr. Brent Edstrom\r\nAdapted by Brian Einstein Lassiter')).toBe(
            'Brent Edstrom\r\nAdapted by Brian Einstein Lassiter'
        );
    });
});
