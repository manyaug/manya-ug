import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { assetUrl } from '../../config/assetUrls';
import '../../styles/gallery-study.css';

/**
 * Resolves image paths
 */
const resolveImageUrl = (src) => {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return assetUrl(src.replace(/^\//, '').replace(/^assets\//, ''));
};

/**
 * GALLERY STUDY ENGINE (React Port) - v3.0 (Immersive Refactor)
 * -----------------------------------------------------------
 */
export function GalleryStudyEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [visitedIndices, setVisitedIndices] = useState(new Set([0]));
    const [imageLoaded, setImageLoaded] = useState(false);
    
    const startTimeRef = React.useRef(Date.now());

    const slides = useMemo(() => data?.slides || [], [data]);
    const currentSlide = slides[currentIdx];
    const isFirstSlide = currentIdx === 0;
    const isLastSlide = currentIdx === slides.length - 1;
    const allSeen = visitedIndices.size === slides.length;

    // ── IMAGE PRELOADING ──────────────────────────────────────────────────────
    useEffect(() => {
        if (currentIdx + 1 < slides.length) {
            const nextImg = new Image();
            nextImg.src = resolveImageUrl(slides[currentIdx + 1].image);
        }
        if (currentIdx - 1 >= 0) {
            const prevImg = new Image();
            prevImg.src = resolveImageUrl(slides[currentIdx - 1].image);
        }
    }, [currentIdx, slides]);

    // ── PROGRESS TRACKER ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!visitedIndices.has(currentIdx)) {
            setVisitedIndices(prev => new Set([...prev, currentIdx]));
        }
    }, [currentIdx, visitedIndices]);

    if (!currentSlide) return <div className="p-8 text-center text-red-500 font-bold">No slides found.</div>;

    const handleNext = () => {
        const duration = Date.now() - startTimeRef.current;
        
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
            if (onResult) onResult({ isCorrect: true, score: slides.length, total: slides.length, type: 'study' });
            if (onComplete) onComplete({ isCorrect: true, score: slides.length, total: slides.length, type: 'study' });
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
        <div className="gallery-engine-root immersive-root animate-in fade-in duration-700">
            
            <main className="ge-stage">
                <div className="ge-card">
                    
                    {/* Progress Indicator */}
                    <div className="ge-progress-dots">
                        {slides.map((_, i) => (
                            <div 
                                key={i}
                                className={`ge-dot ${i === currentIdx ? 'active' : visitedIndices.has(i) ? 'visited' : ''}`}
                            />
                        ))}
                    </div>

                    <div className="ge-title-wrap">
                        <h2 className="ge-title animate-in slide-in-from-top-4 duration-500">
                            {currentSlide.title}
                        </h2>
                    </div>

                    {/* Image Viewport */}
                    <div className="ge-viewport" onClick={toggleDrawer}>
                        <img 
                            key={currentIdx}
                            src={resolveImageUrl(currentSlide.image)} 
                            alt={currentSlide.title}
                            onLoad={() => setImageLoaded(true)}
                            className={`ge-image ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 translate-y-4'}`}
                        />

                        {/* Navigation Overlay (Internal) */}
                        <div className="ge-nav-overlay">
                            <button 
                                className="ge-nav-btn" 
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                disabled={isFirstSlide}
                            >
                                <ChevronLeft strokeWidth={3} size={28} />
                            </button>
                            <button 
                                className={`ge-nav-btn ${!visitedIndices.has(currentIdx + 1) && !isLastSlide ? 'pulse' : ''}`}
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            >
                                {isLastSlide ? <Check strokeWidth={3} size={28} /> : <ChevronRight strokeWidth={3} size={28} />}
                            </button>
                        </div>
                    </div>

                    {/* Detail Drawer */}
                    <div className={`ge-drawer ${isExpanded ? '' : 'collapsed'}`}>
                        <div className="ge-drawer-handle" onClick={toggleDrawer}>
                            <div className="ge-handle-bar" />
                            <button className="ge-view-btn">
                                {isExpanded ? 'TAP TO MINIMIZE' : <><Sparkles size={16} /> VIEW DETAILS</>}
                            </button>
                        </div>

                        <div className="ge-drawer-content scroll-smooth">
                            <div className="ge-insight-pill">
                                <div className="ge-insight-icon"><Sparkles size={18} /></div>
                                <div className="ge-insight-text">
                                    <b>Manya Insight</b>
                                    <p>Read carefully! You must view every card to complete this quest.</p>
                                </div>
                            </div>
                            
                            <div 
                                className="ge-description animate-in fade-in duration-1000"
                                dangerouslySetInnerHTML={{ __html: currentSlide.description }}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

GalleryStudyEngine.hideGlobalFooter = true;
export default GalleryStudyEngine;
