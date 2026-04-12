import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Trophy, Zap, Info, PenTool, Palette } from 'lucide-react';

/**
 * MANYA ENGLISH: PUNCTUATION PORTAL ENGINE (v2.0 Standalone)
 * --------------------------------------------------------
 * Promoted from Sandbox. Now fully data-driven.
 */
const PunctuationPortalEngine = ({ data, onComplete }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [slots, setSlots] = useState([]);
    const [phase, setPhase] = useState('active'); // 'active' | 'success' | 'finish'
    const [isDark, setIsDark] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const initialData = useMemo(() => {
        const d = data?.data || data || {};
        return {
            queries: d.queries || [
                { 
                    parts: ["Wait", " I'm coming with you", "!"], 
                    slots: [{ index: 1, expected: ',', hint: "Use a comma after 'Wait'!" }]
                }
            ],
            availableMarks: d.marks || [',', '.', '!', '?', ';', ':', '-', '"']
        };
    }, [data]);

    // 1. Initialize Level
    useEffect(() => {
        if (initialData.queries[currentIdx]) {
            setSlots(initialData.queries[currentIdx].slots.map(s => ({ ...s, current: null })));
            setPhase('active');
        }
    }, [currentIdx, initialData.queries]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleDrop = (mark, slotIndex) => {
        setSlots(prev => prev.map(s => s.index === slotIndex ? { ...s, current: mark } : s));
    };

    const checkSolution = () => {
        const isCorrect = slots.every(s => s.current === s.expected);
        if (isCorrect) {
            window.ManyaAudio?.success?.();
            if (currentIdx < initialData.queries.length - 1) {
                setPhase('success');
                setTimeout(() => {
                    setCurrentIdx(prev => prev + 1);
                }, 1500);
            } else {
                setPhase('finish');
            }
        } else {
            setTotalMistakes(prev => prev + 1);
            window.ManyaAudio?.error?.();
            // Just a visual shake would be nice here
        }
    };

    const q = initialData.queries[currentIdx];

    return (
        <div className={`flex flex-col h-full font-jakarta overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-[#FAFAFA] text-slate-800'}`}>
            {/* STICKER VIEWPORT */}
            <div className={`flex-1 relative flex flex-col p-6 sm:p-10 overflow-hidden min-h-[450px] ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                {/* Decorative Pattern */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                    style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 Q 30 15, 50 10 T 90 10' fill='none' stroke='${isDark ? 'white' : 'black'}' stroke-width='2'/%3E%3C/svg%3E")`,
                    }} 
                />

                {/* Header */}
                <div className="relative z-20 flex justify-between items-start mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center rotate-3 shadow-lg">
                            <Palette className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-none uppercase">Punctuation Portal</h2>
                            <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] mt-2 italic">Editorial Engine</p>
                        </div>
                    </div>
                </div>

                {/* Sentence with Sticker Slots */}
                <div className={`relative z-10 flex-1 flex flex-wrap items-center justify-center gap-y-12 px-8 text-center rounded-[48px] border-4 border-dashed m-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-10 leading-relaxed max-w-2xl">
                        {q?.parts.map((text, i) => {
                            const slot = slots.find(s => s.index === i);
                            return (
                                <React.Fragment key={i}>
                                    <span className="text-xl sm:text-3xl font-black tracking-tight">{text}</span>
                                    {slot && (
                                        <div 
                                            className={`group relative w-12 h-12 sm:w-16 sm:h-16 rounded-[24px] border-4 border-dashed flex items-center justify-center transition-all ${
                                                slot.current 
                                                ? 'border-pink-300 bg-pink-500 rotate-6 scale-110 shadow-xl' 
                                                : (isDark ? 'border-white/10 bg-white/5 hover:border-pink-500/40' : 'border-slate-200 bg-white hover:border-pink-200')
                                            }`}
                                        >
                                            <AnimatePresence mode="wait">
                                                {slot.current ? (
                                                    <motion.span 
                                                        initial={{ scale: 0, rotate: -20 }}
                                                        animate={{ scale: 1, rotate: 6 }}
                                                        className="text-3xl sm:text-4xl font-black text-white font-serif"
                                                    >
                                                        {slot.current}
                                                    </motion.span>
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-white/20" />
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {phase === 'success' && (
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 bg-emerald-500 text-white px-8 py-4 rounded-[32px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center gap-4"
                        >
                            <Trophy size={16} />
                            Markup Successful
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* STICKER DRAWER */}
            <div className={`p-10 border-t-8 transition-all ${isDark ? 'bg-[#151921] border-white/5' : 'bg-white border-slate-50'}`}>
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
                    <div className="flex flex-wrap justify-center gap-4">
                        {initialData.availableMarks.map(mark => (
                            <motion.button
                                key={mark}
                                whileHover={{ scale: 1.15, rotate: 5, y: -5 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    const nextSlot = slots.find(s => !s.current);
                                    if (nextSlot) handleDrop(mark, nextSlot.index);
                                }}
                                className={`w-14 h-14 flex items-center justify-center border-4 rounded-[28px] text-2xl font-black shadow-xl transition-all font-serif ${isDark ? 'bg-white/5 border-white/10 text-pink-400 hover:border-pink-500 hover:text-pink-500' : 'bg-white border-pink-50 text-pink-400 hover:border-pink-400'}`}
                            >
                                {mark}
                            </motion.button>
                        ))}
                    </div>

                    <div className="flex items-center gap-6 w-full max-w-2xl px-4">
                         <div className={`p-6 rounded-[40px] border-2 flex items-center gap-4 flex-1 ${isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-pink-50/50 border-pink-100 text-pink-600'}`}>
                            <PenTool size={24} className="text-pink-400 shrink-0" />
                            <p className="text-[11px] font-bold leading-relaxed">
                                Choose the correct <span className="text-pink-500">Sticker</span> for each slot to complete the punctuation mapping.
                            </p>
                        </div>
                        
                        <button 
                            disabled={slots.some(s => !s.current) || phase !== 'active' }
                            onClick={checkSolution}
                            className={`px-12 py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-xl ${
                                slots.every(s => s.current) 
                                ? 'bg-pink-500 text-white shadow-pink-500/20 hover:-translate-y-1' 
                                : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-white/20'
                            }`}
                        >
                            Final Markup
                        </button>
                    </div>
                </div>
            </div>

            {/* FINISH OVERLAY */}
            <AnimatePresence>
                {phase === 'finish' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-3xl p-6">
                        <motion.div 
                            initial={{ scale: 0.8, rotate: -5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="bg-white dark:bg-[#151921] p-16 rounded-[72px] shadow-3xl text-center max-w-sm w-full border-[12px] border-pink-500"
                        >
                            <div className="w-28 h-28 bg-pink-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-12 relative">
                                <Zap size={56} className="text-white fill-white" />
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center border-4 border-white">
                                    <Trophy size={24} className="text-white" />
                                </div>
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-3 italic">Punctuation Pro!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12">The manuscript is verified</p>
                            
                            <button 
                                onClick={() => {
                                    if (onComplete) onComplete({
                                        isCorrect: totalMistakes === 0,
                                        accuracy: Math.max(0, (initialData.queries.length - totalMistakes) / initialData.queries.length),
                                        score: initialData.queries.length * 20,
                                        mistakes: totalMistakes,
                                        type: 'simulation',
                                        engineType: 'PUNCTUATION_PORTAL'
                                    });
                                }}
                                className="w-full py-6 bg-pink-500 text-white rounded-[32px] font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-xl shadow-pink-500/20"
                            >
                                CONTINUE <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

PunctuationPortalEngine.hideGlobalFooter = true;
export default PunctuationPortalEngine;
