import { useState, useEffect, useRef, useCallback } from 'react'
import useVerovio from './hooks/useVerovio';
import { transposeMusicXML, isolatePart } from './utils/xmlTranspose';
import JSZip from 'jszip';
import './App.css'
import SidePanel from './components/SidePanel';
import SongSelectorPanel from './components/SongSelectorPanel';
import HelpPanel from './components/HelpPanel';
import { instruments } from './constants/instruments';
import type { Song, PartState } from './types/song';
import { Loader2, Music, RotateCcw, Eye, HelpCircle, Menu, X, Download } from 'lucide-react';
import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";

function App() {
  const { verovioToolkit, loading } = useVerovio();
  const [svg, setSvg] = useState<string>('');
  const [processedXml, setProcessedXml] = useState<string>('');
  const [fullScoreXml, setFullScoreXml] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [scoreVersion, setScoreVersion] = useState<number>(0);
  
  // N-Part State
  const [parts, setParts] = useState<PartState[]>([]);
  const [globalTranspose, setGlobalTranspose] = useState<number>(0);
  const [viewMode, setViewMode] = useState<string>('score'); // 'score' | 'part-1' | 'part-2' etc.
  
  // Songs Data
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);

  // Update Page Title and Favicon based on Config
  useEffect(() => {
      const title = import.meta.env.VITE_APP_TITLE;
      if (title) document.title = title;

      const logo = import.meta.env.VITE_APP_LOGO;
      if (logo) {
          const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
          link.type = 'image/png';
          link.rel = 'icon';
          link.href = `${import.meta.env.BASE_URL}${logo}`;
          document.head.appendChild(link);
      }
  }, []);

  // Fetch Songs on Boot
  useEffect(() => {
    const fetchSongs = async () => {
        try {
            // Use import.meta.env.BASE_URL to respect 'base' config in vite.config.ts
            // But 'current' logic for public files is tricky if base is not root.
            // Vite handles 'public' files at root.
            // If base is '/duetplay/', then fetch('/duetplay/songs.json')
            const manifestName = import.meta.env.VITE_SONGS_MANIFEST_URL || 'songs.json';
            const manifestUrl = `${import.meta.env.BASE_URL}${manifestName}`;
            const response = await fetch(manifestUrl);
            if (!response.ok) throw new Error('Failed to load songs manifest');
            const data = await response.json();
            setSongs(data);
        } catch (e) {
            console.error(e);
            setStatus('Error loading library');
        } finally {
            setIsLoadingSongs(false);
        }
    };
    fetchSongs();
  }, []);

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isSongPanelOpen, setIsSongPanelOpen] = useState(false);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
                
                // --- MULTI-PART TRANSPOSE LOOP ---
                for (const part of parts) {
                    const inst = instruments.find(i => i.value === part.instrument);
                    const orig = instruments.find(i => i.value === part.originalInstrument);
                    const hasShift = part.octave !== 0 || globalTranspose !== 0;
                    
                    // Optimization: Skip if "none" and no transpose
                    // BUT: If user explicitly selected "none" (meaning Concert Pitch), we might still want Global Transpose applied.
                    
                    // Logic: If user specifically chose an instrument, apply its transposition.
                    // If instrument is 'none', it implies no CHANGE to transposition (keep original), 
                    // UNLESS Global Transpose is active.
                    
                    // Wait, if I select 'Alto Sax' (Eb) on a generic C part, I want it to read for Alto Sax.
                    // If I select 'none', it stays as is. 
                    
                    // Construct Transpose Params
                    if (inst && (part.instrument !== 'none' || hasShift)) {
                        const totalShift = (part.octave * 12) + globalTranspose;
                        const targetClef = part.instrument === 'none' ? undefined : inst.clef;
                        
                        // We target the part by Index (1-based ID).
                        processedXML = transposeMusicXML(
                            processedXML,
                            inst.transpose,
                            targetClef,
                            part.id.toString(), // "1", "2", "3", "4"
                            orig?.transpose || 'P1',
                            part.instrument === 'none' ? undefined : inst.name,
                            totalShift
                        );
                    }
                }

                // Capture the full score (transposed) for range previews and full-score download triggers
                setFullScoreXml(processedXML);
                
                // --- View Mode Filtering ---
                if (viewMode !== 'score') {
                    // viewMode is like 'part-1'
                    const partId = parseInt(viewMode.replace('part-', ''));
                    // isolatePart expects 0-based index
                    if (!isNaN(partId)) {
                        processedXML = isolatePart(processedXML, partId - 1);
                    }
                }
                
                setProcessedXml(processedXML);

                // Set options BEFORE loading data to ensure layout is calculated correctly during load/render
                verovioToolkit.setOptions({
                    scale: scale,
                    adjustPageHeight: true,
                    pageWidth: Math.floor((safeWidth * 100) / scale),
                    pageHeight: 60000,
                    transpose: '',
                    header: 'none',
                    footer: 'none'
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
  }, [verovioToolkit, containerWidth, parts, zoomLevel, isMobile, isLandscape, globalTranspose, viewMode]);

  const mapInstrumentNameToValue = useCallback((name: string): string => {
      if (!name) return 'none';
      // Normalize: remove trailing nuparts, globalTranspose, viewMode, zoomLevel, isMobile, isLandscap
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

  const handleDownloadPdf = async () => {
    if (!svg) return;
    
    try {
        // Parse SVG string to Element
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svg, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        // Get dimensions from SVG
        const viewBox = svgElement.getAttribute('viewBox');
        let w = 595.28; // A4
        let h = 841.89;
        
        if (viewBox) {
            const [, , vbW, vbH] = viewBox.split(' ').map(parseFloat);
            w = vbW;
            h = vbH;
        } else {
             const wAttr = svgElement.getAttribute('width');
             const hAttr = svgElement.getAttribute('height');
             if (wAttr) w = parseFloat(wAttr);
             if (hAttr) h = parseFloat(hAttr);
        }

        const orientation = w > h ? 'l' : 'p';
        
        // Reserve space for custom header
        const HEADER_HEIGHT = 100;
        
        const doc = new jsPDF({
            orientation: orientation,
            unit: 'pt',
            format: [w, h + HEADER_HEIGHT]
        });

        if (currentSong) {
            doc.setFont("times", "bold");
            doc.setFontSize(24);
            doc.text(currentSong.title, w / 2, 50, { align: "center" });

            doc.setFont("times", "italic");
            doc.setFontSize(12);
            doc.text(currentSong.composer, w - 50, 70, { align: "right" });
            if (currentSong.arranger) {
                doc.text(`arr. ${currentSong.arranger}`, w - 50, 84, { align: "right" });
            }
        }

        await svg2pdf(svgElement, doc, {
            x: 0,
            y: HEADER_HEIGHT,
            width: w,
            height: h
        });

        const fileName = currentSong ? currentSong.title.replace(/[\s\W]+/g, '_').toLowerCase() : 'score';
        doc.save(`${fileName}.pdf`);
    } catch (e) {
        console.error("PDF Generation failed:", e);
        alert("Failed to generate PDF. Please try printing the page instead.");
    }
  };

  const resetSettings = useCallback(() => {
    // Reset all parts to original
    setParts(prev => prev.map(p => ({
        ...p,
        instrument: p.originalInstrument,
        octave: 0
    })));
    setGlobalTranspose(0);
  }, []);

  const loadScore = useCallback(async (filename: string) => {
        setStatus('Loading score...');
        // Clear current data to prevent rendering old score with new settings
        fileDataRef.current = null; 
        try {
            // Use BASE_URL to handle subdirectory deployment correctly
            const baseUrl = import.meta.env.VITE_ASSETS_BASE_URL || import.meta.env.BASE_URL;
            const response = await fetch(`${baseUrl}${filename}`);
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

  const handleSongSelect = useCallback((song: Song) => {
        // Scroll to top
        if (containerRef.current) containerRef.current.scrollTop = 0;
        
        setCurrentSong(song);

        // Initialize Parts Array
        const newParts: PartState[] = [];
        
        // If song.instruments is missing or empty, assume 2 (default/legacy)
        const instList = (song.instruments && song.instruments.length > 0) 
            ? song.instruments 
            : ['', '']; 

        instList.forEach((instName, index) => {
             const originalVal = mapInstrumentNameToValue(instName);

             const existingPart = parts[index];
             
             // Retention Logic Refined:
             // Only retain if the user has explicitly selected an instrument (isUserSelected === true).
             // Otherwise, default to the new song's instrument (originalVal).
             
             let instrumentToUse = originalVal;
             let isUserSelected = false;

             if (existingPart && existingPart.isUserSelected) {
                 instrumentToUse = existingPart.instrument;
                 isUserSelected = true; // Keep status
             }

             newParts.push({
                 id: index + 1,
                 instrument: instrumentToUse,
                 originalInstrument: originalVal,
                 octave: 0, // Reset octave
                 isUserSelected: isUserSelected
             });
        });

        setParts(newParts);
        setGlobalTranspose(0); // Reset Global Transpose
        setViewMode('score');
        
        loadScore(song.filename);
        setIsSongPanelOpen(false);
  }, [mapInstrumentNameToValue, loadScore, parts]);
  
  const hasInitialLoad = useRef(false);

  // Initial Load
  useEffect(() => {
    if (hasInitialLoad.current || isLoadingSongs || songs.length === 0) return;

    if (!loading && verovioToolkit && !fileDataRef.current) {
        hasInitialLoad.current = true;
        
        // Determine default song based on mode (inferred from title or existence)
        const appTitle = import.meta.env.VITE_APP_TITLE || 'DuetPlay';
        let defaultId = 'bach_invention_11'; // Default for DuetPlay

        if (appTitle === 'QuartetPlay') {
            defaultId = 'final_fantasy_vii_main_theme_sax_quartet_satb';
        }

        // Try to find the preferred default, otherwise fall back to first song
        const defaultSong = songs.find(s => s.id === defaultId) || songs[0];
        if (defaultSong) handleSongSelect(defaultSong);
    }
  }, [loading, verovioToolkit, songs, isLoadingSongs, handleSongSelect]); // Removing deps that caused loops
  
  const handlePartChange = (id: number, field: keyof PartState, value: string | number) => {
       setParts(prev => prev.map(p => {
           if (p.id !== id) return p;
           
           // If instrument is changed, mark as User Selected
           const updates: Partial<PartState> = { [field]: value };
           if (field === 'instrument') {
               updates.isUserSelected = true;
           }
           
           return { ...p, ...updates };
       }));
  };
  
  const toggleViewMode = () => {
      // Cycle: score -> part-1 -> part-2 -> ... -> part-N -> score
      if (viewMode === 'score') {
          setViewMode('part-1');
      } else {
          const currentId = parseInt(viewMode.replace('part-', ''));
          if (currentId < parts.length) {
              setViewMode(`part-${currentId + 1}`);
          } else {
              setViewMode('score');
          }
      }
  };
  
  const getViewLabel = () => {
      if (viewMode === 'score') return 'Score';
      const id = viewMode.replace('part-', '');
      return `Part ${id}`;
  };

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

  return (
    <div className="p-0 w-full mx-auto flex flex-col h-screen">
      <div className="flex justify-between items-center mb-1 md:mb-2 gap-1 md:gap-2 p-1 md:p-2 relative flex-wrap md:flex-nowrap bg-white shadow-sm z-30">
          <div className="flex items-center gap-3 hidden md:flex">
               <img 
                   src={`${import.meta.env.BASE_URL}${import.meta.env.VITE_APP_LOGO || 'duetplay_logo.png'}`} 
                   alt="Logo" 
                   className="h-8 w-auto rounded-sm" 
                   onError={(e) => {
                       // Fallback if base url is tricky
                       (e.target as HTMLImageElement).src = import.meta.env.VITE_APP_LOGO || 'duetplay_logo.png';
                   }} 
               />
               <h1 className="text-xl md:text-2xl font-bold truncate max-w-[200px] md:max-w-md" title={import.meta.env.VITE_APP_TITLE || 'DuetPlay'}>
                   {import.meta.env.VITE_APP_TITLE || 'DuetPlay'}
               </h1>
          </div>
          

          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap flex-1 justify-end">
            
            {/* Mobile Menu Button - Left Justified */}
            {isMobile && (
                <div className="flex-none mr-auto md:hidden">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="flex items-center justify-center p-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm h-[38px] w-[38px]"
                        title="Menu"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            )}

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
                onClick={toggleViewMode}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap min-w-[90px] justify-center"
                title="Toggle View"
            >
                <Eye size={18} />
                <span className="inline">
                    {getViewLabel()}
                </span>
            </button>

            <button 
                onClick={handleDownloadPdf}
                disabled={!svg}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hidden md:flex"
                title="Download PDF"
            >
                <Download size={18} />
                <span className="hidden lg:inline">PDF</span>
            </button>

            <button 
                onClick={() => setIsSongPanelOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm whitespace-nowrap ${isMobile && !isLandscape ? 'hidden' : 'flex'}`}
                title="Select Song"
            >
                <Music size={18} />
                <span className="hidden md:inline">Select Song</span>
            </button>
            <button 
                onClick={() => setIsSidePanelOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm whitespace-nowrap ${isMobile && !isLandscape ? 'hidden' : 'flex'}`}
                title="Select Instruments"
            >
                <span className="text-lg leading-none">🎷</span>
                <span className="hidden md:inline">Select Instruments</span>
            </button>

            <button 
                onClick={() => setIsHelpPanelOpen(true)}
                className={`flex items-center justify-center p-2 rounded text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm hidden md:flex ${isMobile && !isLandscape ? 'hidden' : ''}`}
                title="Help"
            >
                <HelpCircle size={20} />
            </button>

        </div>

        {/* Mobile Menu Drawer */}
        {isMenuOpen && (
            <>
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
                
                <div className="fixed top-0 left-0 h-full w-[60%] bg-white shadow-2xl z-50 flex flex-col gap-4 p-4 md:hidden border-r border-gray-200 animate-in slide-in-from-left duration-200">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="font-bold text-lg text-gray-800">Menu</h2>
                        <button 
                            onClick={() => setIsMenuOpen(false)} 
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <button 
                         onClick={handleDownloadPdf}
                         disabled={!svg}
                         className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm w-full text-left disabled:opacity-50"
                    >
                        <Download size={18} className="shrink-0" />
                        <span>Download PDF</span>
                    </button>

                    <button 
                        onClick={() => { setIsMenuOpen(false); setIsSongPanelOpen(true); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm w-full text-left"
                    >
                        <Music size={18} className="shrink-0" />
                        <span>Select Song</span>
                    </button>

                    <button 
                        onClick={() => { setIsMenuOpen(false); setIsSidePanelOpen(true); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm w-full text-left"
                    >
                        <span className="text-lg leading-none shrink-0">🎷</span>
                        <span>Instruments</span>
                    </button>

                    <button 
                        onClick={() => { setIsMenuOpen(false); setIsHelpPanelOpen(true); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm w-full text-left"
                    >
                        <HelpCircle size={18} className="shrink-0" />
                        <span>Help</span>
                    </button>
                </div>
            </>
        )}
      </div>

      <SidePanel 
        isOpen={isSidePanelOpen} 
        onClose={() => setIsSidePanelOpen(false)}
        parts={parts}
        onPartChange={handlePartChange}
        globalTranspose={globalTranspose}
        onGlobalTransposeChange={setGlobalTranspose}
        xmlString={fullScoreXml}
        currentDisplayedXml={processedXml}
        currentRawSvg={svg}
        onReset={resetSettings}
        isMobile={isMobile}
      />

      <SongSelectorPanel
        isOpen={isSongPanelOpen}
        onClose={() => setIsSongPanelOpen(false)}
        onSelectSong={handleSongSelect}
        isMobile={isMobile}
        isLandscape={isLandscape}
        songs={songs}
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

      <div ref={containerRef} className="w-full flex-1 overflow-auto bg-gray-100 p-2 flex justify-center">
          {!loading && svg && (
            <div
              className="border border-gray-300 shadow-lg rounded bg-white h-auto relative"
              style={{ overflowX: 'hidden', maxWidth: '100%' }}
            >
                {/* Custom HTML Header to avoid Verovio Overlap */}
                {currentSong && (
                    <div className="flex flex-col pt-6 px-8 font-serif select-none pointer-events-none">
                        <h1 className="text-2xl md:text-4xl text-center font-bold text-gray-900 leading-tight mb-2">
                            {currentSong.title}
                        </h1>
                        <div className="flex justify-between text-sm md:text-base italic text-gray-800">
                             <span></span>
                             <div className="text-right flex flex-col items-end">
                                 <span>{currentSong.composer}</span>
                                 {currentSong.arranger && <span className="text-sm">arr. {currentSong.arranger}</span>}
                             </div>
                        </div>
                    </div>
                )}

                <div
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            </div>
          )}
      </div>
    </div>
  )
}

export default App
