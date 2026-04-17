import React, { useState, useEffect, useMemo, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Star, ArrowRight, RotateCcw } from 'lucide-react';

// Decoupled Resources
import { TOPPINGS, CUSTOMERS, calculateCombinations, getStarRating, getToppingLayout, validateOrder } from './PizzaFractions/PizzaLogic';
import PizzaRenderer from './PizzaFractions/PizzaRenderer';

/**
 * MANYA PIZZA FRACTIONS v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates combinatorics math from SVG pizza rendering.
 */

// --- Formula Animation Stage ---
function FormulaReveal({ n, targetVal, onDone }) {
    const [step, setStep] = useState(0);
    const steps = [
        { label: "Toppings chosen", expr: `n = ${n}` },
        { label: "Total subsets (2ⁿ)", expr: `2${n} = ${Math.pow(2, n)}` },
        { label: "Non-empty subsets (−∅)", expr: `${Math.pow(2, n)} − 1 = ${targetVal}` },
        { label: "Customer gets exactly", expr: `✅  ${targetVal} combos!` },
    ];

    useEffect(() => {
        if (step >= steps.length) { setTimeout(onDone, 600); return; }
        const t = setTimeout(() => setStep(s => s + 1), 700);
        return () => clearTimeout(t);
    }, [step]);

    return (
        <div className="flex flex-col gap-2 py-3">
            {steps.slice(0, step).map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">{s.label}</span>
                    <span className="font-mono font-black text-emerald-900 text-sm">{s.expr}</span>
                </motion.div>
            ))}
        </div>
    );
}

export default function PizzaGameEngine({ data, onComplete, onResult }) {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [selected, setSelected] = useState(new Set());
    const [phase, setPhase] = useState('ordering'); 
    const [isError, setIsError] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    const [levelMistakes, setLevelMistakes] = useState(0);
    const [customerMood, setCustomerMood] = useState('neutral');

    const startTimeRef = useRef(Date.now());
    const question = data?.questions?.[currentLevel];
    const totalLevels = data?.questions?.length || 1;
    const targetVal = question?.targetVal || 3;
    const customer = useMemo(() => CUSTOMERS[currentLevel % CUSTOMERS.length], [currentLevel]);
    const n = selected.size;
    const resultCombos = calculateCombinations(n);
    const stars = getStarRating(levelMistakes);

    useEffect(() => {
        startTimeRef.current = Date.now();
        setLevelMistakes(0); setCustomerMood('neutral'); setPhase('ordering');
    }, [currentLevel]);

    const toggle = (id) => {
        if (phase !== 'ordering') return;
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
        audioService.tap?.();
    };

    const serve = () => {
        if (phase !== 'ordering') return;
        const isCorrect = resultCombos === targetVal;
        const scorePacket = validateOrder(n, targetVal, levelMistakes, startTimeRef.current);

        if (isCorrect) {
            setCustomerMood('happy'); setPhase('revealing'); audioService.success?.();
        } else {
            setIsError(true); setCustomerMood('sad');
            setMistakes(m => m + 1); setLevelMistakes(m => m + 1);
            audioService.error?.();
            setTimeout(() => { setIsError(false); setCustomerMood('neutral'); }, 1200);
        }
    };

    const handleNext = () => {
        if (currentLevel < totalLevels - 1) {
            setCurrentLevel(l => l + 1); setSelected(new Set());
        } else {
            const final = { isCorrect: true, score: totalLevels, total: totalLevels, mistakes, type: 'game' };
            onResult?.(final); onComplete?.(final);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#1a0a00] overflow-hidden relative selection:bg-transparent font-sans">
            <div className="flex-none flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex gap-1">{Array.from({ length: totalLevels }).map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all ${i === currentLevel ? 'w-6 bg-orange-400' : i < currentLevel ? 'w-4 bg-emerald-500' : 'w-4 bg-white/10'}`} />))}</div>
                <div className="text-[10px] font-black text-orange-400/70 uppercase tracking-widest text-center flex-1">Manya Pizzeria</div>
                <div className="flex gap-0.5">{[1,2,3].map(s => (<Star key={s} size={14} className={s <= stars ? 'text-amber-400 fill-amber-400' : 'text-white/10 fill-white/10'} />))}</div>
            </div>

            <PizzaRenderer selectedIds={Array.from(selected)} phase={phase} isError={isError} getToppingLayout={getToppingLayout} TOPPINGS={TOPPINGS} targetVal={targetVal} numToppings={n} calculateCombinations={calculateCombinations} />

            <div className="flex-none bg-[#0f0700] border-t border-white/5 rounded-t-[28px] z-20 p-4 pb-safe">
                <AnimatePresence mode="wait">
                    {phase === 'ordering' && (
                        <motion.div key="ordering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="grid grid-cols-6 gap-2 mb-4">
                                {TOPPINGS.map(t => (
                                    <button key={t.id} onClick={() => toggle(t.id)} className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${selected.has(t.id) ? 'border-orange-500 bg-orange-500/20 scale-105 shadow-xl' : 'border-white/10 bg-white/5 shadow-md'}`}>
                                        <span className="text-2xl leading-none">{t.icon}</span>
                                        <span className="text-[9px] font-bold text-white/40 uppercase">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={serve} disabled={n === 0} className={`w-full h-14 font-black flex items-center justify-center gap-2 tracking-widest uppercase rounded-2xl transition-all ${n === 0 ? 'bg-white/10 text-white/30' : 'bg-orange-500 text-white shadow-lg'}`}>
                                <ChefHat size={20} /> SERVE PIZZA
                            </button>
                        </motion.div>
                    )}

                    {phase === 'revealing' && (
                        <motion.div key="revealing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2"><FormulaReveal n={n} targetVal={targetVal} onDone={() => setPhase('celebrating')} /></motion.div>
                    )}

                    {phase === 'celebrating' && (
                        <motion.div key="celebrating" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 text-center">
                            <div className="text-white/60 font-bold">Excellent Ratio! {customer.name} is impressed.</div>
                            <button onClick={handleNext} className="w-full h-14 bg-emerald-500 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2">
                                <ArrowRight size={20} /> {currentLevel < totalLevels - 1 ? 'NEXT LEVEL' : 'FINISH SHIFT'}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
