import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [phase, setPhase] = useState('active'); // 'active' | 'defeated' | 'victory'
    const [isDark, setIsDark] = useState(false);
    const [totalHealed, setTotalHealed] = useState(0);
    const [totalMissed, setTotalMissed] = useState(0);
    
    const startTimeRef = useRef(Date.now());
    const spawnRef = useRef(null);

    const config = initializeGardenData(data);

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
            setMarching(prev => [...prev, spawnSentence(config.queries)]);
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
                            setHealth(h => Math.max(0, h - 25));
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
        if (health <= 0) { setPhase('defeated'); clearInterval(spawnRef.current); }
        if (score >= config.winScore) { setPhase('victory'); clearInterval(spawnRef.current); }
    }, [health, score, config.winScore]);

    const handleWordClick = (sentenceId, word) => {
        if (phase !== 'active') return;
        setMarching(prev => prev.map(s => {
            if (s.id === sentenceId) {
                const { isCorrect, updatedSentence } = handleWordInteraction(s, word);
                if (isCorrect) {
                    setScore(sc => { 
                        const n = sc + 100; 
                        if (onResult) onResult({ isCorrect: true, score: n, total: config.winScore, type: 'gardenguard_partial' });
                        return n; 
                    });
                    setTotalHealed(th => th + 1);
                    audioService.success?.();
                }
                return updatedSentence;
            }
            return s;
        }));
    };

    const handleFinish = () => {
        const result = calculateGardenScoring(phase, score, totalHealed, totalMissed, config.winScore, startTimeRef.current);
        if (onComplete) onComplete(result);
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            <GardenRenderer 
                health={health} score={score} marching={marching} 
                phase={phase} isDark={isDark} handleWordClick={handleWordClick} 
            />

            {/* OVERLAYS */}
            <AnimatePresence>
                {phase !== 'active' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#151921] p-12 rounded-[56px] text-center max-w-sm w-full border-8 border-emerald-400">
                            <div className="w-24 h-24 bg-emerald-500 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-12">
                                {phase === 'victory' ? <Trophy size={56} className="text-white fill-white" /> : <AlertCircle size={56} className="text-white" />}
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-3">
                                {phase === 'victory' ? 'Bountiful!' : 'Withered'}
                            </h2>
                            <button onClick={handleFinish} className="w-full py-6 bg-emerald-500 text-white rounded-[32px] font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-4">
                                Submit Results <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

GardenGuardEngine.hideGlobalFooter = true;
export default GardenGuardEngine;
