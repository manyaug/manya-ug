import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializeHarvestData, spawnHarvestItem, checkHarvestCollision, calculateHarvestScoring } from './Harvest/HarvestLogic';
import HarvestRenderer from './Harvest/HarvestRenderer';

/**
 * MANYA ENGLISH: HARVEST ENGINE v4.5 (Juicy Edition)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates physics logic from visuals.
 * - v2.0: Splats, Streaks, and Dynamic Speed.
 */

const HarvestEngine = ({ data, onComplete }) => {
    const config = useMemo(() => initializeHarvestData(data), [data]);
    
    /* ── state ── */
    const [side, setSide] = useState('left');
    const [items, setItems] = useState([]);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [lives, setLives] = useState(3);
    const [done, setDone] = useState(false);
    const [won, setWon] = useState(false);
    const [particles, setParticles] = useState([]);
    const [splats, setSplats] = useState([]);
    const [shakeKey, setShakeKey] = useState(0);
    const [shakeDir, setShakeDir] = useState(0); // -1 left, 1 right

    /* ── refs (live for high-perf physics loop) ── */
    const sideRef = useRef('left');
    const scoreRef = useRef(0);
    const streakRef = useRef(0);
    const livesRef = useRef(3);
    const doneRef = useRef(false);
    const nextId = useRef(0);
    const lastSpawn = useRef(0);
    const mistakesRef = useRef(0);
    const startTimeRef = useRef(Date.now());
    const raf = useRef(null);

    // Sync state back to refs for the physics loop
    useEffect(() => { sideRef.current = side; }, [side]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { streakRef.current = streak; }, [streak]);
    useEffect(() => { livesRef.current = lives; }, [lives]);

    const createBurst = (x, y, color) =>
        setParticles(p => [...p, ...Array(7).fill(0).map(() => ({
            id: Math.random(), x, y, color,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random()) * -5 - 2,
            life: 1
        }))]);

    const createSplat = (x, y, color) => {
        setSplats(s => [...s, { id: Math.random(), x, y, color, life: 2.0 }]);
        setShakeDir(x < 50 ? -1 : 1);
        setShakeKey(k => k + 1);
    };

    const handleTap = useCallback((e) => {
        if (doneRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        setSide(cx < rect.width / 2 ? 'left' : 'right');
    }, []);

    useEffect(() => {
        if (!config.wordPool.length) return;

        const tick = (t) => {
            if (doneRef.current) return;

            // 1. Spawning (Difficulty scales: spawn faster as score grows)
            const spawnInterval = Math.max(800, 1800 - (scoreRef.current * 3));
            if (t - lastSpawn.current > spawnInterval) {
                setItems(prev => [...prev, spawnHarvestItem(config.wordPool, config.leftCat, nextId.current++)]);
                lastSpawn.current = t;
            }

            // 2. Physics (Speed scales: 5% faster every 50 points)
            const speedMult = 1 + (Math.floor(scoreRef.current / 50) * 0.05);
            let scoreGain = 0;
            let lifeLoss = 0;
            let hits = [];
            let misses = [];

            setItems(prev => {
                const kept = [];
                for (const item of prev) {
                    const newY = item.y + (item.vy * speedMult);

                    // Catch Zone Check (y axis)
                    if (newY >= 75 && newY <= 90 && item.side === sideRef.current) {
                        const { isCorrect } = checkHarvestCollision(item, sideRef.current, config.leftCat, config.rightCat);
                        if (isCorrect) {
                            // Streak bonus: +10 base, +2 per streak (max +20)
                            const bonus = Math.min(20, streakRef.current * 2);
                            scoreGain += (10 + bonus);
                            hits.push({ x: item.x, y: newY, color: '#fb923c' }); // Orange/Gold
                            setStreak(s => {
                                const n = s + 1;
                                setMaxStreak(ms => Math.max(ms, n));
                                return n;
                            });
                        } else {
                            lifeLoss += 1;
                            setStreak(0);
                            misses.push({ x: item.x, y: newY, color: '#f43f5e' }); // Rose Splat
                        }
                        continue;
                    }

                    // Bottom Fall Miss Check
                    if (newY > 100) {
                        const { isCorrect } = checkHarvestCollision(item, item.side, config.leftCat, config.rightCat);
                        if (isCorrect) {
                            lifeLoss += 1;
                            setStreak(0);
                        }
                        continue;
                    }

                    kept.push({ ...item, y: newY });
                }
                return kept;
            });

            if (scoreGain > 0) { 
                setScore(s => s + scoreGain); 
            }
            if (lifeLoss > 0) { 
                setLives(l => Math.max(0, l - lifeLoss)); 
                mistakesRef.current += lifeLoss;
                audioService.error?.();
            }

            hits.forEach(b => createBurst(b.x, b.y, b.color));
            misses.forEach(m => createSplat(m.x, m.y, m.color));

            // Fade Splats & Particles
            setParticles(p => p.map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.2, life: pt.life - 0.05 })).filter(pt => pt.life > 0));
            setSplats(s => s.map(sp => ({ ...sp, life: sp.life - 0.02 })).filter(sp => sp.life > 0));

            raf.current = requestAnimationFrame(tick);
        };

        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [config]);

    // Win/Lose Watcher
    useEffect(() => {
        if (doneRef.current) return;
        
        if (score >= config.winScore) { 
            doneRef.current = true;
            setDone(true);
            setWon(true);
            cancelAnimationFrame(raf.current);
            audioService.victory?.();
            setTimeout(() => handleFinish(true), 1200);
        }
        
        if (lives <= 0) { 
            doneRef.current = true;
            setDone(true);
            setWon(false);
            cancelAnimationFrame(raf.current);
            setTimeout(() => handleFinish(false), 1200);
        }
    }, [score, lives, config.winScore]);

    const handleFinish = (won) => {
        const result = calculateHarvestScoring(won, score, config.winScore, mistakesRef.current, startTimeRef.current);
        if (onComplete) onComplete({ ...result, total: config.winScore, maxStreak });
    };

    return (
        <HarvestRenderer 
            score={score} winScore={config.winScore} lives={lives} side={side} 
            items={items} particles={particles} splats={splats}
            streak={streak} maxStreak={maxStreak}
            shakeKey={shakeKey} shakeDir={shakeDir}
            leftCat={config.leftCat} rightCat={config.rightCat} 
            done={done} won={won} handleTap={handleTap} 
        />
    );
};

HarvestEngine.hideGlobalFooter = true;

export default HarvestEngine;
