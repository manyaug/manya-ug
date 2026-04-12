import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, CheckCircle2, AlertCircle, ArrowRight, Trophy, Sparkles } from 'lucide-react';

/**
 * MANYA ENGLISH: SENTENCE BLOCKS ENGINE (v2.0 Standalone)
 * -----------------------------------------------------
 * Promoted from Sandbox. Now fully data-driven.
 */
const SentenceBlocksEngine = ({ data, onComplete }) => {
    const [phase, setPhase] = useState('build'); // 'build' | 'success' | 'finish'
    const [isDark, setIsDark] = useState(false);
    const [slots, setSlots] = useState([]);
    const [bank, setBank] = useState([]);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const initialData = useMemo(() => {
        const d = data?.data || data || {};
        const s = d.slots || [
            { id: 's1', expected: 'The brave knight' },
            { id: 's2', expected: 'conquered' },
            { id: 's3', expected: 'the dragon' },
        ];
        const b = d.distractors || ['quickly', 'sleeping'];
        return { slots: s, distractors: b };
    }, [data]);

    // 1. Initialize from Data
    useEffect(() => {
        const s = initialData.slots.map(slot => ({ ...slot, current: null }));
        const b = [
            ...initialData.slots.map(slot => ({ id: `b-${slot.id}`, text: slot.expected, color: getRandomColor() })),
            ...initialData.distractors.map((text, i) => ({ id: `d-${i}`, text: text, color: 'bg-slate-400' }))
        ].sort(() => Math.random() - 0.5);
        
        setSlots(s);
        setBank(b);
        setPhase('build');
    }, [initialData]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const getRandomColor = () => {
        const colors = ['bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-emerald-400', 'bg-violet-400'];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    const handleDrop = (word, slotId) => {
        setSlots(prev => prev.map(s => 
            s.id === slotId ? { ...s, current: word } : s
        ));
        setBank(prev => prev.filter(w => w.id !== word.id));
        const oldWord = slots.find(s => s.id === slotId)?.current;
        if (oldWord) setBank(prev => [...prev, oldWord]);
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
        const isStable = slots.every(s => s.current?.text === s.expected);
        if (isStable) {
            setPhase('success');
            window.ManyaAudio?.success?.();
            setTimeout(() => setPhase('finish'), 1500);
        } else {
            setPhase('error');
            setTotalMistakes(prev => prev + 1);
            window.ManyaAudio?.error?.();
            setTimeout(() => setPhase('build'), 1000);
        }
    };

    return (
        <div className={`flex flex-col h-full font-jakarta overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-[#FFFBEB] text-slate-800'}`}>
            {/* PLAY AREA */}
            <div className={`flex-1 relative flex flex-col p-4 sm:p-10 overflow-hidden min-h-[400px] sm:min-h-[450px] ${isDark ? 'bg-white/5 shadow-inner' : 'bg-sky-50'}`}>
                {/* Visual Flair */}
                <div className="absolute top-10 left-10 w-32 h-10 bg-white dark:bg-indigo-500/10 rounded-full blur-2xl opacity-50" />
                
                {/* Header */}
                <div className="relative z-20 flex justify-between items-start mb-6 sm:mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-400 rounded-2xl shadow-[0_4px_0_#d97706] sm:shadow-[0_5px_0_#d97706] flex items-center justify-center">
                            <Box className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none uppercase">Sentence Blocks</h2>
                            <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.3em] mt-2">Architecture Engine</p>
                        </div>
                    </div>
                </div>

                {/* Building Zone */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8 sm:gap-12">
                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full max-w-4xl">
                        {slots.map((slot, i) => (
                            <div key={slot.id} className="relative group w-[120px] sm:w-[180px]">
                                <motion.div 
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleRemove(slot.id)}
                                    className={`h-22 sm:h-32 rounded-[28px] sm:rounded-[32px] border-4 border-dashed flex items-center justify-center cursor-pointer transition-all shadow-inner ${
                                        slot.current 
                                        ? `${slot.current.color} border-white/50 shadow-[0_8px_0_rgba(0,0,0,0.1)]` 
                                        : (isDark ? 'border-white/10 bg-white/5 hover:border-indigo-500/40' : 'border-sky-200 bg-white hover:border-sky-400')
                                    }`}
                                >
                                    <AnimatePresence mode="wait">
                                        {slot.current ? (
                                            <motion.div 
                                                initial={{ y: 5, opacity: 0, scale: 0.8 }}
                                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                                className="text-sm font-black text-center px-4 text-white leading-tight drop-shadow-sm uppercase"
                                            >
                                                {slot.current.text}
                                            </motion.div>
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-sky-200'}`}>Slot {i + 1}</span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                                
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-2 bg-black/10 rounded-full blur-sm" />
                            </div>
                        ))}
                    </div>

                    <AnimatePresence>
                        {phase === 'error' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3 text-rose-600 bg-rose-50 px-6 py-3 rounded-full border-2 border-rose-200 shadow-lg"
                            >
                                <AlertCircle size={20} />
                                <span className="text-xs font-black uppercase">Structure Unstable!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Hint Card */}
                <div className="mt-auto relative z-20">
                    <div className={`backdrop-blur-sm p-5 rounded-[32px] border-2 flex items-center gap-4 shadow-sm ${isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-white/80 border-sky-100 text-slate-600'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-sky-100 text-sky-500'}`}>
                            <Sparkles size={20} />
                        </div>
                        <p className="text-[11px] font-bold leading-snug">
                            {data?.hint || "Stack the colorful blocks in the correct order to reveal the story!"}
                        </p>
                    </div>
                </div>
            </div>

            {/* BLOCK BANK */}
            <div className={`p-4 sm:p-8 border-t-4 transition-all ${isDark ? 'bg-[#151921] border-white/5' : 'bg-white border-sky-100'}`}>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                    {bank.map(word => (
                        <motion.button
                            key={word.id}
                            whileHover={{ y: -5, scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                const emptySlot = slots.find(s => !s.current);
                                if (emptySlot) handleDrop(word, emptySlot.id);
                            }}
                            className={`px-4 py-3 sm:px-6 sm:py-4 ${word.color} rounded-[20px] sm:rounded-[24px] text-white text-[10px] sm:text-xs font-black shadow-[0_4px_0_rgba(0,0,0,0.15)] sm:shadow-[0_6px_0_rgba(0,0,0,0.15)] active:shadow-none transition-all flex items-center justify-center min-w-[100px] sm:min-w-[120px] uppercase tracking-wider`}
                        >
                            {word.text}
                        </motion.button>
                    ))}
                </div>

                <div className="flex justify-center">
                    <button 
                        disabled={slots.some(s => !s.current) || phase !== 'build'}
                        onClick={checkStability}
                        className={`w-full sm:w-auto px-8 py-4 sm:px-16 sm:py-6 rounded-[24px] sm:rounded-[32px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs transition-all shadow-xl ${
                            slots.every(s => s.current) 
                            ? 'bg-indigo-600 text-white shadow-indigo-500/20 hover:-translate-y-1' 
                            : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-white/20'
                        }`}
                    >
                        Validate Structure
                    </button>
                </div>
            </div>

            {/* VICTORY OVERLAY */}
            <AnimatePresence>
                {phase === 'finish' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6">
                        <motion.div 
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="bg-white dark:bg-[#151921] p-8 sm:p-12 rounded-[40px] sm:rounded-[56px] shadow-3xl text-center max-w-sm w-full border-4 sm:border-8 border-amber-400 relative overflow-hidden"
                        >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-400 rounded-[30px] sm:rounded-[40px] flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-[0_8px_0_#d97706] sm:shadow-[0_10px_0_#d97706] rotate-12">
                                <Trophy size={48} className="text-white fill-white sm:hidden" />
                                <Trophy size={56} className="text-white fill-white hidden sm:block" />
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-2 sm:mb-3">Architect!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] sm:text-[10px] mb-8 sm:mb-12">Final stability achieved</p>
                            
                            <button 
                                onClick={() => {
                                    if (onComplete) onComplete({
                                        isCorrect: totalMistakes === 0,
                                        accuracy: Math.max(0, (slots.length - totalMistakes) / slots.length),
                                        score: slots.length * 10,
                                        mistakes: totalMistakes,
                                        type: 'simulation',
                                        engineType: 'SENTENCE_BLOCKS'
                                    });
                                }}
                                className="w-full py-4 sm:py-6 bg-indigo-600 text-white rounded-[24px] sm:rounded-[32px] font-black text-[10px] sm:text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-xl shadow-indigo-500/20"
                            >
                                Continue <ArrowRight size={20} strokeWidth={4} />
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
