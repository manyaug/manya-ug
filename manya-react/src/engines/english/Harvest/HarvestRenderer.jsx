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
    phase,
    handleTap 
}) => {
    const basketLeft = side === 'left' ? '10%' : '55%';
    const progress = Math.min(100, (score / winScore) * 100);

    return (
        <div 
            className="flex flex-col h-full bg-[var(--bg-page)] text-[var(--text-main)] overflow-hidden select-none font-sans relative"
            style={{ 
                transform: shakeKey > 0 ? `translateX(${shakeDir * 6}px)` : 'none',
                transition: 'transform 0.1s ease-out'
            }}
            onClick={handleTap}
            onTouchStart={handleTap}
        >
            {/* AMBIENT GLOW */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_var(--manya-purple)_0%,_transparent_70%)] opacity-[0.08] dark:opacity-30 pointer-events-none" />

            {/* TOP PROGRESS */}
            <header className="flex-none px-8 pt-10 pb-4 z-30 relative">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[var(--text-sub)]">Harvest</span>
                        <div className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse" />
                    </div>
                    <div className="text-[10px] font-bold text-[var(--text-sub)]">{score} <span className="opacity-30">/</span> {winScore}</div>
                </div>
                <div className="h-1 w-full bg-[var(--border-subtle)] rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-indigo-500"
                    />
                </div>
            </header>

            {/* DYNAMIC GARDEN BACKGROUND (Pure CSS) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-slate-900 to-black" />
                <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-emerald-900/20 to-transparent" />
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
            </div>

            {/* CATEGORY BUCKETS (Premium 3D Basket Layout) */}
            <div className="absolute bottom-6 inset-x-0 h-32 z-30 pointer-events-none">
                {/* Left Basket Lane (Exactly 25%) */}
                <div className="absolute bottom-0 pb-2" style={{ left: '25%', transform: 'translateX(-50%)' }}>
                    <div className={`w-[130px] h-28 relative transition-all duration-300 ${side === 'left' ? 'scale-110 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'scale-90 opacity-60 grayscale-[0.3]'}`}>
                        {/* 3D Basket Body */}
                        <div id={side === 'left' ? "celebration-coin-source" : undefined} className="absolute inset-0 top-8 bg-gradient-to-b from-indigo-500/20 to-indigo-900/60 border-x-2 border-b-2 border-indigo-400/50 rounded-b-[2rem] rounded-t-sm backdrop-blur-md shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5)]" />
                        <div className="absolute top-8 inset-x-0 h-4 bg-indigo-500/30 border-2 border-indigo-400/50 rounded-full" /> {/* Rim */}
                        
                        <div className="relative h-full flex flex-col items-center justify-end pb-5">
                            <div className="text-[9px] font-black uppercase tracking-widest text-indigo-200 text-center px-2 leading-tight drop-shadow-md">
                                {leftCat}
                            </div>
                        </div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[45px] filter drop-shadow-lg">🧺</div>
                        {/* Active Indicator */}
                        {side === 'left' && <motion.div layoutId="active-bucket-glow" className="absolute top-12 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-300 rounded-full shadow-[0_0_15px_#818cf8]" />}
                    </div>
                </div>

                {/* Right Basket Lane (Exactly 75%) */}
                <div className="absolute bottom-0 pb-2" style={{ left: '75%', transform: 'translateX(-50%)' }}>
                    <div className={`w-[130px] h-28 relative transition-all duration-300 ${side === 'right' ? 'scale-110 drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'scale-90 opacity-60 grayscale-[0.3]'}`}>
                        {/* 3D Basket Body */}
                        <div id={side === 'right' ? "celebration-coin-source" : undefined} className="absolute inset-0 top-8 bg-gradient-to-b from-purple-500/20 to-purple-900/60 border-x-2 border-b-2 border-purple-400/50 rounded-b-[2rem] rounded-t-sm backdrop-blur-md shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5)]" />
                        <div className="absolute top-8 inset-x-0 h-4 bg-purple-500/30 border-2 border-purple-400/50 rounded-full" /> {/* Rim */}
                        
                        <div className="relative h-full flex flex-col items-center justify-end pb-5">
                            <div className="text-[9px] font-black uppercase tracking-widest text-purple-200 text-center px-2 leading-tight drop-shadow-md">
                                {rightCat}
                            </div>
                        </div>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[45px] filter drop-shadow-lg">🧺</div>
                        {/* Active Indicator */}
                        {side === 'right' && <motion.div layoutId="active-bucket-glow" className="absolute top-12 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-300 rounded-full shadow-[0_0_15px_#a855f7]" />}
                    </div>
                </div>
            </div>

            {/* PLAYGROUND (Items fall into the buckets) */}
            <div className="flex-1 relative">
                <AnimatePresence>
                    {phase === 'intro' && (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[100] bg-[var(--bg-page)]/90 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center"
                        >
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                                <div className="text-7xl relative z-10">🍇</div>
                            </div>
                            <h2 className="text-3xl font-black mb-3 tracking-tight text-[var(--text-main)] uppercase italic">Harvest Time</h2>
                            <p className="text-[var(--text-sub)] text-sm mb-10 max-w-[220px] font-medium leading-relaxed opacity-80">Quick! Sort the words into the correct baskets before they hit the ground.</p>
                            <button 
                                onClick={handleTap}
                                className="manya-btn-elite primary w-full max-w-[260px]"
                            >
                                <div className="btn-toy-gloss" />
                                <span>Start Sorting</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* HUD STATS (Integrated & Sleek) */}
                <div className="absolute top-0 inset-x-8 flex items-center justify-between z-30">
                    <AnimatePresence>
                        {streak > 2 && (
                            <motion.div 
                                initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                                className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full"
                            >
                                <Zap size={12} className="text-amber-500 fill-amber-500 animate-pulse" />
                                <span className="text-[10px] font-black text-amber-500 tracking-wider">{streak}x COMBO</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex gap-2">
                        {[0, 1, 2].map(i => (
                            <motion.div 
                                key={i}
                                animate={i < lives ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
                                className={`w-2 h-2 rounded-full ${i < lives ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]' : 'bg-slate-700'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* ITEMS (Glowing Orbs) */}
                <AnimatePresence>
                    {items.map(item => (
                        <motion.div
                            key={item.id}
                            className="absolute pointer-events-none"
                            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%,-50%)', zIndex: 50, filter: `hue-rotate(${item.hue}deg)` }}
                            initial={{ scale: 0, rotate: -20, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                        >
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500 opacity-40 blur-xl rounded-full animate-pulse" />
                                <div className="bg-gradient-to-br from-indigo-100 to-white px-5 py-3 rounded-[2rem] shadow-[0_10px_25px_rgba(0,0,0,0.3),inset_0_-4px_0_rgba(0,0,0,0.1)] border-2 border-white flex items-center justify-center min-w-[100px] overflow-hidden">
                                    <div className="absolute top-0 inset-x-0 h-1/2 bg-white/50 rounded-b-[2rem]" />
                                    <span className="relative z-10 text-indigo-950 text-[14px] font-black tracking-widest uppercase italic drop-shadow-sm">{item.text}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* SELECTION ZONES (Invisible full-screen tap) */}
                <div className="absolute inset-0 flex z-10">
                    <div className="flex-1" />
                    <div className="flex-1" />
                </div>
            </div>

            {/* ERROR TOAST */}
            <AnimatePresence>
                {shakeKey > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[100] px-5 py-2 bg-rose-600 text-white rounded-full text-[9px] font-bold tracking-widest uppercase flex items-center gap-2 shadow-2xl"
                    >
                        <AlertCircle size={12} /> Incorrect Category
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SPACER FOR MOBILE SAFARI ETC */}
            <div className="h-10 flex-none bg-[var(--bg-page)]" />

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
                
                @font-face { font-family: 'Jakarta'; src: url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap'); }
                .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
            `}</style>
        </div>
    );
};

export default HarvestRenderer;
