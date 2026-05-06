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
    const [selectionMode, setSelectionMode] = useState(true); // Must select changed words first
    const [userSelectedIds, setUserSelectedIds] = useState(new Set());
    const [errorCount, setErrorCount] = useState(0);
    const [showCorrection, setShowCorrection] = useState(false);

    const startTimeRef = useRef(Date.now());
    const config = useMemo(() => {
        const result = initializeMorphData(data);
        console.log(`🧠 [MorphEngine] Initialized with Data:`, {
            incoming: data,
            parsed: result
        });
        return result;
    }, [data]);
    
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

    const handleWordClick = (id) => {
        if (!selectionMode || isTransformed) return;
        
        setUserSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else {
                next.add(id);
                audioService.playSFX('tap');
            }
            return next;
        });
    };

    const validateSelection = () => {
        const correctIds = config.directWords.filter(w => w.changed).map(w => w.id);
        const userIds = Array.from(userSelectedIds);
        
        const missed = correctIds.filter(id => !userSelectedIds.has(id));
        const extra = userIds.filter(id => !correctIds.includes(id));

        if (missed.length === 0 && extra.length === 0) {
            setSelectionMode(false);
            audioService.success?.();
        } else {
            setErrorCount(s => s + 1);
            audioService.error?.();
            setShowCorrection(true);
            setTimeout(() => setShowCorrection(false), 2000);
        }
    };

    const handleToggle = (val) => {
        if (selectionMode) {
            validateSelection();
            return;
        }

        const next = val === '1';
        if (next !== isTransformed) {
            setIsAnimating(true);
            setTimeout(() => {
                setIsTransformed(next);
                setIsAnimating(false);
                if (!hasMorphed) {
                    setHasMorphed(true);
                    setScore(Math.max(50, 150 - (errorCount * 20)));
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
            selectionMode={selectionMode} userSelectedIds={userSelectedIds}
            handleWordClick={handleWordClick} showCorrection={showCorrection}
        />
    );
};

MorphGameEngine.hideGlobalFooter = true;
export default MorphGameEngine;
