import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RotateCcw, Box, Sparkles, Info, CheckCircle2, Trophy, ChevronRight, X, ChevronDown } from 'lucide-react';

/**
 * THREE D STUDY ENGINE (React Port) - v1.1
 * ---------------------------------------
 * Premium 3D interactive learning engine using <model-viewer>.
 * Features:
 * - Liquid Layout: Adapts to any content length with premium scrolling.
 * - Global Theme: Syncs with Manya's Light/Dark mode.
 * - Quiz/Study Modes: Interactive labeling and anatomical focus.
 */
export function ThreeDStudyEngine({ data, onComplete }) {
    const [selectedPinId, setSelectedPinId] = useState(null);
    const [correctPinIds, setCorrectPinIds] = useState(new Set());
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [feedbackState, setFeedbackState] = useState(null); // { type: 'success' | 'error', id: string }
    const [isFinished, setIsFinished] = useState(false);
    const [showScrollHint, setShowScrollHint] = useState(false);
    
    const viewerRef = useRef(null);
    const containerRef = useRef(null);

    const hotspots = useMemo(() => data?.hotspots || [], [data]);
    const wordBank = useMemo(() => data?.wordBank || hotspots.map(h => h.label), [data, hotspots]);
    const isQuiz = data?.mode === 'quiz' || !!data?.wordBank;
    const accent = data?.subject?.toLowerCase() === 'science' ? '#7c3aed' : '#3b82f6';

    // --- CAMERA MATH ---
    const calculateOrbit = (normStr) => {
        if (!normStr) return "0deg 75deg 80%";
        const parts = normStr.split(' ').map(Number);
        let theta = Math.atan2(parts[0], parts[2]) * (180 / Math.PI);
        let phi = Math.acos(parts[1]) * (180 / Math.PI);
        return `${theta}deg ${phi}deg 75%`;
    };

    const handlePinClick = (hs) => {
        if (viewerRef.current) {
            viewerRef.current.cameraTarget = hs.pos;
            viewerRef.current.cameraOrbit = calculateOrbit(hs.norm);
        }
        setSelectedPinId(hs.id);
        if (!isQuiz) setIsDrawerOpen(true);
        playEffect('click');
    };

    const handleResetCamera = () => {
        if (viewerRef.current) {
            viewerRef.current.cameraTarget = "auto auto auto";
            viewerRef.current.cameraOrbit = "0deg 75deg 105%";
        }
        setIsDrawerOpen(false);
        setSelectedPinId(null);
        playEffect('click');
    };

    const handleWordSelection = (word) => {
        if (!selectedPinId) return;

        const hs = hotspots.find(h => h.id === selectedPinId);
        if (hs && hs.label.toLowerCase() === word.toLowerCase()) {
            playEffect('success');
            setCorrectPinIds(prev => new Set([...prev, selectedPinId]));
            setFeedbackState({ type: 'success', id: selectedPinId });
            setTimeout(() => {
                setFeedbackState(null);
                setSelectedPinId(null);
                if (viewerRef.current) viewerRef.current.cameraTarget = "auto auto auto";
            }, 1200);
        } else {
            playEffect('error');
            setFeedbackState({ type: 'error', id: selectedPinId });
            setTimeout(() => setFeedbackState(null), 800);
        }
    };

    const playEffect = (type) => {
        if (!window.ManyaAudio) return;
        if (type === 'click') window.ManyaAudio.click();
        if (type === 'success') window.ManyaAudio.finish();
        if (type === 'error') window.ManyaAudio.whoosh();
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShowScrollHint(!atBottom && scrollHeight > clientHeight);
    };

    // CHECK COMPLETION
    useEffect(() => {
        if (isQuiz && correctPinIds.size === hotspots.length && hotspots.length > 0) {
            setTimeout(() => setIsFinished(true), 1000);
        }
    }, [correctPinIds, hotspots.length, isQuiz]);

    // SCROLL HINT EFFECT
    useEffect(() => {
        if (isDrawerOpen && !isQuiz) {
            const checkScroll = () => {
                const el = containerRef.current?.querySelector('.drawer-content-area');
                if (el) setShowScrollHint(el.scrollHeight > el.clientHeight);
            };
            setTimeout(checkScroll, 300);
        } else {
            setShowScrollHint(false);
        }
    }, [isDrawerOpen, selectedPinId, isQuiz]);

    const selectedHS = useMemo(() => hotspots.find(h => h.id === selectedPinId), [hotspots, selectedPinId]);

    return (
        <div 
            ref={containerRef} 
            className="relative w-full h-full bg-[var(--bg-main)] font-['Plus_Jakarta_Sans',_sans-serif] overflow-hidden flex flex-col transition-colors duration-700"
            style={{ '--accent-color': accent }}
        >
            
            <main className="flex-1 overflow-hidden flex flex-col bg-[var(--bg-main)]">
                {/* 3D VIEWPORT - 80% DEDICATED SPACE */}
                <div className={`flex-[0.8] relative overflow-hidden transition-all duration-700 bg-black/5 dark:bg-black/20 rounded-[32px] m-2 border border-black/5 dark:border-white/5`}>
                    
                    {/* GHOST PROGRESS BADGE */}
                    <div className="absolute top-4 left-4 z-50 pointer-events-none">
                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-3xl px-3 py-1.5 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
                            <Box size={10} className="text-[var(--accent-color)]" />
                            <span className="text-[10px] font-black text-white tracking-[0.2em]">
                                {correctPinIds.size}/{hotspots.length}
                            </span>
                        </div>
                    </div>

                    <model-viewer
                        ref={viewerRef}
                        src={data.modelUrl}
                        camera-controls
                        shadow-intensity="1"
                        auto-rotate={!selectedPinId}
                        environment-image="neutral"
                        camera-orbit="0deg 75deg 105%"
                        className="w-full h-full outline-none"
                    >
                        {hotspots.map((hs, idx) => (
                            <button
                                key={hs.id}
                                slot={`hotspot-${hs.id}`}
                                className={`Hotspot group transition-all duration-500 ${
                                    selectedPinId === hs.id ? 'selected' : ''
                                } ${correctPinIds.has(hs.id) ? 'correct-pin' : ''} ${
                                    feedbackState?.id === hs.id && feedbackState?.type === 'error' ? 'animate-shake' : ''
                                }`}
                                data-id={hs.id}
                                data-position={hs.pos}
                                data-normal={hs.norm || '0 1 0'}
                                onClick={() => handlePinClick(hs)}
                                disabled={correctPinIds.has(hs.id)}
                            >
                                <span className="pointer-events-none drop-shadow-sm">
                                    {correctPinIds.has(hs.id) ? '✓' : idx + 1}
                                </span>
                            </button>
                        ))}
                    </model-viewer>

                    {/* COMPACT RESET CAMERA */}
                    <div className="absolute right-4 bottom-4 flex flex-col gap-3 z-50">
                        {!isQuiz && !isFinished && (
                            <button 
                                onClick={() => setIsFinished(true)}
                                className="h-10 px-4 rounded-xl bg-orange-500 text-white font-black text-[10px] tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 hover:bg-orange-600"
                            >
                                <CheckCircle2 size={14} /> MASTERED
                            </button>
                        )}
                        <button 
                            onClick={handleResetCamera}
                            className="w-10 h-10 rounded-xl bg-[var(--bg-main)]/40 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-all text-[var(--text-sub)] hover:text-[var(--accent-color)] ml-auto"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                    
                    {/* ENHANCED HUD PROMPT - BOTTOM DOCKED PILL */}
                    {isQuiz && !isFinished && !selectedPinId && (
                        <div className="absolute bottom-6 right-6 left-22 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-700">
                             <div className="bg-[var(--accent-color)]/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-3 w-fit ml-auto">
                                <Sparkles size={14} className="text-white animate-pulse" />
                                <p className="text-[10px] font-black text-white leading-tight tracking-widest uppercase">
                                    Tap a pulsing pin
                                </p>
                             </div>
                        </div>
                    )}
                </div>

                {/* WORD BANK - 20% DEDICATED SPACE */}
                {isQuiz && !isFinished && (
                    <div className="flex-[0.2] min-h-[180px] bg-[#0f1115]/95 backdrop-blur-3xl border-t border-white/10 p-4 pb-8 overflow-y-auto custom-scrollbar">
                        <div className="max-w-3xl mx-auto flex flex-col gap-3">
                            <div className="flex items-center justify-center -mt-1 mb-1">
                                <div className="w-12 h-1 bg-white/10 rounded-full" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                {wordBank.map((word, idx) => {
                                    const isCorrect = Array.from(correctPinIds).some(pid => hotspots.find(h => h.id === pid)?.label === word);
                                    const isError = feedbackState?.id === word && feedbackState?.type === 'error';
                                    
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleWordSelection(word)}
                                            disabled={isCorrect}
                                            className={`h-11 rounded-xl border font-black text-[9.5px] tracking-wide transition-all active:scale-95 flex items-center justify-center px-4 relative overflow-hidden ${
                                                isCorrect
                                                ? 'bg-green-500/5 border-green-500/10 text-green-500/20 shadow-none'
                                                : isError
                                                    ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-shake shadow-lg shadow-red-500/10'
                                                    : selectedPinId
                                                        ? 'bg-[#1a1c23] border-[var(--accent-color)] text-[var(--accent-color)] shadow-xl shadow-[var(--accent-color)]/10 hover:scale-[1.03] z-10'
                                                        : 'bg-white/5 border-white/5 text-white/60'
                                            }`}
                                        >
                                            <span className="relative z-10">{word.toUpperCase()}</span>
                                            {isCorrect && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/5">
                                                    <CheckCircle2 size={14} className="text-green-500/30" />
                                                </div>
                                            )}
                                            {selectedPinId && !isCorrect && (
                                                 <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent-color)]/30 animate-pulse" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* STUDY DRAWER */}
                {!isQuiz && (
                    <div 
                        className={`absolute bottom-0 left-0 right-0 h-[75vh] bg-[var(--bg-card)]/95 backdrop-blur-3xl z-[100] rounded-[48px_48px_0_0] border-t-2 border-[var(--border-subtle)] shadow-up transition-all duration-700 ease-spring flex flex-col ${
                            isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
                        }`}
                    >
                        <div className="w-full h-10 shrink-0 flex flex-col items-center justify-center cursor-pointer group" onClick={() => setIsDrawerOpen(false)}>
                            <div className="w-16 h-1.5 bg-[var(--border-subtle)] rounded-full transition-all group-hover:w-24 group-hover:bg-[var(--accent-color)]/30" />
                        </div>
                        
                        {selectedHS && (
                            <div 
                                onScroll={handleScroll}
                                className="flex-1 overflow-y-auto px-6 md:px-12 pb-32 pt-2 custom-scrollbar drawer-content-area"
                            >
                                <div className="max-w-2xl mx-auto">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center">
                                            <Sparkles size={20} />
                                        </div>
                                        <span className="text-[11px] font-black text-[var(--accent-color)] tracking-[0.2em] uppercase">Anatomy Focus</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-[var(--text-main)] tracking-tighter mb-4 leading-[0.9]" dangerouslySetInnerHTML={{ __html: selectedHS.label }} />
                                    <p className="text-xl md:text-2xl font-bold text-[var(--text-sub)] leading-tight mb-6" dangerouslySetInnerHTML={{ __html: selectedHS.info }} />
                                    <div className="text-lg font-medium text-[var(--text-muted)] leading-relaxed mb-10" dangerouslySetInnerHTML={{ __html: selectedHS.description || "Detailed analysis of this component." }} />
                                    
                                    {(selectedHS.examTip || selectedHS.hint) && (
                                        <div className="relative p-8 rounded-[3rem] bg-amber-500/5 border-2 border-amber-500/20 overflow-hidden group">
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/40">
                                                        <Info size={16} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-amber-600 tracking-[0.3em] uppercase">Exam Insight</span>
                                                </div>
                                                <div className="text-xl md:text-2xl font-black text-amber-900 leading-tight" dangerouslySetInnerHTML={{ __html: selectedHS.examTip || selectedHS.hint }} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="h-20" />
                                </div>
                            </div>
                        )}

                        {showScrollHint && (
                            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center pointer-events-none animate-bounce z-[150]">
                                <div className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-full text-[10px] font-black tracking-widest shadow-xl flex items-center gap-2">
                                    SCROLL FOR MORE <ChevronDown size={14} />
                                </div>
                            </div>
                        )}
                        
                        <button 
                            className="bg-[var(--bg-main)] text-[var(--text-muted)] absolute top-8 right-8 w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all border border-[var(--border-subtle)] hover:bg-[var(--accent-color)] hover:text-white z-[200]"
                            onClick={() => setIsDrawerOpen(false)}
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}

                {/* COMPLETION OVERLAY */}
                {isFinished && (
                    <div className="absolute inset-0 bg-[var(--bg-card)]/95 backdrop-blur-xl z-[2000] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                        <div className="w-24 h-24 bg-yellow-400 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-8 animate-bounce">
                            <Trophy size={48} />
                        </div>
                        <h2 className="text-4xl font-black text-[var(--text-main)] mb-12 uppercase tracking-tighter">Model Completed!</h2>
                        <button 
                            onClick={onComplete}
                            className="h-20 w-full max-w-[320px] rounded-[2.5rem] bg-[var(--accent-color)] text-white font-black text-xl shadow-2xl flex items-center justify-center gap-6 active:scale-95 transition-all"
                        >
                            CONTINUE <ChevronRight size={32} />
                        </button>
                    </div>
                )}

            </main>

            <style>{`
                .threed-study-root {
                    background: var(--bg-main);
                    color: var(--text-main);
                    --accent-color: #F472B6; /* Default Pink */
                }
                
                [data-theme='dark'] .threed-study-root {
                    --bg-main: #0B0E14;
                    --text-main: #f8fafc;
                }

                .Hotspot { 
                    width: 32px; height: 32px; border-radius: 50%; 
                    background: var(--accent-color); border: 2.5px solid white; 
                    cursor: pointer; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.25);
                    color: white; font-weight: 900;
                }
                .Hotspot.selected { 
                    transform: scale(1.4); background: var(--accent-color); border-color: white; z-index: 1000;
                    box-shadow: 0 0 30px var(--accent-color);
                }
                .Hotspot.correct-pin { 
                    background: #10B981; border-color: white; transform: scale(0.9);
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
                }
                .Hotspot:not(.selected):not(.correct-pin) { animation: pinPulse 2s infinite; }
                
                @keyframes pinPulse { 
                    0% { box-shadow: 0 0 0 0 var(--accent-color); opacity: 1; } 
                    70% { box-shadow: 0 0 0 15px transparent; opacity: 1; } 
                    100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
                }

                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
                .animate-shake { animation: shake 0.4s ease-in-out; }
                .shadow-up { box-shadow: 0 -25px 80px -15px rgba(0,0,0,0.1); }
                .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--accent-color); border-radius: 20px; border: 2px solid var(--bg-card); opacity: 0.3; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { opacity: 1; }
            `}</style>
        </div>
    );
}

export default ThreeDStudyEngine;
