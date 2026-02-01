/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'verovio' {
    export const module: {
        onRuntimeInitialized: (() => void) | null;
    };
    export class toolkit {
        constructor();
        setOptions(options: Record<string, any>): void;
        loadData(data: string): void;
        loadZipDataBuffer(data: ArrayBuffer): void;
        renderToSVG(page: number, options: Record<string, any>): string;
        redoLayout(): void;
    }
}

declare module 'verovio/wasm' {
    export default function createVerovioModule(): Promise<any>;
}

declare module 'verovio/esm' {
    export class VerovioToolkit {
        constructor(module: any);
        setOptions(options: Record<string, any>): void;
        loadData(data: string): void;
        loadZipDataBuffer(data: ArrayBuffer): void;
        renderToSVG(page: number, options: Record<string, any>): string;
        redoLayout(): void;
    }
}
