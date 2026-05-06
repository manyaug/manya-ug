import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';
import { useBehavioralTracker } from '../../hooks/useBehavioralTracker';

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

    // 🧠 BEHAVIORAL TRACKER (Phase 3)
    const { metrics, recordFirstClick } = useBehavioralTracker(phase === 'build');

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
        recordFirstClick();
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

        if (isStable) {
            setPhase('success');
            audioService.success?.();
            setTimeout(handleFinish, 1200);
        } else {
            setPhase('error');
            setTotalMistakes(prev => prev + 1);
            audioService.error?.();
            setTimeout(() => setPhase('build'), 1000);
        }
    };

    const handleFinish = () => {
        const result = calculateSentenceScoring(true, totalMistakes, slots.length, startTime);
        const finalPayload = { 
            ...result,
            // 🧠 Phase 3 Behavioral Telemetry
            metrics: {
                ...metrics,
                frustrationClicks: totalMistakes
            }
        };
        if (onResult) onResult(finalPayload);
        if (onComplete) onComplete(finalPayload);
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            <SentenceRenderer 
                slots={slots} bank={bank} phase={phase} isDark={isDark} data={data} 
                handleRemove={handleRemove} handleDrop={handleDrop} 
                onValidate={checkStability}
                canValidate={!slots.some(s => !s.current) && phase === 'build'}
            />


        </div>
    );
};

SentenceBlocksEngine.hideGlobalFooter = true;
export default SentenceBlocksEngine;
