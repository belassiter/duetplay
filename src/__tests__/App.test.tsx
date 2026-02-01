import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import useVerovio from '../hooks/useVerovio';

// Mock the hook
vi.mock('../hooks/useVerovio');

describe('App', () => {
    const mockSetOptions = vi.fn();
    const mockLoadZipDataBuffer = vi.fn();
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
                renderToSVG: mockRenderToSVG
            }
        });
        
        // Mock fetch
        window.fetch = vi.fn().mockResolvedValue({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
        });
    });

    it('renders the title', async () => {
        render(<App />);
        expect(screen.getByText('DuetPlay')).toBeInTheDocument();
        // Wait for async effects to settle to avoid "not wrapped in act" warnings
        await waitFor(() => expect(mockSetOptions).toHaveBeenCalled());
    });



    it('calls verovio with correct options to show all measures', async () => {
        render(<App />);

        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
        });

        // Check if adjustPageHeight is set to true (Requirement: All measure should show up)
        expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({
            adjustPageHeight: true
        }));
    });
    
    it('sets width based on container', async () => {
        // Mock clientWidth
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 1000 });
        
        render(<App />);
        
        await waitFor(() => {
             expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({
                pageWidth: expect.any(Number)
            }));
        });
    });
});