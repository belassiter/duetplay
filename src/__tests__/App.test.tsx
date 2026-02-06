import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import useVerovio from '../hooks/useVerovio';

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

describe('App', () => {
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
        window.fetch = vi.fn().mockImplementation((url) => {
             if (typeof url === 'string' && url.endsWith('songs.json')) {
                 return Promise.resolve({
                     ok: true,
                     json: () => Promise.resolve([
                        { 
                            id: 'bach_invention_11', 
                            title: 'Invention 11', 
                            filename: 'bach_invention_11.mxl',
                            instruments: ['Piano', 'Piano'] 
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

    it('renders the app title', async () => {
        render(<App />);
        // Default song title
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
