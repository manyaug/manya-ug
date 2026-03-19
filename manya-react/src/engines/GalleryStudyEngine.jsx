import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

/**
 * GALLERY STUDY ENGINE (React Port)
 * --------------------------------
 * Replaces the legacy vanilla JS gallery engine with a modern, 
 * performant React component.
 */
export default function GalleryStudyEngine({ data, onComplete }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

    const slides = data?.slides || [];
    const currentSlide = slides[currentIdx];

    if (!currentSlide) return <div className="p-8 text-center text-red-500 font-bold">No slides found.</div>;

    const handleNext = () => {
        if (currentIdx < slides.length - 1) {
            setCurrentIdx(idx => idx + 1);
            setIsExpanded(false);
        } else {
            if (onComplete) onComplete();
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) {
            setCurrentIdx(idx => idx - 1);
            setIsExpanded(false);
        }
    };

    const toggleDrawer = () => setIsExpanded(!isExpanded);

    return (
        <div className="relative w-full h-full bg-[#FDFBF7] font-['Plus_Jakarta_Sans',_sans-serif] overflow-hidden flex flex-col">
            
            {/* STAGE AREA */}
            <main className="flex-1 flex flex-col p-[10px_15px] relative overflow-hidden">
                <div className="flex-1 bg-white rounded-[35px] border-[2.5px] border-[#F1F5F9] relative overflow-hidden shadow-[0_15px_45px_rgba(0,0,0,0.03)] flex flex-col">
                    
                    {/* PROGRESS DOTS */}
                    <div className="flex gap-2 p-5 justify-center items-center">
                        {slides.map((_, i) => (
                            <div 
                                key={i}
                                className={`h-2 transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] rounded-full ${
                                    i === currentIdx 
                                    ? 'w-6 bg-[#7c3aed] shadow-[0_0_10px_rgba(124,58,237,0.3)]' 
                                    : 'w-2 bg-[#E2E8F0]'
                                }`}
                            />
                        ))}
                    </div>

                    {/* SIDE NAVIGATION */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-3 pointer-events-none z-[1000]">
                        <button 
                            className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md text-[#7c3aed] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.1)] border-[1.5px] border-[#F1F5F9] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none pointer-events-auto"
                            onClick={handlePrev}
                            disabled={currentIdx === 0}
                        >
                            <ChevronLeft strokeWidth={4} size={20} />
                        </button>
                        <button 
                            className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-md text-[#7c3aed] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.1)] border-[1.5px] border-[#F1F5F9] transition-all active:scale-95 pointer-events-auto"
                            onClick={handleNext}
                        >
                            {currentIdx === slides.length - 1 ? <Check strokeWidth={4} size={20} /> : <ChevronRight strokeWidth={4} size={20} />}
                        </button>
                    </div>

                    {/* IMAGE VIEWPORT */}
                    <div 
                        className="flex-1 w-full flex items-center justify-center p-5 cursor-pointer"
                        onClick={toggleDrawer}
                    >
                        <img 
                            key={currentIdx} // Force animation on index change
                            src={currentSlide.image} 
                            alt={currentSlide.title}
                            className="max-w-full max-h-full object-contain rounded-3xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.08)] animate-[slideScale_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)]"
                        />
                    </div>

                    {/* GLASSMOPHISM DRAWER */}
                    <div 
                        className={`absolute bottom-0 left-0 right-0 h-1/2 bg-white/95 backdrop-blur-2xl z-[1100] rounded-[40px_40px_0_0] border-t-2 border-[#F1F5F9] shadow-[0_-15px_40px_rgba(0,0,0,0.06)] transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] flex flex-col ${
                            isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-75px)]'
                        }`}
                    >
                        <div className="w-10 h-1.5 bg-[#E2E8F0] rounded-full mx-auto my-4 shrink-0 transition-opacity" />
                        
                        <div 
                            className="px-6 pb-4 flex justify-between items-center cursor-pointer shrink-0"
                            onClick={toggleDrawer}
                        >
                            <h3 className="text-lg font-black text-[#1E293B] leading-tight flex-1 pr-4 line-clamp-1">
                                {currentSlide.title}
                            </h3>
                            <div className="px-3 py-1.5 rounded-full bg-[#FCE7F3] text-[#db2777] text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                                {isExpanded ? 'CLOSE' : 'READ NOTES'}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-12 text-[#475569] text-base leading-relaxed">
                            <div className="bg-[#F8FAFC] p-4 rounded-2xl border-l-4 border-[#db2777] mb-5 font-bold text-[#1E293B] text-xs">
                                Manya Insight: Tap notes to close or the image to expand!
                            </div>
                            <div 
                                className="prose prose-slate max-w-none"
                                dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                            />
                        </div>
                    </div>

                </div>
            </main>

            <style>{`
                @keyframes slideScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
}
