import React from 'react';
import { X } from 'lucide-react';
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
}

const SidePanel: React.FC<SidePanelProps> = ({ 
    isOpen, 
    onClose, 
    instrument1, 
    instrument2, 
    originalInstruments,
    onInstrument1Change, 
    onInstrument2Change 
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
            <div className={`fixed top-0 right-0 h-full w-[40%] bg-white shadow-xl transform transition-transform duration-300 z-50 ${
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
                    
                    <InstrumentSelector 
                        label={getLabel('part2')}
                        selectedValue={instrument2}
                        onSelect={onInstrument2Change}
                        isOpen={activeSelector === 'part2'}
                        onToggle={() => handleToggle('part2')}
                    />
                </div>
            </div>
        </>
    );
};

export default SidePanel;
