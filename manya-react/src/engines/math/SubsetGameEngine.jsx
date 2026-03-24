import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Flag, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

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

export default function SubsetGameEngine({ data, onComplete, onResult }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [insideItems, setInsideItems] = useState(new Set());
    const [found, setFound] = useState(new Set());
    const [isResolved, setIsResolved] = useState(false);
    const [alreadyFoundCount, setAlreadyFoundCount] = useState(0);
    
    const [errorAnim, setErrorAnim] = useState(false);
    const [successAnim, setSuccessAnim] = useState(false);

    const question = data?.questions?.[currentStep];
    const totalLevels = data?.questions?.length || 1;
    
    const theme = question?.theme || 'default';
    const items = question?.items || [];
    const totalSubsets = Math.pow(2, items.length);

    useEffect(() => {
        if (window.QuestRunner) window.QuestRunner.disableButton?.();
    }, []);

    const toggleItem = (item) => {
        if (isResolved) return;
        const next = new Set(insideItems);
        if (next.has(item)) next.delete(item);
        else next.add(item);
        setInsideItems(next);
        
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
        window.ManyaAudio?.tap?.();
    };

    const checkPacking = () => {
        if (isResolved) {
            handleNext();
            return;
        }

        // Generate key
        const sortedInside = Array.from(insideItems).sort();
        const key = sortedInside.length > 0 ? sortedInside.join(',') : "EMPTY";

        if (found.has(key)) {
            // Already found
            setErrorAnim(true);
            setAlreadyFoundCount(prev => prev + 1);
            window.ManyaAudio?.error?.();
            if (window.navigator?.vibrate) window.navigator.vibrate([50, 100, 50]);
            setTimeout(() => setErrorAnim(false), 800);
        } else {
            // New combination found!
            setSuccessAnim(true);
            window.ManyaAudio?.success?.();
            
            const nextFound = new Set(found);
            nextFound.add(key);
            setFound(nextFound);

            // Check Win
            if (nextFound.size === totalSubsets) {
                setIsResolved(true);
                if (window.navigator?.vibrate) window.navigator.vibrate([30, 50, 30, 50, 100]);
            } else {
                if (window.navigator?.vibrate) window.navigator.vibrate(30);
            }

            // Reset after brief delay so user sees it packed
            setTimeout(() => {
                setInsideItems(new Set()); // Auto reset the box
                setSuccessAnim(false);
            }, 600);
        }
    };

    const handleNext = () => {
        if (currentStep < totalLevels - 1) {
            setCurrentStep(currentStep + 1);
            setInsideItems(new Set());
            setFound(new Set());
            setIsResolved(false);
        } else {
            // Final Completion
            if (onResult) {
                onResult({
                    isCorrect: true,
                    score: totalLevels,
                    total: totalLevels,
                    mistakes: alreadyFoundCount,
                    type: 'game'
                });
            }
            if (onComplete) onComplete();
        }
    };

    const renderShelfItem = (key, idx) => {
        if (!key) {
            return (
                <div key={`empty-${idx}`} className="flex-shrink-0 w-12 h-10 border-2 border-dashed border-indigo-200 rounded-xl flex items-center justify-center text-indigo-300 font-bold text-sm">
                    ?
                </div>
            );
        }

        if (key === "EMPTY") {
            return (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key={`shelf-${idx}`} className="flex-shrink-0 px-3 h-10 bg-indigo-50 border-2 border-indigo-200 rounded-xl flex items-center justify-center text-indigo-500 font-black text-sm shadow-sm">
                    {theme === 'flag' ? '∅' : '{ }'}
                </motion.div>
            );
        }

        const itemsList = key.split(',');
        
        if (theme === 'flag') {
            return (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key={`shelf-${idx}`} className="flex-shrink-0 px-2 h-10 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center gap-1">
                    {itemsList.map(name => (
                        <div key={name} className="w-3 h-full max-h-6 border border-slate-300 rounded-[2px]" style={{ backgroundColor: COLORS[name] || '#ccc' }} />
                    ))}
                </motion.div>
            );
        }

        return (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} key={`shelf-${idx}`} className="flex-shrink-0 px-3 h-10 bg-fuchsia-50 border-2 border-fuchsia-200 rounded-xl flex items-center gap-1 shadow-sm font-black text-fuchsia-700">
                {'{ '}
                {itemsList.map(name => ICONS[name] || name[0]).join(',')}
                {' }'}
            </motion.div>
        );
    };

    const foundArray = Array.from(found);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative selection:bg-transparent">
            {/* STAGE */}
            <div className="flex-1 relative flex flex-col p-6 bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f1f5f9_100%)] overflow-hidden">
                <div className="text-center font-bold text-slate-500 mb-2">{question?.prompt}</div>
                
                {/* Visual Box / Flag */}
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <motion.div 
                        animate={
                            errorAnim ? { x: [-10, 10, -10, 10, 0] } :
                            successAnim ? { scale: [1, 1.05, 1], filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'] } :
                            {}
                        }
                        transition={{ duration: 0.4 }}
                        className={`relative flex shadow-xl overflow-hidden ${
                            theme === 'flag' 
                                ? 'w-[280px] h-[180px] bg-white border-4 border-slate-300 rounded-lg flex-row' 
                                : 'w-full max-w-[320px] aspect-[4/3] bg-white border-4 border-slate-300 rounded-[32px] flex-wrap content-center gap-4 p-6'
                        }`}
                    >
                        {theme === 'flag' ? (
                            // Flag Mode: Columns
                            items.map((item, i) => (
                                <div 
                                    key={`stripe-${i}`}
                                    className="flex-1 border-r border-slate-100 last:border-r-0 transition-colors duration-300"
                                    style={{ backgroundColor: insideItems.has(item) ? COLORS[item] || '#ccc' : 'transparent' }}
                                />
                            ))
                        ) : (
                            // Lunchbox Mode
                            <AnimatePresence>
                                {insideItems.size === 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold italic tracking-wide pointer-events-none"
                                    >
                                        EMPTY SET (∅)
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                        
                        {theme !== 'flag' && Array.from(insideItems).map(item => (
                            <motion.div 
                                layoutId={`item-${item}`}
                                key={item}
                                onClick={() => toggleItem(item)}
                                className="w-16 h-16 flex items-center justify-center text-4xl cursor-pointer hover:scale-110 active:scale-95 drop-shadow-md z-10"
                            >
                                {ICONS[item] || "📦"}
                            </motion.div>
                        ))}
                    </motion.div>
                    
                    {/* Item Inventory Bar (outside layout) */}
                    <div className="mt-8 flex gap-4 h-20 items-center justify-center">
                        {items.map(item => {
                            const isInside = insideItems.has(item);
                            
                            if (theme === 'flag') {
                                return (
                                    <button
                                        key={item}
                                        onClick={() => toggleItem(item)}
                                        className={`relative w-14 h-14 rounded-full border-4 transition-all ${
                                            isInside ? 'scale-110 shadow-lg border-white' : 'scale-100 border-transparent shadow-sm'
                                        }`}
                                        style={{ backgroundColor: COLORS[item] || '#ccc' }}
                                    >
                                        {isInside && <div className="absolute inset-0 ring-4 ring-slate-400 rounded-full" />}
                                    </button>
                                );
                            }

                            return (
                                <div key={item} className="w-16 h-16 relative">
                                    {!isInside && (
                                        <motion.div
                                            layoutId={`item-${item}`}
                                            onClick={() => toggleItem(item)}
                                            className="absolute inset-0 flex items-center justify-center text-5xl cursor-pointer hover:-translate-y-2 transition-transform active:scale-90 drop-shadow-xl"
                                        >
                                            {ICONS[item] || "📦"}
                                        </motion.div>
                                    )}
                                    {/* Ghost placeholder when item is inside */}
                                    <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-10 grayscale">
                                        {ICONS[item] || "📦"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* HUD */}
            <div className="flex-none bg-white p-5 pb-safe border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[32px] z-20 flex flex-col gap-4">
                {/* Horizontal Shelf */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                    {/* Render found items, then placeholders for remaining */}
                    {Array.from({ length: totalSubsets }).map((_, i) => {
                        const key = foundArray[i];
                        return (
                            <div key={`slot-${i}`} className="snap-center">
                                {renderShelfItem(key, i)}
                            </div>
                        );
                    })}
                </div>

                <motion.button
                    onClick={checkPacking}
                    animate={errorAnim ? { x: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.3 }}
                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-[15px] tracking-wide uppercase transition-all ${
                        isResolved 
                        ? 'bg-emerald-500 text-white shadow-none translate-y-[4px]'
                        : errorAnim 
                        ? 'bg-rose-500 text-white shadow-[0_4px_0_#9f1239]'
                        : 'bg-indigo-600 text-white shadow-[0_4px_0_#4338ca] active:translate-y-[4px] active:shadow-none'
                    }`}
                >
                    {isResolved ? (
                        currentStep < totalLevels - 1 ? (
                            <>
                                <ArrowRight size={20} strokeWidth={3} />
                                NEXT LEVEL
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={20} strokeWidth={3} />
                                QUEST COMPLETE!
                            </>
                        )
                    ) : errorAnim ? (
                        <>
                            <AlertTriangle size={20} strokeWidth={3} />
                            ALREADY FOUND!
                        </>
                    ) : theme === 'flag' ? (
                        <>
                            <Flag size={20} strokeWidth={3} />
                            CHECK PATTERN
                        </>
                    ) : (
                        <>
                            <PackageOpen size={20} strokeWidth={3} />
                            PACK IT!
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
