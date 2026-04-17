import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Timer, Trophy, ArrowRight, Sparkles } from 'lucide-react';

/**
 * WORD GRID RENDERER
 * Stateless UI component for the drag-to-select word search grid.
 */

const GridRenderer = ({ 
    isDark, 
    gridSize, 
    grid, 
    foundWords, 
    rawWords, 
    selection, 
    foundCoords, 
    seconds, 
    score, 
    showFinish, 
    handleStart, 
    handleMove, 
    handleEnd,
    onComplete,
    handleRetry
}) => {
    const isCellSelected = (r, c) => selection.some(p => p.r === r && p.c === c);
    const isCellFound = (r, c) => foundCoords.has(`${r},${c}`);

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            <div className="flex-none p-4 sm:p-6 pb-2">
                <div className="flex justify-between items-center mb-6">
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-lg shadow-indigo-500/5' : 'bg-white text-indigo-600 border border-slate-100 shadow-sm'}`}>
                        <Search size={12} className="animate-pulse" /> Word Search
                    </div>
                    <div className="flex gap-2">
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 ${isDark ? 'bg-white/5 text-slate-400' : 'bg-white text-slate-500 shadow-sm border border-slate-100'}`}>
                            <Timer size={14} /> {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100'}`}>
                            {score}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-xl mx-auto">
                    {rawWords.map((word, i) => (
                        <div 
                            key={i} 
                            className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${foundWords.has(word) ? 'bg-emerald-500/20 text-emerald-500 scale-90 translate-y-1' : (isDark ? 'bg-white/5 text-slate-200 border border-white/10 shadow-xl' : 'bg-white text-slate-700 border border-slate-200 shadow-lg shadow-slate-200/50')}`}
                        >
                            {word}
                            {foundWords.has(word) && <Sparkles size={10} className="inline ml-1 mb-0.5" />}
                        </div>
                    ))}
                </div>
            </div>

            <div 
                className="flex-1 flex items-center justify-center p-3 sm:p-6 touch-none overflow-hidden"
                onMouseDown={handleStart} onMouseMove={handleMove} onMouseUp={handleEnd}
                onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
            >
                <div 
                    className={`grid gap-1 w-full max-w-[420px] aspect-square p-2.5 rounded-[40px] shadow-3xl transition-all duration-500 ${isDark ? 'bg-white/5 border border-white/10 shadow-indigo-500/5' : 'bg-white border-2 border-slate-200 shadow-slate-300/50'}`}
                    style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                >
                    {grid.map((row, r) => row.map((char, c) => {
                        const selected = isCellSelected(r, c);
                        const found = isCellFound(r, c);
                        return (
                            <div 
                                key={`${r}-${c}`} data-r={r} data-c={c}
                                className={`flex items-center justify-center rounded-xl text-base font-black transition-all duration-300 select-none ${selected ? 'bg-indigo-600 text-white scale-110 z-20 shadow-xl' : (found ? 'bg-emerald-500/20 text-emerald-500 scale-95' : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'))}`}
                            >
                                {char}
                            </div>
                        );
                    }))}
                </div>
            </div>

            <div className="p-10 text-center">
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] opacity-30 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Drag to Connect Letters
                </p>
            </div>

            <AnimatePresence>
                {showFinish && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-xl bg-black/40">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl border border-white/10 text-center max-w-sm w-full">
                            <div className="w-24 h-24 bg-indigo-600 text-white rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                                <Trophy size={48} />
                            </div>
                            <h2 className="text-4xl font-black mb-2 tracking-tight">Success!</h2>
                            <p className="text-slate-500 font-bold mb-10 text-lg">Final Score: {score} pts</p>
                            <div className="flex flex-col gap-3 w-full">
                                <button onClick={onComplete} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20">
                                    Continue <ArrowRight size={20} />
                                </button>
                                <button onClick={handleRetry} className="w-full h-12 text-slate-500 font-black text-[10px] tracking-widest uppercase hover:text-indigo-500 transition-colors">
                                    ↺ New Grid
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GridRenderer;
