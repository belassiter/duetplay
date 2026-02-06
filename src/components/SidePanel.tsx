import React from 'react';
import { X, ArrowUp, ArrowDown, RotateCcw, Download, FileText } from 'lucide-react';
import InstrumentSelector from './InstrumentSelector';
import { instruments } from '../constants/instruments';
import RangePreview from './RangePreview';
import type { PartState } from '../types/song';
import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    
    parts: PartState[];
    onPartChange: (partId: number, field: keyof PartState, value: string | number) => void;

    globalTranspose: number;
    onGlobalTransposeChange: (val: number) => void;
    
    // Range Preview
    xmlString: string;
    
    // Download
    currentDisplayedXml?: string;
    currentRawSvg?: string;

    // Reset
    onReset?: () => void;
    isMobile?: boolean;
    isLandscape?: boolean;
}

const OctaveControl = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => (
    <div className="flex items-center gap-2 mt-2 mb-2 text-sm text-gray-700">
        <span className="font-medium mr-1">Adjust range:</span>
        <button 
           onClick={() => onChange(Math.max(value - 1, -5))}
           className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 text-gray-600"
           disabled={value <= -5}
        >
             <ArrowDown size={16} />
        </button>
        <button 
           onClick={() => onChange(Math.min(value + 1, 5))}
           className="p-1 border rounded hover:bg-gray-100 disabled:opacity-50 text-gray-600"
           disabled={value >= 5}
        >
             <ArrowUp size={16} />
        </button>
        <span className="min-w-[80px] text-center font-medium">
            {value > 0 ? '+' : ''}{value} {Math.abs(value) === 1 ? 'octave' : 'octaves'}
        </span>
    </div>
);

const SidePanel: React.FC<SidePanelProps> = ({ 
    isOpen, 
    onClose, 
    parts,
    onPartChange,
    globalTranspose,
    onGlobalTransposeChange,
    xmlString,
    onReset,
    isMobile,
    isLandscape,
    currentDisplayedXml,
    currentRawSvg
}) => {
    const [activeSelectorId, setActiveSelectorId] = React.useState<number | null>(null);

    const handleDownloadXml = () => {
        if (!currentDisplayedXml) return;
        const blob = new Blob([currentDisplayedXml], { type: 'application/vnd.recordare.musicxml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'score.musicxml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = async () => {
        if (!currentRawSvg) return;
        
        try {
            // Parse SVG string to Element
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(currentRawSvg, "image/svg+xml");
            const svgElement = svgDoc.documentElement;

            // Get dimensions from SVG (Verovio units are often in 10ths or similar, usually pt is safe bet if we match viewBox)
            // Verovio default: 100px ~= 1 inch? No.
            // Let's rely on viewBox if possible.
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
            
            const doc = new jsPDF({
                orientation: orientation,
                unit: 'pt',
                format: [w, h]
            });

            await svg2pdf(svgElement, doc, {
                x: 0,
                y: 0,
                width: w,
                height: h
            });

            doc.save('score.pdf');
        } catch (e) {
            console.error("PDF Generation failed:", e);
            alert("Failed to generate PDF. Please try printing the page instead.");
        }
    };

    const getClef = (instVal: string) => {
        const inst = instruments.find(i => i.value === instVal);
        return inst ? inst.clef : 'treble';
    };

    // Close selectors when panel closes
    React.useEffect(() => {
        if (!isOpen) setActiveSelectorId(null);
    }, [isOpen]);

    const handleToggle = (id: number) => {
        setActiveSelectorId(prev => prev === id ? null : id);
    };

    const getLabel = (partId: number, originalInstrument: string) => {
        const base = `Part ${partId}`;
        if (originalInstrument && originalInstrument !== 'none') {
            const inst = instruments.find(i => i.value === originalInstrument);
            if (inst) {
                 return `${base} (Orig: ${inst.name})`;
            }
        }
        return `Part ${partId}`;
    };

    // Width class
    const widthClass = (isMobile && !isLandscape) ? 'w-[80%]' : 'w-[60%]';
    
    // Layout class
    // Desktop OR Mobile Landscape: Row layout
    // Mobile Portrait: Column layout
    const isRowLayout = !isMobile || isLandscape;
    const contentLayoutClass = isRowLayout ? 'flex-row' : 'flex-col';

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
                    onClick={onClose}
                />
            )}
            
            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full ${widthClass} bg-[#f5faff] shadow-xl transform transition-transform duration-300 z-50 flex flex-col ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="flex justify-between items-center p-4 border-b bg-blue-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-800">Select Instruments</h2>
                        {onReset && (
                             <button 
                                onClick={onReset} 
                                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors ml-2" 
                                title="Reset all instrument settings to default"
                             >
                                <RotateCcw size={16} />
                             </button>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Download Actions */}
                <div className="flex gap-2 p-3 bg-gray-50 border-b justify-center shrink-0">
                    <button 
                        onClick={handleDownloadPdf}
                        disabled={!currentRawSvg}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50"
                        title="Download as PDF"
                    >
                        <FileText size={16} />
                        <span>PDF</span>
                    </button>
                    <button 
                         onClick={handleDownloadXml}
                         disabled={!currentDisplayedXml}
                         className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 font-medium text-gray-700 disabled:opacity-50"
                         title="Download as MusicXML"
                    >
                        <Download size={16} />
                        <span>MusicXML</span>
                    </button>
                </div>
                
                {/* Content Area */}
                {/* Scrollable Container for the *entire* content if in vertical mode, or handled per column?
                    User request: "Each part is scrolling separately. Make them scroll as one unit." 
                    BUT also: "Give [mobile horizontal] a similar column format to desktop."
                    
                    Desktop format: `flex-row`.
                    Column format (mobile portrait): `flex-col`.
                    
                    Scrolling:
                    If Row Layout (Desktop/Landscape): 
                        We want the main container to be non-scrollable, but columns inside to be scrollable?
                        Or main container scrollable?
                        Usually in columns, maybe we want individual scrolling? 
                        User: "mobile vertical... Make them scroll as one unit." -> implied single scroll container.
                        User: "mobile horizontal... scrolling separately... Give it a similar column format to desktop."
                        
                        Current Desktop Impl: `overflow-hidden` on parent, `overflow-y-auto` on CHILDREN.
                        
                        Proposed:
                        Mobile Portrait (Column Layout): Parent `overflow-y-auto`. Children `overflow-visible` (flex-none).
                        Desktop/Landscape (Row Layout): Parent `overflow-hidden`. Children `overflow-y-auto` (flex-1).
                */}
                <div className={`flex-1 relative flex ${contentLayoutClass} ${!isRowLayout ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                    {parts.map((part) => (
                        <div key={part.id} className={`p-4 ${isRowLayout ? 'flex-1 overflow-y-auto border-r last:border-0' : 'border-b last:border-0'}`}>
                            <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">
                                {getLabel(part.id, part.originalInstrument)}
                            </h3>
                            
                            <div className="mb-4">
                                <InstrumentSelector 
                                    label="Instrument"
                                    selectedValue={part.instrument}
                                    onSelect={(val) => onPartChange(part.id, 'instrument', val)}
                                    isOpen={activeSelectorId === part.id}
                                    onToggle={() => handleToggle(part.id)}
                                />
                            </div>
                            
                            <OctaveControl 
                                value={part.octave} 
                                onChange={(val) => onPartChange(part.id, 'octave', val)} 
                            />
                            
                            {isOpen && (
                                <RangePreview 
                                    label={`Part ${part.id}`} 
                                    xmlString={xmlString} 
                                    staffId={part.id.toString()}
                                    clef={getClef(part.instrument)} 
                                    instrumentValue={part.instrument}
                                    partId={part.id.toString()}
                                    octaveShift={part.octave}
                                    transposeSemitones={globalTranspose}
                                    isMobile={isMobile}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer: Key Control */}
                <div className="p-4 border-t bg-gray-50 shrink-0">
                    <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-800">Adjust Key (Global):</label>
                            <span className="text-sm font-medium text-blue-600 w-12 text-right">
                            {globalTranspose > 0 ? '+' : ''}{globalTranspose}
                            </span>
                    </div>
                    <input 
                        type="range" 
                        min="-12" 
                        max="12" 
                        step="1"
                        value={globalTranspose}
                        onChange={(e) => onGlobalTransposeChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                        <span>-12</span>
                        <span>0</span>
                        <span>+12</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SidePanel;
