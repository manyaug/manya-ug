import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Flag, CheckCircle2, AlertTriangle, ArrowRight, Zap, Target, Layers } from 'lucide-react';

/**
 * MANYA SUBSET GAME ENGINE v2.0 (Platinum Elite Dark)
 * -------------------------------------------------------------
 * - MIGRATION: Legacy Light -> Platinum Elite Dark.
 * - VISUALS: Glassmorphic Drop Zone + Neon Pulse Shelf.
 * - INTERACTION: Haptic-Ready Drag + Platinum HUD.
 * - AUDIT: Resolved layout inconsistencies for 360x740.
 */

const ICONS = { 
    "Apple": "🍎", "Banana": "🍌", "Orange": "🍊", 
    "Mango": "🥭", "Pen": "🖊️", "Book": "📘", 
    "Car": "🚗", "Ball": "⚽", "Bear": "🧸", "Robot": "🤖", "Doll": "🪆",
    "Spade": "♠️", "Heart": "♥️", "Club": "♣️", "Diamond": "♦️",
    "Black": "⚫", "Yellow": "🟡", "Red": "🔴"
};

const COLORS = {
    "Black": "#0f172a", "Yellow": "#eab308", "Red": "#ef4444",
    "Green": "#22c55e", "Blue": "#3b82f6", "White": "#ffffff"
};

export default function SubsetGameEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [insideItems, setInsideItems] = useState(new Set());
    const [found, setFound] = useState(new Set());
    const [isResolved, setIsResolved] = useState(false);
    const [alreadyFoundCount, setAlreadyFoundCount] = useState(0);
    const [pulseAlpha, setPulseAlpha] = useState(1.0);
    
    const [errorAnim, setErrorAnim] = useState(false);
    const [successAnim, setSuccessAnim] = useState(false);
    const [showEmptyHint, setShowEmptyHint] = useState(true);
    const [isFinishing, setIsFinishing] = useState(false);

    const startTimeRef = useRef(Date.now());
    const dropZoneRef = useRef(null);
    const containerRef = useRef(null);

    const questions = useMemo(() => data?.questions || data?.data?.questions || [], [data]);
    const currentQuestion = questions[currentStep];
    const totalLevels = questions.length || 1;
    
    // ─── STABLE DATA DERIVATION ───
    const theme = currentQuestion?.theme || 'default';
    const items = useMemo(() => currentQuestion?.items || [], [currentQuestion]);
    const totalSubsets = useMemo(() => Math.pow(2, items.length), [items]);

    // NEON PULSE ANIMATION
    useEffect(() => {
        let frameId;
        const animate = (t) => { setPulseAlpha(0.75 + 0.25 * Math.sin(t / 450)); frameId = requestAnimationFrame(animate); };
        frameId = requestAnimationFrame(animate); return () => cancelAnimationFrame(frameId);
    }, []);

    const toggleItem = (item) => {
        if (isResolved || isFinishing) return;
        const next = new Set(insideItems);
        if (next.has(item)) next.delete(item);
        else next.add(item);
        setInsideItems(next);
        setShowEmptyHint(false);
        if (window.ManyaAudio?.tap) window.ManyaAudio.tap();
    };

    const handleDragEnd = (event, info, item) => {
        if (isResolved) return;
        const dropZone = dropZoneRef.current; if (!dropZone) return;
        const rect = dropZone.getBoundingClientRect();
        const isInZone = info.point.x > rect.left && info.point.x < rect.right &&
                         info.point.y > rect.top && info.point.y < rect.bottom;
        if (isInZone && !insideItems.has(item)) toggleItem(item);
    };

    const checkPacking = () => {
        if (isFinishing) return;
        if (isResolved) { handleNext(); return; }
        const sortedInside = Array.from(insideItems).sort();
        const key = sortedInside.length > 0 ? sortedInside.join(',') : "EMPTY";
        const duration = Date.now() - startTimeRef.current;
        const isNew = !found.has(key);

        if (onAttempt) onAttempt({ isCorrect: isNew, label: `Subset: {${key}}`, duration, mistakes: isNew ? 0 : 1 });

        if (!isNew) {
            setErrorAnim(true); setAlreadyFoundCount(p => p + 1);
            if (window.ManyaAudio?.error) window.ManyaAudio.error();
            setTimeout(() => setErrorAnim(false), 800);
        } else {
            setSuccessAnim(true);
            if (window.ManyaAudio?.success) window.ManyaAudio.success();
            const nextFound = new Set(found); nextFound.add(key); setFound(nextFound);
            startTimeRef.current = Date.now();
            if (nextFound.size === totalSubsets) setIsResolved(true);
            setTimeout(() => { setInsideItems(new Set()); setSuccessAnim(false); }, 600);
        }
    };

    const handleNext = () => {
        if (isFinishing) return;
        
        if (currentStep < totalLevels - 1) {
            setCurrentStep(currentStep + 1); setInsideItems(new Set()); setFound(new Set()); setIsResolved(false);
        } else {
            setIsFinishing(true);
            const result = { isCorrect: true, score: totalLevels, total: totalLevels, mistakes: alreadyFoundCount, type: 'game' };
            console.log(`🎮 [SubsetGame] Finishing Game:`, result);
            if (onResult) onResult(result);
            if (onComplete) onComplete(result);
        }
    };

    const renderShelfItem = (key, idx) => {
        if (!key) return <div key={`empty-${idx}`} className="flex-shrink-0 w-16 h-12 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center text-white/20 font-black text-sm">?</div>;
        const isNewest = idx === found.size - 1;
        const baseStyle = "flex-shrink-0 px-4 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-xl border transition-all duration-300";
        const themeStyle = key === "EMPTY" ? "bg-amber-500/10 border-amber-500/40 text-amber-500" : "bg-violet-600/10 border-violet-600/40 text-violet-400";
        
        return (
            <motion.div initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }} key={`shelf-${idx}`} className={`${baseStyle} ${themeStyle} ${isNewest ? 'ring-2 ring-emerald-500/50' : ''}`}>
                {key === "EMPTY" ? '∅' : `{ ${key.split(',').map(n => ICONS[n] || n[0]).join(', ')} }`}
            </motion.div>
        );
    };

    const foundArray = Array.from(found);

    if (!currentQuestion || !data) return null; // Safety guard

    return (
        <div ref={containerRef} className="flex flex-col h-full w-full bg-[#0F172A] font-jakarta overflow-hidden relative selection:bg-transparent">
            {/* STAGE */}
            <div className="flex-1 relative flex flex-col p-6 overflow-y-auto no-scrollbar">
                <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(8px, 1.5vh, 24px)' }}>
                    <div className="w-8 h-8 bg-violet-600/20 rounded-xl flex items-center justify-center text-violet-500"><Zap size={16} fill="currentColor" /></div>
                    <div className="text-violet-500 font-extrabold text-[12px] tracking-widest uppercase">Subset Quest • Level {currentStep + 1}</div>
                </div>
                
                <h2 className="font-bold text-white leading-tight" style={{ fontSize: 'clamp(18px, 2.5vh, 24px)', marginBottom: 'clamp(12px, 2vh, 32px)' }}>{currentQuestion?.prompt}</h2>

                
                {/* Visual Glass Zone */}
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <motion.div 
                        ref={dropZoneRef}
                        animate={
                            errorAnim ? { x: [-10, 10, -10, 10, 0] } :
                            successAnim ? { scale: [1, 1.05, 1], borderColor: ['#334155', '#10b981', '#334155'] } : {}
                        }
                        className={`relative flex flex-wrap content-center justify-center gap-6 p-8 shadow-2xl transition-all duration-300 ${
                            theme === 'flag' 
                                ? 'w-[300px] h-[180px] bg-white/5 border-2 border-white/10 rounded-2xl flex-row overflow-hidden' 
                                : 'w-full max-w-[340px] aspect-[4/3] max-h-[35vh] bg-slate-900/50 backdrop-blur-xl border-4 border-slate-700/50 rounded-[40px]'
                        }`}
                    >
                        {theme === 'flag' ? (
                            items.map((item, i) => (
                                <div key={`stripe-${i}`} className="flex-1 border-r border-white/5 last:border-r-0 transition-all duration-500" style={{ backgroundColor: insideItems.has(item) ? COLORS[item] || '#ccc' : 'transparent', opacity: insideItems.has(item) ? 1 : 0.1 }} />
                            ))
                        ) : (
                            <>
                                <AnimatePresence>
                                    {insideItems.size === 0 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 font-black tracking-widest pointer-events-none">
                                            <PackageOpen size={64} className="mb-4 opacity-10" />
                                            <span>EMPTY SET (∅)</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                {Array.from(insideItems).map(item => (
                                    <motion.div layoutId={`item-${item}`} key={item} onClick={() => toggleItem(item)} className="w-20 h-20 flex items-center justify-center text-5xl cursor-pointer hover:scale-110 active:scale-95 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] z-10 transition-transform">
                                        {ICONS[item] || "📦"}
                                    </motion.div>
                                ))}
                            </>
                        )}
                    </motion.div>
                    
                    {/* Inventory */}
                    <div className="flex gap-6 items-center justify-center" style={{ marginTop: 'clamp(16px, 3vh, 40px)', height: 'clamp(60px, 12vh, 96px)' }}>
                        {items.map(item => {
                            const isInside = insideItems.has(item);
                            return (
                                <div key={item} className="relative" style={{ width: 'clamp(50px, 10vh, 80px)', height: 'clamp(50px, 10vh, 80px)' }}>
                                    <AnimatePresence>
                                        {!isInside && (
                                            <motion.div 
                                                layoutId={`item-${item}`} 
                                                drag 
                                                dragSnapToOrigin 
                                                onDragEnd={(e, info) => handleDragEnd(e, info, item)} 
                                                onClick={() => toggleItem(item)} 
                                                className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing hover:-translate-y-2 transition-all active:scale-90 drop-shadow-2xl z-30"
                                                style={{ fontSize: 'clamp(32px, 6vh, 60px)' }}
                                            >
                                                {ICONS[item] || "📦"}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-5 grayscale pointer-events-none" style={{ fontSize: 'clamp(24px, 5vh, 48px)' }}>{ICONS[item] || "📦"}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* HUD / Shelf */}
            <div className="flex-none bg-slate-900/80 backdrop-blur-3xl p-6 pb-safe border-t border-white/10 rounded-t-[40px] z-20 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)]" style={{ gap: 'clamp(12px, 2vh, 24px)' }}>
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs tracking-widest uppercase"><Target size={14} className="text-emerald-500" /> Progression</div>
                    <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-black">{found.size} / {totalSubsets} FOUND</div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                    {Array.from({ length: totalSubsets }).map((_, i) => (
                        <div key={`slot-${i}`} className="snap-center">{renderShelfItem(foundArray[i], i)}</div>
                    ))}
                </div>

                <motion.button
                    onClick={checkPacking}
                    whileTap={{ scale: 0.98, y: 2 }}
                    className={`w-full py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 text-sm tracking-[0.2em] uppercase transition-all shadow-2xl ${
                        isResolved ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                        errorAnim ? 'bg-rose-500 text-white shadow-rose-500/20' :
                        'bg-violet-600 text-white shadow-violet-600/30'
                    }`}
                >
                    {isResolved ? (currentStep < totalLevels - 1 ? <><ArrowRight size={20} strokeWidth={4} /> NEXT LEVEL</> : <><CheckCircle2 size={20} strokeWidth={4} /> COMPLETE QUEST</>) :
                     errorAnim ? <><AlertTriangle size={20} strokeWidth={4} /> ALREADY FOUND!</> :
                     <><PackageOpen size={20} strokeWidth={4} /> PACK IT!</>}
                </motion.button>
            </div>
            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        </div>
    );
}
