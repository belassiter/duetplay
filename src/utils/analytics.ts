import type { PartState } from '../types/song';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKXPZDBKJM0xRrC5q3gyuR73PUvzCH60t-NmN5Z7Z7uVXGL_feEm4pjZWK9n_GkoSE/exec';

type EventType = 'page_view' | 'load_song' | 'download_pdf' | 'download_mxl' | 'configuration_change' | 'error';

interface LogEventParams {
    type: EventType;
    filename?: string; // For songs, this is the filename. For page views, can be url or ignored.
    details?: string; // JSON string or human readable details
}

export const logEvent = (params: LogEventParams) => {
    // Basic User Agent info
    const ua = navigator.userAgent;
    
    // Determine App Name from Title (Configured in .env or defaults)
    const appTitle = import.meta.env.VITE_APP_TITLE || 'DuetPlay';
    
    // Construct URL parameters
    // The script expects: sheet, filename, type, page, ua.
    // We will append 'details' but the current script won't store it unless updated.
    // However, we can pack details into 'filename' or 'page' if needed, OR we rely on user updating the script.
    // The user said "log all of the parameters... so then we don't log every time... just when they're done"
    // This implies complex data.
    // Let's send 'details' as a new parameter and assume user will update script to capture it.
    // Or, we can append it to 'filename' like "MySong.xml (Details: ...)" which handles legacy scripts nicely.
    
    // Let's try to be clean and send it as a separate param, and also maybe append to filename if critical?
    // No, better to keep filename clean for aggregation.
    // We will stick to the plan: Send 'details'.
    
    const url = new URL(SCRIPT_URL);
    url.searchParams.append('sheet', appTitle);
    url.searchParams.append('type', params.type);
    url.searchParams.append('filename', params.filename || 'unknown');
    url.searchParams.append('page', window.location.pathname); // Source page
    url.searchParams.append('ua', ua);
    
    if (params.details) {
        url.searchParams.append('details', params.details);
    }

    // Fire and forget, no-cors
    fetch(url.toString(), {
        method: 'POST',
        mode: 'no-cors'
    }).catch(err => console.error('Analytics Error:', err));
};

export const getConfigurationDiff = (parts: PartState[], globalTranspose: number): string | null => {
    const changes: string[] = [];

    if (globalTranspose !== 0) {
        changes.push(`Key: ${globalTranspose > 0 ? '+' : ''}${globalTranspose}`);
    }

    parts.forEach(part => {
        const partChanges: string[] = [];
        
        // Check Instrument Change
        // Using strict equality might fail if originalInstrument is undefined or different casing?
        // PartState has originalInstrument.
        if (part.originalInstrument && part.instrument !== part.originalInstrument) {
            partChanges.push(`${part.originalInstrument}->${part.instrument}`);
        }
        
        // Check Octave Change
        if (part.octave !== 0) {
            partChanges.push(`Octave: ${part.octave > 0 ? '+' : ''}${part.octave}`);
        }

        if (partChanges.length > 0) {
            changes.push(`P${part.id}[${partChanges.join(', ')}]`);
        }
    });

    if (changes.length === 0) return null;
    return changes.join('; ');
};
