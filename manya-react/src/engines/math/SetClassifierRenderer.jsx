import React from 'react';
import { Orbit, ArrowRight } from 'lucide-react';
import { THEMES } from './SetClassifierLogic';

/**
 * SET CLASSIFIER RENDERER
 * Handles the visual presentation, particle canvas stage, and choice UI.
 */
const SetClassifierRenderer = ({
    currentQ,
    stepIdx,
    totalQuestions,
    isDark,
    feedback,
    isResolved,
    canvasRef,
    containerRef,
    handleChoice,
    handleNext
}) => {
    const theme = isDark ? THEMES.dark : THEMES.light;

    return (
        <div ref={containerRef} className={`flex flex-col h-full ${theme.bg} font-jakarta transition-all duration-500 overflow-hidden`}>
            {/* 1. STAGE */}
            <div className={`flex-[2.5] w-full relative bg-gradient-to-b ${theme.stage} border-b-2 ${theme.b} transition-all duration-700 ${feedback === 'correct' ? 'border-green-500 bg-green-500/5' : (feedback === 'wrong' ? 'border-red-500 bg-red-500/5' : theme.b)}`}>
                <canvas ref={canvasRef} className="w-full h-full block" />
                
                <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
                    <div className={`px-3 py-1.5 rounded-2xl text-[10px] font-black tracking-[0.1em] uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-glow-indigo' : 'bg-white/80 backdrop-blur-md text-indigo-600 border border-indigo-100 shadow-premium-sm'}`}>
                        <Orbit size={12} className="animate-spin-slow" /> CLASSIFY
                    </div>
                    <div className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold ${isDark ? 'bg-black/40 text-slate-500' : 'bg-white/80 backdrop-blur-md text-slate-400 shadow-premium-sm'}`}>
                        {stepIdx + 1} / {totalQuestions}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5 overflow-hidden z-20">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-1000 ease-spring" style={{ width: `${((stepIdx + 1) / totalQuestions) * 100}%` }} />
                </div>
            </div>

            {/* 2. LESSON CARD */}
            <div className={`flex-none flex flex-col ${theme.card} relative z-10 shadow-up overflow-hidden`}>
                <div className="flex-none px-5 py-4 text-center flex flex-col justify-center gap-1">
                    <h2 className={`font-black leading-tight ${theme.text} tracking-tight text-xl`} dangerouslySetInnerHTML={{ __html: currentQ?.prompt }} />
                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${theme.sub} opacity-30`}>Determine Domain</p>
                </div>

                {/* 3. CONTROLS */}
                <div className="p-6 flex flex-col gap-4 border-t border-[var(--border-color)]">
                    <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ${isResolved ? 'opacity-0 scale-95 absolute inset-0 pointer-events-none' : 'opacity-100'}`}>
                        <button onClick={() => handleChoice('finite')} className="h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all bg-[#58cc02] text-white border-[#46a302] border-b-[6px] active:translate-y-[2px] active:border-b-[4px] hover:bg-[#46a302] shadow-[0_4px_10px_rgba(88,204,2,0.15)] flex flex-col items-center justify-center">
                            <span className="leading-none">FINITE</span>
                            <span className="text-[8px] opacity-80 block lowercase font-semibold mt-0.5">Limited</span>
                        </button>
                        <button onClick={() => handleChoice('infinite')} className="h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all bg-rose-500 text-white border-rose-700 border-b-[6px] active:translate-y-[2px] active:border-b-[4px] hover:bg-rose-600 shadow-[0_4px_10px_rgba(244,63,94,0.15)] flex flex-col items-center justify-center">
                            <span className="leading-none">INFINITE</span>
                            <span className="text-[8px] opacity-80 block lowercase font-semibold mt-0.5">Endless</span>
                        </button>
                    </div>

                    <button 
                        onClick={handleNext}
                        className={`w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-3 bg-[#58cc02] text-white border-[#46a302] border-b-[6px] active:translate-y-[2px] active:border-b-[4px] hover:bg-[#46a302] ${isResolved ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}
                    >
                        {stepIdx === totalQuestions - 1 ? 'Finish Activity' : 'Next Question'} <ArrowRight size={18} strokeWidth={4} />
                    </button>
                </div>
            </div>

            <style>{`
                .animate-spin-slow { animation: spin 12s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .ease-spring { transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
                .shadow-up { box-shadow: 0 -15px 40px rgba(0,0,0,0.04); }
                .shadow-glow-indigo { box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4); }
            `}</style>
        </div>
    );
};

export default SetClassifierRenderer;
