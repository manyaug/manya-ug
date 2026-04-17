import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializeLevel, moveObstacle, validateMove, calculateMazeScoring } from './GrammarMaze/MazeLogic';
import MazeRenderer from './GrammarMaze/MazeRenderer';

/**
 * MANYA ENGLISH: GRAMMAR MAZE ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates grid navigation and obstacle logic from the Arcade UI.
 */

const GrammarMazeEngine = ({ data, onComplete }) => {
    const levels = useMemo(() => data?.levels || [], [data]);
    const [lvlIdx, setLvlIdx] = useState(0);
    const [playerPos, setPlayerPos] = useState({ r: 0, c: 0 });
    const [lives, setLives] = useState(5);
    const [score, setScore] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [feedback, setFeedback] = useState(null); 
    const [obstacles, setObstacles] = useState([]);
    const [showFinish, setShowFinish] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const globalStartTimeRef = useRef(Date.now());
    const currentLvl = levels[lvlIdx];

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // 1. Initialize Level
    const initLevel = useCallback((idx) => {
        const lvl = levels[idx];
        if (!lvl) return;
        const { startPos, obstacles } = initializeLevel(lvl);
        setPlayerPos(startPos);
        setObstacles(obstacles);
        setFeedback(null);
        setIsGameOver(false);
    }, [levels]);

    useEffect(() => { initLevel(lvlIdx); }, [lvlIdx, initLevel]);

    // 2. Obstacle Movement & Collision Loop
    useEffect(() => {
        if (isGameOver || showFinish) return;
        const interval = setInterval(() => {
            setObstacles(prev => prev.map(obs => {
                const next = moveObstacle(obs);
                if (next.r === playerPos.r && next.c === playerPos.c) handleHit();
                return next;
            }));
        }, 600);
        return () => clearInterval(interval);
    }, [playerPos, isGameOver, showFinish]);

    const handleHit = useCallback(() => {
        setLives(l => {
            const next = Math.max(0, l - 1);
            if (next === 0) setIsGameOver(true);
            return next;
        });
        setFeedback({ type: 'error', msg: 'OUCH! Guard hit!' });
        setTotalMistakes(m => m + 1);
        audioService.error?.();
        
        // Reset player
        const { startPos } = initializeLevel(levels[lvlIdx]);
        setPlayerPos(startPos);
    }, [levels, lvlIdx]);

    const attemptMove = useCallback((dr, dc) => {
        if (isGameOver || showFinish || feedback?.type === 'success') return;
        
        const rows = currentLvl?.maze?.length || 0;
        const cols = currentLvl?.maze?.[0]?.length || 0;
        const { isValid, r, c } = validateMove(dr, dc, playerPos, currentLvl.maze, rows, cols);

        if (!isValid) return;
        setPlayerPos({ r, c });

        // Check Answer Gate
        const gate = currentLvl.answers.find(ans => ans.r === r && ans.c === c);
        if (gate) {
            if (gate.isCorrect) {
                setScore(s => s + 250);
                setFeedback({ type: 'success', msg: '🌟 CORRECT!' });
                audioService.success?.();
                setTimeout(() => {
                    if (lvlIdx < levels.length - 1) setLvlIdx(i => i + 1);
                    else setShowFinish(true);
                }, 1000);
            } else {
                handleHit();
            }
        }

        // Check Obstacle collision
        if (obstacles.some(obs => obs.r === r && obs.c === c)) handleHit();
    }, [playerPos, currentLvl, obstacles, isGameOver, showFinish, feedback, handleHit, lvlIdx, levels.length]);

    // Input Listeners
    useEffect(() => {
        const handleKeys = (e) => {
            switch (e.key) {
                case 'ArrowUp': case 'w': attemptMove(-1, 0); break;
                case 'ArrowDown': case 's': attemptMove(1, 0); break;
                case 'ArrowLeft': case 'a': attemptMove(0, -1); break;
                case 'ArrowRight': case 'd': attemptMove(0, 1); break;
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [attemptMove]);

    const handleFinish = () => {
        const final = calculateMazeScoring(true, score, totalMistakes, levels.length, globalStartTimeRef.current);
        if (onComplete) onComplete(final);
    };

    const handleRetry = () => {
        setLvlIdx(0); setLives(5); setScore(0); setShowFinish(false); setIsGameOver(false);
    };

    return (
        <MazeRenderer 
            isDark={isDark} lvlIdx={lvlIdx} lives={lives} score={score} 
            currentLvl={currentLvl} playerPos={playerPos} obstacles={obstacles} 
            feedback={feedback} attemptMove={attemptMove} data={data} 
            showFinish={showFinish} isGameOver={isGameOver} 
            handleFinish={handleFinish} handleRetry={handleRetry} 
        />
    );
};

GrammarMazeEngine.hideGlobalFooter = true;
export default GrammarMazeEngine;
