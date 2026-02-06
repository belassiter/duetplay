import React from 'react';
import { X, Search, FileMusic, HelpCircle, AlertCircle, Volume2, Info, Mail, Heart, Github, Eye, Bot } from 'lucide-react';

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
    isMobile?: boolean;
}

const FAQItem = ({ question, answer, icon: Icon }: { question: string, answer: React.ReactNode, icon?: React.ElementType }) => (
    <div className="mb-6">
        <h4 className="font-semibold text-gray-800 flex items-start gap-2 mb-1">
            {Icon && <Icon size={18} className="text-blue-500 mt-0.5 shrink-0" />}
            {question}
        </h4>
        <div className="text-gray-600 text-sm ml-7 leading-relaxed">{answer}</div>
    </div>
);

const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose, isMobile }) => {
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
            <div className={`fixed top-0 right-0 h-full ${isMobile ? 'w-full max-w-full' : 'w-[500px] max-w-[80vw]'} bg-[#f5faff] shadow-xl transform transition-transform duration-300 z-50 flex flex-col ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="flex justify-between items-center p-4 border-b bg-blue-100">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="text-blue-600" />
                        <h2 className="text-lg font-bold text-gray-800">Help & FAQ</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-900 mb-2">Welcome!</h3>
                        <p className="text-sm text-blue-800 mb-2">
                            Have you ever wanted to play with a small ensemble, but didn't have sheet music for your instruments? We can can accommodate a wide variety of instruments, so you can play to your heart's desire.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold border-b pb-2 mb-4">How to Use</h3>
                        
                        <div className="flex gap-3 mb-4">
                            <div className="bg-white p-2 rounded h-fit shrink-0 shadow-sm border border-blue-100"><Search size={20} className="text-blue-500" /></div>
                            <div>
                                <strong className="block text-gray-800">1. Select a Song</strong>
                                <p className="text-sm text-gray-600">Browse the library by title, composer, or difficulty.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mb-4">
                            <div className="bg-white p-2 rounded h-fit shrink-0 shadow-sm border border-blue-100"><FileMusic size={20} className="text-blue-500" /></div>
                            <div>
                                <strong className="block text-gray-800">2. Configure Instruments</strong>
                                <p className="text-sm text-gray-600">Open <strong>Select Instruments</strong> to choose your instrument for each Part. The score will automatically transpose!</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mb-6">
                            <div className="bg-white p-2 rounded h-fit shrink-0 shadow-sm border border-blue-100"><AlertCircle size={20} className="text-blue-500" /></div>
                            <div>
                                <strong className="block text-gray-800">3. Adjust Range</strong>
                                <p className="text-sm text-gray-600">Use the octave and key adjustment controls if the notes are too high or low for your instrument. The range for each instrument is shown below.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mb-6">
                            <div className="bg-white p-2 rounded h-fit shrink-0 shadow-sm border border-blue-100"><Eye size={20} className="text-blue-500" /></div>
                            <div>
                                <strong className="block text-gray-800">4. Display Score or Parts</strong>
                                <p className="text-sm text-gray-600">Click on the <strong>Score</strong> button to toggle between displaying the score or invidiual parts. This is useful if each person is playing on a separate device.</p>
                            </div>
                        </div>                        

                        <h3 className="text-lg font-bold border-b pb-2 mb-4 mt-8">FAQ</h3>

                        <FAQItem 
                            icon={Volume2}
                            question="Can this play audio?"
                            answer="Not at the moment. The first priority was to generate custom sheet music for duets."
                        />
                        
                        <FAQItem 
                            icon={Info}
                            question="Did you know it's incorrectly dealing with mid-song key changes for transposed parts?"
                            answer="Yes, that's a known bug. That turned out to be a lot more complicated than I expected."
                        />

                         <FAQItem 
                            icon={Mail}
                            question="I wish it had more songs!"
                            answer={<>I'm putting some work into sourcing more music. If you have any MusicXML (.mxl) files, you're welcome to send them to <a href="mailto:brian@esquartet.com" className="text-blue-600 hover:underline">brian@esquartet.com</a></>}
                        />

                         <FAQItem 
                            icon={Heart}
                            question="Shouldn't you be charging money for this, or at least show ads?"
                            answer="This is my gift to you. Spread the word!"
                        />

                         <FAQItem 
                            icon={FileMusic}
                            question="I wish I could load my own mxl files!"
                            answer="That may be possible in future versions."
                        />

                         <FAQItem 
                            icon={Bot}
                            question="How did you write all of this code?"
                            answer="Copilot wrote pretty much all of the code, so making v1 of this app only took ~5 hours."
                        />
                                                
                        <FAQItem 
                            icon={Github}
                            question="Where can I find the source code?"
                            answer={<a href="https://github.com/belassiter/duetplay/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">https://github.com/belassiter/duetplay/</a>}
                        />

                    </div>
                    
                    <div className="text-center text-xs text-gray-400 mt-12 mb-4">
                        v{import.meta.env.VITE_APP_VERSION || '1.0.4'}
                    </div>
                </div>
            </div>
        </>
    );
};

export default HelpPanel;
