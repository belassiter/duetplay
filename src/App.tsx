import { useState, useEffect, useRef, useCallback } from 'react'
import useVerovio from './hooks/useVerovio';
import { Loader2, Music } from 'lucide-react';
import { transposeMusicXML } from './utils/xmlTranspose';
import JSZip from 'jszip';
import './App.css'
import SidePanel from './components/SidePanel';
import { instruments } from './constants/instruments';

function App() {
  const { verovioToolkit, loading } = useVerovio();
  const [svg, setSvg] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  
  // Instrument State
  const [instrument1, setInstrument1] = useState<string>('none');
  const [instrument2, setInstrument2] = useState<string>('none');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

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
                
                let processedXML = xmlText;
                
                if (inst1 && inst1.value !== 'none') {
                    // Apply transposition to Part 1 / Staff 1
                    processedXML = transposeMusicXML(processedXML, inst1.transpose, inst1.clef, '1');
                }
                
                // Get Inst 2
                const inst2 = instruments.find(i => i.value === instrument2);
                if (inst2 && inst2.value !== 'none') {
                     // Apply to Part 2 / Staff 2
                     processedXML = transposeMusicXML(processedXML, inst2.transpose, inst2.clef, '2');
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
  }, [verovioToolkit, containerWidth, instrument1, instrument2]);


  useEffect(() => {
    if (!loading && verovioToolkit && !fileDataRef.current) {
      const fetchScore = async () => {
        setStatus('Loading score...');
        try {
            const response = await fetch('/bach_invention_11.mxl');
            const data = await response.arrayBuffer();
            fileDataRef.current = data;
            renderScore();
        } catch (e) {
            console.error(e);
            setStatus('Error loading file');
        }
      };
      fetchScore();
    } else if (!loading && verovioToolkit && fileDataRef.current) {
        // Debounce re-render slightly for UX
        const timeoutId = setTimeout(() => {
            renderScore();
        }, 100);
        return () => clearTimeout(timeoutId);
    }
  }, [loading, verovioToolkit, renderScore]);

  return (
    <div className="p-4 max-w-screen-xl mx-auto flex flex-col h-screen">
      <div className="flex justify-between items-center mb-2 gap-2">
          <h1 className="text-2xl font-bold">DuetPlay</h1>
          <div className="flex gap-2">
            <button 
                onClick={() => setIsSidePanelOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
                <Music size={16} />
                Select Instruments
            </button>
          </div>
      </div>
      
      <SidePanel 
        isOpen={isSidePanelOpen} 
        onClose={() => setIsSidePanelOpen(false)}
        instrument1={instrument1}
        instrument2={instrument2}
        onInstrument1Change={setInstrument1}
        onInstrument2Change={setInstrument2}
      />

      
      {status && <div className="text-sm text-gray-500 mb-2">{status}</div>}
      
      {(loading || isRendering) && (
        <div className="flex justify-center p-8">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      )}
      
      <div ref={containerRef} className="w-full flex-1 overflow-hidden">
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
