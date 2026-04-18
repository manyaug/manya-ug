import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializePunctuationData, validatePunctuation, calculatePunctuationScoring } from './PunctuationPortal/PunctuationLogic';
import PunctuationRenderer from './PunctuationPortal/PunctuationRenderer';

/**
 * MANYA ENGLISH: PUNCTUATION PORTAL ENGINE v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates sticker-based UI from sentence validation rules.
 */

const PunctuationPortalEngine = ({ data, onComplete }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [slots, setSlots] = useState([]);
    const [phase, setPhase] = useState('active'); 
    const [isDark, setIsDark] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const startTimeRef = useRef(Date.now());
    const initialData = useMemo(() => initializePunctuationData(data), [data]);

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // 1. Initialize Level
    useEffect(() => {
        if (initialData.queries[currentIdx]) {
            setSlots(initialData.queries[currentIdx].slots.map(s => ({ ...s, current: null })));
            setPhase('active');
        }
    }, [currentIdx, initialData.queries]);

    const handleDrop = (mark) => {
        if (phase !== 'active') return;
        setSlots(prev => {
            const nextSlotIndex = prev.findIndex(s => !s.current);
            if (nextSlotIndex === -1) return prev;
            
            const newSlots = [...prev];
            newSlots[nextSlotIndex] = { ...newSlots[nextSlotIndex], current: mark };
            return newSlots;
        });
    };

    const checkSolution = () => {
        const isCorrect = validatePunctuation(slots);
        if (isCorrect) {
            audioService.success?.();
            if (currentIdx < initialData.queries.length - 1) {
                setPhase('success');
                setTimeout(() => { setCurrentIdx(prev => prev + 1); }, 1500);
            } else {
                setTimeout(handleFinish, 1200);
            }
        } else {
            setTotalMistakes(prev => prev + 1);
            audioService.error?.();
            // Optional: reset slots on error or let user retry
        }
    };

    const handleFinish = () => {
        const finalResult = calculatePunctuationScoring(true, totalMistakes, initialData.queries.length, startTimeRef.current);
        if (onComplete) onComplete(finalResult);
    };

    return (
        <PunctuationRenderer 
            isDark={isDark} currentIdx={currentIdx} slots={slots} 
            phase={phase} totalMistakes={totalMistakes} initialData={initialData} 
            handleDrop={handleDrop} checkSolution={checkSolution} handleFinish={handleFinish} 
        />
    );
};

PunctuationPortalEngine.hideGlobalFooter = true;
export default PunctuationPortalEngine;
