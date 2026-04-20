import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertCircle, ShoppingBasket, Target, Zap } from 'lucide-react';

/**
 * HARVEST RENDERER v5.0 - "App-Theme Edition"
 * -------------------------------------------------------------
 * Simplified, premium visual system matching the Manya core theme.
 * Slate-950 background, Indigo-600 highlights, White typographic tiles.
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
    const basketLeft = side === 'left' ? '10%' : '55%';
    const progress = Math.min(100, (score / winScore) * 100);

    return (
        <div 
            className="flex flex-col h-full bg-slate-950 text-white overflow-hidden select-none font-jakarta relative"
            style={{ 
                background: 'linear-gradient(to bottom, #020617 0%, #0f172a 100%)',
                transform: shakeKey > 0 ? `translateX(${shakeDir * 10}px)` : 'none',
                transition: shakeKey > 0 ? 'transform 0.05s linear' : 'transform 0.4s ease-out'
            }}
            onClick={handleTap}
            onTouchStart={handleTap}
        >
            {/* CLEAN BACKGROUND DEPTH */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            
            {/* LANE GUIDES */}
            <div className="absolute inset-0 flex pointer-events-none opacity-20">
                <div className="flex-1 border-r border-dashed border-white/10" />
                <div className="flex-1" />
            </div>

            {/* TOP BAR: Progress & Stats */}
            <header className="flex-none px-6 pt-12 pb-4 z-30 relative">
                <div className="max-w-[420px] mx-auto">
                    <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <div className="flex items-center gap-2">
                            <Target size={12} className="text-indigo-400" />
                            <span>Sorting Mastery</span>
                        </div>
                        <div className="text-white">{score} / {winScore}</div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        />
                    </div>
                </div>
            </header>

            {/* CATEGORY SIGNS (Pill Standard) */}
            <div className="flex-none flex px-6 gap-6 pt-2 pb-6 z-20">
                <div className={`flex-1 transition-all duration-300 ${side === 'left' ? 'scale-105' : 'opacity-30'}`}>
                    <div className={`py-4 rounded-[2rem] border-2 text-center transition-all ${side === 'left' ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_25px_rgba(79,70,229,0.3)]' : 'bg-slate-900 border-white/10'}`}>
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Left Lane</div>
                        <div className="text-sm font-black tracking-tight uppercase">{leftCat}</div>
                    </div>
                </div>
                
                <div className={`flex-1 transition-all duration-300 ${side === 'right' ? 'scale-105' : 'opacity-30'}`}>
                    <div className={`py-4 rounded-[2rem] border-2 text-center transition-all ${side === 'right' ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_25px_rgba(79,70,229,0.3)]' : 'bg-slate-900 border-white/10'}`}>
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Right Lane</div>
                        <div className="text-sm font-black tracking-tight uppercase">{rightCat}</div>
                    </div>
                </div>
            </div>

            {/* PLAYGROUND */}
            <div className="flex-1 relative">
                {/* LIVES (Mini pills) */}
                <div className="absolute right-6 top-0 z-30 flex flex-col gap-2">
                    {[0, 1, 2].map(i => (
                        <motion.div 
                            key={i}
                            animate={{ 
                                scale: i < lives ? 1 : 0.8, 
                                opacity: i < lives ? 1 : 0.1 
                            }}
                            className={`w-1.5 h-6 rounded-full ${i < lives ? 'bg-rose-500' : 'bg-white'}`}
                        />
                    ))}
                </div>

                {/* STREAK DISPLAY */}
                <AnimatePresence>
                    {streak > 2 && (
                        <motion.div 
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            className="absolute left-6 top-10 z-30 bg-indigo-600/20 border border-indigo-500/30 backdrop-blur-xl px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
                        >
                            <Zap size={16} className="text-indigo-400 fill-indigo-400" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-indigo-300 tracking-tighter">Streak</span>
                                <span className="text-xl font-black text-white leading-none">{streak}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* PARTICLES & SPLATS */}
                {particles.map(p => (
                    <motion.div
                        key={p.id}
                        initial={{ scale: 1.2, opacity: 1 }}
                        animate={{ scale: 0, opacity: 0, y: -20 }}
                        className="absolute w-2 h-2 rounded-full z-40"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, backgroundColor: '#6366f1', boxShadow: '0 0 10px #6366f1' }}
                    />
                ))}

                {/* WORD TILES (Premium Typographic Cards) */}
                <AnimatePresence>
                    {items.map(item => (
                        <div
                            key={item.id}
                            className="absolute pointer-events-none"
                            style={{ 
                                left: `${item.x}%`, 
                                top: `${item.y}%`, 
                                transform: 'translate(-50%,-50%)',
                                zIndex: 50
                            }}
                        >
                            <motion.div 
                                initial={{ scale: 0, rotate: -5 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="bg-white px-5 py-3 rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] border-b-4 border-slate-200 flex items-center justify-center min-w-[100px]"
                            >
                                <span className="text-slate-900 text-xs font-black uppercase tracking-tight">
                                    {item.text}
                                </span>
                                {/* Subtle inner glow based on category for learners */}
                                <div className={`absolute -bottom-1 inset-x-4 h-1 rounded-full opacity-30 ${item.cat === leftCat ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                            </motion.div>
                        </div>
                    ))}
                </AnimatePresence>

                {/* THE BASKET (Sleek Crate) */}
                <div
                    className="absolute bottom-16 transition-all duration-200 ease-out z-40"
                    style={{ left: basketLeft, width: '35%' }}
                >
                    <div className="w-full max-w-[130px] mx-auto">
                        <div className={`h-16 bg-slate-800 rounded-2xl border-2 border-white/10 shadow-2xl relative flex items-center justify-center transition-all ${shakeKey > 0 ? 'bg-rose-900 border-rose-500 scale-95' : 'border-indigo-500/50'}`}>
                            {/* Inner basket glow */}
                            <div className="absolute inset-2 bg-slate-900/50 rounded-lg overflow-hidden">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_#fff_0%,_transparent_70%)]" />
                            </div>
                            <ShoppingBasket size={32} className={`relative z-10 transition-all ${shakeKey > 0 ? 'text-rose-400' : 'text-indigo-400'}`} />
                            
                            {/* Streak Aura */}
                            {streak > 5 && (
                                <div className="absolute inset-[-4px] rounded-[1.4rem] border-2 border-indigo-400/50 animate-pulse" />
                            )}
                        </div>
                        {/* Shadow pill */}
                        <div className="w-20 h-3 bg-black/40 rounded-full blur-xl mx-auto mt-2" />
                    </div>
                </div>

                {/* INPUT ZONES */}
                <div className="absolute inset-0 flex z-10">
                    <div className="flex-1 cursor-pointer active:bg-white/5 transition-colors" />
                    <div className="flex-1 cursor-pointer active:bg-white/5 transition-colors" />
                </div>
            </div>

            {/* ERROR TOAST */}
            <AnimatePresence>
                {shakeKey > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 bg-rose-600 text-white rounded-2xl flex items-center gap-3 font-black text-[10px] tracking-widest uppercase shadow-2xl"
                    >
                        <AlertCircle size={14} /> Oops! Wrong Lane
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SPACER FOR MOBILE SAFARI ETC */}
            <div className="h-10 bg-slate-950/20" />

            <style>{`
                @font-face { font-family: 'Jakarta'; src: url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap'); }
                .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
            `}</style>
        </div>
    );
};

export default HarvestRenderer;
