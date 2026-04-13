import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { assetUrl } from '../../config/assetUrls';

/**
 * Resolves image paths:
 * - Full URLs (https://...) → pass through
 * - Relative paths (assets/science/...) → resolve via Supabase CDN
 * - Root-relative paths (/content/...) → pass through
 */
const resolveImageUrl = (src) => {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    // Map any relative or local-style paths to the CDN
    return assetUrl(src.replace(/^\//, '').replace(/^assets\//, ''));
};

/**
 * GALLERY STUDY ENGINE (React Port) - v2.1
 * -----------------------------------------
 * World-class educational gallery with:
 * - Zero-lag preloading
 * - Conditional completion (must see all slides)
 * - Premium Glassmorphism & Micro-animations
 * - Full Dark/Light Theme support
 */
export function GalleryStudyEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [visitedIndices, setVisitedIndices] = useState(new Set([0]));
    const [imageLoaded, setImageLoaded] = useState(false);
    
    const startTimeRef = React.useRef(Date.now());

    const slides = useMemo(() => data?.slides || [], [data]);
    const currentSlide = slides[currentIdx];
    const isLastSlide = currentIdx === slides.length - 1;
    const allSeen = visitedIndices.size === slides.length;

    // ── IMAGE PRELOADING ──────────────────────────────────────────────────────
    useEffect(() => {
        // Preload next image for instant transitions
        if (currentIdx + 1 < slides.length) {
            const nextImg = new Image();
            nextImg.src = resolveImageUrl(slides[currentIdx + 1].image);
        }
        // Preload previous
        if (currentIdx - 1 >= 0) {
            const prevImg = new Image();
            prevImg.src = resolveImageUrl(slides[currentIdx - 1].image);
        }
    }, [currentIdx, slides]);

    // ── COMPLETION LOGIC ──────────────────────────────────────────────────────
    useEffect(() => {
        // Update visited set
        if (!visitedIndices.has(currentIdx)) {
            setVisitedIndices(prev => new Set([...prev, currentIdx]));
        }
    }, [currentIdx]);

    if (!currentSlide) return <div className="p-8 text-center text-red-500 font-bold">No slides found.</div>;

    const handleNext = () => {
        const duration = Date.now() - startTimeRef.current;
        
        // ── RECORD GRANULAR ATTEMPT (Viewed Card) ──
        if (onAttempt) {
            onAttempt({
                isCorrect: true,
                label: `Gallery Slide: ${currentSlide.title || currentIdx + 1}`,
                duration,
                mistakes: 0
            });
        }

        if (currentIdx < slides.length - 1) {
            setCurrentIdx(idx => idx + 1);
            setImageLoaded(false);
            setIsExpanded(false);
            startTimeRef.current = Date.now();
        } else if (allSeen) {
            if (onResult) {
                onResult({
                    isCorrect: true,
                    score: visitedIndices.size,
                    total: slides.length,
                    type: 'study'
                });
            }
            if (onComplete) onComplete({
                isCorrect: true,
                score: visitedIndices.size,
                total: slides.length,
                type: 'study'
            });
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) {
            setCurrentIdx(idx => idx - 1);
            setImageLoaded(false);
            setIsExpanded(false);
        }
    };

    const toggleDrawer = () => setIsExpanded(!isExpanded);

    return (
        <div className="gallery-engine-root relative w-full h-full bg-[var(--bg-main)] font-['Plus_Jakarta_Sans',_sans-serif] overflow-hidden flex flex-col transition-colors duration-500">
            
            {/* STAGE AREA */}
            <main className="flex-1 flex flex-col p-[10px_15px] relative overflow-hidden">
                <div className="flex-1 bg-[var(--bg-card)] rounded-[40px] border-[2px] border-[var(--border-subtle)] relative overflow-hidden shadow-premium flex flex-col">
                    
                    {/* PROGRESS BAR (Modern) */}
                    <div className="flex flex-col gap-4 p-6 items-center z-10">
                        <div className="flex gap-1.5 justify-center items-center">
                            {slides.map((_, i) => (
                                <div 
                                    key={i}
                                    className={`h-1.5 transition-all duration-700 ease-spring rounded-full ${
                                        i === currentIdx 
                                        ? 'w-10 bg-[#7c3aed] shadow-glow-purple' 
                                        : visitedIndices.has(i)
                                            ? 'w-4 bg-[#10B981]'
                                            : 'w-2 bg-[var(--text-muted)] opacity-30'
                                    }`}
                                />
                            ))}
                        </div>
                        <h2 className="text-xl font-black text-[var(--text-main)] text-center animate-in fade-in slide-in-from-top-2 duration-700">
                            {currentSlide.title}
                        </h2>
                    </div>

                    {/* SIDE NAVIGATION (Glassmorphism) */}
                    <div className="absolute top-[50%] -translate-y-1/2 w-full flex justify-between px-4 pointer-events-none z-[1000]">
                        <button 
                            className="w-12 h-12 rounded-2xl bg-[var(--bg-main)] text-[#7c3aed] flex items-center justify-center shadow-glass border border-[var(--border-subtle)] transition-all active:scale-90 hover:scale-105 disabled:opacity-0 disabled:scale-90 pointer-events-auto"
                            onClick={handlePrev}
                            disabled={currentIdx === 0}
                        >
                            <ChevronLeft strokeWidth={3.5} size={24} />
                        </button>
                        <button 
                            className={`w-12 h-12 rounded-2xl bg-[var(--bg-main)] text-[#7c3aed] flex items-center justify-center shadow-glass border border-[var(--border-subtle)] transition-all active:scale-90 hover:scale-105 pointer-events-auto ${!visitedIndices.has(currentIdx + 1) && !isLastSlide ? 'animate-pulse shadow-glow-purple' : ''}`}
                            onClick={handleNext}
                        >
                            {isLastSlide ? <Check strokeWidth={3.5} size={24} /> : <ChevronRight strokeWidth={3.5} size={24} />}
                        </button>
                    </div>

                    {/* IMAGE VIEWPORT */}
                    <div 
                        className="flex-1 w-full flex items-center justify-center p-6 cursor-pointer relative group"
                        onClick={toggleDrawer}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-b from-[#7c3aed]/5 to-transparent transition-opacity duration-700 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`} />
                        <img 
                            key={currentIdx} 
                            src={resolveImageUrl(currentSlide.image)} 
                            alt={currentSlide.title}
                            onLoad={() => setImageLoaded(true)}
                            className={`max-w-[90%] max-h-[90%] object-contain rounded-[2.5rem] transition-all duration-700 ease-spring-heavy ${
                                imageLoaded ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'
                            } shadow-2xl group-hover:scale-[1.03] group-active:scale-[0.98]`}
                            style={{ willChange: 'transform, opacity' }}
                        />
                    </div>

                    {/* PREMIUM SOLID DRAWER */}
                    <div 
                        className={`absolute bottom-0 left-0 right-0 h-[65%] bg-[var(--drawer-bg)] z-[1100] rounded-[50px_50px_0_0] border-t-2 border-[var(--border-subtle)] shadow-up transition-all duration-700 ease-spring flex flex-col ${
                            isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-85px)]'
                        }`}
                    >
                        {/* HANDLE AREA (Expands Drawer) */}
                        <div 
                            className="w-full h-24 shrink-0 flex flex-col items-center justify-center cursor-pointer group/handle"
                            onClick={toggleDrawer}
                        >
                            <div className="w-12 h-1.5 bg-[var(--text-muted)] opacity-20 rounded-full mb-5 group-hover/handle:opacity-40 transition-opacity" />
                            <div className="px-8 w-full flex justify-center items-center">
                                <div className={`px-8 py-4 rounded-3xl transition-all duration-300 font-black text-[14px] tracking-widest uppercase flex items-center gap-3 active:scale-95 shadow-xl ${
                                    isExpanded ? 'bg-[var(--bg-main)] text-[var(--text-main)] border-2 border-[var(--border-subtle)]' : 'bg-[#7c3aed] text-white shadow-glow-purple'
                                }`}>
                                    {isExpanded ? 'CLOSE' : <><Sparkles size={18} /> VIEW DETAILS</>}
                                </div>
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto px-8 pb-16 text-[var(--text-sub)] text-[17.5px] leading-[1.7] font-medium scroll-smooth">
                            <div className="bg-[var(--insight-bg)] p-6 rounded-[2.5rem] border-2 border-[var(--insight-border)] mb-8 font-black text-[var(--text-main)] text-[12px] flex items-start gap-5 shadow-sm">
                                <div className="p-2.5 bg-[#7c3aed] rounded-2xl text-white shadow-lg shrink-0">
                                    <Sparkles size={18} />
                                </div>
                                <div className="flex flex-col gap-1.5 pt-0.5">
                                    <span className="tracking-tight text-[#7c3aed] uppercase text-[10px]">MANYA INSIGHT</span>
                                    <span className="opacity-90 font-bold leading-snug text-sm">Swipe up to expand details. You must see all cards to complete this quest.</span>
                                </div>
                            </div>
                            
                            <div 
                                className="prose-manya"
                                dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                            />
                        </div>
                        
                        {/* BOTTOM FADE INDICATOR */}
                        <div className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--drawer-bg)] to-transparent pointer-events-none transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`} />
                    </div>

                </div>
            </main>

            <style>{`
                .gallery-engine-root {
                    background: var(--bg-main);
                    color: var(--text-main);
                    --bg-main: #ffffff;
                    --bg-card: #f0f0f0;
                    --border-subtle: #e0e0e0;
                    --text-main: #1a1a1a;
                    --text-sub: #4a4a4a;
                    --text-muted: #a0a0a0;
                    --glass-bg: #f8fafc;
                    --glass-border: #e2e8f0;
                    --drawer-bg: #ffffff;
                    --insight-bg: #f6f1ff;
                    --insight-border: #e9e0ff;
                }
                
                [data-theme='dark'] .gallery-engine-root {
                    --bg-main: #0B0E14;
                    --bg-card: #1a1f2c;
                    --border-subtle: #2a3040;
                    --text-main: #f8fafc;
                    --text-sub: #cbd5e1;
                    --text-muted: #707070;
                    --glass-bg: #1e293b;
                    --glass-border: #334155;
                    --drawer-bg: #111827;
                    --insight-bg: #251b3d;
                    --insight-border: #3d2d63;
                }

                .shadow-premium { box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08), 0 0 0 1px var(--border-subtle); }
                .shadow-glass { box-shadow: 0 12px 30px -5px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.1); }
                .shadow-up { box-shadow: 0 -25px 50px -12px rgba(0,0,0,0.06); }
                .shadow-glow-purple { box-shadow: 0 0 25px rgba(124,58,237,0.45); }
                
                .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
                .ease-spring-heavy { transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275); }

                .prose-manya b { color: var(--text-main); font-weight: 900; }
                .prose-manya p { margin-bottom: 1.5rem; }
                .prose-manya .rule-box { 
                    margin: 2rem 0; 
                    padding: 1.75rem; 
                    background: #f8f6ff;
                    border-radius: 2rem; 
                    border: 2px dashed #7c3aed;
                    font-size: 1.05rem;
                    line-height: 1.6;
                    color: var(--text-main);
                }
                [data-theme='dark'] .prose-manya .rule-box { background: #1a1526; }
                .prose-manya .rule-box b { color: #7c3aed; }
                
                .prose-manya .danger-box { 
                    margin: 2rem 0; 
                    padding: 1.75rem; 
                    background: #fff5f5;
                    border-radius: 2rem; 
                    border-left: 8px solid #ef4444;
                    font-size: 1.05rem;
                    line-height: 1.6;
                    color: var(--text-main);
                }
                [data-theme='dark'] .prose-manya .danger-box { background: #2d1616; }
                .prose-manya .danger-box b { color: #ef4444; }
            `}</style>
        </div>
    );
}

GalleryStudyEngine.hideGlobalFooter = true;
export default GalleryStudyEngine;
