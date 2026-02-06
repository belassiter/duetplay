import React from 'react';
import { X, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import InstrumentSelector from './InstrumentSelector';
import { instruments } from '../constants/instruments';
import RangePreview from './RangePreview';
import type { PartState } from '../types/song';

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    
    parts: PartState[];
    onPartChange: (partId: number, field: keyof PartState, value: string | number) => void;

    globalTranspose: number;
    onGlobalTransposeChange: (val: number) => void;
    
    // Range Preview
    xmlString: string;
    
    // Reset
    onReset?: () => void;
    isMobile?: boolean;
}

const OctaveControl = ({ value, onChange }: { value: number, onChange: (val: number) => void }) => (
    <div className="flex items-center gap-2 mt-2 mb-6 text-sm text-gray-700">
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
    isMobile
}) => {
    const [activeSelectorId, setActiveSelectorId] = React.useState<number | null>(null);

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
        const base = `Part ${partId} Instrument`;
        if (originalInstrument && originalInstrument !== 'none') {
            const inst = instruments.find(i => i.value === originalInstrument);
            if (inst) {
                 return `${base} (original is ${inst.name})`;
            }
        }
        return base;
    };

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
            <div className={`fixed top-0 right-0 h-full ${isMobile ? 'w-[60%]' : 'w-[40%]'} bg-[#f5faff] shadow-xl transform transition-transform duration-300 z-50 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="flex justify-between items-center p-4 border-b bg-blue-100">
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
                
                <div className="p-4 h-[calc(100vh-60px)] overflow-y-auto pb-20">
                    {parts.map((part) => (
                        <div key={part.id} className="mb-6">
                            <InstrumentSelector 
                                label={getLabel(part.id, part.originalInstrument)}
                                selectedValue={part.instrument}
                                onSelect={(val) => onPartChange(part.id, 'instrument', val)}
                                isOpen={activeSelectorId === part.id}
                                onToggle={() => handleToggle(part.id)}
                            />
                            
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
                            <hr className="my-4 border-gray-100" />
                        </div>
                    ))}

                    <hr className="my-2 border-gray-200" />
                    
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-sm font-bold text-gray-800">Adjust key (Global):</label>
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
            </div>
        </>
    );
};

export default SidePanel;
