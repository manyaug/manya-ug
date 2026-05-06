import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, X, Zap, Trophy, Compass, Lightbulb, Sparkles, AlertCircle, ArrowRight, RotateCcw
} from 'lucide-react';
import QuestHUD from '../../components/QuestHUD';
import { triggerRewardFlight } from '../../utils/fxUtils';
import { audioService } from '../../infrastructure/audio/audioService';

/**
 * ENGLISH RENDERER v3.1 (SST Elite Style + Fixed Hint)
 * --------------------------------------------------
 * - STICKY FOOTER: Submit button stays at bottom.
 * - SCROLLABLE HEART: Question + Options scroll if too long.
 * - INSIGHT BANNER: Fixed hint overlap and readability.
 */
const EnglishRenderer = ({
    isLoading,
    loadingConfig,
    randomFact,
    currentQ,
    currentIdx,
    totalQuestions,
    nodeType,
    selectedOption,
    isAnswered,
    hintUsed,
    setHintUsed,
    setSelectedOption,
    handleSubmit,
    correctText,
    userWasCorrect,
    frustration,
    questMeta,
    showExplanation,
    gemsEarned,
    showGemToast,
    onContinue,
    session,
    BridgeNode,
    currentMode
}) => {
    const [timeLeft, setTimeLeft] = React.useState(null);
    const [maxTime, setMaxTime] = React.useState(18);
    const correctBtnRef = useRef(null);
    const correctCount = session?.correctCount || 0;
    const streakCount = session?.streak || 0;
    const masteryScore = session?.mastery || 0;


    // --- ⚡ SPEEDRUN TIMER LISTENER ---
    useEffect(() => {
        const onStart = (e) => {
            const duration = e.detail?.duration || 18;
            setMaxTime(duration);
            setTimeLeft(duration);
        };
        const onStop = () => setTimeLeft(null);
        
        window.addEventListener('manya-fx-speedrun-start', onStart);
        window.addEventListener('manya-fx-speedrun-stop', onStop);
        window.addEventListener('manya-engine-timeout', onStop);

        return () => {
            window.removeEventListener('manya-fx-speedrun-start', onStart);
            window.removeEventListener('manya-fx-speedrun-stop', onStop);
            window.removeEventListener('manya-engine-timeout', onStop);
        };
    }, []);

    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && !isAnswered) {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, isAnswered]);

    // Trigger flying coins and mascot reactions when user is answered
    useEffect(() => {
        if (isAnswered) {
            if (userWasCorrect) {
                // Global event for feedback layer
                window.dispatchEvent(new CustomEvent('manya-correct', { detail: { subject: 'english' } }));

                // Flying Coins
                if (correctBtnRef.current) {
                    setTimeout(() => {
                        triggerRewardFlight(correctBtnRef.current, 'coin', 5);
                    }, 300);
                }
            } else {
                // Global event for feedback layer
                window.dispatchEvent(new CustomEvent('manya-wrong', { detail: { subject: 'english' } }));
            }
        }
    }, [isAnswered, userWasCorrect]);

    // --- 📥 LOADING SCREEN ---
    if (isLoading) {
        const cfg = loadingConfig || {};
        return (
            <div className="quest-loading-overlay" style={{ '--loader-color': cfg.color, '--loader-dark': cfg.colorDark, '--loader-bg': cfg.bgLight }}>
                <div className="loader-blob loader-blob-1" style={{ background: cfg.color }} />
                <div className="loader-blob loader-blob-2" style={{ background: cfg.color }} />
                <div className="loader-content-card">
                    <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                        <img src={cfg.mascot} alt={cfg.name} className="loader-mascot-img" />
                    </div>
                    <h3 className="loader-title">{cfg.title}</h3>
                    <div className="loader-bounce-dots">
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '0ms' }} />
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '200ms' }} />
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '400ms' }} />
                    </div>
                    <div className="loader-fact-card" style={{ borderColor: `${cfg.color}30` }}>
                        <span className="loader-fact-label" style={{ color: cfg.color }}>Did you know?</span>
                        <p className="loader-fact-text">{randomFact}</p>
                    </div>
                    <p className="loader-status-text">{cfg.sub}</p>
                </div>
            </div>
        );
    }
    
    // --- 🎮 SIMULATION ROUTING ---
    if (BridgeNode) {
        return (
            <div className="flex-1 !w-full !h-full flex flex-col overflow-hidden relative !p-0 !m-0 min-h-0">
                {BridgeNode}
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 relative">
            {/* Scrollable primary area */}

            {/* --- SCROLLABLE CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">

                {currentQ?.isRephrased && (
                    <div className="text-[10px] uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 font-black mb-4 text-center">
                        🔄 Concept Replay: Different Wording
                    </div>
                )}
                
                {frustration?.level === 'high' && (
                    <div className="text-[10px] uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2 font-black mb-4 text-center">
                        💡 Tutor Tip: Watch the structure!
                    </div>
                )}

                {/* QUESTION CARD (Glowing & Glossy) */}
                <div className="bg-[var(--bg-card)] rounded-[2.5rem] border-[4px] border-indigo-500/40 neon-glow-violet px-7 py-8 mb-6 shadow-2xl relative transition-all duration-500">
                    <div className="toy-card-gloss" />
                    
                    <div className="flex items-center justify-between mb-5 relative z-10">
                        <div className="flex items-center gap-2">
                            {timeLeft !== null && (
                                <div className="flex items-center gap-2 bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse shadow-lg shadow-rose-500/30">
                                    <Zap size={12} fill="currentColor" />
                                    <span>{timeLeft}s</span>
                                </div>
                            )}
                            {currentMode === 'reverse' && (
                                <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-indigo-500/30">
                                    <RotateCcw size={12} />
                                    <span>REVERSE MODE</span>
                                </div>
                            )}
                        </div>

                        {!isAnswered && currentQ?.hint && (
                            <div className="relative">
                                <button 
                                    onClick={() => setHintUsed(!hintUsed)} 
                                    className={`p-2.5 rounded-2xl transition-all relative z-20 ${hintUsed ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <Lightbulb size={20} className={hintUsed ? "animate-pulse" : ""} />
                                </button>
                                
                                <AnimatePresence>
                                    {hintUsed && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                            className="mcq-hint-bubble"
                                            style={{ 
                                                right: '-5px', 
                                                top: '55px', 
                                                width: '240px',
                                                background: '#ffffff',
                                                backdropFilter: 'none',
                                                WebkitBackdropFilter: 'none',
                                                opacity: 1,
                                                border: '3px solid #f59e0b',
                                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            <div className="toy-card-gloss" />
                                            <div className="mcq-hint-header">
                                                <Sparkles size={14} className="text-amber-500" />
                                                <span className="mcq-hint-badge" style={{ color: '#f59e0b' }}>Tutor Hint</span>
                                            </div>
                                            <p className="mcq-hint-text" style={{ color: '#1e293b', opacity: 1 }}>
                                                "{currentQ.hint}"
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    <p className="text-[var(--text-main)] font-bold text-xl leading-snug relative z-10">
                        {currentQ?.question || currentQ?.question_text}
                    </p>
                </div>

                {/* OPTIONS (SST-Style Premium Buttons) */}
                <div className="flex flex-col gap-3">
                    {currentQ?.options?.map((opt, i) => {
                        const isSelected = opt === selectedOption;
                        let cls = "mcq-fe-btn transition-all duration-300";
                        if (isAnswered) {
                            if (opt === correctText) cls += " mcq-fe-correct";
                            else if (isSelected) cls += " mcq-fe-wrong";
                            else cls += " mcq-fe-faded";
                        } else if (isSelected) {
                            cls += " mcq-fe-selected";
                        }

                        return (
                            <motion.button
                                key={i}
                                disabled={isAnswered}
                                onClick={() => {
                                    setSelectedOption(opt);
                                    audioService.playSFX('tap');
                                }}
                                className={cls}
                                ref={opt === correctText ? correctBtnRef : null}
                                whileTap={!isAnswered ? { scale: 0.98, translateY: 2 } : {}}
                                style={{
                                    borderColor: isSelected && !isAnswered ? 'rgba(129, 140, 248, 0.8)' : undefined,
                                    background: isSelected && !isAnswered ? 'rgba(129, 140, 248, 0.1)' : undefined
                                }}
                            >
                                <div className="toy-card-gloss" />
                                <span className={`mcq-fe-letter ${isSelected && !isAnswered ? 'bg-indigo-500 text-white' : ''}`}>
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="mcq-fe-text">{opt}</span>
                                {isAnswered && opt === correctText && <Check size={18} className="mcq-fe-icon correct-icon" strokeWidth={4} />}
                                {isAnswered && isSelected && opt !== correctText && <X size={18} className="mcq-fe-icon wrong-icon" strokeWidth={4} />}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* --- STICKY FOOTER --- */}
            <div className="flex-none p-4 pb-8 w-full bg-[#0c111d]/80 backdrop-blur-lg border-t border-white/5 relative z-50">
                {!isAnswered ? (
                    <button
                        ref={correctBtnRef} // Attach ref for coin burst origin
                        onClick={handleSubmit}
                        disabled={!selectedOption}
                        className={`w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                            selectedOption 
                            ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:translate-y-1' 
                            : 'bg-[#e5e5e5] text-[#a0a0a0] border-b-[4px] border-[#d4d4d4]'
                        }`}
                    >
                        {selectedOption && <div className="btn-toy-gloss" />}
                        <span className="relative z-10 flex items-center gap-2">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                    </button>
                ) : (
                    <div ref={correctBtnRef} className={`w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 font-black text-[10px] tracking-widest uppercase border-2 transition-all duration-500 ${userWasCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                        {userWasCorrect ? <>Magnificent! Keep going! <Check size={18} /></> : <>Analyzing solution... <AlertCircle size={18} /></>}
                    </div>
                )}
            </div>

            {/* --- SOLUTION PORTAL (Portals to Body) --- */}
            {showExplanation && !userWasCorrect && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-[#151921] rounded-[3rem] p-8 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                        <div className="toy-card-gloss" />
                        
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                                <X size={28} strokeWidth={3} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Not quite!</h3>
                                <p className="text-xs font-bold text-slate-400">Let's see what happened...</p>
                            </div>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 mb-6">
                            <Check size={20} className="text-emerald-500" strokeWidth={3} />
                            <div className="text-sm font-bold text-emerald-400">
                                Correct Answer: <span className="text-white ml-1">{correctText}</span>
                            </div>
                        </div>

                        <div className="max-h-[30vh] overflow-y-auto pr-2 mb-8 scrollbar-hide">
                            <p className="text-slate-300 font-bold leading-relaxed text-base italic">
                                "{currentQ.explanation || 'Look closely at the grammar rule applied here. Practice makes perfect!'}"
                            </p>
                        </div>

                        <button 
                            onClick={onContinue}
                            className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-[0_8px_0_#b45309] active:translate-y-1 active:shadow-none transition-all"
                        >
                            <div className="btn-toy-gloss" />
                            Keep Exploring <ArrowRight size={20} />
                        </button>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .mcq-fe-letter.bg-indigo-500 { background-color: #6366f1 !important; border-color: #6366f1 !important; }
            `}</style>
        </div>
    );
};

export default EnglishRenderer;
