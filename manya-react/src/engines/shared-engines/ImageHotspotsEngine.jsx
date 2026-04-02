import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, 
    Sparkles, 
    CheckCircle2, 
    Lightbulb, 
    Trophy,
    X,
    Check
} from 'lucide-react';

/**
 * ImageHotspotsEngine - React Migration
 * Features:
 * - Neon Pins: Pulsing interactive hotspots.
 * - Glassmorphic Drawer: Premium study/quiz details.
 * - Dual Mode: Study (Information) and Quiz (Labeling).
 * - Intelligent Feedback: Shake animations and completion overlay.
 * - Z-Fixed: Ensures the FINISH button is always accessible.
 */
export function ImageHotspotsEngine({ data, onComplete, onResult, onAttempt }) {
    const [selectedPinId, setSelectedPinId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [correctPinIds, setCorrectPinIds] = useState(new Set());
    const [imageLoaded, setImageLoaded] = useState(false);
    const [feedbackState, setFeedbackState] = useState(null); // { type: 'error'|'success', id: string }
    const [showCompletion, setShowCompletion] = useState(false);
    const [totalMistakes, setTotalMistakes] = useState(0);

    const globalStartTimeRef = React.useRef(Date.now());
    const startTimeRef = React.useRef(Date.now());

    const hotspots = data?.hotspots || [];
    const isQuizMode = data?.mode === 'quiz' || data?.mode === 'labeling' || !!data?.wordBank;
    const wordBank = data?.wordBank || hotspots.map(h => h.label);

    useEffect(() => {
        if (showCompletion) {
            const score = isQuizMode ? correctPinIds.size : 1;
            const total = isQuizMode ? hotspots.length : 1;
            
            // DB Bridge
            if (onResult) {
                onResult({
                    isCorrect: score === total,
                    score,
                    total,
                    type: isQuizMode ? 'labeling' : 'study'
                });
            } else if (window.QuestRunner?.handleEngineResult) {
                 window.QuestRunner.handleEngineResult({
                    isCorrect: score === total,
                    score,
                    total,
                    mistakes: totalMistakes,
                    duration: Date.now() - globalStartTimeRef.current,
                    type: isQuizMode ? 'labeling' : 'study'
                });
            }
        }
    }, [showCompletion, isQuizMode, correctPinIds.size, hotspots.length, onResult]);

    useEffect(() => {
        if (correctPinIds.size === hotspots.length && hotspots.length > 0) {
            const timer = setTimeout(() => setShowCompletion(true), 800);
            playEffect('success');
            return () => clearTimeout(timer);
        }
    }, [correctPinIds.size, hotspots.length]);

    const playEffect = (type) => {
        if (window.ManyaAudio) {
            if (type === 'click') window.ManyaAudio.click();
            if (type === 'success') window.ManyaAudio.finish();
            if (type === 'error') window.ManyaAudio.whoosh();
        }
    };

    const handlePinClick = (pinId) => {
        playEffect('click');
        setSelectedPinId(pinId);
        startTimeRef.current = Date.now();
        if (!isQuizMode) {
            setCorrectPinIds(prev => new Set([...prev, pinId]));
            setIsExpanded(true); // Only expand in study mode
        }
    };

    const handleWordSelection = (word) => {
        if (!selectedPinId) {
            if (window.addToast) window.addToast({ message: "Tap a pulsing pin first!", type: "info" });
            return;
        }

        const hs = hotspots.find(h => h.id === selectedPinId);
        const isCorrect = hs && hs.label.toLowerCase() === word.toLowerCase();
        const duration = Date.now() - startTimeRef.current;

        // ── RECORD GRANULAR ATTEMPT ──
        if (onAttempt) {
            onAttempt({
                isCorrect,
                label: `Image Hotspot: ${word}`,
                duration,
                mistakes: isCorrect ? 0 : 1
            });
        }

        if (isCorrect) {
            if (window.addToast) window.addToast({ message: "Correct! Great job Hero.", type: "success" });
            playEffect('success');
            setCorrectPinIds(prev => new Set([...prev, selectedPinId]));
            setFeedbackState({ type: 'success', id: word });
            setTimeout(() => {
                setFeedbackState(null);
                setSelectedPinId(null);
            }, 800);
            startTimeRef.current = Date.now();
        } else {
            if (window.addToast) window.addToast({ message: "Not quite. Try again!", type: "error" });
            playEffect('error');
            setTotalMistakes(prev => prev + 1);
            setFeedbackState({ type: 'error', id: word });
            setTimeout(() => setFeedbackState(null), 600);
        }
    };

    const selectedHS = hotspots.find(h => h.id === selectedPinId);

    if (!data) return <div className="p-8 text-center opacity-50">No data available.</div>;

    return (
        <div className="relative w-full h-full bg-[var(--bg-main)] font-['Plus_Jakarta_Sans',_sans-serif] overflow-hidden flex flex-col transition-colors duration-500">
            
            {/* FLOATING FINISH BUTTON */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    playEffect('success');
                    if (onComplete) onComplete({
                        isCorrect: correctPinIds.size === hotspots.length,
                        score: correctPinIds.size,
                        total: hotspots.length,
                        mistakes: totalMistakes,
                        accuracy: hotspots.length > 0 ? (correctPinIds.size / hotspots.length) : 1,
                        duration: Date.now() - globalStartTimeRef.current,
                        type: isQuizMode ? 'labeling' : 'study'
                    });
                }}
                className={`fixed bottom-6 right-6 p-[14px_28px] rounded-[2rem] bg-[#7c3aed] text-white font-black text-[10px] tracking-widest shadow-strong active:scale-95 transition-all flex items-center gap-2 z-[3000] group/finish ${
                    showCompletion ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
                }`}
            >
                FINISH
                <Check size={14} />
            </button>

            <main className="flex-1 flex flex-col p-[10px_15px] relative overflow-hidden">
                <div className="flex-1 bg-[var(--bg-card)] rounded-[40px] border-[2px] border-[var(--border-subtle)] relative overflow-hidden shadow-premium flex flex-col">
                    
                    {/* INFO BAR - Moved higher and made more subtle */}
                    <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center z-20 pointer-events-none">
                        <div className="bg-[var(--glass-bg)] backdrop-blur-xl px-3 py-1.5 rounded-xl shadow-glass border border-[var(--glass-border)] flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse" />
                            <span className="text-[9px] font-black text-[var(--text-main)] tracking-widest uppercase">
                                {isQuizMode ? 'QUIZ MODE' : 'STUDY MODE'}
                            </span>
                        </div>
                        <div className="bg-[var(--glass-bg)] backdrop-blur-xl px-3 py-1.5 rounded-xl shadow-glass border border-[var(--glass-border)]">
                            <span className="text-[9px] font-black text-[var(--text-main)] tracking-widest opacity-60">
                                {correctPinIds.size}/{hotspots.length} COMPLETED
                            </span>
                        </div>
                    </div>

                    {/* DIAGRAM VIEWPORT */}
                    <div 
                        className="flex-1 w-full flex items-center justify-center p-4 relative group overflow-hidden"
                        onClick={() => {
                            if (!isQuizMode) setIsExpanded(false);
                        }}
                    >
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img 
                                src={data.imageUrl} 
                                alt="Diagram"
                                onLoad={() => setImageLoaded(true)}
                                className={`max-w-full max-h-full object-contain rounded-2xl transition-all duration-1000 ${
                                    imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                                }`}
                            />

                            {hotspots.map((hs) => {
                                const isCorrect = correctPinIds.has(hs.id);
                                const isActive = selectedPinId === hs.id;
                                const isError = feedbackState?.type === 'error' && isActive;
                                return (
                                    <div 
                                        key={hs.id}
                                        className={`absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer z-[100] flex items-center justify-center transition-all duration-300 ${
                                            isCorrect && isQuizMode ? 'pointer-events-none' : 'pointer-events-auto'
                                        } ${isError ? 'animate-shake' : ''}`}
                                        style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePinClick(hs.id);
                                        }}
                                    >
                                        <div className={`relative w-6 h-6 rounded-full border-2 border-white transition-all duration-500 shadow-xl ${
                                            isCorrect 
                                                ? 'bg-[#10B981] scale-100' 
                                                : isError
                                                    ? 'bg-rose-500 scale-125 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                                                    : isActive 
                                                        ? 'bg-[#db2777] scale-150 shadow-[0_0_25px_rgba(219,39,119,0.9)]' 
                                                        : 'bg-[#7c3aed] scale-100 shadow-[0_0_15px_rgba(124,58,237,0.6)]'
                                        }`}>
                                            {!isCorrect && !isError && (
                                                <div className="absolute inset-0 rounded-full border-2 border-inherit animate-ping opacity-40" />
                                            )}
                                            {isCorrect && <Check size={14} className="text-white absolute inset-0 m-auto" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* WORD BANK - More compact grid */}
                    {isQuizMode && (
                        <div className="px-5 pb-6 pt-2 grid grid-cols-2 gap-2.5 z-20 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)] to-transparent">
                            {wordBank.map((word, i) => {
                                const isUsed = Array.from(correctPinIds).some(pid => hotspots.find(h => h.id === pid)?.label === word);
                                const isError = feedbackState?.type === 'error' && feedbackState?.id === word;
                                const isSuccess = feedbackState?.type === 'success' && feedbackState?.id === word;

                                return (
                                    <button 
                                        key={i}
                                        className={`p-3.5 rounded-xl border font-black text-[11px] transition-all tracking-tight active:scale-95 ${
                                            isUsed || isSuccess
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 opacity-50' 
                                            : isError
                                                ? 'bg-rose-50 border-rose-500 text-rose-600 animate-shake'
                                                : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-main)] shadow-sm hover:border-[#7c3aed]/50'
                                        }`}
                                        onClick={() => handleWordSelection(word)}
                                    >
                                        {word}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* COMPLETION OVERLAY */}
            {showCompletion && (
                <div className="fixed inset-0 z-[4000] bg-[var(--bg-main)]/80 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
                        <div className="w-24 h-24 bg-[#7c3aed] rounded-[2.5rem] flex items-center justify-center text-white shadow-glow-purple mb-8 animate-in zoom-in-50 duration-700 delay-300">
                            <Trophy size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-[var(--text-main)] mb-4 tracking-tighter">
                        Diagram Mastered!
                        </h2>
                        <p className="text-[var(--text-sub)] text-lg font-bold mb-10 opacity-70">
                        You correctly identified all {hotspots.length} parts.
                        </p>
                        <button 
                        onClick={() => {
                            if (onComplete) onComplete({
                                isCorrect: true,
                                score: hotspots.length,
                                total: hotspots.length,
                                mistakes: totalMistakes,
                                accuracy: 1.0,
                                duration: Date.now() - globalStartTimeRef.current,
                                type: isQuizMode ? 'labeling' : 'study'
                            });
                        }}
                        className="w-full max-w-[300px] h-20 rounded-[2.5rem] bg-[#7c3aed] text-white font-black text-xl shadow-xl shadow-[#7c3aed]/30 active:scale-95 transition-all flex items-center justify-center gap-4 group"
                        >
                            CONTINUE
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                                <ChevronRight size={24} />
                            </div>
                        </button>
                </div>
            )}

            {/* PREMIUM GLASS DRAWER */}
            <div 
                className={`absolute bottom-0 left-0 right-0 h-[65%] bg-[var(--drawer-bg)] backdrop-blur-3xl z-[2000] rounded-[50px_50px_0_0] border-t-2 border-[var(--glass-border)] shadow-up transition-all duration-700 ease-spring flex flex-col ${
                    (isExpanded && selectedHS) ? 'translate-y-0 pointer-events-auto' : 'translate-y-[calc(100%-0px)] pointer-events-none'
                }`}
            >
                <div className="w-full h-20 shrink-0 flex items-center justify-center relative">
                    <div className="w-12 h-1 bg-[var(--text-muted)] opacity-20 rounded-full" />
                    <button 
                        onClick={() => setIsExpanded(false)}
                        className="absolute right-6 p-2 rounded-xl bg-[var(--text-muted)]/10 text-[var(--text-main)] active:scale-90 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 pb-32 scroll-smooth">
                    {selectedHS && (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col gap-2">
                                <span className="px-3 py-1 bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-black rounded-lg w-fit tracking-widest uppercase">
                                    {selectedHS.label}
                                </span>
                                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">
                                    Part Analysis
                                </h2>
                            </div>

                            <div className="p-6 bg-[var(--bg-main)] rounded-3xl border border-[var(--border-subtle)] shadow-sm">
                                <p className="text-xl font-bold text-[var(--text-main)] mb-3 leading-snug">
                                    {selectedHS.info}
                                </p>
                                <div 
                                    className="text-[var(--text-sub)] text-base font-medium leading-[1.8]"
                                    dangerouslySetInnerHTML={{ __html: selectedHS.description || "Learn about this crucial component." }}
                                />
                            </div>

                            {(selectedHS.examTip || selectedHS.hint) && (
                                <div className="bg-amber-50 p-6 rounded-3xl border-l-[8px] border-amber-400 flex items-start gap-4 shadow-sm animate-in zoom-in-0 duration-700 delay-300">
                                    <div className="p-2.5 bg-amber-400 rounded-2xl text-white shadow-lg rotate-3">
                                        <Lightbulb size={20} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-amber-800 tracking-tighter">MANYA HINT</span>
                                        <span className="text-[var(--text-main)] font-bold text-sm leading-relaxed">
                                            {selectedHS.examTip || selectedHS.hint}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .hotspots-engine-root {
                    background: var(--bg-main);
                    color: var(--text-main);
                }
                
                [data-theme='dark'] .hotspots-engine-root {
                    --bg-main: #0B0E14;
                    --bg-card: #2a2a2a;
                    --border-subtle: #3a3a3a;
                    --text-main: #f8fafc;
                    --text-sub: #cccccc;
                    --text-muted: #888888;
                    --drawer-bg: #2a2a2a;
                    --glass-bg: rgba(42, 42, 42, 0.7);
                    --glass-border: rgba(42, 42, 42, 0.3);
                }

                .shadow-premium { box-shadow: 0 25px 60px -12px rgba(0,0,0,0.08); }
                .shadow-glass { box-shadow: 0 12px 30px -5px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.1); }
                .shadow-up { box-shadow: 0 -25px 50px -12px rgba(0,0,0,0.06); }
                .shadow-glow-purple { box-shadow: 0 0 25px rgba(124,58,237,0.45); }
                .shadow-strong { box-shadow: 0 10px 20px rgba(124,58,237,0.3); }
                
                .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }

                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-in-from-bottom { from { transform: translateY(2rem); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-in { animation: fade-in 0.5s ease-out; }
                .fade-in { animation-name: fade-in; }
                .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom; }
                .zoom-in-0 { animation-name: zoom-in; }
                .zoom-in-95 { animation-name: zoom-in; }
                .zoom-in-50 { animation: zoom-in 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .animate-shake { animation: shake 0.3s ease-in-out 2; }
            `}</style>
        </div>
    );
}

ImageHotspotsEngine.hideGlobalFooter = true;

export default ImageHotspotsEngine;
