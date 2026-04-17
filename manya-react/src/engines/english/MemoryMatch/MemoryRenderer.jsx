import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Lightbulb, Trophy, ArrowRight } from 'lucide-react';

/**
 * MEMORY MATCH RENDERER
 * Stateless UI component for the 3D flipping card grid.
 */

const MemoryRenderer = ({ 
    isDark, 
    score, 
    hint, 
    cards, 
    flippedIndices, 
    matches, 
    handleCardClick, 
    showFinish, 
    onComplete, 
    resetGame 
}) => {
    const gridCols = cards.length <= 6 ? 'grid-cols-2' : (cards.length <= 12 ? 'grid-cols-3' : 'grid-cols-4');

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            <div className="flex-none p-6 pb-2">
                <div className="flex justify-between items-center mb-6">
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-lg' : 'bg-white text-indigo-600 border border-slate-100 shadow-sm'}`}>
                        <Brain size={12} className="animate-pulse" /> Memory Match
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2 ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
                        <Sparkles size={14} className="text-amber-500" /> {score}
                    </div>
                </div>

                <div className={`p-4 rounded-3xl border flex items-start gap-3 transition-all ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-premium-sm'}`}>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Lightbulb size={16} />
                    </div>
                    <p className={`text-xs font-bold leading-normal mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{hint}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide flex items-center justify-center">
                <div className={`grid ${gridCols} gap-3 w-full max-w-lg pb-10`}>
                    {cards.map((card, idx) => {
                        const isFlipped = flippedIndices.includes(idx) || matches.has(card.pairId);
                        const isMatched = matches.has(card.pairId);
                        
                        return (
                            <div key={card.id} onClick={() => handleCardClick(idx)} className="aspect-[3/4] perspective-1000 cursor-pointer group">
                                <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    <div className={`absolute inset-0 backface-hidden rounded-2xl border-2 flex items-center justify-center shadow-lg transition-all ${isDark ? 'bg-[#1E2530] border-white/5 text-indigo-500/30' : 'bg-white border-slate-100 text-slate-200'} group-hover:scale-105 active:scale-95`}>
                                        <div className="w-12 h-12 rounded-full border-4 border-current opacity-10 flex items-center justify-center">
                                            <span className="text-xl font-black">?</span>
                                        </div>
                                    </div>
                                    <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 flex items-center justify-center p-3 text-center shadow-xl transition-all ${isMatched ? (isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700') : (isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-indigo-100 text-indigo-700')}`}>
                                        <span className="text-xs font-black leading-tight uppercase tracking-tight">{card.text}</span>
                                        {isMatched && <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] animate-in zoom-in duration-300">✓</div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <AnimatePresence>
                {showFinish && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-xl bg-black/40">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl text-center max-w-sm w-full border border-white/10">
                            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                                <Trophy size={48} />
                            </div>
                            <h2 className="text-4xl font-black mb-2 tracking-tight leading-none">Legend!</h2>
                            <p className="text-slate-500 font-bold mb-10 text-lg">Score: {score} pts</p>
                            <div className="flex flex-col gap-3 w-full">
                                <button onClick={onComplete} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20">
                                    Continue <ArrowRight size={20} />
                                </button>
                                <button onClick={resetGame} className="w-full h-14 text-slate-500 font-black text-[10px] tracking-widest uppercase hover:text-indigo-500 transition-colors">
                                    ↺ Play Again
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .shadow-premium-sm { box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
            `}</style>
        </div>
    );
};

export default MemoryRenderer;
