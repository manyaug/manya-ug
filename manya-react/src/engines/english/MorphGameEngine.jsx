import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lightbulb, Trophy, MoveHorizontal, Sparkles, ArrowRight, Zap, RefreshCcw } from 'lucide-react';

/**
 * MANYA ENGLISH: MORPH GAME ENGINE 2.0 (Pro Edition)
 * --------------------------------------------------
 * - Cinematic morphological transformations.
 * - Stardust word transitions with staggered animations.
 * - Premium glassmorphic "Morph Portal" controller.
 * - Dynamic stage glow and interactive state feedback.
 */

const MorphGameEngine = ({ data, onComplete }) => {
    const [isTransformed, setIsTransformed] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [score, setScore] = useState(0);
    const [hasMorphed, setHasMorphed] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const themeColor = data?.themeColor || '#6366f1';
    const directWords = useMemo(() => data?.direct || [], [data]);
    const indirectWords = useMemo(() => data?.indirect || [], [data]);
    
    const currentWords = isTransformed ? indirectWords : directWords;
    const hint = isTransformed ? data?.indirectHint : data?.directHint;

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleToggle = (val) => {
        const next = val === '1';
        if (next !== isTransformed) {
            setIsAnimating(true);
            setTimeout(() => {
                setIsTransformed(next);
                setIsAnimating(false);
                if (!hasMorphed) {
                    setHasMorphed(true);
                    setScore(150);
                    window.ManyaAudio?.success?.();
                }
            }, 400);
        }
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-700 relative ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-900 text-white'}`}>
            
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: themeColor }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: '#fbbf24' }} />
            </div>

            {/* Header */}
            <div className="flex-none p-8 pt-12 z-20 text-center">
                <div className="max-w-md mx-auto">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-3">{data?.variantTitle || "Morphology"}</h2>
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-top-4 duration-700">
                        <Zap size={14} className="text-amber-400 fill-amber-400 animate-pulse" />
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-300">Pro Morphing Engine</span>
                    </div>
                </div>
            </div>

            {/* Stage Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
                <div 
                    className={`relative w-full max-w-3xl p-12 sm:p-20 rounded-[60px] border transition-all duration-700 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/10 shadow-3xl'}`}
                    style={{ 
                        boxShadow: isTransformed ? `0 0 100px ${themeColor}33` : '0 0 60px rgba(255,255,255,0.05)',
                        borderColor: isTransformed ? `${themeColor}44` : 'rgba(255,255,255,0.1)',
                        transform: isAnimating ? 'scale(0.98) rotateX(2deg)' : 'scale(1) rotateX(0deg)'
                    }}
                >
                    <div className={`flex flex-wrap justify-center gap-x-4 gap-y-6 transition-opacity duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                        {currentWords.map((w, i) => (
                            <div 
                                key={`${isTransformed ? 'ind' : 'dir'}-${w.id}-${i}`}
                                className="relative group"
                                style={{ animationDelay: `${i * 40}ms` }}
                            >
                                <span className={`text-3xl sm:text-5xl font-black transition-all duration-700 block animate-in fade-in slide-in-from-bottom-4 ${isTransformed && w.changed ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]' : 'text-white'}`}>
                                    {w.text}
                                </span>
                                {isTransformed && w.changed && (
                                    <div className="absolute -top-4 -right-4">
                                        <Sparkles size={16} className="text-amber-300 animate-bounce" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Stage Decorative Elements */}
                    <div className="absolute top-6 left-10 flex gap-1.5 opacity-20">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                </div>

                {/* Score Indicator */}
                {score > 0 && (
                    <div className="mt-8 px-6 py-2 rounded-2xl bg-indigo-500 text-white font-black text-xs tracking-widest shadow-xl shadow-indigo-500/40 animate-in zoom-in-50 duration-500">
                        MORPH SCORE: {score}
                    </div>
                )}
            </div>

            {/* Portal Controller (Bottom Panel) */}
            <div className={`flex-none p-10 pb-12 rounded-t-[60px] border-t transition-all duration-700 relative z-20 ${isDark ? 'bg-[#151921] border-white/5 shadow-[0_-30px_100px_rgba(0,0,0,0.6)]' : 'bg-[#1E2530] border-white/10 shadow-[0_-30px_80px_rgba(0,0,0,0.4)]'}`}>
                <div className="max-w-md mx-auto relative">
                    
                    {/* Controller Labels */}
                    <div className="flex justify-between items-end mb-8 px-4">
                        <div className={`flex flex-col transition-all duration-500 ${!isTransformed ? 'scale-110 opacity-100' : 'scale-90 opacity-40'}`}>
                            <span className="text-[8px] font-black text-indigo-400 tracking-[0.3em] uppercase mb-1">Status</span>
                            <span className="text-xs font-black text-white uppercase tracking-widest">Direct</span>
                        </div>
                        <div className={`flex flex-col items-end transition-all duration-500 ${isTransformed ? 'scale-110 opacity-100' : 'scale-90 opacity-40'}`}>
                            <span className="text-[8px] font-black text-amber-400 tracking-[0.3em] uppercase mb-1">Output</span>
                            <span className="text-xs font-black text-white uppercase tracking-widest">Reported</span>
                        </div>
                    </div>

                    {/* The Morph Portal Slider */}
                    <div className="relative h-20 flex items-center mb-10 group">
                        {/* Track Background */}
                        <div className="absolute inset-x-0 h-4 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                            <div 
                                className="h-full transition-all duration-700 ease-out"
                                style={{ 
                                    width: isTransformed ? '100%' : '0%',
                                    background: `linear-gradient(90deg, ${themeColor}, #fbbf24)`
                                }}
                            />
                        </div>

                        {/* Slide Input (Transparent Overlay) */}
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="1"
                            value={isTransformed ? 1 : 0}
                            onChange={(e) => handleToggle(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                        />

                        {/* Interactive Handle */}
                        <div 
                            className="absolute w-16 h-16 rounded-[24px] shadow-3xl transition-all duration-700 ease-spring z-20 flex items-center justify-center text-slate-900 border-[6px]"
                            style={{ 
                                left: isTransformed ? 'calc(100% - 64px)' : '0%',
                                backgroundColor: isTransformed ? '#fbbf24' : '#fff',
                                borderColor: isDark ? '#151921' : '#1E2530',
                                boxShadow: isTransformed ? '0 0 50px rgba(251,191,36,0.5)' : '0 0 40px rgba(255,255,255,0.2)',
                                transform: isAnimating ? 'scale(1.2) rotate(180deg)' : 'scale(1) rotate(0deg)'
                            }}
                        >
                            {isAnimating ? <RefreshCcw size={24} className="animate-spin text-slate-900" /> : <MoveHorizontal size={24} strokeWidth={3} />}
                        </div>
                        
                        {/* Magnetic Endpoints */}
                        <div className="absolute inset-x-2 flex justify-between pointer-events-none opacity-20">
                            <div className="w-1.5 h-10 bg-white rounded-full" />
                            <div className="w-1.5 h-10 bg-white rounded-full" />
                        </div>
                    </div>

                    {/* Hint Bubble */}
                    <div className={`p-6 rounded-[32px] border transition-all duration-500 min-h-[80px] flex items-center justify-center ${isDark ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex gap-4 items-center">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isTransformed ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                <Lightbulb size={20} />
                            </div>
                            <p className="text-xs sm:text-sm font-black italic text-slate-300 tracking-tight leading-relaxed">
                                {hint || "Slide the portal to transform the speech."}
                            </p>
                        </div>
                    </div>

                    {/* Success Button */}
                    <div className={`overflow-hidden transition-all duration-700 ${hasMorphed && !isAnimating ? 'max-h-32 opacity-100 mt-10' : 'max-h-0 opacity-0'}`}>
                        <button 
                            onClick={onComplete}
                            className="w-full h-18 bg-indigo-600 text-white rounded-3xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-indigo-500/40"
                        >
                            Continue Discovery <ArrowRight size={20} strokeWidth={4} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .ease-spring { transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 0.6s linear infinite; }
            `}</style>
        </div>
    );
};

MorphGameEngine.hideGlobalFooter = true;
export default MorphGameEngine;
