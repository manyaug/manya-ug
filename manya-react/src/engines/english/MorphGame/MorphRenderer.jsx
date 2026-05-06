import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Sparkles, MoveHorizontal, RefreshCcw, Lightbulb, ArrowRight } from 'lucide-react';

/**
 * MORPH GAME RENDERER
 * Stateless UI component for the cinematic speech transformation stage.
 */

const MorphRenderer = ({ 
    isDark, 
    isTransformed, 
    isAnimating, 
    score, 
    hasMorphed, 
    themeColor, 
    currentWords, 
    hint, 
    variantTitle, 
    handleToggle, 
    onComplete,
    selectionMode,
    userSelectedIds,
    handleWordClick,
    showCorrection
}) => {
    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-700 relative ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-900 text-white'}`}>
            
            {/* Ambient Lighting */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: themeColor }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: '#fbbf24' }} />
            </div>

            {/* Header HUD */}
            <div className="flex-none p-8 pt-12 z-20 text-center">
                <div className="max-w-md mx-auto">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-3">{variantTitle}</h2>
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl transition-all duration-500" style={{ borderColor: selectionMode ? '#6366f1' : '#10b981' }}>
                        <Zap size={14} className={`${selectionMode ? 'text-indigo-400' : 'text-emerald-400'} fill-current animate-pulse`} />
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-300">
                            {selectionMode ? 'Challenge: Spot the Morph' : 'Discovery: Morph Portal Active'}
                        </span>
                    </div>
                </div>
            </div>

            {/* The Morph Stage */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                <motion.div 
                    className={`relative w-full max-w-3xl p-12 sm:p-20 rounded-[60px] border transition-all duration-700 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/10 shadow-3xl'}`}
                    animate={{ 
                        scale: isAnimating ? 0.98 : 1,
                        rotateX: isAnimating ? 2 : 0,
                        boxShadow: isTransformed ? `0 0 100px ${themeColor}33` : '0 0 60px rgba(255,255,255,0.05)',
                        borderColor: isTransformed ? `${themeColor}44` : 'rgba(255,255,255,0.1)'
                    }}
                >
                    <div className={`flex flex-wrap justify-center gap-x-4 gap-y-6 transition-opacity duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                        {currentWords.map((w, i) => {
                            const isSelected = userSelectedIds?.has(w.id);
                            return (
                                <div 
                                    key={`${isTransformed ? 'ind' : 'dir'}-${w.id}-${i}`} 
                                    className={`relative group cursor-pointer transition-all duration-300 ${selectionMode && isSelected ? 'scale-110' : ''}`}
                                    onClick={() => handleWordClick?.(w.id)}
                                >
                                    <span className={`text-3xl sm:text-5xl font-black transition-all duration-700 block animate-in fade-in slide-in-from-bottom-4 
                                        ${isTransformed && w.changed ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]' : 'text-white'}
                                        ${selectionMode && isSelected ? '!text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]' : ''}
                                        ${showCorrection && w.changed ? '!text-rose-400 animate-bounce' : ''}
                                    `}>
                                        {w.text}
                                    </span>
                                    {isTransformed && w.changed && (
                                        <div className="absolute -top-4 -right-4">
                                            <Sparkles size={16} className="text-amber-300 animate-bounce" />
                                        </div>
                                    )}
                                    {selectionMode && isSelected && (
                                        <motion.div layoutId="selection-glow" className="absolute -inset-2 bg-indigo-500/10 rounded-xl border border-indigo-500/30 -z-10" />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="absolute top-6 left-10 flex gap-1.5 opacity-20">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                </motion.div>

                {score > 0 && (
                    <div className="mt-8 px-6 py-2 rounded-2xl bg-indigo-500 text-white font-black text-xs tracking-widest shadow-xl animate-in zoom-in-50">
                        MORPH SCORE: {score}
                    </div>
                )}
            </div>

            {/* Control Panel */}
            <div className={`flex-none p-10 pb-12 rounded-t-[60px] border-t transition-all duration-700 relative z-20 ${isDark ? 'bg-[#151921] border-white/5 shadow-[0_-30px_100px_rgba(0,0,0,0.6)]' : 'bg-[#1E2530] border-white/10 shadow-[0_-30px_80px_rgba(0,0,0,0.4)]'}`}>
                <div className="max-w-md mx-auto relative">
                    <div className="flex justify-between items-end mb-8 px-4">
                        <div className={`flex flex-col transition-all duration-500 ${!isTransformed ? 'scale-110 opacity-100' : 'scale-90 opacity-40'}`}>
                            <span className="text-[8px] font-black text-indigo-400 tracking-widest uppercase mb-1">Status</span>
                            <span className="text-xs font-black text-white uppercase tracking-widest">Direct</span>
                        </div>
                        <div className={`flex flex-col items-end transition-all duration-500 ${isTransformed ? 'scale-110 opacity-100' : 'scale-90 opacity-40'}`}>
                            <span className="text-[8px] font-black text-amber-400 tracking-widest uppercase mb-1">Output</span>
                            <span className="text-xs font-black text-white uppercase tracking-widest">Reported</span>
                        </div>
                    </div>

                    <div className="relative h-20 flex items-center mb-10 group">
                        <div className="absolute inset-x-0 h-4 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                            <div className="h-full transition-all duration-700 ease-out" style={{ width: isTransformed ? '100%' : '0%', background: `linear-gradient(90deg, ${themeColor}, #fbbf24)` }} />
                        </div>
                        <input 
                            type="range" min="0" max="1" step="1" value={isTransformed ? 1 : 0}
                            onChange={(e) => handleToggle(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                        />
                        <div 
                            className="absolute w-16 h-16 rounded-[24px] shadow-3xl transition-all duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] z-20 flex items-center justify-center text-slate-900 border-[6px]"
                            style={{ 
                                left: isTransformed ? 'calc(100% - 64px)' : '0%',
                                backgroundColor: isTransformed ? '#fbbf24' : selectionMode ? '#818cf8' : '#fff',
                                borderColor: isDark ? '#151921' : '#1E2530',
                                boxShadow: isTransformed ? '0 0 50px rgba(251,191,36,0.5)' : selectionMode ? '0 0 30px rgba(129,140,248,0.4)' : '0 0 40px rgba(255,255,255,0.2)',
                                transform: isAnimating ? 'scale(1.2) rotate(180deg)' : 'scale(1) rotate(0deg)'
                            }}
                        >
                            {isAnimating ? <RefreshCcw size={24} className="animate-spin" /> : selectionMode ? <Zap size={24} className="text-white" fill="currentColor" /> : <MoveHorizontal size={24} strokeWidth={3} />}
                        </div>
                    </div>

                    <div className={`p-6 rounded-[32px] border transition-all duration-500 min-h-[80px] flex items-center justify-center ${isDark ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white/5 border-white/10'} ${showCorrection ? 'border-rose-500/50 bg-rose-500/5' : ''}`}>
                        <div className="flex gap-4 items-center">
                            <Lightbulb size={20} className={showCorrection ? 'text-rose-500' : isTransformed ? 'text-amber-500' : 'text-indigo-400'} />
                            <p className={`text-xs font-black italic transition-colors ${showCorrection ? 'text-rose-400' : 'text-slate-300'}`}>
                                {showCorrection ? "Almost! Look at the words bouncing." : selectionMode ? "Click the words that will change during the morph." : (hint || "Slide the portal to transform the speech.")}
                            </p>
                        </div>
                    </div>

                    <div className={`overflow-hidden transition-all duration-700 ${hasMorphed && !isAnimating ? 'max-h-32 opacity-100 mt-10' : 'max-h-0 opacity-0'}`}>
                        <button onClick={onComplete} className="w-full h-18 bg-indigo-600 text-white rounded-3xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-2xl">
                            Continue Discovery <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 0.6s linear infinite; }
            `}</style>
        </div>
    );
};

export default MorphRenderer;
