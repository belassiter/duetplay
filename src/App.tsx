import { useState, useEffect, useRef, useCallback } from 'react'
import useVerovio from './hooks/useVerovio';
import { Loader2, Music } from 'lucide-react';
import { transposeMusicXML } from './utils/xmlTranspose';
import JSZip from 'jszip';
import './App.css'
import SidePanel from './components/SidePanel';
import SongSelectorPanel from './components/SongSelectorPanel';
import { instruments } from './constants/instruments';
import type { Song } from './types/song';

function App() {
  const { verovioToolkit, loading } = useVerovio();
  const [svg, setSvg] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  
  // Instrument State
  const [instrument1, setInstrument1] = useState<string>('none');
  const [instrument2, setInstrument2] = useState<string>('none');
  const [originalInstruments, setOriginalInstruments] = useState<{ part1: string, part2: string }>({ part1: 'none', part2: 'none' });
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isSongPanelOpen, setIsSongPanelOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const fileDataRef = useRef<ArrayBuffer | null>(null);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderScore = useCallback(async () => {
      if (!verovioToolkit || !fileDataRef.current) return;
      
      setIsRendering(true);
      setStatus('Rendering...');
      
      try {
            const scale = 40; 
            const safeWidth = Math.max(containerWidth - 20, 100);

            // Always treat as XML now
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(fileDataRef.current);
            
            let scoreFile = '';
            
            // 1. Try reading META-INF/container.xml
            const containerFile = zipContent.files['META-INF/container.xml'];
            if (containerFile) {
                const containerXML = await containerFile.async('string');
                const parser = new DOMParser();
                const doc = parser.parseFromString(containerXML, 'application/xml');
                const rootFile = doc.getElementsByTagName('rootfile')[0];
                if (rootFile) {
                    scoreFile = rootFile.getAttribute('full-path') || '';
                }
            }
            
            // 2. Fallback
            if (!scoreFile || !zipContent.files[scoreFile]) {
                    scoreFile = Object.keys(zipContent.files).find(name => 
                    (name.endsWith('.xml') || name.endsWith('.musicxml')) && !name.includes('META-INF')
                    ) || '';
            }
            
            if (scoreFile && zipContent.files[scoreFile]) {
                const xmlText = await zipContent.files[scoreFile].async('string');
                
                // Get Instrument Defs
                const inst1 = instruments.find(i => i.value === instrument1);
                const orig1 = instruments.find(i => i.value === originalInstruments.part1);
                
                let processedXML = xmlText;
                
                if (inst1 && inst1.value !== 'none' && inst1.value !== originalInstruments.part1) {
                    // Apply transposition to Part 1 / Staff 1
                    // We need relative transposition: from Original -> Target.
                    // If no original is known (or none), we assume C (Piano/Flute/Violin etc) or simply use target transpose logic if original was untransposed.
                    
                    // Actually, existing logic likely assumes source is C.
                    // If source is Trumpet (Bb), transpose is -2.
                    // If target is Alto Sax (Eb), transpose is +9 from C (Wait, Alto is Eb, sounds M6 lower, so -9).
                    
                    // Let's pass the raw steps difference to a modified transpose function or handle it here?
                    // Currently transposeMusicXML takes 'interval' string which Tonal parses.
                    
                    // We need to calculate the interval from Source to Target.
                    // Since specific interval math is complex with strings like "-M2", "-P5", 
                    // we might need a better way if we want full relative support.
                    
                    // HOWEVER, if 'originalInstruments.part1' is 'none' (default), we treat source as Concert C.
                    // If 'originalInstruments.part1' is 'bb_trumpet', we treat source as Bb.
                    
                    // Let's defer strict interval math and just pass both to transposeMusicXML if we update it?
                    // OR: update transposeMusicXML to accept sourceTranspose and targetTranspose.
                    
                    processedXML = transposeMusicXML(processedXML, inst1.transpose, inst1.clef, '1', orig1?.transpose || 'P1');
                }
                
                // Get Inst 2
                const inst2 = instruments.find(i => i.value === instrument2);
                const orig2 = instruments.find(i => i.value === originalInstruments.part2);

                if (inst2 && inst2.value !== 'none' && inst2.value !== originalInstruments.part2) {
                     // Apply to Part 2 / Staff 2
                     processedXML = transposeMusicXML(processedXML, inst2.transpose, inst2.clef, '2', orig2?.transpose || 'P1');
                }
                
                verovioToolkit.loadData(processedXML);
            } else {
                console.error("Could not find music xml file");
                // Fallback to raw load if simpler (though likely fails for mxl)
                verovioToolkit.loadZipDataBuffer(fileDataRef.current);
            }

            verovioToolkit.setOptions({
                scale: scale,
                adjustPageHeight: true,
                pageWidth: Math.floor((safeWidth * 100) / scale),
                transpose: ''
            });
            
            const svgData = verovioToolkit.renderToSVG(1, {});
            setSvg(svgData);
            setStatus('');
      } catch (e) {
          console.error(e);
          setStatus('Error rendering score');
      } finally {
          setIsRendering(false);
      }
  }, [verovioToolkit, containerWidth, instrument1, instrument2, originalInstruments]);


  const loadScore = useCallback(async (filename: string) => {
        setStatus('Loading score...');
        try {
            const response = await fetch(`/${filename}`); // Public folder access
            if (!response.ok) throw new Error(`Fetch error: ${response.statusText}`);
            const data = await response.arrayBuffer();
            fileDataRef.current = data;
            renderScore();
        } catch (e) {
            console.error(e);
            setStatus('Error loading file');
            setIsRendering(false);
        }
  }, [renderScore]);

  // Initial Load
  useEffect(() => {
    if (!loading && verovioToolkit && !fileDataRef.current) {
        loadScore('bach_invention_11.mxl');
    } else if (!loading && verovioToolkit && fileDataRef.current) {
        // Debounce re-render slightly for UX
        const timeoutId = setTimeout(() => {
            renderScore();
        }, 100);
        return () => clearTimeout(timeoutId);
    }
  }, [loading, verovioToolkit, renderScore, loadScore]);

  // Handle Keyboard Scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!containerRef.current) return;
        
        // Only scroll if we are not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            return;
        }

        const scrollAmount = containerRef.current.clientHeight * 0.9; // 90% of page height

        if (e.code === 'Space' || e.code === 'PageDown') {
            e.preventDefault();
            containerRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        } else if (e.code === 'PageUp') {
            e.preventDefault();
            containerRef.current.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mapInstrumentNameToValue = useCallback((name: string): string => {
      if (!name) return 'none';
      const cleanName = name.trim().toLowerCase();
      const inst = instruments.find(i => 
          i.name.toLowerCase() === cleanName || 
          i.value.toLowerCase() === cleanName || 
          i.label.toLowerCase().includes(cleanName)
      );
      return inst ? inst.value : 'none';
  }, []);

  const handleSongSelect = (song: Song) => {
      setIsSongPanelOpen(false);
      
      const p1Val = song.instruments[0] ? mapInstrumentNameToValue(song.instruments[0]) : 'none';
      const p2Val = song.instruments[1] ? mapInstrumentNameToValue(song.instruments[1]) : 'none';

      setInstrument1(p1Val);
      setInstrument2(p2Val);
      setOriginalInstruments({ part1: p1Val, part2: p2Val });
      
      loadScore(song.filename);
  };

  return (
    <div className="p-4 w-full mx-auto flex flex-col h-screen">
      <div className="flex justify-between items-center mb-2 gap-2">
          <div className="flex items-center gap-4">
               <h1 className="text-xl md:text-2xl font-bold truncate max-w-[200px] md:max-w-md" title="DuetPlay">
                   DuetPlay
               </h1>
          </div>
          
          <div className="flex gap-2">
            <button 
                onClick={() => setIsSongPanelOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
                <Music size={16} />
                Select Song
            </button>
            <button 
                onClick={() => setIsSidePanelOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
                <span className="text-lg leading-none">🎷</span>
                Select Instruments
            </button>
          </div>
      </div>
      
      <SidePanel 
        isOpen={isSidePanelOpen} 
        onClose={() => setIsSidePanelOpen(false)}
        instrument1={instrument1}
        instrument2={instrument2}
        originalInstruments={originalInstruments}
        onInstrument1Change={setInstrument1}
        onInstrument2Change={setInstrument2}
      />

      <SongSelectorPanel
          isOpen={isSongPanelOpen}
          onClose={() => setIsSongPanelOpen(false)}
          onSelectSong={handleSongSelect}
      />
      
      {status && <div className="text-sm text-gray-500 mb-2">{status}</div>}
      
      {(loading || isRendering) && (
        <div className="flex justify-center p-8">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      )}
      
      <div ref={containerRef} className="w-full flex-1 overflow-auto">
          {!loading && svg && (
            <div
              className="border border-gray-300 p-2 shadow-sm rounded bg-white h-auto"
              style={{ overflowX: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
      </div>
    </div>
  )
}

export default App
