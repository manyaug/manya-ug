import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializeTenseData, validateTenseSelection, calculateTenseScoring } from './TenseTreehouse/TenseLogic';
import TenseRenderer from './TenseTreehouse/TenseRenderer';

/**
 * MANYA ENGLISH: TENSE TREEHOUSE ENGINE v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates temporal categorization logic from the treehouse climbing visuals.
 */

const TenseTreehouseEngine = ({ data, onComplete }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [phase, setPhase] = useState('active'); // 'active' | 'success' | 'finish'
    const [error, setError] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const startTimeRef = useRef(Date.now());
    const initialData = useMemo(() => initializeTenseData(data), [data]);
    const q = initialData.queries[currentIdx];

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const handleSelect = (opt) => {
        if (phase !== 'active') return;
        setSelectedOption(opt);

        const isCorrect = validateTenseSelection(opt, q.correct);

        if (isCorrect) {
            audioService.success?.();
            setError(false);
            if (currentIdx < initialData.queries.length - 1) {
                setPhase('success');
                setTimeout(() => {
                    setCurrentIdx(prev => prev + 1);
                    setSelectedOption(null);
                    setPhase('active');
                }, 1500);
            } else {
                setPhase('finish');
            }
        } else {
            audioService.error?.();
            setTotalMistakes(prev => prev + 1);
            setError(true);
            setTimeout(() => setError(false), 1000);
        }
    };

    const handleFinishResult = () => {
        const result = calculateTenseScoring(totalMistakes, initialData.queries.length, startTimeRef.current);
        if (onComplete) onComplete(result);
    };

    return (
        <TenseRenderer 
            isDark={isDark} currentIdx={currentIdx} totalQueries={initialData.queries.length} 
            selectedOption={selectedOption} phase={phase} error={error} q={q} 
            handleSelect={handleSelect} onComplete={handleFinishResult} 
        />
    );
};

TenseTreehouseEngine.hideGlobalFooter = true;
export default TenseTreehouseEngine;
