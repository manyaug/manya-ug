import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Heart, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Lightbulb, Trophy, AlertCircle } from 'lucide-react';

/**
 * GRAMMAR MAZE RENDERER
 * Stateless UI component for the grammar arcade maze.
 */

const MazeRenderer = ({ 
    isDark, 
    lvlIdx, 
    lives, 
    score, 
    currentLvl, 
    playerPos, 
    obstacles, 
    feedback, 
    attemptMove,
    data,
    showFinish,
    isGameOver,
    handleFinish,
    handleRetry
}) => {
    const maze = currentLvl?.maze || [];
    const rows = maze.length;
    const cols = maze[0]?.length || 0;

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Header HUD */}
            <div className="flex-none p-6 pb-2">
                <div className="flex justify-between items-center mb-4">
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        <Zap size={12} className="animate-pulse" /> Level {lvlIdx + 1}
                    </div>
                    <div className="flex gap-2">
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>
                            {Array(lives).fill(0).map((_, i) => <Heart key={i} size={12} fill="currentColor" />)}
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
                            {score}
                        </div>
                    </div>
                </div>

                <div className={`p-4 rounded-3xl border text-center transition-all ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <p className="text-xs font-black leading-tight uppercase tracking-tight">
                        {currentLvl?.question}
                    </p>
                </div>
            </div>

            {/* Maze Area */}
            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                <div 
                    className={`relative grid p-1 rounded-2xl ${isDark ? 'bg-slate-800 shadow-2xl' : 'bg-slate-200'}`}
                    style={{ 
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        width: 'min(90vw, 400px)',
                        aspectRatio: `${cols}/${rows}`
                    }}
                >
                    {maze.map((row, r) => row.map((tile, c) => {
                        const gate = currentLvl.answers.find(ans => ans.r === r && ans.c === c);
                        const isWall = tile === 1;
                        return (
                            <div 
                                key={`${r}-${c}`}
                                className={`relative flex items-center justify-center text-[8px] font-black text-center border-[0.5px] border-black/5 ${isWall ? (isDark ? 'bg-slate-900 shadow-inner' : 'bg-slate-400') : ''} ${gate ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700') : ''}`}
                            >
                                {gate?.text}
                            </div>
                        );
                    }))}

                    {/* Moving Obstacles */}
                    {obstacles.map((obs, i) => (
                        <div 
                            key={i}
                            className="absolute z-10 text-lg transition-all duration-500 ease-linear flex items-center justify-center"
                            style={{ 
                                width: `${100/cols}%`, 
                                height: `${100/rows}%`,
                                transform: `translate(${obs.c * 100}%, ${obs.r * 100}%)`
                            }}
                        >
                            {obs.type === 'TIGER' ? '🐅' : '🐍'}
                        </div>
                    ))}

                    {/* Player */}
                    <motion.div 
                        className="absolute z-20 flex items-center justify-center"
                        animate={{ x: `${playerPos.c * 100}%`, y: `${playerPos.r * 100}%` }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{ width: `${100/cols}%`, height: `${100/rows}%` }}
                    >
                        <div className="w-4/5 h-4/5 bg-indigo-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                            <span className="text-[10px]">👤</span>
                        </div>
                    </motion.div>
                </div>

                {/* Feedback Toast */}
                <AnimatePresence>
                    {feedback && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                        >
                            <div className={`px-6 py-3 rounded-2xl font-black text-sm shadow-2xl border-2 ${feedback.type === 'success' ? 'bg-emerald-500 border-white text-white' : 'bg-rose-500 border-white text-white'}`}>
                                {feedback.msg}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* D-Pad Controls */}
            <div className={`p-6 pb-14 flex flex-col items-center shrink-0 ${isDark ? 'bg-[#0B0E14]' : 'bg-slate-50'}`}>
                <div className="grid grid-cols-3 gap-2">
                    <div />
                    <button onClick={() => attemptMove(-1, 0)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all outline-none border border-slate-200 dark:border-white/10">
                        <ChevronUp size={24} />
                    </button>
                    <div />
                    <button onClick={() => attemptMove(0, -1)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all outline-none border border-slate-200 dark:border-white/10">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={() => attemptMove(1, 0)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all outline-none border border-slate-200 dark:border-white/10">
                        <ChevronDown size={24} />
                    </button>
                    <button onClick={() => attemptMove(0, 1)} className="w-14 h-14 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all outline-none border border-slate-200 dark:border-white/10">
                        <ChevronRight size={24} />
                    </button>
                </div>
                
                {data?.hint && (
                    <div className="mt-8 flex items-center gap-3 px-4">
                        <Lightbulb size={16} className="text-amber-500" />
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {data.hint}
                        </p>
                    </div>
                )}
            </div>

            {/* Finish/Fail Overlays */}
            <AnimatePresence>
                {(showFinish || isGameOver) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-xl bg-black/40">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl text-center max-w-sm w-full border border-white/10">
                            <div className={`w-24 h-24 rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12 ${showFinish ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {showFinish ? <Trophy size={48} /> : <AlertCircle size={48} />}
                            </div>
                            <h2 className="text-4xl font-black mb-2 tracking-tight">
                                {showFinish ? 'Maze Runner!' : 'Game Over'}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 text-lg">
                                Score: {score} pts
                            </p>
                            
                            <div className="flex flex-col gap-3 w-full">
                                <button onClick={handleFinish} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl">
                                    Continue
                                </button>
                                <button onClick={handleRetry} className="w-full h-14 text-slate-500 font-black text-[10px] tracking-widest uppercase outline-none">
                                    Try Again
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MazeRenderer;
