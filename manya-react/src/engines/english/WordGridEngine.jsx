import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { generateWordGrid, calculateSelection, validateSelection, calculateGridScoring } from './WordGrid/GridLogic';
import GridRenderer from './WordGrid/GridRenderer';

/**
 * MANYA ENGLISH: WORD GRID ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates grid generation and selection logic from the cell-based UI.
 */

const WordGridEngine = ({ data, onComplete }) => {
    const gridSize = data?.size || 8;
    const rawWords = useMemo(() => {
        if (!data?.words) return ["MANYA", "LEARN", "APP"];
        return data.words.map(w => (typeof w === 'string' ? w : w.word).toUpperCase());
    }, [data]);

    const [grid, setGrid] = useState([]);
    const [foundWords, setFoundWords] = useState(new Set());
    const [selection, setSelection] = useState([]); 
    const [foundCoords, setFoundCoords] = useState(new Set()); 
    const [isSelecting, setIsSelecting] = useState(false);
    const [score, setScore] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const startTimeRef = useRef(Date.now());

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // 1. Initialize Level
    const initGrid = useCallback(() => {
        setGrid(generateWordGrid(gridSize, rawWords));
        setFoundWords(new Set());
        setFoundCoords(new Set());
        setScore(0);
        setSeconds(0);
        setShowFinish(false);
        window.QuestRunner?.setIsTyping?.(false);
    }, [gridSize, rawWords]);

    useEffect(() => { initGrid(); }, [initGrid]);

    // Timer
    useEffect(() => {
        const interval = setInterval(() => setSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // 2. Interaction Handlers
    const getPosFromEvent = (e) => {
        const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.dataset.r !== undefined) {
            return { r: parseInt(target.dataset.r), c: parseInt(target.dataset.c) };
        }
        return null;
    };

    const handleStart = (e) => {
        const pos = getPosFromEvent(e);
        if (pos) {
            setIsSelecting(true);
            setSelection([pos]);
        }
    };

    const handleMove = (e) => {
        if (!isSelecting) return;
        const pos = getPosFromEvent(e);
        if (!pos) return;

        const first = selection[0];
        if (!first || (first.r === pos.r && first.c === pos.c && selection.length === 1)) return;

        const nextSelection = calculateSelection(first, pos);
        if (nextSelection) setSelection(nextSelection);
    };

    const handleEnd = () => {
        if (!isSelecting) return;
        setIsSelecting(false);

        const { isMatch, matchedWord } = validateSelection(selection, grid, rawWords, foundWords);
        
        if (isMatch) {
            setFoundWords(prev => {
                const next = new Set(prev).add(matchedWord);
                if (next.size === rawWords.length) {
                    // Logic delay for visual confirmation before finishing
                    setTimeout(handleFinish, 1200);
                }
                return next;
            });
            setFoundCoords(prev => {
                const next = new Set(prev);
                selection.forEach(p => next.add(`${p.r},${p.c}`));
                return next;
            });
            setScore(s => s + 10);
            audioService.success?.();
        } else if (selection.length > 1) {
            audioService.error?.();
        }
        setSelection([]);
    };

    const handleFinish = () => {
        const result = calculateGridScoring(foundWords, rawWords.length, seconds, startTimeRef.current);
        if (onComplete) onComplete({ ...result, total: rawWords.length });
    };

    return (
        <GridRenderer 
            isDark={isDark} gridSize={gridSize} grid={grid} 
            foundWords={foundWords} rawWords={rawWords} 
            selection={selection} foundCoords={foundCoords} 
            seconds={seconds} score={score} showFinish={false} 
            handleStart={handleStart} handleMove={handleMove} handleEnd={handleEnd} 
            onComplete={handleFinish} handleRetry={initGrid} 
        />
    );
};

WordGridEngine.hideGlobalFooter = true;
export default WordGridEngine;
