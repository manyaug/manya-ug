import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Sparkles, AlertCircle, Droplets, Zap } from 'lucide-react';

/**
 * HARVEST RENDERER v2.5 - "The Orchard Elite"
 * -------------------------------------------------------------
 * Premium visual system with splats, streaks, and organic signposts.
 */
const HarvestRenderer = ({ 
    score, 
    winScore, 
    lives, 
    side, 
    items, 
    particles, 
    splats,
    streak,
    maxStreak,
    shakeKey, 
    shakeDir,
    leftCat, 
    rightCat, 
    done, 
    won, 
    handleTap 
}) => {
    const basketLeft = side === 'left' ? '12%' : '53%';
    const fruits = ['🍎', '🍇', '🍊', '🍐', '🫐', '🍓'];
    const progress = Math.min(100, (score / winScore) * 100);

    return (
        <div 
            className="flex flex-col h-full bg-[#052e16] text-white overflow-hidden select-none font-jakarta relative"
            style={{ 
                background: 'radial-gradient(circle at center, #065f46 0%, #052e16 100%)',
                // Directional Recoil Shake
                transform: shakeKey > 0 ? `translateX(${shakeDir * 12}px)` : 'none',
                transition: shakeKey > 0 ? 'transform 0.1s cubic-bezier(0.36, 0, 0.66, -0.56)' : 'transform 0.4s ease-out'
            }}
            onClick={handleTap}
            onTouchStart={handleTap}
        >
            {/* Background Atmosphere */}
            <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                <Leaf className="absolute top-10 left-10 rotate-45 text-emerald-400" size={60} />
                <Leaf className="absolute top-40 right-10 -rotate-12 text-emerald-500" size={80} />
                <Leaf className="absolute top-[60%] left-[-20px] rotate-90 text-emerald-600" size={100} />
                <div className="absolute bottom-[-100px] left-[-100px] w-80 h-80 bg-emerald-500/20 blur-[120px] rounded-full" />
                <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
            </div>

            {/* TOP NAVIGATION: Mastery Progress */}
            <header className="flex-none px-6 pt-12 pb-2 z-30 relative">
                <div className="max-w-[400px] mx-auto">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Mastery Progress</span>
                        </div>
                        <div className="text-xs font-black tabular-nums text-amber-400">{score} / {winScore}</div>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5 backdrop-blur-md px-0.5 py-0.5">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        />
                    </div>
                </div>
            </header>

            {/* STREAK METER (Floating Sticky) */}
            <AnimatePresence>
                {streak > 1 && (
                    <motion.div 
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-40 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-3 flex flex-col items-center gap-4 shadow-2xl"
                    >
                        <div className="text-[10px] font-black uppercase writing-vertical-lr tracking-widest text-white/40 mb-2">Streak</div>
                        <div className="relative flex flex-col items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`w-1.5 h-6 rounded-full mb-1 transition-all duration-300 ${i < (streak % 5 || 5) ? 'bg-amber-400 shadow-[0_0_10px_orange]' : 'bg-white/10'}`} />
                            ))}
                            <div className="mt-2 text-2xl font-black italic text-amber-400">{streak}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LIVES COUNTER (Floating Top Right) */}
            <div className="absolute right-6 top-[100px] z-30 flex gap-2">
                {[0, 1, 2].map(i => (
                    <motion.div 
                        key={i}
                        animate={{ 
                            scale: i < lives ? 1 : 0.8, 
                            opacity: i < lives ? 1 : 0.2,
                            y: i < lives ? 0 : 10
                        }}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${i < lives ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/5'}`}
                    >
                        <span className="text-xs">❤️</span>
                    </motion.div>
                ))}
            </div>

            {/* ORCHARD SIGNPOSTS (Slick Glass) */}
            <div className="flex-none flex px-6 gap-4 pt-4 pb-4 z-20">
                <div className={`flex-1 group relative transition-all duration-500 ${side === 'left' ? 'scale-105' : 'opacity-40 grayscale-[50%]'}`}>
                    <div className={`flex flex-col items-center justify-center py-4 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden shadow-2xl ${side === 'left' ? 'bg-indigo-600/90 border-indigo-400/50 neon-glow-violet' : 'bg-white/5 border-white/10'}`}>
                        <div className="toy-card-gloss" />
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-50 z-10">Sign 01</div>
                        <span className="text-xs font-black tracking-widest uppercase z-10">{leftCat}</span>
                    </div>
                </div>
                
                <div className={`flex-1 group relative transition-all duration-500 ${side === 'right' ? 'scale-105' : 'opacity-40 grayscale-[50%]'}`}>
                    <div className={`flex flex-col items-center justify-center py-4 rounded-[2.5rem] border-2 transition-all duration-500 relative overflow-hidden shadow-2xl ${side === 'right' ? 'bg-emerald-600/90 border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-white/10'}`}>
                        <div className="toy-card-gloss" />
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] mb-1 opacity-50 z-10">Sign 02</div>
                        <span className="text-xs font-black tracking-widest uppercase z-10">{rightCat}</span>
                    </div>
                </div>
            </div>

            {/* Game Playground */}
            <div className="flex-1 relative overflow-hidden backdrop-blur-[2px]">
                {/* Visual Lane Guides */}
                <div className="absolute inset-0 flex pointer-events-none">
                    <div className="flex-1 border-r border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent" />
                    <div className="flex-1 bg-gradient-to-l from-white/[0.03] to-transparent" />
                </div>

                {/* Catch Particles & Splats */}
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ scale: 1.5, opacity: 1 }}
                        animate={{ scale: 0, y: -40, opacity: 0 }}
                        className="absolute w-4 h-4 rounded-full pointer-events-none z-30"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color, boxShadow: `0 0 20px ${p.color}` }}
                    />
                ))}

                {/* JUICE SPLATS (Error Consequence) */}
                <AnimatePresence>
                    {splats.map(s => (
                        <motion.div
                            key={s.id}
                            initial={{ scale: 0, rotate: Math.random() * 360 }}
                            animate={{ scale: s.life, opacity: s.life > 1 ? 1 : s.life }}
                            exit={{ opacity: 0 }}
                            className="absolute pointer-events-none z-20 mix-blend-screen"
                            style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)' }}
                        >
                            <div className="w-24 h-24 bg-rose-500/40 rounded-full blur-2xl flex items-center justify-center">
                                <Droplets className="text-rose-400" size={40} />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Spawning Fruits */}
                <AnimatePresence>
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="absolute pointer-events-none flex flex-col items-center gap-2"
                            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%,-50%)' }}
                        >
                            <motion.div 
                                initial={{ scale: 0, rotate: -30 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className={`w-14 h-14 rounded-[1.8rem] border-2 shadow-2xl flex items-center justify-center relative ${item.cat === leftCat ? 'bg-indigo-500 border-indigo-300 shadow-indigo-500/20' : 'bg-emerald-500 border-emerald-300 shadow-emerald-500/20'}`}
                            >
                                <div className="toy-card-gloss" />
                                <span className="text-2xl filter drop-shadow-md z-10">{fruits[item.id % fruits.length]}</span>
                            </motion.div>
                            <div className="px-3 py-1 bg-black/60 shadow-2xl backdrop-blur-md rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/90">
                                {item.text}
                            </div>
                        </div>
                    ))}
                </AnimatePresence>

                {/* PREMIUM BASKET */}
                <div
                    className="absolute bottom-12 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none z-30"
                    style={{ left: basketLeft, width: '35%' }}
                >
                    <div className="relative mx-auto flex flex-col items-center w-[120px]">
                        {/* Shadow */}
                        <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-24 h-6 bg-black/50 rounded-full blur-xl animate-pulse" />
                        
                        <div className={`w-full h-20 bg-gradient-to-b from-[#b45309] to-[#78350f] rounded-b-[40px] rounded-t-2xl border-t-[8px] border-[#f59e0b] shadow-2xl relative overflow-hidden transition-all duration-300 ${shakeKey > 0 ? 'scale-95 brightness-150' : 'scale-100'}`}>
                            <div className="toy-card-gloss" />
                            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white, white 2px, transparent 2px, transparent 10px)' }} />
                            <span className="text-3xl filter drop-shadow-lg scale-110 z-10 transition-transform active:scale-125">🧺</span>
                            
                            {/* Streak Aura */}
                            <AnimatePresence>
                                {streak > 5 && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 0.5, 0] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute inset-0 bg-amber-400 blur-2xl opacity-20 pointer-events-none"
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Interactive Controls (Tap Zones) */}
                <div className="absolute bottom-0 inset-x-0 h-40 flex z-40">
                    <div className="flex-1 active:bg-white/[0.05] transition-colors rounded-tr-[40px]" />
                    <div className="flex-1 active:bg-white/[0.05] transition-colors rounded-tl-[40px]" />
                </div>
            </div>

            {/* ERROR WARNING PORTAL (Inline but premium) */}
            <AnimatePresence>
                {shakeKey > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-rose-500 text-white rounded-2xl flex items-center gap-3 font-black text-[10px] tracking-widest uppercase shadow-[0_10px_30px_rgba(244,63,94,0.4)]"
                    >
                        <AlertCircle size={16} /> Wrong Category!
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Standard Footer Space Guard */}
            <div className="h-10 bg-slate-950/40 relative z-30" />
            
            <style>{`
                .writing-vertical-lr { writing-mode: vertical-lr; }
                .neon-glow-violet {
                    box-shadow: 0 0 20px rgba(129, 140, 248, 0.2), inset 0 0 10px rgba(129, 140, 248, 0.1);
                    border-color: rgba(129, 140, 248, 0.5) !important;
                }
            `}</style>
        </div>
    );
};

export default HarvestRenderer;
