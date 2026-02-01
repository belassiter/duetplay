import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useVerovio from '../useVerovio';

// Mock verovio for happy path
vi.mock('verovio/wasm', () => {
    return {
        default: () => Promise.resolve({ /* mock module */ })
    };
});

vi.mock('verovio/esm', () => {
    return {
        VerovioToolkit: class {
            constructor() {}
            setOptions() {}
            loadZipDataBuffer() {}
            renderToSVG() { return '<svg></svg>'; }
        }
    };
});

describe('useVerovio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state then resolve', async () => {
    const { result } = renderHook(() => useVerovio());
    
    // Initially loading
    expect(result.current.loading).toBe(true);
    
    // Expect it to resolve automatically via the Promise
    await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.verovioToolkit).toBeTruthy();
    });
  });
});