import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowRight, Trophy, Zap, AlertTriangle, CloudSun, Leaf, Tent, Box } from 'lucide-react';

/**
 * MANYA ENGLISH: TENSE TREEHOUSE ENGINE (v2.0 Standalone)
 * -----------------------------------------------------
 * Promoted from Sandbox. Now fully data-driven.
 */
const TenseTreehouseEngine = ({ data, onComplete }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [phase, setPhase] = useState('active'); // 'active' | 'success' | 'finish'
    const [error, setError] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const initialData = useMemo(() => {
        const d = data?.data || data || {};
        return {
            queries: d.queries || [
                { 
                    base: "She eats an apple", 
                    targetTense: "The Past", 
                    options: ["ate", "eaten", "eats"], 
                    correct: "ate", 
                    fullCorrect: "She ate an apple" 
                }
            ]
        };
    }, [data]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleSelect = (opt) => {
        if (phase !== 'active') return;
        setSelectedOption(opt);
        const q = initialData.queries[currentIdx];

        if (opt === q.correct) {
            window.ManyaAudio?.success?.();
            setError(false);
            if (currentIdx < initialData.queries.length - 1) {
                setPhase('success');
                setTimeout(() => {
                    setCurrentIdx(prev => prev + 1);
                    setSelectedOption(null);
                    setPhase('active');
                }, 1500);
            } else {
                setPhase('finish');
            }
        } else {
            window.ManyaAudio?.error?.();
            setTotalMistakes(prev => prev + 1);
            setError(true);
            setTimeout(() => setError(false), 1000);
        }
    };

    const q = initialData.queries[currentIdx];

    return (
        <div className={`flex flex-col h-full font-jakarta overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-800'}`}>
            {/* TREEHOUSE VIEWPORT */}
            <div className={`flex-1 relative flex flex-col p-4 sm:p-10 overflow-hidden min-h-[400px] sm:min-h-[450px] ${isDark ? 'bg-white/5' : 'bg-emerald-500/5'}`}>
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
                
                {/* Header */}
                <div className="relative z-20 flex justify-between items-start mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500 rounded-2xl sm:rounded-3xl shadow-[0_4px_0_#065f46] sm:shadow-[0_6px_0_#059669] flex items-center justify-center rotate-3">
                            <Tent className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none italic uppercase">Tense Treehouse</h2>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-2 italic">Temporal Engine</p>
                        </div>
                    </div>
                </div>

                {/* The Magic Tree Area */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10">
                    <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-2xl px-2">
                        <motion.div 
                            initial={{ scale: 0.9, y: -10 }}
                            animate={{ scale: 1, y: 0 }}
                            className={`inline-flex items-center gap-3 px-5 py-3 rounded-[24px] border-2 transition-all ${isDark ? 'bg-white/5 border-white/5 shadow-2xl' : 'bg-white border-emerald-100 shadow-xl'}`}
                        >
                            <CloudSun size={20} className="text-amber-500 animate-bounce" />
                            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-indigo-400' : 'text-emerald-800'}`}>Tense Season: {q?.targetTense}</span>
                        </motion.div>
                        
                        <div className={`w-full p-8 sm:p-12 rounded-[40px] sm:rounded-[48px] shadow-2xl relative border-t-4 sm:border-t-8 transition-all animate-in slide-in-from-bottom-8 duration-700 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-emerald-100'}`}>
                             <h3 className={`text-xl sm:text-4xl font-black px-2 leading-tight tracking-tight text-center ${isDark ? 'text-white' : 'text-emerald-950'}`}>
                                {phase === 'success' ? q?.fullCorrect : q?.base}
                             </h3>
                             <Leaf className="absolute -top-4 -right-4 text-emerald-400 rotate-45 opacity-50 sm:opacity-100" size={32} fill="currentColor" />
                             <Leaf className="absolute -bottom-4 -left-4 text-orange-400 -rotate-12 opacity-50 sm:opacity-100" size={24} fill="currentColor" />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-2xl px-4">
                        {q?.options.map((opt, i) => (
                            <motion.button
                                key={i}
                                whileHover={{ y: -5, scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(opt)}
                                className={`px-6 sm:px-10 py-5 sm:py-6 rounded-[24px] sm:rounded-[32px] font-black text-base sm:text-lg transition-all shadow-[0_6px_0_rgba(0,0,0,0.1)] sm:shadow-[0_8px_0_rgba(0,0,0,0.15)] active:shadow-none uppercase tracking-wider min-w-[140px] sm:min-w-[180px] ${
                                    selectedOption === opt && opt === q.correct ? 'bg-emerald-500 text-white' :
                                    selectedOption === opt && opt !== q.correct ? 'bg-rose-500 text-white shadow-[0_6px_0_#9f1239] sm:shadow-[0_8px_0_#9f1239]' :
                                    (isDark ? 'bg-white/10 text-white border-2 border-white/5' : 'bg-white text-emerald-900 border-2 border-emerald-50')
                                }`}
                            >
                                {opt}
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3 text-rose-600 bg-rose-50 px-6 sm:px-8 py-3 sm:py-4 rounded-full border-2 border-rose-200 shadow-xl"
                            >
                                <AlertTriangle size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Temporal Anomaly!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* TREE ROOTS / PROGRESSBAR */}
            <div className={`p-6 sm:p-10 transition-all border-t-2 sm:border-t-4 ${isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-emerald-50'}`}>
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                    <div className="flex-1 w-full space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-center text-emerald-600/50">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Climb Altitude</span>
                            <span className="text-[10px] font-black italic tracking-tighter uppercase leading-none">Checkpoint {currentIdx + 1}/{initialData.queries.length}</span>
                        </div>
                        <div className="h-4 w-full bg-emerald-500/10 rounded-full p-1 border border-emerald-100 overflow-hidden">
                            <motion.div 
                                animate={{ width: `${((currentIdx + 1) / initialData.queries.length) * 100}%` }}
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-lg"
                            />
                        </div>
                    </div>

                    <div className={`p-5 sm:p-6 rounded-[32px] sm:rounded-[40px] border-2 max-w-xs flex items-center gap-4 sm:gap-5 ${isDark ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-emerald-50 border-emerald-100'}`}>
                        <Box size={24} className="text-emerald-500 shrink-0 opacity-60" />
                        <p className={`text-[10px] sm:text-[11px] font-black leading-relaxed ${isDark ? 'text-slate-400' : 'text-emerald-900/60 uppercase'}`}>
                            Ascend the treehouse by matching the verb syntax to the <span className="text-emerald-500">Target Season</span>.
                        </p>
                    </div>
                </div>
            </div>

            {/* FINISH OVERLAY */}
            <AnimatePresence>
                {phase === 'finish' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-3xl p-6">
                        <motion.div 
                            initial={{ scale: 0.8, y: 100 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white dark:bg-[#151921] p-16 rounded-[72px] shadow-3xl text-center max-w-sm w-full border-[12px] border-emerald-500"
                        >
                            <div className="w-28 h-28 bg-emerald-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-[0_12px_0_#065f46] rotate-12 relative overflow-hidden">
                                <Trophy size={64} className="text-white fill-white relative z-10" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-3 italic">Climber Supreme!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12">The peak has been reached</p>
                            
                            <button 
                                onClick={() => {
                                    if (onComplete) onComplete({
                                        isCorrect: totalMistakes === 0,
                                        accuracy: Math.max(0, (initialData.queries.length - totalMistakes) / initialData.queries.length),
                                        score: initialData.queries.length * 15,
                                        mistakes: totalMistakes,
                                        type: 'simulation',
                                        engineType: 'TENSE_TREEHOUSE'
                                    });
                                }}
                                className="w-full py-6 bg-emerald-500 text-white rounded-[40px] font-black text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-4 shadow-[0_10px_0_#059669] hover:bg-emerald-600 transition-all active:translate-y-2 active:shadow-none"
                            >
                                Submit & Continue <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

TenseTreehouseEngine.hideGlobalFooter = true;
export default TenseTreehouseEngine;
