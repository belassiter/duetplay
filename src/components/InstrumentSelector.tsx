import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { instruments } from '../constants/instruments';

interface InstrumentSelectorProps {
    label: string;
    onSelect: (instrumentValue: string) => void;
    selectedValue: string;
    isOpen: boolean;
    onToggle: () => void;
}

const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({ 
    label, 
    onSelect, 
    selectedValue,
    isOpen,
    onToggle
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInstruments = useMemo(() => {
        if (!searchTerm) return instruments.slice(0, 50); 
        return instruments.filter(inst => 
            inst.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const selectedInstrument = instruments.find(i => i.value === selectedValue);

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <div 
                    className="w-full border rounded px-3 py-2 bg-white cursor-pointer flex justify-between items-center"
                    onClick={onToggle}
                >
                    <span className={selectedInstrument ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedInstrument ? selectedInstrument.name : 'Select Instrument...'}
                    </span>
                    <Search size={16} className="text-gray-400" />
                </div>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b">
                            <input
                                type="text"
                                className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Search instruments..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {filteredInstruments.map((inst) => (
                            <div 
                                key={inst.value}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${
                                    selectedValue === inst.value ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                    onSelect(inst.value);
                                    // onToggle(); // Let parent handle closing if needed, or keeping open? 
                                    // Actually usually selection closes it.
                                    onToggle(); 
                                    setSearchTerm('');
                                }}
                            >
                                {inst.label}
                            </div>
                        ))}
                        {filteredInstruments.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500">No instruments found</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstrumentSelector;
