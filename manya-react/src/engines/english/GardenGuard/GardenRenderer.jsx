import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flower2, Droplets, Sun, Sparkles, ArrowRight, Trophy, AlertCircle } from 'lucide-react';

/** 
 * GARDEN GUARD RENDERER
 * -------------------------------------------------------------
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
        <div className="flex flex-col h-full bg-[var(--bg-page)] text-[var(--text-main)] overflow-hidden select-none font-sans relative">
            {/* AMBIENT GARDEN GLOW (Theme Aware) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,_var(--manya-green)_0%,_transparent_70%)] opacity-[0.08] dark:opacity-30 pointer-events-none" />

            {/* TOP STATS (Compact) */}
            <header className="flex-none px-8 pt-10 pb-6 z-30 relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-2xl animate-bounce">🌻</div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-emerald-600 dark:text-emerald-400/80">Grammar Garden</span>
                        <div className="h-0.5 w-12 bg-emerald-500/30 rounded-full mt-1" />
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[8px] font-bold text-[var(--text-sub)] uppercase tracking-widest">Energy</p>
                        <p className={`text-sm font-bold ${health > 30 ? 'text-emerald-500' : 'text-rose-500'}`}>{health}%</p>
                    </div>
                    <div className="text-right border-l border-[var(--border-subtle)] pl-4">
                        <p className="text-[8px] font-bold text-[var(--text-sub)] uppercase tracking-widest">Score</p>
                        <p className="text-sm font-bold text-amber-500">{score}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 relative overflow-hidden">
                {/* INSTRUCTION OVERLAY */}
                <AnimatePresence>
                    {phase === 'intro' && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] bg-[var(--bg-page)]/90 backdrop-blur-sm flex flex-col items-center justify-center p-12 text-center"
                        >
                            <div className="text-5xl mb-6 animate-pulse">💧</div>
                            <h2 className="text-2xl font-bold mb-3 tracking-tight text-[var(--text-main)]">Fix the Tags</h2>
                            <p className="text-[var(--text-sub)] text-sm mb-8 max-w-[220px]">Tap the <span className="text-rose-500 font-bold">incorrect word</span> in the sentences to heal the garden!</p>
                            <button 
                                onClick={() => handleWordClick('START')}
                                className="manya-btn-elite primary w-full max-w-[240px]"
                            >
                                <div className="btn-toy-gloss" />
                                <span>Start Training</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MARCHING SENTENCES (Compact & Snappy) */}
                <div className="absolute inset-0 z-10 px-6">
                    <AnimatePresence>
                        {marching.map((s) => (
                            <motion.div
                                key={s.id} 
                                initial={{ x: -200, opacity: 0 }} 
                                animate={{ x: '100%', opacity: 1 }} 
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: s.duration / 1000, ease: 'linear' }}
                                className="absolute flex flex-col" 
                                style={{ top: `${15 + (s.lane ?? 0) * 20}%` }}
                            >
                                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${
                                    s.isHealed 
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300' 
                                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-main)] backdrop-blur-md'
                                } shadow-sm`}>
                                    <span className="text-sm">{s.isHealed ? '✨' : '💧'}</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {s.words.map((word, i) => (
                                            <button
                                                key={i} 
                                                id={s.isHealed && word === s.correct ? 'celebration-coin-source' : undefined}
                                                onClick={() => handleWordClick(s.id, word, i)}
                                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all transform active:scale-90 ${
                                                    s.isHealed && word === s.correct 
                                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                                                    : 'hover:bg-[var(--accent-bg)]'
                                                }`}
                                            >
                                                {word}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-1 h-0.5 w-8 bg-emerald-500/20 rounded-full mx-4" />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* ERROR FEEDBACK */}
            <AnimatePresence>
                {health < 100 && (
                     <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none">
                         <div className="h-0.5 w-32 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                             <motion.div 
                                animate={{ width: `${health}%`, backgroundColor: health > 30 ? '#10B981' : '#F43F5E' }}
                                className="h-full"
                             />
                         </div>
                     </div>
                )}
            </AnimatePresence>
            <style>{`
                .manya-btn-elite {
                    position: relative;
                    height: 60px;
                    border-radius: 20px;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    font-size: 13px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    overflow: hidden;
                    box-shadow: 0 8px 0 rgba(0,0,0,0.2);
                }
                .manya-btn-elite.primary { background: var(--manya-purple); box-shadow: 0 8px 0 var(--manya-purple-dark); }
                .manya-btn-elite:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
};

export default GardenRenderer;
