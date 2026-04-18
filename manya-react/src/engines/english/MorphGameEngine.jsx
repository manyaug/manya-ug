import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializeMorphData, calculateMorphScoring } from './MorphGame/MorphLogic';
import MorphRenderer from './MorphGame/MorphRenderer';

/**
 * MANYA ENGLISH: MORPH GAME ENGINE v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates speech transformation logic from the cinematic visual stage.
 */

const MorphGameEngine = ({ data, onComplete }) => {
    const [isTransformed, setIsTransformed] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [score, setScore] = useState(0);
    const [hasMorphed, setHasMorphed] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const startTimeRef = useRef(Date.now());
    const config = useMemo(() => initializeMorphData(data), [data]);
    
    const currentWords = isTransformed ? config.indirectWords : config.directWords;
    const hint = isTransformed ? config.indirectHint : config.directHint;

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const handleToggle = (val) => {
        const next = val === '1';
        if (next !== isTransformed) {
            setIsAnimating(true);
            setTimeout(() => {
                setIsTransformed(next);
                setIsAnimating(false);
                if (!hasMorphed) {
                    setHasMorphed(true);
                    setScore(150);
                    audioService.success?.();
                }
            }, 400);
        }
    };

    const handleFinish = () => {
        const result = calculateMorphScoring(hasMorphed, startTimeRef.current);
        if (onComplete) onComplete({ ...result, total: 150, accuracy: hasMorphed ? 1 : 0 });
    };

    return (
        <MorphRenderer 
            isDark={isDark} isTransformed={isTransformed} isAnimating={isAnimating} 
            score={score} hasMorphed={hasMorphed} themeColor={config.themeColor} 
            currentWords={currentWords} hint={hint} variantTitle={config.variantTitle} 
            handleToggle={handleToggle} onComplete={handleFinish} 
        />
    );
};

MorphGameEngine.hideGlobalFooter = true;
export default MorphGameEngine;
