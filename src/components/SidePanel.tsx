import React from 'react';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import InstrumentSelector from './InstrumentSelector';
import { instruments } from '../constants/instruments';

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    instrument1: string;
    instrument2: string;
    originalInstruments?: { part1: string, part2: string };
    onInstrument1Change: (val: string) => void;
    onInstrument2Change: (val: string) => void;
    isMobile?: boolean;
    
    // New Props
    part1Octave: number;
    onPart1OctaveChange: (val: number) => void;
    part2Octave: number;
    onPart2OctaveChange: (val: number) => void;
    globalTranspose: number;
    onGlobalTransposeChange: (val: number) => void;
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
    instrument1, 
    instrument2, 
    originalInstruments,
    onInstrument1Change, 
    onInstrument2Change,
    isMobile,
    part1Octave,
    onPart1OctaveChange,
    part2Octave,
    onPart2OctaveChange,
    globalTranspose,
    onGlobalTransposeChange
}) => {
    const [activeSelector, setActiveSelector] = React.useState<'none' | 'part1' | 'part2'>('none');

    // Close selectors when panel closes
    React.useEffect(() => {
        if (!isOpen) setActiveSelector('none');
    }, [isOpen]);

    const handleToggle = (selector: 'part1' | 'part2') => {
        setActiveSelector(prev => prev === selector ? 'none' : selector);
    };

    const getLabel = (part: 'part1' | 'part2') => {
        const base = part === 'part1' ? "Part 1 Instrument" : "Part 2 Instrument";
        const origVal = originalInstruments ? originalInstruments[part] : 'none';
        
        if (origVal && origVal !== 'none') {
            const inst = instruments.find(i => i.value === origVal);
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
            <div className={`fixed top-0 right-0 h-full ${isMobile ? 'w-[60%]' : 'w-[40%]'} bg-white shadow-xl transform transition-transform duration-300 z-50 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-bold text-gray-800">Select Instruments</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-4">
                    <InstrumentSelector 
                        label={getLabel('part1')}
                        selectedValue={instrument1}
                        onSelect={onInstrument1Change}
                        isOpen={activeSelector === 'part1'}
                        onToggle={() => handleToggle('part1')}
                    />
                    
                    <OctaveControl value={part1Octave} onChange={onPart1OctaveChange} />

                    <InstrumentSelector 
                        label={getLabel('part2')}
                        selectedValue={instrument2}
                        onSelect={onInstrument2Change}
                        isOpen={activeSelector === 'part2'}
                        onToggle={() => handleToggle('part2')}
                    />

                    <OctaveControl value={part2Octave} onChange={onPart2OctaveChange} />
                    
                    <hr className="my-6 border-gray-200" />
                    
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                             <label className="text-sm font-bold text-gray-800">Adjust key:</label>
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
