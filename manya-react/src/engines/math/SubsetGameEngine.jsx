import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Flag, CheckCircle2, AlertTriangle, ArrowRight, Zap, Target } from 'lucide-react';

// Decoupled Resources
import { ICONS, COLORS, calculatePowerSetSize, validateDiscovery, getSubsetKey } from './SubsetExplorer/SubsetLogic';
import SubsetRenderer from './SubsetExplorer/SubsetRenderer';

/**
 * MANYA SUBSET EXPLORER v3.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates Power Set discovery from Glassmorphic UI.
 */

export default function SubsetGameEngine({ data, onComplete, onResult }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [insideItems, setInsideItems] = useState(new Set());
    const [found, setFound] = useState(new Set());
    const [isResolved, setIsResolved] = useState(false);
    const [errorAnim, setErrorAnim] = useState(false);
    const [successAnim, setSuccessAnim] = useState(false);
    const [levelMistakes, setLevelMistakes] = useState(0);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const startTimeRef = useRef(Date.now());
    const dropZoneRef = useRef(null);

    const questions = useMemo(() => data?.questions || data?.data?.questions || [], [data]);
    const currentQuestion = questions[currentStep];
    const totalLevels = questions.length || 1;
    
    const items = useMemo(() => currentQuestion?.items || [], [currentQuestion]);
    const totalSubsets = useMemo(() => calculatePowerSetSize(items.length), [items]);

    useEffect(() => {
        onResult?.({
            score: currentStep,
            total: totalLevels,
            type: 'pulse'
        });
    }, [currentStep, totalLevels, onResult]);

    const toggleItem = (item) => {
        if (isResolved) return;
        const next = new Set(insideItems);
        if (next.has(item)) next.delete(item); else next.add(item);
        setInsideItems(next);
        audioService.tap?.();
    };

    const handleDragEnd = (event, info, item) => {
        if (isResolved) return;
        const rect = dropZoneRef.current?.getBoundingClientRect();
        if (!rect) return;
        const isInZone = info.point.x > rect.left && info.point.x < rect.right &&
                         info.point.y > rect.top && info.point.y < rect.bottom;
        if (isInZone && !insideItems.has(item)) toggleItem(item);
    };

    const checkPacking = () => {
        if (isResolved) { handleNext(); return; }
        
        const result = validateDiscovery(insideItems, found, totalSubsets, startTimeRef.current);
        
        if (!result.isCorrect) {
            setErrorAnim(true); setLevelMistakes(p => p + 1);
            audioService.error?.();
            setTimeout(() => setErrorAnim(false), 800);
        } else {
            setSuccessAnim(true);
            audioService.success?.();
            const nextFound = new Set(found); nextFound.add(result.key); setFound(nextFound);
            if (result.isComplete) setIsResolved(true);
            setTimeout(() => { setInsideItems(new Set()); setSuccessAnim(false); }, 600);
            startTimeRef.current = Date.now();
        }
    };

    const handleNext = () => {
        if (currentStep < totalLevels - 1) {
            setCurrentStep(s => s + 1); setInsideItems(new Set()); setFound(new Set()); setIsResolved(false);
        } else {
            const final = { isCorrect: true, score: totalLevels, total: totalLevels, mistakes: levelMistakes, type: 'game' };
            onResult?.(final); onComplete?.(final);
        }
    };

    const renderShelfItem = (key, idx) => {
        if (!key) return <div key={`empty-${idx}`} className="flex-shrink-0 w-16 h-12 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-white/20 font-black text-sm">?</div>;
        const themeStyle = key === "EMPTY" ? "bg-amber-500/10 border-amber-500/40 text-amber-500" : "bg-violet-600/10 border-violet-600/40 text-violet-400";
        return (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key={`shelf-${idx}`} className={`flex-shrink-0 px-4 h-12 rounded-2xl flex items-center justify-center font-black text-sm border ${themeStyle}`}>
                {key === "EMPTY" ? '∅' : `{ ${key.split(',').map(n => ICONS[n] || n[0]).join(', ')} }`}
            </motion.div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] font-jakarta overflow-hidden relative selection:bg-transparent">
            {/* STAGE */}
            <div className="flex-1 relative flex flex-col p-6 overflow-y-auto no-scrollbar">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-500"><Zap size={16} fill="currentColor" /></div>
                    <div className="text-violet-500 font-extrabold text-[12px] uppercase tracking-widest text-[#7c3aed]">Level {currentStep + 1}</div>
                </div>
                
                <h2 className="font-bold text-[var(--text-main)] text-xl mb-6">{currentQuestion?.prompt}</h2>

                <SubsetRenderer 
                    theme={currentQuestion?.theme} items={items} insideItems={insideItems} 
                    errorAnim={errorAnim} successAnim={successAnim} ICONS={ICONS} COLORS={COLORS} 
                    dropZoneRef={dropZoneRef} toggleItem={toggleItem} handleDragEnd={handleDragEnd} 
                />
            </div>

            {/* HUD / Shelf */}
            <div className="flex-none bg-[var(--bg-card)] p-6 pb-safe border-t border-[var(--border-color)] rounded-t-[40px] z-20 flex flex-col gap-4 shadow-2xl">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-[var(--text-sub)] font-bold text-xs uppercase tracking-widest"><Target size={14} className="text-emerald-500" /> Progression</div>
                    <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-black">{found.size} / {totalSubsets} FOUND</div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {Array.from({ length: totalSubsets }).map((_, i) => (
                        <div key={`slot-${i}`}>{renderShelfItem(Array.from(found)[i], i)}</div>
                    ))}
                </div>

                <motion.button
                    onClick={checkPacking}
                    className={`w-full py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 text-sm uppercase transition-all border-b-[6px] active:translate-y-[2px] active:border-b-[4px] ${
                        isResolved ? 'bg-[#58cc02] border-[#46a302] text-white hover:bg-[#46a302]' :
                        errorAnim ? 'bg-rose-500 border-rose-700 text-white hover:bg-rose-600' : 'bg-[#58cc02] border-[#46a302] text-white hover:bg-[#46a302] shadow-[0_10px_20px_rgba(88,204,2,0.25)]'
                    }`}
                >
                    <div className="btn-toy-gloss" />
                    {isResolved ? (currentStep < totalLevels - 1 ? <><ArrowRight size={20} /> NEXT LEVEL</> : <><CheckCircle2 size={20} /> COMPLETE</>) :
                     errorAnim ? <><AlertTriangle size={20} /> USED!</> : <><PackageOpen size={20} /> PACK IT!</>}
                </motion.button>
            </div>
            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        </div>
    );
}
