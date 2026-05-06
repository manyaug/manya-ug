import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tent, CloudSun, Leaf, AlertTriangle, Box, Trophy, ArrowRight } from 'lucide-react';

/**
 * TENSE TREEHOUSE RENDERER
 * Stateless UI component for the temporal categorization engine.
 */

const TenseRenderer = ({ 
    isDark, 
    currentIdx, 
    totalQueries, 
    selectedOption, 
    phase, 
    error, 
    q, 
    handleSelect, 
    onComplete 
}) => {
    return (
        <div className={`flex flex-col h-full font-jakarta overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-800'}`}>
            <div className={`flex-1 relative flex flex-col p-4 sm:p-10 overflow-hidden min-h-[400px] ${isDark ? 'bg-white/5' : 'bg-emerald-500/5'}`}>
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
                
                {/* Header */}
                <div className="relative z-20 flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-3xl shadow-[0_6px_0_#059669] flex items-center justify-center rotate-3">
                            <Tent className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-none italic uppercase">Tense Treehouse</h2>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-2 italic">Temporal Engine</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6">
                    <div className="flex flex-col items-center gap-4 w-full max-w-2xl px-2">
                        <motion.div 
                            initial={{ scale: 0.9, y: -10 }} animate={{ scale: 1, y: 0 }}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[1rem] border-2 transition-all ${isDark ? 'bg-white/5 border-white/5 shadow-2xl' : 'bg-white border-emerald-100 shadow-sm'}`}
                        >
                            <CloudSun size={16} className="text-amber-500 animate-bounce" />
                            <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-indigo-400' : 'text-emerald-800'}`}>Tense Season: {q?.targetTense}</span>
                        </motion.div>
                        
                        <div className={`w-full p-6 sm:p-8 rounded-[2rem] shadow-xl relative border-t-4 transition-all animate-in slide-in-from-bottom-8 duration-700 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-emerald-100'}`}>
                             <h3 className={`text-lg sm:text-2xl font-black px-2 leading-relaxed tracking-tight text-center ${isDark ? 'text-white' : 'text-emerald-950'}`}>
                                {phase === 'success' ? q?.fullCorrect : q?.base}
                             </h3>
                             <Leaf className="absolute -top-3 -right-3 text-emerald-400 rotate-45 opacity-30 sm:opacity-50" size={24} fill="currentColor" />
                             <Leaf className="absolute -bottom-3 -left-3 text-orange-400 -rotate-12 opacity-30 sm:opacity-50" size={18} fill="currentColor" />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 max-w-2xl px-4">
                        {q?.options.map((opt, i) => (
                            <motion.button
                                key={i} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(opt)}
                                className={`px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-[0_6px_0_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none uppercase tracking-wider min-w-[120px] ${
                                    selectedOption === opt && opt === q.correct ? 'bg-emerald-500 text-white shadow-[0_6px_0_#059669]' :
                                    selectedOption === opt && opt !== q.correct ? 'bg-rose-500 text-white shadow-[0_6px_0_#be123c]' :
                                    (isDark ? 'bg-white/10 text-white border-2 border-white/5 shadow-[0_6px_0_rgba(255,255,255,0.05)]' : 'bg-white text-emerald-900 border-2 border-emerald-50')
                                }`}
                            >
                                {opt}
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-2 text-rose-600 bg-rose-50 px-6 py-3 rounded-full border-2 border-rose-200 shadow-lg absolute bottom-4"
                            >
                                <AlertTriangle size={16} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Temporal Anomaly!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className={`p-4 sm:p-6 transition-all border-t-2 ${isDark ? 'bg-[#0B0E14] border-white/5' : 'bg-white border-emerald-50'}`}>
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="flex-1 w-full space-y-2">
                        <div className="flex justify-between items-center text-emerald-600/50">
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Climb Altitude</span>
                            <span className="text-[9px] font-black italic tracking-tighter uppercase leading-none">Checkpoint {currentIdx + 1}/{totalQueries}</span>
                        </div>
                        <div className="h-3 w-full bg-emerald-500/10 rounded-full p-0.5 border border-emerald-100 overflow-hidden">
                            <motion.div animate={{ width: `${((currentIdx + 1) / totalQueries) * 100}%` }} className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-md" />
                        </div>
                    </div>

                    <div className={`p-3 sm:p-4 rounded-[1.5rem] border-2 max-w-xs flex items-center gap-3 ${isDark ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-emerald-50 border-emerald-100'}`}>
                        <Box size={20} className="text-emerald-500 shrink-0 opacity-60" />
                        <p className={`text-[9px] sm:text-[10px] font-black leading-relaxed ${isDark ? 'text-slate-400' : 'text-emerald-900/60 uppercase'}`}>
                            Ascend the treehouse by matching the verb syntax to the <span className="text-emerald-500">Target Season</span>.
                        </p>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {phase === 'finish' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-3xl p-6">
                        <motion.div initial={{ scale: 0.8, y: 100 }} animate={{ scale: 1, y: 0 }} className="bg-white dark:bg-[#151921] p-16 rounded-[72px] shadow-3xl text-center max-w-sm w-full border-[12px] border-emerald-500">
                            <div className="w-28 h-28 bg-emerald-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-[0_12px_0_#065f46] rotate-12 relative overflow-hidden">
                                <Trophy size={64} className="text-white fill-white relative z-10" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-3 italic">Climber Supreme!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12">The peak has been reached</p>
                            <button onClick={onComplete} className="w-full h-16 bg-[#58cc02] hover:bg-[#46a302] text-white rounded-2xl font-black text-xs tracking-[0.3em] uppercase flex items-center justify-center gap-4 border-b-[4px] border-[#46a302] transition-all active:translate-y-1">
                                <span className="relative z-10 flex items-center gap-2">Submit & Continue <ArrowRight size={20} strokeWidth={4} /></span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TenseRenderer;
