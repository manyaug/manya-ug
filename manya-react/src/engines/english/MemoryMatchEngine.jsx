import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lightbulb, Trophy, Brain, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

/**
 * MANYA ENGLISH: MEMORY MATCH ENGINE (React v1.0)
 * ----------------------------------------------
 * - Premium 3D card flip animations.
 * - Glassmorphic bento-style layout.
 * - Intelligent grid scaling (2x3, 3x4, 4x4).
 * - Match animations and tactile feedback.
 */

const MemoryMatchEngine = ({ data, onComplete }) => {
    const [cards, setCards] = useState([]);
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [matches, setMatches] = useState(new Set());
    const [lockBoard, setLockBoard] = useState(false);
    const [score, setScore] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const hint = data?.hint || "Find the matching pairs!";
    
    // Initialize Game
    useEffect(() => {
        if (!data?.pairs) return;

        const deck = [];
        data.pairs.forEach((pair, idx) => {
            deck.push({ id: `p${idx}-a`, pairId: idx, text: pair.item1, state: 'hidden' });
            deck.push({ id: `p${idx}-b`, pairId: idx, text: pair.item2, state: 'hidden' });
        });

        // Shuffle
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        setCards(deck);
    }, [data]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => {
            const isDarkSet = document.documentElement.classList.contains('dark') || 
                             getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)';
            setIsDark(isDarkSet);
        };
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleCardClick = (index) => {
        if (lockBoard || flippedIndices.includes(index) || matches.has(cards[index].pairId)) return;

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setLockBoard(true);
            const [idx1, idx2] = newFlipped;
            if (cards[idx1].pairId === cards[idx2].pairId) {
                // MATCH
                setMatches(prev => new Set(prev).add(cards[idx1].pairId));
                setScore(s => s + 20);
                window.ManyaAudio?.success?.();
                setFlippedIndices([]);
                setLockBoard(false);
            } else {
                // NO MATCH
                setTimeout(() => {
                    setFlippedIndices([]);
                    setLockBoard(false);
                    setScore(s => Math.max(0, s - 5));
                    window.ManyaAudio?.error?.();
                }, 1000);
            }
        }
    };

    // Check Win
    useEffect(() => {
        if (cards.length > 0 && matches.size === cards.length / 2) {
            setTimeout(() => setShowFinish(true), 600);
        }
    }, [matches, cards]);

    const resetGame = () => {
        setMatches(new Set());
        setScore(0);
        setFlippedIndices([]);
        setShowFinish(false);
        // Reshuffle
        const reshuffled = [...cards];
        for (let i = reshuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]];
        }
        setCards(reshuffled);
    };

    const gridCols = cards.length <= 6 ? 'grid-cols-2' : (cards.length <= 12 ? 'grid-cols-3' : 'grid-cols-4');

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* 1. Header Area */}
            <div className="flex-none p-6 pb-2">
                <div className="flex justify-between items-center mb-6">
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10' : 'bg-white text-indigo-600 border border-slate-100 shadow-sm'}`}>
                        <Brain size={12} className="animate-pulse" /> Memory Match
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-2 ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
                        <Sparkles size={14} className="text-amber-500" /> {score}
                    </div>
                </div>

                {/* Hint Card */}
                <div className={`p-4 rounded-3xl border flex items-start gap-3 transition-all ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-premium-sm'}`}>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Lightbulb size={16} />
                    </div>
                    <p className={`text-xs font-bold leading-normal mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {hint}
                    </p>
                </div>
            </div>

            {/* 2. Grid Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide flex items-center justify-center">
                <div className={`grid ${gridCols} gap-3 w-full max-w-lg`}>
                    {cards.map((card, idx) => {
                        const isFlipped = flippedIndices.includes(idx) || matches.has(card.pairId);
                        const isMatched = matches.has(card.pairId);
                        
                        return (
                            <div 
                                key={card.id}
                                onClick={() => handleCardClick(idx)}
                                className="aspect-[3/4] perspective-1000 cursor-pointer group"
                            >
                                <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    
                                    {/* Front (Hidden) */}
                                    <div className={`absolute inset-0 backface-hidden rounded-2xl border-2 flex items-center justify-center shadow-lg transition-all ${isDark ? 'bg-[#1E2530] border-white/5 text-indigo-500/30' : 'bg-white border-slate-100 text-slate-200'} group-hover:scale-105 active:scale-95`}>
                                        <div className="w-12 h-12 rounded-full border-4 border-current opacity-10 flex items-center justify-center">
                                            <span className="text-xl font-black">?</span>
                                        </div>
                                    </div>

                                    {/* Back (Visible) */}
                                    <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-2 flex items-center justify-center p-3 text-center shadow-xl transition-all ${isMatched ? (isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-emerald-50 border-emerald-200 text-emerald-700') : (isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-indigo-100 text-indigo-700')}`}>
                                        <span className={`text-[10px] sm:text-xs font-black leading-tight uppercase tracking-tight`}>
                                            {card.text}
                                        </span>
                                        {isMatched && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] animate-in zoom-in duration-300">
                                                ✓
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Finish Overlay */}
            {showFinish && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl bg-white/10">
                    <div className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl border border-white/10 scale-in-center">
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                            <Trophy size={48} />
                        </div>
                        <h2 className="text-4xl font-black mb-2 tracking-tight">Memory Legend!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 text-lg">
                            Score: {score} pts
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={onComplete}
                                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Continue Quest <ArrowRight size={20} strokeWidth={4} />
                            </button>
                            <button 
                                onClick={resetGame}
                                className="w-full h-14 text-slate-500 font-black text-[10px] tracking-widest uppercase hover:text-indigo-500 transition-colors"
                            >
                                Play Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .shadow-premium-sm { box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
                .scale-in-center { animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

MemoryMatchEngine.hideGlobalFooter = true;
export default MemoryMatchEngine;
