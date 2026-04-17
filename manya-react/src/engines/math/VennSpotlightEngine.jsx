import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import VennSpotlightRenderer from './VennSpotlightRenderer';
import { detectSpotlightRegion, validateSpotlight } from './VennSpotlightLogic';

/**
 * VENN SPOTLIGHT ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates notation logic from SVG masking visuals.
 */
export default function VennSpotlightEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [litRegions, setLitRegions] = useState(new Set());
    const [errorAnim, setErrorAnim] = useState(false);
    const [isResolved, setIsResolved] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    
    const startTimeRef = useRef(Date.now());
    const containerRef = useRef(null);
    const question = data?.questions?.[currentStep];
    const totalLevels = data?.questions?.length || 1;

    useEffect(() => {
        setLitRegions(new Set());
        setIsResolved(false);
        setErrorAnim(false);
        startTimeRef.current = Date.now();
    }, [currentStep]);

    const handleTap = (e) => {
        if (isResolved) return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        if (clientX === undefined) return;

        const region = detectSpotlightRegion(clientX - rect.left, clientY - rect.top, rect.width, rect.height);

        if (region) {
            setLitRegions(prev => {
                const next = new Set(prev);
                if (next.has(region)) next.delete(region); else next.add(region);
                return next;
            });
            audioService.tap?.();
        }
    };

    const handleCheck = () => {
        if (isResolved) {
            if (currentStep < totalLevels - 1) setCurrentStep(s => s + 1);
            else onComplete?.({ isCorrect: true, score: totalLevels, total: totalLevels, mistakes, type: 'quiz' });
            return;
        }

        const isCorrect = validateSpotlight(litRegions, question.targetRegions);
        const duration = Date.now() - startTimeRef.current;

        onAttempt?.({ isCorrect, label: `Spotlight [${currentStep + 1}]: ${question.notation}`, duration });

        if (isCorrect) {
            setIsResolved(true); audioService.success?.();
            if (currentStep === totalLevels - 1) {
                onResult?.({ isCorrect: true, score: totalLevels, total: totalLevels, mistakes, type: 'quiz' });
            }
        } else {
            setErrorAnim(true); setMistakes(m => m+1); audioService.error?.();
            setTimeout(() => setErrorAnim(false), 800);
        }
    };

    if (!question) return null;

    return (
        <VennSpotlightRenderer 
            question={question} litRegions={litRegions} errorAnim={errorAnim}
            isResolved={isResolved} currentStep={currentStep} totalLevels={totalLevels}
            containerRef={containerRef} handleTap={handleTap} handleCheck={handleCheck}
        />
    );
}
