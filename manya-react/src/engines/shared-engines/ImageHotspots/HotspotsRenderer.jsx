import React from 'react';
import { 
    ChevronRight, 
    Sparkles, 
    CheckCircle2, 
    Lightbulb, 
    Trophy,
    X,
    Check
} from 'lucide-react';
import { resolveRemoteUrl } from '../../../config/assetUrls';

export default function HotspotsRenderer({
    data,
    hotspots,
    isQuizMode,
    wordBank,
    selectedPinId,
    correctPinIds,
    wrongWords = new Set(),
    imageLoaded,
    feedbackState,
    showCompletion,
    totalMistakes,
    onImageLoad,
    onPinClick,
    onWordSelection,
    onFinish,
    onCloseDrawer,
    isExpanded,
    selectedHS
}) {
    return (
        <div className="relative w-full h-full bg-[var(--bg-main)] font-['Plus_Jakarta_Sans',_sans-serif] overflow-hidden flex flex-col transition-colors duration-500">
            <style>{`
                .hotspots-engine-root { background: var(--bg-main); color: var(--text-main); }
                [data-theme='dark'] .hotspots-engine-root {
                    --bg-main: #0B0E14; --bg-card: #2a2a2a; --border-subtle: #3a3a3a;
                    --text-main: #f8fafc; --text-sub: #cccccc; --text-muted: #888888;
                    --drawer-bg: #2a2a2a; --glass-bg: rgba(42, 42, 42, 0.7); --glass-border: rgba(42, 42, 42, 0.3);
                }
                .shadow-premium { box-shadow: 0 25px 60px -12px rgba(0,0,0,0.08); }
                .shadow-glass { box-shadow: 0 12px 30px -5px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.1); }
                .shadow-up { box-shadow: 0 -25px 50px -12px rgba(0,0,0,0.06); }
                .shadow-glow-purple { box-shadow: 0 0 25px rgba(124,58,237,0.45); }
                .shadow-strong { box-shadow: 0 10px 20px rgba(124,58,237,0.3); }
                .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-8px); }
                    75% { transform: translateX(8px); }
                }
                .animate-shake { animation: shake 0.3s ease-in-out 2; }
            `}</style>
            
            {/* FLOATING FINISH BUTTON */}
            <button 
                onClick={onFinish}
                className={`fixed bottom-6 right-6 p-[14px_28px] rounded-[2rem] bg-[#7c3aed] text-white font-black text-[10px] tracking-widest shadow-strong active:scale-95 transition-all flex items-center gap-2 z-[3000] group/finish ${
                    showCompletion ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
                }`}
            >
                FINISH
                <Check size={14} />
            </button>

            <main className="flex-1 flex flex-col p-[10px_15px] relative overflow-hidden">
                <div className="flex-1 bg-[var(--bg-card)] rounded-[40px] border-[2px] border-[var(--border-subtle)] relative overflow-hidden shadow-premium flex flex-col">
                    
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

                    <div className="flex-1 w-full flex items-center justify-center p-4 relative group overflow-hidden" onClick={() => !isQuizMode && onCloseDrawer()}>
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img 
                                src={resolveRemoteUrl(data.imageUrl, data._originUrl)} 
                                alt="Diagram"
                                onLoad={onImageLoad}
                                className={`max-w-full max-h-full object-contain rounded-2xl transition-all duration-1000 ${
                                    imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                                }`}
                            />

                            {hotspots.map((hs) => {
                                const isCorrect = correctPinIds.has(hs.id);
                                const isActive  = selectedPinId === hs.id;
                                const isError   = feedbackState?.type === 'error' && isActive;
                                const isWrong   = !isCorrect && wrongWords.has(
                                    hotspots.find(h => h.id === hs.id)?.label
                                );
                                return (
                                    <div 
                                        key={hs.id}
                                        className={`absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 z-[100] flex items-center justify-center transition-all duration-300 ${
                                            (isCorrect || isWrong) ? 'pointer-events-none cursor-default' : 'pointer-events-auto cursor-pointer'
                                        } ${isError ? 'animate-shake' : ''}`}
                                        style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                                        onClick={(e) => { e.stopPropagation(); if (!isCorrect && !isWrong) onPinClick(hs.id); }}
                                    >
                                        <div className={`relative w-6 h-6 rounded-full border-2 border-white transition-all duration-500 shadow-xl ${
                                            isCorrect ? 'bg-[#10B981]' 
                                            : isWrong  ? 'bg-rose-700 opacity-50 scale-90 shadow-none'
                                            : isError  ? 'bg-rose-500 scale-125 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
                                            : isActive ? 'bg-[#db2777] scale-150 shadow-[0_0_25px_rgba(219,39,119,0.9)]' 
                                            : 'bg-[#7c3aed] scale-100 shadow-[0_0_15px_rgba(124,58,237,0.6)]'
                                        }`}>
                                            {!isCorrect && !isWrong && !isError && <div className="absolute inset-0 rounded-full border-2 border-inherit animate-ping opacity-40" />}
                                            {isCorrect && <Check size={14} className="text-white absolute inset-0 m-auto" />}
                                            {isWrong  && <X    size={14} className="text-white/70 absolute inset-0 m-auto" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isQuizMode && (
                        <div className="px-5 pb-6 pt-2 grid grid-cols-2 gap-2.5 z-20 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)] to-transparent">
                            {wordBank.map((word, i) => {
                                const isUsed    = Array.from(correctPinIds).some(pid => hotspots.find(h => h.id === pid)?.label === word);
                                const isWrongW  = wrongWords.has(word);
                                const isError   = feedbackState?.type === 'error'   && feedbackState?.id === word;
                                const isSuccess = feedbackState?.type === 'success'  && feedbackState?.id === word;
                                return (
                                    <button 
                                        key={i}
                                        className={`p-3.5 rounded-xl border font-black text-[11px] transition-all tracking-tight active:scale-95 flex items-center justify-center gap-1.5 ${
                                            isUsed || isSuccess ? 'bg-emerald-50 border-emerald-500 text-emerald-600 opacity-50' 
                                            : isWrongW  ? 'bg-rose-50 border-rose-300 text-rose-400 opacity-50 cursor-default'
                                            : isError   ? 'bg-rose-50 border-rose-500 text-rose-600 animate-shake'
                                            : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-main)] shadow-sm hover:border-[#7c3aed]/50'
                                        }`}
                                        onClick={() => !isWrongW && onWordSelection(word)}
                                        disabled={isUsed || isWrongW}
                                    >
                                        {isWrongW && <X size={12} className="text-rose-400 shrink-0" />}
                                        {word}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {showCompletion && (
                <div className="fixed inset-0 z-[4000] bg-[var(--bg-main)]/80 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 bg-[#7c3aed] rounded-[2.5rem] flex items-center justify-center text-white shadow-glow-purple mb-8">
                        <Trophy size={48} />
                    </div>
                    <h2 className="text-4xl font-black text-[var(--text-main)] mb-4 tracking-tighter">Diagram Mastered!</h2>
                    <p className="text-[var(--text-sub)] text-lg font-bold mb-10 opacity-70">You correctly identified all {hotspots.length} parts.</p>
                    <button onClick={onFinish} className="w-full max-w-[300px] h-20 rounded-[2.5rem] bg-[#7c3aed] text-white font-black text-xl shadow-xl shadow-[#7c3aed]/30 active:scale-95 transition-all flex items-center justify-center gap-4 group">
                        CONTINUE <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform"><ChevronRight size={24} /></div>
                    </button>
                </div>
            )}

            <div className={`absolute bottom-0 left-0 right-0 h-[65%] bg-[var(--drawer-bg)] backdrop-blur-3xl z-[2000] rounded-[50px_50px_0_0] border-t-2 border-[var(--glass-border)] shadow-up transition-all duration-700 ease-spring flex flex-col ${isExpanded && selectedHS ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'}`}>
                <div className="w-full h-20 shrink-0 flex items-center justify-center relative">
                    <div className="w-12 h-1 bg-[var(--text-muted)] opacity-20 rounded-full" />
                    <button onClick={onCloseDrawer} className="absolute right-6 p-2 rounded-xl bg-[var(--text-muted)]/10 text-[var(--text-main)] active:scale-90 transition-all"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-8 pb-32 scroll-smooth">
                    {selectedHS && (
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <span className="px-3 py-1 bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-black rounded-lg w-fit tracking-widest uppercase">{selectedHS.label}</span>
                                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Part Analysis</h2>
                            </div>
                            <div className="p-6 bg-[var(--bg-main)] rounded-3xl border border-[var(--border-subtle)] shadow-sm">
                                <p className="text-xl font-bold text-[var(--text-main)] mb-3 leading-snug">{selectedHS.info}</p>
                                <div className="text-[var(--text-sub)] text-base font-medium leading-[1.8]" dangerouslySetInnerHTML={{ __html: selectedHS.description || "Learn about this crucial component." }} />
                            </div>
                            {(selectedHS.examTip || selectedHS.hint) && (
                                <div className="bg-amber-50 p-6 rounded-3xl border-l-[8px] border-amber-400 flex items-start gap-4 shadow-sm">
                                    <div className="p-2.5 bg-amber-400 rounded-2xl text-white shadow-lg rotate-3"><Lightbulb size={20} /></div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-amber-800 tracking-tighter">MANYA HINT</span>
                                        <span className="text-[var(--text-main)] font-bold text-sm leading-relaxed">{selectedHS.examTip || selectedHS.hint}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
