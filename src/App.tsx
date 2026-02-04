import { useState, useEffect, useRef, useCallback } from 'react'
import useVerovio from './hooks/useVerovio';
import { transposeMusicXML, isolatePart } from './utils/xmlTranspose';
import JSZip from 'jszip';
import './App.css'
import SidePanel from './components/SidePanel';
import SongSelectorPanel from './components/SongSelectorPanel';
import HelpPanel from './components/HelpPanel';
import { instruments } from './constants/instruments';
import type { Song } from './types/song';
import songsData from './data/songs.json';
import { Loader2, Music, RotateCcw, Eye, HelpCircle } from 'lucide-react';

function App() {
  const { verovioToolkit, loading } = useVerovio();
  const [svg, setSvg] = useState<string>('');
  const [processedXml, setProcessedXml] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [scoreVersion, setScoreVersion] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'score' | 'part1' | 'part2'>('score');
  
  // Instrument State
  const [instrument1, setInstrument1] = useState<string>('none');
  const [instrument2, setInstrument2] = useState<string>('none');
  const [originalInstruments, setOriginalInstruments] = useState<{ part1: string, part2: string }>({ part1: 'none', part2: 'none' });
  const [part1Octave, setPart1Octave] = useState<number>(0);
  const [part2Octave, setPart2Octave] = useState<number>(0);
  const [globalTranspose, setGlobalTranspose] = useState<number>(0);
  
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isSongPanelOpen, setIsSongPanelOpen] = useState(false);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const fileDataRef = useRef<ArrayBuffer | null>(null);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isLand = width > height;
        
        setIsLandscape(isLand);
        // Mobile: Small width OR (Landscape AND small height)
        setIsMobile(width < 768 || (isLand && height < 600));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

    // Cap zoom on mobile
    useEffect(() => {
        if (isMobile && zoomLevel > 150) {
            setZoomLevel(150);
        }
    }, [isMobile, zoomLevel]);

    const renderScore = useCallback(async () => {
      if (!verovioToolkit || !fileDataRef.current) return;
      
      setIsRendering(true);
      setStatus('Rendering...');
      
      try {
            // Adaptive Base Scale: 
            // Mobile Portrait: 40 (standard)
            // Mobile Landscape: 24 (60% of 40)
            // Desktop: 55 (larger, fixes "jamming" and fills space better)
            let baseScale = 55;
            if (isMobile) {
                baseScale = isLandscape ? 24 : 40;
            }

            const scale = baseScale * (zoomLevel / 100); 
            // Decrease padding on mobile side edges (safeWidth)
            // Desktop: 20 (10px padding each side)
            // Mobile: 2 (1px padding each side approx)
            const sidePadding = isMobile ? 2 : 20;
            const safeWidth = Math.max(containerWidth - sidePadding, 100);

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
                let processedXML = xmlText;
                
                // Get Inst 1
                const inst1 = instruments.find(i => i.value === instrument1);
                const orig1 = instruments.find(i => i.value === originalInstruments.part1);
                
                const hasShift1 = part1Octave !== 0 || globalTranspose !== 0;

                if (inst1 && (inst1.value !== 'none' || hasShift1)) {
                    const p1TotalShift = (part1Octave * 12) + globalTranspose;
                    const targetClef = inst1.value === 'none' ? undefined : inst1.clef;

                    processedXML = transposeMusicXML(
                        processedXML, 
                        inst1.transpose, 
                        targetClef, 
                        '1', 
                        orig1?.transpose || 'P1', 
                        inst1.value === 'none' ? undefined : inst1.name,
                        p1TotalShift
                    );
                }
                
                // Get Inst 2
                const inst2 = instruments.find(i => i.value === instrument2);
                const orig2 = instruments.find(i => i.value === originalInstruments.part2);
                
                const hasShift2 = part2Octave !== 0 || globalTranspose !== 0;

                if (inst2 && (inst2.value !== 'none' || hasShift2 || (inst2.value !== originalInstruments.part2 && inst2.value !== 'none'))) {
                     const p2TotalShift = (part2Octave * 12) + globalTranspose;
                     const targetClef = inst2.value === 'none' ? undefined : inst2.clef;

                     // Apply to Part 2 / Staff 2
                     processedXML = transposeMusicXML(
                        processedXML, 
                        inst2.transpose, 
                        targetClef, 
                        '2', 
                        orig2?.transpose || 'P1', 
                        inst2.value === 'none' ? undefined : inst2.name,
                        p2TotalShift
                    );
                }
                
                // --- View Mode Filtering ---
                if (viewMode === 'part1') {
                    processedXML = isolatePart(processedXML, 0);
                } else if (viewMode === 'part2') {
                    processedXML = isolatePart(processedXML, 1);
                }
                
                setProcessedXml(processedXML);

                // Set options BEFORE loading data to ensure layout is calculated correctly during load/render
                verovioToolkit.setOptions({
                    scale: scale,
                    adjustPageHeight: true,
                    pageWidth: Math.floor((safeWidth * 100) / scale),
                    pageHeight: 60000,
                    transpose: ''
                });

                verovioToolkit.loadData(processedXML);
            } else {
                console.error("Could not find music xml file");
                // Fallback to raw load if simpler (though likely fails for mxl)
                verovioToolkit.loadZipDataBuffer(fileDataRef.current);
            }
            
            // Render
            const svgData = verovioToolkit.renderToSVG(1, {});
            setSvg(svgData);
            setStatus('');
      } catch (e) {
          console.error(e);
          setStatus('Error rendering score');
      } finally {
          setIsRendering(false);
      }
  }, [verovioToolkit, containerWidth, instrument1, instrument2, originalInstruments, zoomLevel, isMobile, isLandscape, part1Octave, part2Octave, globalTranspose, viewMode]);

  const mapInstrumentNameToValue = useCallback((name: string): string => {
      if (!name) return 'none';
      // Normalize: remove trailing numbers (e.g. "Trumpet 1" -> "Trumpet") and whitespace
      const cleanName = name.replace(/\s*\d+$/, '').trim().toLowerCase();
      
      // Use "find" carefully - specificity matters. 
      // 1. Exact match on value
      // 2. Exact match on name
      // 3. Exact match on alias
      // 4. Label includes (Fallback)
      
      let inst = instruments.find(i => i.value.toLowerCase() === cleanName);
      if (inst) return inst.value;

      inst = instruments.find(i => i.name.toLowerCase() === cleanName);
      if (inst) return inst.value;

      inst = instruments.find(i => i.aliases && i.aliases.some(a => a.toLowerCase() === cleanName));
      if (inst) return inst.value;

      // Fallback: Check if label contains the name, but avoid partial matches like "Trumpet" matching "C Trumpet" incorrectly if a better match exists.
      // We process explicit "Bb Trumpet" etc above. If we are here, we have "Trumpet".
      // "C Trumpet" label contains "trumpet". "Bb Trumpet" label contains "trumpet".
      // The old logic `i.label.toLowerCase().includes(cleanName)` found the FIRST valid instrument containing "trumpet", which happened to be C Trumpet.
      
      return 'none';
  }, []);


  const resetSettings = useCallback(() => {
    setInstrument1(originalInstruments.part1);
    setInstrument2(originalInstruments.part2);
    setPart1Octave(0);
    setPart2Octave(0);
    setGlobalTranspose(0);
  }, [originalInstruments]);

  const loadScore = useCallback(async (filename: string) => {
        setStatus('Loading score...');
        // Clear current data to prevent rendering old score with new settings
        fileDataRef.current = null; 
        try {
            // Use BASE_URL to handle subdirectory deployment correctly
            const response = await fetch(`${import.meta.env.BASE_URL}${filename}`);
            if (!response.ok) throw new Error(`Fetch error: ${response.statusText}`);
            const data = await response.arrayBuffer();
            fileDataRef.current = data;
            setScoreVersion(v => v + 1);
        } catch (e) {
            console.error(e);
            setStatus('Error loading file');
            setIsRendering(false);
        }
  }, []);

  const hasInitialLoad = useRef(false);

  // Initial Load
  useEffect(() => {
    if (hasInitialLoad.current) return;

    if (!loading && verovioToolkit && !fileDataRef.current) {
        hasInitialLoad.current = true;
        // Set default instruments for the starting song
        const songs = songsData as Song[];
        const defaultSong = songs.find(s => s.id === 'bach_invention_11') || songs[0];
        if (defaultSong) {
             const p1Val = defaultSong.instruments[0] ? mapInstrumentNameToValue(defaultSong.instruments[0]) : 'none';
             const p2Val = defaultSong.instruments[1] ? mapInstrumentNameToValue(defaultSong.instruments[1]) : 'none';
             
             // Batch updates
             setInstrument1(p1Val);
             setInstrument2(p2Val);
             setOriginalInstruments({ part1: p1Val, part2: p2Val });
             loadScore(defaultSong.filename);
        }
    }
  }, [loading, verovioToolkit, loadScore, mapInstrumentNameToValue]);

  // Re-render when data/params change
  useEffect(() => {
    if (!loading && verovioToolkit && fileDataRef.current) {
        // Debounce re-render slightly for UX
        const timeoutId = setTimeout(() => {
            renderScore();
        }, 100);
        return () => clearTimeout(timeoutId);
    }
  }, [loading, verovioToolkit, renderScore, scoreVersion]); // Removed fileDataRef.current check from deps as it's a ref

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
    <div className="p-0 w-full mx-auto flex flex-col h-screen">
      <div className="flex justify-between items-center mb-1 md:mb-2 gap-1 md:gap-2 p-1 md:p-2 relative flex-wrap md:flex-nowrap bg-white shadow-sm z-30">
          <div className="flex items-center gap-4 hidden md:flex">
               <h1 className="text-xl md:text-2xl font-bold truncate max-w-[200px] md:max-w-md" title="DuetPlay">
                   DuetPlay
               </h1>
          </div>
          
          <div className="flex gap-2 items-center w-full md:w-auto justify-end">
            {/* Zoom Control */}
            <div className="flex items-center gap-2 bg-white border border-gray-300 px-2 py-1.5 rounded shadow-sm h-[38px] relative flex-1 md:flex-none max-w-[240px] md:max-w-none">
                
                <span className="text-sm font-medium text-gray-700 hidden sm:inline mr-1">Zoom</span>
                
                {/* Reset Button */}
                <button 
                    onClick={() => setZoomLevel(100)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                    title="Reset Zoom to 100%"
                >
                     <RotateCcw size={18} className={zoomLevel === 100 ? "opacity-20" : "opacity-100"} />
                     <span className="sr-only">Reset</span>
                </button>

                <div className="relative flex items-center flex-1 min-w-[80px]">
                    <input 
                        type="range" 
                        min="50" 
                        max={isMobile ? "150" : "250"}
                        value={zoomLevel} 
                        onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 relative z-10"
                    />
                    {/* Tick mark at 100% */}
                    {/* Range 50-250 (span 200). 100 is 50/200 = 25% */}
                    {/* Range 50-150 (span 100). 100 is 50/100 = 50% */}
                    <div 
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-gray-400 pointer-events-none z-0"
                        style={{ left: isMobile ? '50%' : '25%' }} 
                    />
                </div>
                <span className="text-xs text-gray-700 w-8 text-right font-variant-numeric tabular-nums">{zoomLevel}%</span>
            </div>
            
            <button 
                onClick={() => setViewMode(prev => prev === 'score' ? 'part1' : (prev === 'part1' ? 'part2' : 'score'))}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap min-w-[90px] justify-center"
                title="Toggle View: Score / Part 1 / Part 2"
            >
                <Eye size={18} />
                <span className="inline">
                    {viewMode === 'score' ? 'Score' : (viewMode === 'part1' ? 'Part 1' : 'Part 2')}
                </span>
            </button>

            <button 
                onClick={() => setIsSongPanelOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm whitespace-nowrap"
                title="Select Song"
            >
                <Music size={18} />
                <span className="hidden md:inline">Select Song</span>
            </button>
            <button 
                onClick={() => setIsSidePanelOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm whitespace-nowrap"
                title="Select Instruments"
            >
                <span className="text-lg leading-none">🎷</span>
                <span className="hidden md:inline">Select Instruments</span>
            </button>

            <button 
                onClick={() => setIsHelpPanelOpen(true)}
                className="flex items-center justify-center p-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm hidden md:flex"
                title="Help & FAQ"
            >
                <HelpCircle size={20} />
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
        isMobile={isMobile}
        part1Octave={part1Octave}
        onPart1OctaveChange={setPart1Octave}
        part2Octave={part2Octave}
        onPart2OctaveChange={setPart2Octave}
        globalTranspose={globalTranspose}
        onGlobalTransposeChange={setGlobalTranspose}
        xmlString={processedXml}
        onReset={resetSettings}
      />

      <SongSelectorPanel
        isOpen={isSongPanelOpen}
        onClose={() => setIsSongPanelOpen(false)}
        onSelectSong={handleSongSelect}
        isMobile={isMobile}
        isLandscape={isLandscape}
      />

      <HelpPanel
        isOpen={isHelpPanelOpen}
        onClose={() => setIsHelpPanelOpen(false)}
        isMobile={isMobile} 
      />

      {status && <div className="text-sm text-gray-500 mb-2 px-2">{status}</div>}

      {(loading || isRendering) && (
        <div className="flex justify-center p-8">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      )}

      <div ref={containerRef} className="w-full flex-1 overflow-auto">
          {!loading && svg && (
            <div
              className="border border-gray-300 p-1 shadow-sm rounded bg-white h-auto"
              style={{ overflowX: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
      </div>
    </div>
  )
}

export default App
