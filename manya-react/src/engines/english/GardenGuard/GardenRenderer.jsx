import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flower2, Droplets, Sun, Sparkles } from 'lucide-react';

/**
 * GARDEN GUARD RENDERER
 * Stateless visual component for the grammar garden.
 */

const GardenRenderer = ({ 
    health, 
    score, 
    marching, 
    phase, 
    isDark, 
    handleWordClick 
}) => {
    return (
        <div className={`flex flex-col h-full font-jakarta overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-[#ECFDF5] text-slate-800'}`}>
            <div className={`flex-1 relative flex flex-col p-6 sm:p-10 overflow-hidden min-h-[400px] ${isDark ? 'bg-white/5' : 'bg-sky-100/30'}`}>
                <div className="absolute top-10 right-10 text-amber-300/40 animate-[spin_10s_linear_infinite]">
                    <Sun size={64} fill="currentColor" strokeWidth={1} />
                </div>
                
                <div className="relative z-30 flex justify-between items-start mb-10 pointer-events-none">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-emerald-500 rounded-3xl flex items-center justify-center shadow-lg">
                            <Flower2 className={isDark ? 'text-white' : 'text-emerald-500'} size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black mb-1 uppercase tracking-tight">Garden Guard</h2>
                        </div>
                    </div>

                    <div className={`flex px-6 py-4 rounded-[32px] gap-6 border-2 transition-all ${isDark ? 'bg-[#151921] border-white/5' : 'bg-white/90 border-white shadow-xl'}`}>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-tighter">Energy</p>
                            <p className={`text-xl font-black tabular-nums ${health > 30 ? 'text-emerald-500' : 'text-rose-500'}`}>{health}%</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-tighter">Score</p>
                            <p className="text-xl font-black text-amber-500 tabular-nums">{score}</p>
                        </div>
                    </div>
                </div>

                {/* Vertical Health Meter Overlay */}
                <div className="absolute right-0 top-0 h-full w-2 z-20 overflow-hidden opacity-40">
                    <motion.div 
                        animate={{ height: `${health}%`, backgroundColor: health > 30 ? '#10B981' : '#F43F5E' }}
                        className="w-full absolute bottom-0"
                    />
                </div>

                {/* Marching Sentences Zone */}
                <div className="relative flex-1 z-10 pr-6">
                    <AnimatePresence>
                        {marching.map((s, idx) => (
                            <motion.div
                                key={s.id} initial={{ x: -200, opacity: 0 }} animate={{ x: '100%', opacity: 1 }}
                                transition={{ duration: s.duration / 1000, ease: 'linear' }}
                                className="absolute flex gap-2" style={{ top: `${15 + (idx % 4) * 20}%` }}
                            >
                                <div className={`flex items-center gap-3 px-6 py-4 rounded-[40px] border-4 transition-all shadow-xl ${
                                    s.isHealed 
                                    ? (isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700') 
                                    : (isDark ? 'bg-white/10 border-white/10 text-slate-300' : 'bg-white border-white text-slate-700')
                                }`}>
                                    <Droplets size={20} className={s.isHealed ? 'text-emerald-400' : 'text-sky-300'} />
                                    <div className="flex gap-2">
                                        {s.words.map((word, i) => (
                                            <button
                                                key={i} onClick={() => handleWordClick(s.id, word, i)}
                                                className={`text-sm sm:text-lg font-black transition-all hover:scale-110 active:scale-95 ${s.isHealed && word === s.correct ? 'text-emerald-400' : ''}`}
                                            >
                                                {word}
                                            </button>
                                        ))}
                                    </div>
                                    {s.isHealed && <Sparkles size={16} className="ml-2 text-amber-400 animate-bounce" />}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default GardenRenderer;
