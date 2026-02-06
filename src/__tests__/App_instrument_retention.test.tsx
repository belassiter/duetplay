import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import useVerovio from '../hooks/useVerovio';
import userEvent from '@testing-library/user-event';

// Mock the hook
vi.mock('../hooks/useVerovio');

// Mock JSZip
vi.mock('jszip', () => {
    return {
        default: class {
            loadAsync() {
                return Promise.resolve({
                    files: {
                        'score.xml': {
                            async: () => '<score-partwise><Measure><note>C4</note></Measure></score-partwise>'
                        }
                    }
                });
            }
        }
    }
});

describe('App Instrument Retention', () => {
    const mockSetOptions = vi.fn();
    const mockLoadData = vi.fn();
    const mockRenderToSVG = vi.fn().mockReturnValue('<svg data-testid="score-svg"></svg>');

    beforeEach(() => {
        vi.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (useVerovio as any).mockReturnValue({
            loading: false,
            verovioToolkit: {
                setOptions: mockSetOptions,
                loadData: mockLoadData,
                renderToSVG: mockRenderToSVG,
                redoLayout: vi.fn(),
            }
        });
        
        // Mock fetch with 2 songs using valid instrument values
        window.fetch = vi.fn().mockImplementation((url) => {
             if (typeof url === 'string' && url.endsWith('songs.json')) {
                 return Promise.resolve({
                     ok: true,
                     json: () => Promise.resolve([
                        { 
                            id: 'song1', 
                            title: 'First Song', 
                            filename: 'song1.mxl',
                            instruments: ['flute', 'violin'],
                            parts: [
                                { id: 1, name: "Part 1", instrument: "flute" },
                                { id: 2, name: "Part 2", instrument: "violin" }
                            ]
                        },
                        { 
                            id: 'song2', 
                            title: 'Second Song', 
                            filename: 'song2.mxl',
                            instruments: ['oboe', 'cello'],
                             parts: [
                                { id: 1, name: "Part 1", instrument: "oboe" },
                                { id: 2, name: "Part 2", instrument: "cello" }
                            ]
                        }
                     ])
                 });
             }
             return Promise.resolve({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
             });
        });
    });

    it('retains instrument ONLY if user selected it', async () => {
        const user = userEvent.setup();
        render(<App />);

        // Wait for Loading
        await waitFor(() => expect(screen.getByText('First Song')).toBeInTheDocument());

        // Initial State for Song 1: Flute, Violin.
        // User has NOT touched anything. isUserSelected should be false/undefined.
        
        // 1. Switch to Second Song immediately WITHOUT changing instruments
        const songButton = screen.getByTitle('Select Song');
        await user.click(songButton);
        const song2Element = await screen.findByText('Second Song');
        await user.click(song2Element);
        
        // 2. Verify Part 1 is 'Oboe' (Default for Song 2), NOT 'Flute' (from Song 1).
        // Because user didn't touch it.
        const instrumentButton = screen.getByTitle('Select Instruments');
        await user.click(instrumentButton);
        
        // Label should be "Part 1 (Orig: Oboe)"
        await screen.findByText(/Part 1 \(Orig: Oboe\)/);
        
        // Check Trigger Value. Should trigger be "Oboe"?
        // Find trigger text.
        // There should be a span with "Oboe" inside the panel.
        await waitFor(() => {
            const oboeTrigger = screen.queryByText('Oboe', { selector: 'span' });
            expect(oboeTrigger).toBeInTheDocument();
        });

        // 3. Now User Changes Part 1 to "Alto Sax"
        const oboeTrigger = screen.getByText('Oboe', { selector: 'span' });
        // Ensure it is clickable (part of the selector)
        if (!oboeTrigger.parentElement?.classList.contains('cursor-pointer')) {
             // Maybe we found the label or list item.
             // But let's assume getByText found the trigger.
        }
        await user.click(oboeTrigger);
        
        const altoOption = await screen.findByText(/Alto Sax/);
        await user.click(altoOption);
        
        // Now isUserSelected = true for Part 1.

        // 4. Switch back to First Song
        await user.click(songButton);
        const song1Element = await screen.findByText('First Song');
        await user.click(song1Element);
        
        // 5. Verify Part 1 is STILL "Alto Sax" (User Choice Retained)
        // Even though First Song default is Flute.
        await user.click(instrumentButton);
        await screen.findByText(/Part 1 \(Orig: Flute\)/); // Label reflects song original
        
        await waitFor(() => {
             const retainedTrigger = screen.queryByText('Alto Sax', { selector: 'span' });
             expect(retainedTrigger).toBeInTheDocument();
        });
        
        // 6. Verify Part 2 is "Violin" (Song 1 Default)
        // Because we never touched Part 2 in step 3.
        await waitFor(() => {
             const violinTrigger = screen.queryByText('Violin', { selector: 'span' });
             expect(violinTrigger).toBeInTheDocument();
        });
    });
});
