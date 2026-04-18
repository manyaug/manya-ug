import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializeMemoryDeck, checkMatch, calculateMemoryScoring } from './MemoryMatch/MemoryLogic';
import MemoryRenderer from './MemoryMatch/MemoryRenderer';

/**
 * MANYA ENGLISH: MEMORY MATCH ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates card-shuffling and match logic from the 3D visual layer.
 */

const MemoryMatchEngine = ({ data, onComplete }) => {
    const [cards, setCards] = useState([]);
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [matches, setMatches] = useState(new Set());
    const [lockBoard, setLockBoard] = useState(false);
    const [score, setScore] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const startTimeRef = useRef(Date.now());
    const hint = data?.hint || "Find the matching pairs!";

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
        if (!data?.pairs) return;
        setCards(initializeMemoryDeck(data.pairs));
    }, [data]);

    const handleCardClick = (index) => {
        if (lockBoard || flippedIndices.includes(index) || matches.has(cards[index].pairId)) return;

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setLockBoard(true);
            const [idx1, idx2] = newFlipped;
            const { isMatch, pairId, scoreDelta } = checkMatch(idx1, idx2, cards);

            if (isMatch) {
                setMatches(prev => new Set(prev).add(pairId));
                setScore(s => s + scoreDelta);
                audioService.success?.();
                setFlippedIndices([]);
                setLockBoard(false);
            } else {
                setTimeout(() => {
                    setFlippedIndices([]);
                    setLockBoard(false);
                    setScore(s => Math.max(0, s + scoreDelta));
                    audioService.error?.();
                }, 1000);
            }
        }
    };

    // 2. Win Observer
    useEffect(() => {
        if (cards.length > 0 && matches.size === cards.length / 2) {
            audioService.success?.();
            setTimeout(handleFinish, 1200);
        }
    }, [matches, cards]);

    const resetGame = () => {
        setMatches(new Set());
        setScore(0);
        setFlippedIndices([]);
        setShowFinish(false);
        setCards(initializeMemoryDeck(data.pairs));
    };

    const handleFinish = () => {
        const result = calculateMemoryScoring(score, matches.size, cards.length / 2, startTimeRef.current);
        if (onComplete) onComplete({ ...result, total: cards.length / 2, isCorrect: true });
    };

    return (
        <MemoryRenderer 
            isDark={isDark} score={score} hint={hint} cards={cards} 
            flippedIndices={flippedIndices} matches={matches} 
            handleCardClick={handleCardClick} showFinish={showFinish} 
            onComplete={handleFinish} resetGame={resetGame} 
        />
    );
};

MemoryMatchEngine.hideGlobalFooter = true;
export default MemoryMatchEngine;
