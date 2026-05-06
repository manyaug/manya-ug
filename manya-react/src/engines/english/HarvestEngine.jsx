import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { awardCoins, updateBalanceThunk } from '../../store/userSlice';
import { CoinBurst } from '../../components/ui/CoinBurst';
import { useBehavioralTracker } from '../../../hooks/useBehavioralTracker';

// Decoupled Resources
import { initializeHarvestData, spawnHarvestItem, checkHarvestCollision, calculateHarvestScoring } from './Harvest/HarvestLogic';
import HarvestRenderer from './Harvest/HarvestRenderer';

/**
 * MANYA ENGLISH: HARVEST ENGINE v5.0 (App-Theme Rebuild)
 * -------------------------------------------------------------
 * Silky smooth sorting gameplay with premium Manya feel.
 * Implements "Perfect Catch" rewards and optimized 60fps physics.
 */
const HarvestEngine = ({ data, onComplete, onResult }) => {
    // 1. DATA INITIALIZATION
    const config = useMemo(() => initializeHarvestData(data), [data]);
    
    // 2. STATE (Visual feedback only)
    const [phase, setPhase] = useState('intro'); // intro | active
    const [side, setSide] = useState('left');
    const [items, setItems] = useState([]);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [lives, setLives] = useState(3);
    const [done, setDone] = useState(false);
    const [won, setWon] = useState(false);
    const [particles, setParticles] = useState([]);
    const [shakeKey, setShakeKey] = useState(0);
    const [shakeDir, setShakeDir] = useState(0);
    const [showCoinBurst, setShowCoinBurst] = useState(false);
    const dispatch = useDispatch();

    // 🧠 BEHAVIORAL TRACKER (Phase 3)
    const { metrics, recordFirstClick } = useBehavioralTracker(phase === 'active');

    // 3. REFS (High-performance physics loop)
    const phaseRef = useRef('intro');
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

    // 4. SYNC (Keep refs in sync with input state)
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { sideRef.current = side; }, [side]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { streakRef.current = streak; }, [streak]);
    useEffect(() => { livesRef.current = lives; }, [lives]);

    // [MOD] Move onResult to useEffect to avoid "update during render" warning
    useEffect(() => {
        if (score > 0 && onResult) {
            onResult({
                isCorrect: true,
                score: score,
                total: config.winScore,
                type: 'harvest_pulse'
            });
        }
    }, [score, config.winScore, onResult]);

    // 5. FX HELPERS
    const createBurst = (x, y) => {
        setParticles(p => [...p, ...Array(5).fill(0).map(() => ({
            id: Math.random(), 
            x: x + (Math.random() - 0.5) * 4, 
            y: y + (Math.random() - 0.5) * 4, 
            life: 1 
        }))]);
    };

    const triggerMistake = (x) => {
        setShakeDir(x < 50 ? -1 : 1);
        setShakeKey(k => k + 1);
        setStreak(0);
        setLives(l => {
            const nl = Math.max(0, l - 1);
            if (nl === 0) triggerFinish(false);
            return nl;
        });
        mistakesRef.current++;
        audioService.error?.();
        // Clear error toast after 1s
        setTimeout(() => setShakeKey(0), 1000);
    };

    // 6. INTERACTION
    const handleTap = useCallback((e) => {
        if (phaseRef.current === 'intro') {
            setPhase('active');
            startTimeRef.current = Date.now();
            return;
        }
        if (doneRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const relativeX = clientX - rect.left;
        
        const newSide = relativeX < rect.width / 2 ? 'left' : 'right';
        setSide(newSide);
        
        // Haptic feedback placeholder
        if (window.navigator?.vibrate) window.navigator.vibrate(5);
    }, []);

    // 7. GAME LOOP
    useEffect(() => {
        if (!config.wordPool.length) return;

        const tick = (t) => {
            if (doneRef.current || phaseRef.current === 'intro') {
                raf.current = requestAnimationFrame(tick);
                return;
            }

            // Spawning Logic (Slowed down: 4-6 seconds between items)
            const spawnRate = Math.max(3500, 6000 - (scoreRef.current * 10));
            if (t - lastSpawn.current > spawnRate) {
                const next = spawnHarvestItem(config.wordPool, config.leftCat, nextId.current++);
                if (next) setItems(prev => [...prev, next]);
                lastSpawn.current = t;
            }

            // Physics Logic (Static speed for consistency)
            const speedMult = 1.0; 

            setItems(prev => {
                const updated = [];
                for (const item of prev) {
                    const nextY = item.y + (item.vy * speedMult);

                    // A. Collision Zone (Main catching area)
                    if (nextY >= 78 && nextY <= 88 && item.side === sideRef.current) {
                        const { isCorrect, isPerfect } = checkHarvestCollision(item, sideRef.current, config.leftCat, config.rightCat);
                        
                        if (isCorrect) {
                            const points = isPerfect ? 20 : 10;
                            const bonus = Math.min(10, Math.floor(streakRef.current / 2));
                            
                             setScore(s => {
                                const ns = s + points + bonus;
                                if (ns >= config.winScore) triggerFinish(true);
                                return ns;
                            });
                            
                            setStreak(s => {
                                const ns = s + 1;
                                setMaxStreak(ms => Math.max(ms, ns));
                                return ns;
                            });

                            createBurst(item.x, nextY);
                            audioService.success?.();
                            setShowCoinBurst(true);

                            // 💰 [Economy] Transactional Reward (Phase 1.1)
                            // Queued for execution outside the state setter to avoid React warnings
                            setTimeout(() => {
                                dispatch(updateBalanceThunk({ 
                                    currency: 'coins', 
                                    amount: 1, 
                                    type: 'EARNED_HARVEST',
                                    contextId: item.id 
                                }));
                            }, 0);
                        } else {
                            triggerMistake(item.x);
                        }
                        continue; // Item consumed
                    }

                    // B. Trash/Miss Zone (Falls off bottom)
                    if (nextY > 105) {
                        const { isCorrect } = checkHarvestCollision(item, item.side, config.leftCat, config.rightCat);
                        // If it was a correct item but missed -> penalty
                        if (isCorrect) triggerMistake(item.x);
                        continue; // Item gone
                    }

                    updated.push({ ...item, y: nextY });
                }
                return updated;
            });

            raf.current = requestAnimationFrame(tick);
        };

        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [config]);

    // 8. COMPLETION
    const triggerFinish = (reachedWinScore) => {
        if (doneRef.current) return;
        doneRef.current = true;
        setDone(true);
        setWon(reachedWinScore);
        cancelAnimationFrame(raf.current);

        const result = calculateHarvestScoring(reachedWinScore, scoreRef.current, config.winScore, mistakesRef.current, startTimeRef.current);
        
        setTimeout(() => {
            if (onComplete) {
                onComplete({ 
                    ...result, 
                    maxStreak,
                    // 🧠 Phase 3 Behavioral Telemetry
                    metrics: {
                        ...metrics,
                        frustrationClicks: mistakesRef.current // Use misses as frustration proxy
                    }
                });
            }
        }, 1200);
    };

    return (
        <>
            <HarvestRenderer 
                score={score} winScore={config.winScore} lives={lives} side={side} 
                items={items} particles={particles} splats={[]}
                streak={streak} maxStreak={maxStreak}
                shakeKey={shakeKey} shakeDir={shakeDir}
                leftCat={config.leftCat} rightCat={config.rightCat} 
                done={done} won={won} phase={phase} handleTap={handleTap} 
            />
            <CoinBurst trigger={showCoinBurst} onFinish={() => setShowCoinBurst(false)} />
        </>
    );
};

HarvestEngine.hideGlobalFooter = true;

export default HarvestEngine;
