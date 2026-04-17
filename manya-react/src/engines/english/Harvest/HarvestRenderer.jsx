import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';

/**
 * HARVEST RENDERER
 * Stateless UI component for the vocabulary collection game.
 */

const HarvestRenderer = ({ 
    score, 
    winScore, 
    lives, 
    side, 
    items, 
    particles, 
    shakeKey, 
    leftCat, 
    rightCat, 
    done, 
    won, 
    handleTap, 
    handleFinish, 
    handleRetry 
}) => {
    const basketLeft = side === 'left' ? '10%' : '55%';

    return (
        <div 
            className="flex flex-col h-full bg-[#0f1623] text-white overflow-hidden select-none font-sans relative"
            onClick={handleTap}
            onTouchStart={handleTap}
        >
            {/* HUD */}
            <header className="flex-none flex items-center justify-between px-5 pt-8 pb-4 z-20">
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-2">
                    <span className="text-amber-400 text-sm">⭐</span>
                    <span className="text-lg font-black tabular-nums">{score}</span>
                    <span className="text-[10px] text-amber-500/60 font-bold ml-1">/ {winScore}</span>
                </div>
                <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                        <span key={i} className={`text-2xl transition-all duration-300 ${i < lives ? 'opacity-100' : 'opacity-15'}`}>
                            {i < lives ? '❤️' : '🖤'}
                        </span>
                    ))}
                </div>
            </header>

            {/* Lane Labels */}
            <div className="flex-none flex px-4 gap-4 pb-2 z-20">
                <div className={`flex-1 text-center py-5 rounded-3xl border-2 transition-all duration-200 font-black text-sm uppercase tracking-widest ${side === 'left' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/3 border-white/8 text-slate-500'}`}>
                    <div className="text-[9px] opacity-40 mb-1 leading-none">Lane 01</div>
                    {leftCat}
                </div>
                <div className={`flex-1 text-center py-5 rounded-3xl border-2 transition-all duration-200 font-black text-sm uppercase tracking-widest ${side === 'right' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/3 border-white/8 text-slate-500'}`}>
                    <div className="text-[9px] opacity-40 mb-1 leading-none">Lane 02</div>
                    {rightCat}
                </div>
            </div>

            {/* Game Canvas Overlay */}
            <div 
                className="flex-1 relative overflow-hidden"
                style={{ animation: shakeKey > 0 ? 'shake 0.4s ease' : 'none' }}
            >
                {/* Particles */}
                {particles.map(p => (
                    <div
                        key={p.id}
                        className="absolute w-3 h-3 rounded-full pointer-events-none"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color, opacity: p.life, transform: `scale(${p.life})` }}
                    />
                ))}

                {/* Falling items */}
                <AnimatePresence>
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="absolute pointer-events-none flex flex-col items-center gap-1"
                            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%,-50%)' }}
                        >
                            <div className={`w-14 h-14 rounded-3xl border-2 shadow-2xl flex items-center justify-center ${item.cat === leftCat ? 'bg-indigo-600 border-indigo-400' : 'bg-emerald-600 border-emerald-400'}`}>
                                <span className="text-2xl">🍎</span>
                            </div>
                            <div className="px-3 py-1 bg-slate-900/80 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                                {item.text}
                            </div>
                        </div>
                    ))}
                </AnimatePresence>

                {/* Basket */}
                <div
                    className="absolute bottom-4 transition-all duration-150 ease-out pointer-events-none"
                    style={{ left: basketLeft, width: '40%' }}
                >
                    <div className="relative mx-auto flex flex-col items-center w-[120px]">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-4 bg-black/30 rounded-full blur-md" />
                        <div className="w-full h-20 bg-gradient-to-b from-amber-500 to-amber-700 rounded-b-[40px] rounded-t-2xl border-t-8 border-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/30 overflow-hidden">
                            <span className="text-3xl">🧺</span>
                        </div>
                    </div>
                </div>

                {/* Start Hint */}
                {score === 0 && !done && (
                    <div className="absolute bottom-32 inset-x-0 flex justify-center pointer-events-none">
                        <div className="flex gap-4 animate-bounce">
                            <div className="px-5 py-3 bg-white/5 border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">← Tap Left</div>
                            <div className="px-5 py-3 bg-white/5 border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Tap Right →</div>
                        </div>
                    </div>
                )}
            </div>

            {/* End Screen Overlay */}
            <AnimatePresence>
                {done && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-black/70 backdrop-blur-2xl flex items-center justify-center p-8">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-[#151e2e] rounded-[48px] p-10 text-center shadow-2xl border border-white/8">
                            <div className={`w-24 h-24 rounded-3xl mx-auto mb-8 flex items-center justify-center text-5xl shadow-2xl ${won ? 'bg-amber-500' : 'bg-rose-600'}`}>
                                {won ? '🏆' : '😔'}
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter mb-2 uppercase italic">{won ? 'Finished!' : 'Missed!'}</h2>
                            <p className="text-slate-400 text-sm mb-10">{won ? `Amazing! ${score} stars collected.` : `Only ${score} stars — try again?`}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleFinish} className="w-full h-14 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-transform">
                                    Continue Quest <ArrowRight size={20} className="inline ml-2" />
                                </button>
                                <button onClick={handleRetry} className="w-full py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-white transition-colors outline-none">
                                    ↺ Play Again
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes shake {
                    0%,100% { transform: translateX(0); }
                    20%      { transform: translateX(-10px); }
                    40%      { transform: translateX(10px); }
                    60%      { transform: translateX(-8px); }
                    80%      { transform: translateX(8px); }
                }
            `}</style>
        </div>
    );
};

export default HarvestRenderer;
