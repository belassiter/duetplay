import { useState, useEffect, useRef, useCallback } from 'react'
import useVerovio from './hooks/useVerovio';
import { Loader2 } from 'lucide-react';
import { transposeMusicXML } from './utils/xmlTranspose';
import JSZip from 'jszip';
import './App.css'

type TransposeMode = 'none' | 'xml';

function App() {
  const { verovioToolkit, loading } = useVerovio();
  const [svg, setSvg] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [transposeMode, setTransposeMode] = useState<TransposeMode>('none');
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

            if (transposeMode === 'xml') {
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
                
                // 2. Fallback: Search for .xml or .musicxml, ignoring META-INF
                if (!scoreFile || !zipContent.files[scoreFile]) {
                     scoreFile = Object.keys(zipContent.files).find(name => 
                        (name.endsWith('.xml') || name.endsWith('.musicxml')) && !name.includes('META-INF')
                     ) || '';
                }
                
                if (scoreFile && zipContent.files[scoreFile]) {
                    const xmlText = await zipContent.files[scoreFile].async('string');
                    const transposedXML = transposeMusicXML(xmlText, 'M2');
                    verovioToolkit.loadData(transposedXML);
                } else {
                    console.error("Could not find music xml file in mxl");
                    verovioToolkit.loadZipDataBuffer(fileDataRef.current);
                }
            } else {
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
  }, [verovioToolkit, containerWidth, transposeMode]);


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
                onClick={() => setTransposeMode(prev => (prev === 'xml' ? 'none' : 'xml'))}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    transposeMode === 'xml' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
            >
                Part 1 = Trumpet {transposeMode === 'xml' ? '(On)' : '(Off)'}
            </button>
          </div>
      </div>
      
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
