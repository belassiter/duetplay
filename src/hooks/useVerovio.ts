import { useState, useEffect } from 'react';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';

export default function useVerovio() {
  const [loading, setLoading] = useState(true);
  const [verovioToolkit, setVerovioToolkit] = useState<VerovioToolkit | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Verovio using the ESM factory pattern
    // This returns a Promise and is more reliable in modern bundlers than the callback approach
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createVerovioModule().then((VerovioModule: any) => {
        const toolkit = new VerovioToolkit(VerovioModule);
        setVerovioToolkit(toolkit);
        setLoading(false);
    });

  }, []);

  return { loading, verovioToolkit };
}