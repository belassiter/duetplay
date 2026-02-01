import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Music2, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import type { Song } from '../types/song';
import songsData from '../data/songs.json';

interface MultiSelectDropdownProps {
    label: string;
    options: string[];
    selectedValues: string[];
    onChange: (vals: string[]) => void;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (opt: string) => {
        if (selectedValues.includes(opt)) {
            onChange(selectedValues.filter(v => v !== opt));
        } else {
            onChange([...selectedValues, opt]);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`border rounded px-3 py-2 text-sm flex items-center gap-2 transition-colors ${selectedValues.length > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-700'}`}
            >
                {label}
                {selectedValues.length > 0 && (
                    <span className="bg-blue-200 text-blue-800 text-xs px-1.5 rounded-full min-w-[1.2em] text-center">
                        {selectedValues.length}
                    </span>
                )}
                <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto p-1">
                    {options.map(opt => (
                        <div 
                            key={opt} 
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer rounded text-sm text-gray-700"
                            onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}
                        >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedValues.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                {selectedValues.includes(opt) && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span>{opt}</span>
                        </div>
                    ))}
                    {options.length === 0 && <div className="p-2 text-gray-500 text-sm">No options available</div>}
                </div>
            )}
        </div>
    );
};


interface SongSelectorPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSong: (song: Song) => void;
    isMobile?: boolean;
    isLandscape?: boolean;
}

const songs = songsData as Song[];

const SongSelectorPanel: React.FC<SongSelectorPanelProps> = ({ isOpen, onClose, onSelectSong, isMobile, isLandscape }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [styleFilters, setStyleFilters] = useState<string[]>([]);
    const [difficultyFilters, setDifficultyFilters] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Song | null, direction: 'asc' | 'desc' }>({ key: 'title', direction: 'asc' });

    // Unique options for filters
    const styles = useMemo(() => Array.from(new Set(songs.map(s => s.style).filter(Boolean))), []);
    const difficulties = useMemo(() => Array.from(new Set(songs.map(s => s.difficulty).filter(Boolean))), []);

    const handleSort = (key: keyof Song) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Song) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400 ml-1 inline" />;
        return sortConfig.direction === 'asc' 
            ? <ArrowUp size={14} className="text-blue-600 ml-1 inline" /> 
            : <ArrowDown size={14} className="text-blue-600 ml-1 inline" />;
    };

    const filteredAndSortedSongs = useMemo(() => {
        const result = songs.filter(song => {
            const matchesSearch = searchTerm === '' || 
                song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                song.composer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                song.arranger.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStyle = styleFilters.length === 0 || (song.style && styleFilters.includes(song.style));
            const matchesDifficulty = difficultyFilters.length === 0 || (song.difficulty && difficultyFilters.includes(song.difficulty));

            return matchesSearch && matchesStyle && matchesDifficulty;
        });

        if (sortConfig.key) {
            const key = sortConfig.key as keyof Song;
            result.sort((a, b) => {
                const valA = a[key];
                const valB = b[key];

                const aStr = (valA !== null && valA !== undefined ? valA : '').toString().toLowerCase();
                const bStr = (valB !== null && valB !== undefined ? valB : '').toString().toLowerCase();
                
                if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [searchTerm, styleFilters, difficultyFilters, sortConfig]);

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
            <div className={`fixed top-0 left-0 h-full ${isMobile ? 'w-full max-w-full' : 'w-[75%] max-w-[75vw]'} bg-white shadow-xl transform transition-transform duration-300 z-50 flex flex-col ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className={`flex justify-between items-center ${isMobile && isLandscape ? 'p-2' : 'p-4'} border-b bg-gray-50`}>
                    <div className="flex items-center gap-2">
                        <Music2 className="text-blue-600" />
                        <h2 className="text-lg font-bold text-gray-800">Select Song</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Search & Filter Bar */}
                <div className={`${isMobile && isLandscape ? 'p-2 gap-2 flex-row items-center' : 'p-4 flex-col gap-4'} border-b flex`}>
                    <div className={`relative ${isMobile && isLandscape ? 'flex-1' : 'w-full'}`}>
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search title, composer, arranger..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <div className={`flex gap-4 ${isMobile && isLandscape ? 'items-center' : 'justify-end'}`}>
                        <MultiSelectDropdown 
                            label="Styles"
                            options={styles as string[]}
                            selectedValues={styleFilters}
                            onChange={setStyleFilters}
                        />
                        
                        <MultiSelectDropdown 
                            label="Difficulty"
                            options={difficulties as string[]}
                            selectedValues={difficultyFilters}
                            onChange={setDifficultyFilters}
                        />
                        
                        {(searchTerm || styleFilters.length > 0 || difficultyFilters.length > 0) && (
                            <button 
                                onClick={() => { setSearchTerm(''); setStyleFilters([]); setDifficultyFilters([]); }}
                                className="text-sm text-blue-600 hover:underline self-center"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-4">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-200 text-sm text-gray-600 uppercase tracking-wider sticky top-0 bg-white shadow-sm">
                                <th 
                                    className="p-3 cursor-pointer hover:bg-gray-100 transition-colors w-[30%]"
                                    onClick={() => handleSort('title')}
                                >
                                    Title {getSortIcon('title')}
                                </th>
                                {(!isMobile || isLandscape) && (
                                <th 
                                    className="p-3 cursor-pointer hover:bg-gray-100 transition-colors w-[20%]"
                                    onClick={() => handleSort('composer')}
                                >
                                    {isMobile && isLandscape ? 'Composer / Arranger' : 'Composer'} {getSortIcon('composer')}
                                </th>
                                )}
                                {!isMobile && (
                                <th 
                                    className="p-3 cursor-pointer hover:bg-gray-100 transition-colors w-[20%]"
                                    onClick={() => handleSort('arranger')}
                                >
                                    Arranger {getSortIcon('arranger')}
                                </th>
                                )}
                                <th className="p-3 w-[10%]">Style</th>
                                <th className="p-3 w-[10%]">Difficulty</th>
                                <th className="p-3 w-[20%]">Parts</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-700">
                            {filteredAndSortedSongs.length > 0 ? (
                                filteredAndSortedSongs.map((song) => (
                                    <tr 
                                        key={song.id} 
                                        onClick={() => onSelectSong(song)}
                                        className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                                    >
                                        <td className="p-3 font-medium text-gray-900 align-top">{song.title}</td>

                                        {(!isMobile || isLandscape) && (
                                        <td className="p-3 align-top max-w-[180px]">
                                            {isMobile && isLandscape ? (
                                              <>
                                                <div className="truncate font-medium" title={song.composer}>{song.composer}</div>
                                                <div className="truncate text-xs text-gray-500" title={song.arranger}>{song.arranger}</div>
                                               </>
                                            ) : (
                                                <div className="truncate" title={song.composer}>{song.composer}</div>
                                            )}
                                        </td>
                                        )}

                                        {!isMobile && (
                                        <td className="p-3 text-gray-500 align-top max-w-[180px]">
                                            <div className="truncate" title={song.arranger}>{song.arranger}</div>
                                        </td>
                                        )}

                                        <td className="p-3 align-top whitespace-nowrap">
                                            {song.style && (
                                                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                                    {song.style}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 align-top whitespace-nowrap">
                                            {song.difficulty && (
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    song.difficulty.toLowerCase().includes('easy') ? 'bg-green-100 text-green-800' :
                                                    song.difficulty.toLowerCase().includes('hard') ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {song.difficulty}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-gray-700 align-top max-w-[180px]">
                                            {song.instruments.map((inst, i) => (
                                                <div key={i} className="truncate" title={inst}>{inst}</div>
                                            ))}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No songs found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer status */}
                <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 text-right">
                    Showing {filteredAndSortedSongs.length} of {songs.length} songs
                </div>
            </div>
        </>
    );
};

export default SongSelectorPanel;
