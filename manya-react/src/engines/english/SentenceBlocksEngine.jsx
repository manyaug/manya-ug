import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';

// Decoupled Resources
import { initializeLevelData, validateStructure, calculateSentenceScoring } from './SentenceBlocks/SentenceLogic';
import SentenceRenderer from './SentenceBlocks/SentenceRenderer';

/**
 * MANYA ENGLISH: SENTENCE BLOCKS ENGINE v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates grammar validation from Block UI.
 */

const SentenceBlocksEngine = ({ data, onComplete, onResult }) => {
    const [phase, setPhase] = useState('build'); // 'build' | 'success' | 'finish' | 'error'
    const [isDark, setIsDark] = useState(false);
    const [slots, setSlots] = useState([]);
    const [bank, setBank] = useState([]);
    const [totalMistakes, setTotalMistakes] = useState(0);
    const [startTime] = useState(Date.now());

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // 1. Initialize from Data
    useEffect(() => {
        const { initialSlots, bank } = initializeLevelData(data);
        setSlots(initialSlots);
        setBank(bank);
        setPhase('build');
    }, [data]);

    const handleDrop = (word) => {
        const emptySlot = slots.find(s => !s.current);
        if (!emptySlot) return;

        setSlots(prev => prev.map(s => 
            s.id === emptySlot.id ? { ...s, current: word } : s
        ));
        setBank(prev => prev.filter(w => w.id !== word.id));
        audioService.tap?.();
    };

    const handleRemove = (slotId) => {
        const word = slots.find(s => s.id === slotId)?.current;
        if (!word) return;
        setSlots(prev => prev.map(s => 
            s.id === slotId ? { ...s, current: null } : s
        ));
        setBank(prev => [...prev, word]);
    };

    const checkStability = () => {
        const isStable = validateStructure(slots);
        const scoring = calculateSentenceScoring(isStable, totalMistakes, slots.length, startTime);

        if (isStable) {
            setPhase('success');
            audioService.success?.();
            setTimeout(() => setPhase('finish'), 1500);
        } else {
            setPhase('error');
            setTotalMistakes(prev => prev + 1);
            audioService.error?.();
            setTimeout(() => setPhase('build'), 1000);
        }
    };

    const handleFinish = () => {
        const result = calculateSentenceScoring(true, totalMistakes, slots.length, startTime);
        if (onResult) onResult(result);
        if (onComplete) onComplete(result);
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            <SentenceRenderer 
                slots={slots} bank={bank} phase={phase} isDark={isDark} data={data} 
                handleRemove={handleRemove} handleDrop={handleDrop} 
            />

            {/* Global Check Trigger */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[80%] max-w-md z-30">
                <button 
                    disabled={slots.some(s => !s.current) || phase !== 'build'}
                    onClick={checkStability}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs transition-all shadow-2xl ${
                        slots.every(s => s.current) 
                        ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:-translate-y-1' 
                        : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-white/20'
                    }`}
                >
                    Validate Structure
                </button>
            </div>

            {/* VICTORY OVERLAY */}
            <AnimatePresence>
                {phase === 'finish' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#151921] p-12 rounded-[56px] text-center max-w-sm w-full border-8 border-amber-400">
                            <div className="w-24 h-24 bg-amber-400 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-xl rotate-12">
                                <Trophy size={56} className="text-white fill-white" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white mb-3">Architect!</h2>
                            <button onClick={handleFinish} className="w-full py-6 bg-indigo-600 text-white rounded-[32px] font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-4">
                                Continue <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

SentenceBlocksEngine.hideGlobalFooter = true;
export default SentenceBlocksEngine;
