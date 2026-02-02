import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import useVerovio from '../hooks/useVerovio';
import userEvent from '@testing-library/user-event';

// Mock the hook
vi.mock('../hooks/useVerovio');

// Mock Data
vi.mock('../data/songs.json', () => ({
    default: [
        {
            id: 'test_song',
            filename: 'test.mxl',
            title: 'Test Song',
            instruments: ['Flute', 'Violin'], // Distinct defaults
            style: 'Test',
            difficulty: 'Easy'
        }
    ]
}));

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

describe('App Transpose', () => {
    const mockSetOptions = vi.fn();
    const mockLoadData = vi.fn();
    const mockRenderToSVG = vi.fn().mockReturnValue('<svg data-testid="score-svg"></svg>');

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (useVerovio as any).mockReturnValue({
            loading: false,
            verovioToolkit: {
                setOptions: mockSetOptions,
                loadData: mockLoadData,
                renderToSVG: mockRenderToSVG
            }
        });
        
        // Mock fetch
        window.fetch = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
        });
    });

    it('transposes when instrument is selected', async () => {
        const user = userEvent.setup();
        render(<App />);
        
        // Wait for initial load
        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
            expect(mockLoadData).toHaveBeenCalled();
        });

        // 1. Open the Side Panel
        const selectButton = screen.getByRole('button', { name: /Select Instruments/i });
        await user.click(selectButton);

        // 2. Select Instrument
        // Default in mock is "Flute" for Part 1.
        // We look for the display text which might be in the selector.
        // The InstrumentSelector component shows just the name.
        const triggers = screen.getAllByText('Flute');
        const part1Trigger = triggers[0]; 
        await user.click(part1Trigger);

        // 3. Search for "Trumpet"
        const searchInput = screen.getByPlaceholderText('Search instruments...');
        await user.type(searchInput, 'Trumpet');

        // 4. Click result "Bb Trumpet"
        const trumpetOption = await screen.findByText("Bb Trumpet (sounds -M2, treble clef)");
        await user.click(trumpetOption);

        // 5. Expect loadData to be called with updated XML
        // It might be called multiple times, we just want to ensure it was called eventually
        await waitFor(() => {
            expect(mockLoadData.mock.calls.length).toBeGreaterThan(1);
        });
        
        await screen.findByTestId('score-svg');
    });
});
