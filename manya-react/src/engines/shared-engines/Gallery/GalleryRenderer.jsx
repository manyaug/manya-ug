import React from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';

export default function GalleryRenderer({
    slides,
    currentIdx,
    visitedIndices,
    imageLoaded,
    isExpanded,
    currentSlide,
    isFirstSlide,
    isLastSlide,
    onNext,
    onPrev,
    onToggleDrawer,
    onImageLoad,
    resolveImageUrl
}) {
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
                    <div className="ge-viewport" onClick={onToggleDrawer}>
                        <img 
                            key={currentIdx}
                            src={resolveImageUrl(currentSlide.image)} 
                            alt={currentSlide.title}
                            onLoad={onImageLoad}
                            className={`ge-image ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 translate-y-4'}`}
                        />

                        {/* Navigation Overlay (Internal) */}
                        <div className="ge-nav-overlay">
                            <button 
                                className="ge-nav-btn" 
                                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                                disabled={isFirstSlide}
                            >
                                <ChevronLeft strokeWidth={3} size={28} />
                            </button>
                            <button 
                                className={`ge-nav-btn ${!visitedIndices.has(currentIdx + 1) && !isLastSlide ? 'pulse' : ''}`}
                                onClick={(e) => { e.stopPropagation(); onNext(); }}
                            >
                                {isLastSlide ? <Check strokeWidth={3} size={28} /> : <ChevronRight strokeWidth={3} size={28} />}
                            </button>
                        </div>
                    </div>

                    {/* Detail Drawer */}
                    <div className={`ge-drawer ${isExpanded ? '' : 'collapsed'}`}>
                        <div className="ge-drawer-handle" onClick={onToggleDrawer}>
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
