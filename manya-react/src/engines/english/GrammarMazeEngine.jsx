import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { telemetryService } from '../../infrastructure/services/telemetryService.js';

// Decoupled Resources
import { initializeLevel, moveObstacle, validateMove, calculateMazeScoring } from './GrammarMaze/MazeLogic';
import MazeRenderer from './GrammarMaze/MazeRenderer';

/**
 * MANYA ENGLISH: GRAMMAR MAZE ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates grid navigation and obstacle logic from the Arcade UI.
 */

const GrammarMazeEngine = ({ data, onComplete }) => {
    const levels = useMemo(() => {
        const raw = data?.levels || data?.questions || data?.items || [];
        return (Array.isArray(raw) && raw.length > 0) ? raw : [{}];
    }, [data]);

    const [lvlIdx, setLvlIdx] = useState(0);
    const [currentLvl, setCurrentLvl] = useState(null);
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
    const lastMoveTimeRef = useRef(Date.now());
    const mistakeCountWindowRef = useRef([]); // Stores timestamps of mistakes

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
        const rawLvl = levels[idx];
        const initialized = initializeLevel(rawLvl);
        setCurrentLvl(initialized);
        setPlayerPos(initialized.startPos);
        setObstacles(initialized.obstacles);
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

        // 🧠 HESITATION TRACKER: Detect long pauses
        const hesitationCheck = setInterval(() => {
            if (Date.now() - lastMoveTimeRef.current > 7000) { // 7 seconds idle
                telemetryService.trackInteraction('english', 'HESITATION_PAUSE', {
                    idleTimeMs: Date.now() - lastMoveTimeRef.current,
                    lvlIdx
                });
                lastMoveTimeRef.current = Date.now(); // reset to avoid spam
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            clearInterval(hesitationCheck);
        };
    }, [playerPos, isGameOver, showFinish, lvlIdx]);

    const handleHit = useCallback(() => {
        setLives(l => {
            const next = Math.max(0, l - 1);
            if (next === 0) setIsGameOver(true);
            return next;
        });
        setFeedback({ type: 'error', msg: 'OUCH! Guard hit!' });
        setTotalMistakes(m => m + 1);
        audioService.error?.();
        
        // 🧠 FRUSTRATION TRACKER: Detect mistake spikes
        const now = Date.now();
        mistakeCountWindowRef.current.push(now);
        // Keep only mistakes in the last 10 seconds
        mistakeCountWindowRef.current = mistakeCountWindowRef.current.filter(t => now - t < 10000);
        
        if (mistakeCountWindowRef.current.length >= 3) {
            telemetryService.trackInteraction('english', 'FRUSTRATION_SPIKE', {
                mistakesInWindow: mistakeCountWindowRef.current.length,
                type: 'GUARD_HIT'
            });
        }

        // Reset player
        if (currentLvl) setPlayerPos(currentLvl.startPos);
    }, [currentLvl]);

    const attemptMove = useCallback((dr, dc) => {
        if (isGameOver || showFinish || feedback?.type === 'success') return;
        
        const rows = currentLvl?.maze?.length || 0;
        const cols = currentLvl?.maze?.[0]?.length || 0;
        const { isValid, r, c } = validateMove(dr, dc, playerPos, currentLvl?.maze, rows, cols);

        if (!isValid) {
            // Track wall hits for frustration
            const now = Date.now();
            mistakeCountWindowRef.current.push(now);
            mistakeCountWindowRef.current = mistakeCountWindowRef.current.filter(t => now - t < 5000);
            if (mistakeCountWindowRef.current.length >= 4) {
                telemetryService.trackInteraction('english', 'FRUSTRATION_SPIKE', {
                    type: 'WALL_HIT'
                });
            }
            return;
        }
        setPlayerPos({ r, c });
        lastMoveTimeRef.current = Date.now();

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
