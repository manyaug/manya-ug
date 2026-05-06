import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { awardCoins, updateBalanceThunk } from '../../store/userSlice';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { CoinBurst } from '../../components/ui/CoinBurst';
import { Trophy, AlertCircle, ArrowRight, Flower2 } from 'lucide-react';

// Decoupled Resources
import { initializeGardenData, spawnSentence, handleWordInteraction, calculateGardenScoring } from './GardenGuard/GardenLogic';
import GardenRenderer from './GardenGuard/GardenRenderer';

/**
 * MANYA ENGLISH: GARDEN GUARD ENGINE v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates real-time game loop from logic and UI.
 */

const GardenGuardEngine = ({ data, onComplete, onResult }) => {
    const [health, setHealth] = useState(100);
    const [score, setScore] = useState(0);
    const [marching, setMarching] = useState([]);
    const [phase, setPhase] = useState('intro'); // 'intro' | 'active' | 'defeated' | 'victory'
    const [isDark, setIsDark] = useState(false);
    const [totalHealed, setTotalHealed] = useState(0);
    const [totalMissed, setTotalMissed] = useState(0);
    const [showCoinBurst, setShowCoinBurst] = useState(false);
    const dispatch = useDispatch();
    
    const startTimeRef = useRef(Date.now());
    const spawnRef = useRef(null);
    const lastLaneRef = useRef(-1);

    const config = useMemo(() => initializeGardenData(data), [data]);

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // 1. Game Loop: Spawning
    useEffect(() => {
        if (phase !== 'active') return;
        spawnRef.current = setInterval(() => {
            const next = spawnSentence(config.queries);
            if (next) {
                // Determine a unique lane to prevent overlap
                let lane = Math.floor(Math.random() * 4);
                if (lane === lastLaneRef.current) lane = (lane + 1) % 4;
                lastLaneRef.current = lane;
                
                const itemWithLane = { ...next, lane };
                console.log(`🌱 [GardenGuard] Spawned: "${next.text}" on Lane ${lane}`);
                setMarching(prev => [...prev, itemWithLane]);
            }
        }, config.spawnRate);
        return () => clearInterval(spawnRef.current);
    }, [phase, config.queries, config.spawnRate]);

    // 2. Game Loop: Decay & Movement
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setMarching(prev => {
                const filtered = prev.filter(s => {
                    const elapsed = now - s.startTime;
                    if (elapsed >= s.duration) {
                        if (!s.isHealed) {
                            setHealth(h => {
                                const next = Math.max(0, h - 25);
                                console.warn(`🚨 [GardenGuard] Health Drop: ${h} -> ${next} (Sentence Expired)`);
                                return next;
                            });
                            setTotalMissed(m => m + 1);
                            audioService.error?.();
                        }
                        return false;
                    }
                    return true;
                });
                return filtered;
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // 3. Game Loop: Win/Loss Observer
    useEffect(() => {
        if (phase !== 'active') return;
        
        if (health <= 0) { 
            console.warn("💀 [GardenGuard] Health reached 0. Phase -> defeated");
            setPhase('defeated'); 
            if (spawnRef.current) clearInterval(spawnRef.current); 
            
            // Auto-finish on defeat
            const result = calculateGardenScoring('defeated', score, totalHealed, totalMissed, config.winScore, startTimeRef.current);
            onComplete?.(result);
        }
        if (score >= config.winScore) { 
            console.log("🏆 [GardenGuard] Target score reached. Phase -> victory");
            setPhase('victory'); 
            if (spawnRef.current) clearInterval(spawnRef.current); 

            // Auto-finish on victory
            const result = calculateGardenScoring('victory', score, totalHealed, totalMissed, config.winScore, startTimeRef.current);
            onComplete?.(result);
        }
        
        // Report partial progress to QuestRunner
        if (score > 0 && onResult) {
            onResult({ 
                isCorrect: true, 
                score, 
                total: config.winScore, 
                type: 'gardenguard_partial' 
            });
        }
    }, [health, score, config.winScore, onResult, phase, totalHealed, totalMissed, onComplete]);

    const handleWordClick = (sentenceId, word) => {
        if (sentenceId === 'START') {
            console.log("🏁 [GardenGuard] Game Started!");
            setPhase('active');
            return;
        }
        if (phase !== 'active') return;
        setMarching(prev => prev.map(s => {
            if (s.id === sentenceId) {
                const { isCorrect, updatedSentence } = handleWordInteraction(s, word);
                if (isCorrect) {
                    setScore(sc => sc + 100);
                    setTotalHealed(th => th + 1);
                    audioService.success?.();
                    setShowCoinBurst(true);
                    
                    // 💰 [Economy] Transactional Reward (Phase 1.1)
                    dispatch(updateBalanceThunk({ 
                        currency: 'coins', 
                        amount: 5, 
                        type: 'EARNED_GARDEN_GUARD',
                        contextId: s.id 
                    }));
                }
                return updatedSentence;
            }
            return s;
        }));
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            <GardenRenderer 
                health={health} score={score} marching={marching} 
                phase={phase} isDark={isDark} handleWordClick={handleWordClick} 
            />
            <CoinBurst trigger={showCoinBurst} onFinish={() => setShowCoinBurst(false)} />
        </div>
    );
};

GardenGuardEngine.hideGlobalFooter = true;
export default GardenGuardEngine;
