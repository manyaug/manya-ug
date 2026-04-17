import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializeHarvestData, spawnHarvestItem, checkHarvestCollision, calculateHarvestScoring } from './Harvest/HarvestLogic';
import HarvestRenderer from './Harvest/HarvestRenderer';

/**
 * MANYA ENGLISH: HARVEST ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates falling item physics from the Garden visual layer.
 */

const HarvestEngine = ({ data, onComplete }) => {
    const config = useMemo(() => initializeHarvestData(data), [data]);
    
    /* ── state ── */
    const [side, setSide] = useState('left');
    const [items, setItems] = useState([]);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [done, setDone] = useState(false);
    const [won, setWon] = useState(false);
    const [particles, setParticles] = useState([]);
    const [shakeKey, setShakeKey] = useState(0);

    /* ── refs (live values for rAF loop) ── */
    const sideRef = useRef('left');
    const scoreRef = useRef(0);
    const livesRef = useRef(3);
    const doneRef = useRef(false);
    const nextId = useRef(0);
    const lastSpawn = useRef(0);
    const mistakesRef = useRef(0);
    const startTimeRef = useRef(Date.now());
    const raf = useRef(null);

    // Sync Side
    useEffect(() => { sideRef.current = side; }, [side]);

    const burst = (x, y, color) =>
        setParticles(p => [...p, ...Array(7).fill(0).map(() => ({
            id: Math.random(), x, y, color,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random()) * -5 - 2,
            life: 1
        }))]);

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

            // 1. Spawning
            if (t - lastSpawn.current > 1800) {
                setItems(prev => [...prev, spawnHarvestItem(config.wordPool, config.leftCat, nextId.current++)]);
                lastSpawn.current = t;
            }

            // 2. Physics & Collision
            let scoreGain = 0;
            let lifeLoss = 0;
            let bursts = [];

            setItems(prev => {
                const kept = [];
                for (const item of prev) {
                    const newY = item.y + item.vy;

                    // Catch Zone Check
                    if (newY >= 75 && newY <= 90 && item.side === sideRef.current) {
                        const { isCorrect } = checkHarvestCollision(item, sideRef.current, config.leftCat, config.rightCat);
                        if (isCorrect) {
                            scoreGain += 10;
                            bursts.push({ x: item.x, y: newY, color: '#f59e0b' });
                        } else {
                            lifeLoss += 1;
                            bursts.push({ x: item.x, y: newY, color: '#f43f5e' });
                        }
                        continue;
                    }

                    // Miss check
                    if (newY > 100) {
                        const { isCorrect } = checkHarvestCollision(item, item.side, config.leftCat, config.rightCat); // pass its own side to see if it was a target
                        if (isCorrect) lifeLoss += 1;
                        continue;
                    }

                    kept.push({ ...item, y: newY });
                }
                return kept;
            });

            if (scoreGain > 0) { setScore(s => { const n = s + scoreGain; scoreRef.current = n; return n; }); }
            if (lifeLoss > 0) { 
                setLives(l => { const n = Math.max(0, l - lifeLoss); livesRef.current = n; return n; }); 
                mistakesRef.current += lifeLoss;
                setShakeKey(k => k + 1);
                audioService.error?.();
            }
            bursts.forEach(b => burst(b.x, b.y, b.color));

            setParticles(p => p.map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, vy: pt.vy + 0.2, life: pt.life - 0.05 })).filter(pt => pt.life > 0));

            raf.current = requestAnimationFrame(tick);
        };

        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [config]);

    // Win/Lose Watcher
    useEffect(() => {
        if (done) return;
        if (score >= config.winScore) { 
            doneRef.current = true; setDone(true); setWon(true); 
            cancelAnimationFrame(raf.current);
            audioService.success?.();
        }
        if (lives <= 0) { 
            doneRef.current = true; setDone(true); setWon(false); 
            cancelAnimationFrame(raf.current);
        }
    }, [score, lives, config.winScore, done]);

    const handleFinish = () => {
        const result = calculateHarvestScoring(won, score, config.winScore, mistakesRef.current, startTimeRef.current);
        if (onComplete) onComplete(result);
    };

    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <HarvestRenderer 
            score={score} winScore={config.winScore} lives={lives} side={side} 
            items={items} particles={particles} shakeKey={shakeKey} 
            leftCat={config.leftCat} rightCat={config.rightCat} 
            done={done} won={won} handleTap={handleTap} 
            handleFinish={handleFinish} handleRetry={handleRetry} 
        />
    );
};

HarvestEngine.hideGlobalFooter = true;
export default HarvestEngine;
