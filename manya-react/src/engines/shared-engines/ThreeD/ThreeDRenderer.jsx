import React from 'react';
import { 
    RotateCcw, 
    Box, 
    Sparkles, 
    Info, 
    CheckCircle2, 
    X, 
    ChevronDown 
} from 'lucide-react';
import { resolveRemoteUrl } from '../../../config/assetUrls';

export default function ThreeDRenderer({
    refViewer,
    data,
    hotspots,
    wordBank,
    isQuiz,
    accent,
    selectedPinId,
    correctPinIds,
    feedbackState,
    isFinished,
    showScrollHint,
    isDrawerOpen,
    onPinClick,
    onResetCamera,
    onMastered,
    onWordSelection,
    onCloseDrawer,
    onScrollDrawer,
    selectedHS
}) {
    return (
        <div className="relative w-full h-full bg-[var(--bg-main)] font-['Plus_Jakarta_Sans',_sans-serif] overflow-hidden flex flex-col transition-colors duration-700" style={{ '--accent-color': accent }}>
            <main className="flex-1 overflow-hidden flex flex-col bg-[var(--bg-main)]">
                <div className="flex-1 min-h-[50vh] relative overflow-hidden transition-all duration-700 bg-black/5 dark:bg-black/20 rounded-[32px] m-2 border border-black/5 dark:border-white/5">
                    <div className="absolute top-4 left-4 z-50 pointer-events-none">
                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-3xl px-3 py-1.5 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
                            <Box size={10} className="text-[var(--accent-color)]" />
                            <span className="text-[10px] font-black text-white tracking-[0.2em]">
                                {correctPinIds.size}/{hotspots.length}
                            </span>
                        </div>
                    </div>

                    <model-viewer
                        ref={refViewer}
                        src={resolveRemoteUrl(data.modelUrl, data._originUrl)}
                        crossorigin="anonymous"
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
                                onClick={() => onPinClick(hs)}
                                disabled={correctPinIds.has(hs.id)}
                            >
                                <span className="pointer-events-none drop-shadow-sm">
                                    {correctPinIds.has(hs.id) ? '✓' : idx + 1}
                                </span>
                            </button>
                        ))}
                    </model-viewer>

                    <div className="absolute right-4 bottom-4 flex flex-col gap-3 z-50">
                        {!isQuiz && !isFinished && (
                            <button 
                                onClick={onMastered}
                                className="h-10 px-4 rounded-xl bg-orange-500 text-white font-black text-[10px] tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2 hover:bg-orange-600"
                            >
                                <CheckCircle2 size={14} /> MASTERED
                            </button>
                        )}
                        <button 
                            onClick={onResetCamera}
                            className="w-10 h-10 rounded-xl bg-[var(--bg-main)]/40 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-lg active:scale-95 transition-all text-[var(--text-sub)] hover:text-[var(--accent-color)] ml-auto"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>
                </div>

                {isQuiz && !isFinished && (
                    <div className="h-[25vh] min-h-[220px] bg-[#0f1115]/95 backdrop-blur-3xl border-t border-white/10 p-4 pb-8 overflow-y-auto custom-scrollbar">
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
                                            onClick={() => onWordSelection(word)}
                                            disabled={isCorrect}
                                            className={`h-11 rounded-xl border font-black text-[9.5px] tracking-wide transition-all active:scale-95 flex items-center justify-center px-4 relative overflow-hidden ${
                                                isCorrect ? 'bg-green-500/5 border-green-500/10 text-green-500/20 shadow-none'
                                                : isError ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-shake shadow-lg shadow-red-500/10'
                                                : selectedPinId ? 'bg-[#1a1c23] border-[var(--accent-color)] text-[var(--accent-color)] shadow-xl shadow-[var(--accent-color)]/10 hover:scale-[1.03] z-10'
                                                : 'bg-white/5 border-white/5 text-white/60'
                                            }`}
                                        >
                                            <span className="relative z-10">{word.toUpperCase()}</span>
                                            {isCorrect && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/5">
                                                    <CheckCircle2 size={14} className="text-green-500/30" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {!isQuiz && (
                    <div className={`absolute bottom-0 left-0 right-0 h-[75vh] bg-[var(--bg-card)]/95 backdrop-blur-3xl z-[100] rounded-[48px_48px_0_0] border-t-2 border-[var(--border-subtle)] shadow-up transition-all duration-700 ease-spring flex flex-col ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                        <div className="w-full h-10 shrink-0 flex flex-col items-center justify-center cursor-pointer group" onClick={onCloseDrawer}>
                            <div className="w-16 h-1.5 bg-[var(--border-subtle)] rounded-full transition-all group-hover:w-24 group-hover:bg-[var(--accent-color)]/30" />
                        </div>
                        {selectedHS && (
                            <div onScroll={onScrollDrawer} className="flex-1 overflow-y-auto px-6 md:px-12 pb-32 pt-2 custom-scrollbar drawer-content-area">
                                <div className="max-w-2xl mx-auto">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center"><Sparkles size={20} /></div>
                                        <span className="text-[11px] font-black text-[var(--accent-color)] tracking-[0.2em] uppercase">Anatomy Focus</span>
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black text-[var(--text-main)] tracking-tighter mb-4 leading-none" dangerouslySetInnerHTML={{ __html: selectedHS.label }} />
                                    <p className="text-xl md:text-2xl font-bold text-[var(--text-sub)] leading-tight mb-6" dangerouslySetInnerHTML={{ __html: selectedHS.info }} />
                                    <div className="text-lg font-medium text-[var(--text-muted)] leading-relaxed mb-10" dangerouslySetInnerHTML={{ __html: selectedHS.description || "Detailed analysis of this component." }} />
                                    {(selectedHS.examTip || selectedHS.hint) && (
                                        <div className="relative p-8 rounded-[3rem] bg-amber-500/5 border-2 border-amber-500/20 overflow-hidden group">
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/40"><Info size={16} /></div>
                                                    <span className="text-[10px] font-black text-amber-600 tracking-[0.3em] uppercase">Exam Insight</span>
                                                </div>
                                                <div className="text-xl md:text-2xl font-black text-amber-900 leading-tight" dangerouslySetInnerHTML={{ __html: selectedHS.examTip || selectedHS.hint }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {showScrollHint && (
                            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center pointer-events-none animate-bounce z-[150]">
                                <div className="px-4 py-2 bg-[var(--accent-color)] text-white rounded-full text-[10px] font-black tracking-widest shadow-xl flex items-center gap-2">SCROLL FOR MORE <ChevronDown size={14} /></div>
                            </div>
                        )}
                        <button className="bg-[var(--bg-main)] text-[var(--text-muted)] absolute top-8 right-8 w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all border border-[var(--border-subtle)] hover:bg-[var(--accent-color)] hover:text-white z-[200]" onClick={onCloseDrawer}><X size={24} /></button>
                    </div>
                )}
            </main>

            <style>{`
                .Hotspot { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-color); border: 2.5px solid white; cursor: pointer; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.25); color: white; font-weight: 900; }
                .Hotspot.selected { transform: scale(1.4); background: var(--accent-color); border-color: white; z-index: 1000; box-shadow: 0 0 30px var(--accent-color); }
                .Hotspot.correct-pin { background: #10B981; border-color: white; transform: scale(0.9); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
                .Hotspot:not(.selected):not(.correct-pin) { animation: pinPulse 2s infinite; }
                @keyframes pinPulse { 0% { box-shadow: 0 0 0 0 var(--accent-color); opacity: 1; } 70% { box-shadow: 0 0 0 15px transparent; opacity: 1; } 100% { box-shadow: 0 0 0 0 transparent; opacity: 1; } }
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
