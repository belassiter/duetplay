import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import useVerovio from '../hooks/useVerovio';
import userEvent from '@testing-library/user-event';

// Mock the hook AND the new util
vi.mock('../hooks/useVerovio');

describe('App Transpose', () => {
    const mockSetOptions = vi.fn();
    const mockLoadZipDataBuffer = vi.fn();
    const mockGetMEI = vi.fn().mockReturnValue('<mei>test</mei>');
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
                loadZipDataBuffer: mockLoadZipDataBuffer,
                getMEI: mockGetMEI,
                loadData: mockLoadData,
                renderToSVG: mockRenderToSVG
            }
        });
        
        // Mock fetch
        window.fetch = vi.fn().mockResolvedValue({
            // Mock a ZIP file structure for JSZip
            // Empty buffer fails JSZip... we need valid zip signature?
            // Or we mock JSZip?
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) 
        });
        
        // Mock JSZip
        vi.mock('jszip', () => {
             return {
                 default: class {
                     loadAsync() {
                         return Promise.resolve({
                             files: {
                                 'score.xml': {
                                     async: (_type: string) => '<score-partwise>...</score-partwise>'
                                 }
                             }
                         });
                     }
                 }
             }
        });
    });

    it('transposes when trumpet button is clicked', async () => {
        const user = userEvent.setup();
        render(<App />);
        
        // Wait for initial load
        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
        });

        // Click the trumpet button
        const trumpetButton = await screen.findByText(/Part 1 = Trumpet/i);
        await user.click(trumpetButton);

        // Expect loadData to be called (XML mode)
        await waitFor(() => {
             expect(mockLoadData).toHaveBeenCalled();
        });
        
        await screen.findByTestId('score-svg');
    });
});
