import React, { useState, useEffect, useMemo, useRef } from 'react';
import GalleryRenderer from './Gallery/GalleryRenderer';
import { 
    resolveImageUrl, 
    getGalleryProgress, 
    calculateGalleryAttempt 
} from './Gallery/GalleryLogic';
import '../../styles/gallery-study.css';

/**
 * GALLERY STUDY ENGINE v4.0 (Atomic)
 * ────────────────────────────────────────────────────
 * - DECOUPLED: Logic (GalleryLogic), Renderer (GalleryRenderer), Controller (Engine)
 */
export function GalleryStudyEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const [visitedIndices, setVisitedIndices] = useState(new Set([0]));
    const [imageLoaded, setImageLoaded] = useState(false);
    
    const startTimeRef = useRef(Date.now());

    const slides = useMemo(() => data?.slides || [], [data]);
    const currentSlide = slides[currentIdx];
    const isFirstSlide = currentIdx === 0;
    const isLastSlide = currentIdx === slides.length - 1;

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

    const handleNext = () => {
        const duration = Date.now() - startTimeRef.current;
        
        onAttempt?.(calculateGalleryAttempt(currentSlide, currentIdx, duration));

        if (currentIdx < slides.length - 1) {
            setCurrentIdx(idx => idx + 1);
            setImageLoaded(false);
            setIsExpanded(false);
            startTimeRef.current = Date.now();
        } else {
            const { isComplete, count } = getGalleryProgress(visitedIndices, slides.length);
            if (isComplete) {
                const result = { isCorrect: true, score: count, total: slides.length, type: 'study' };
                onResult?.(result);
                onComplete?.(result);
            }
        }
    };

    const handlePrev = () => {
        if (currentIdx > 0) {
            setCurrentIdx(idx => idx - 1);
            setImageLoaded(false);
            setIsExpanded(false);
        }
    };

    if (!currentSlide) return <div className="p-8 text-center text-red-500 font-bold">No slides found.</div>;

    return (
        <GalleryRenderer 
            slides={slides}
            currentIdx={currentIdx}
            visitedIndices={visitedIndices}
            imageLoaded={imageLoaded}
            isExpanded={isExpanded}
            currentSlide={currentSlide}
            isFirstSlide={isFirstSlide}
            isLastSlide={isLastSlide}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleDrawer={() => setIsExpanded(!isExpanded)}
            onImageLoad={() => setImageLoaded(true)}
            resolveImageUrl={resolveImageUrl}
        />
    );
}

GalleryStudyEngine.hideGlobalFooter = true;
export default GalleryStudyEngine;
