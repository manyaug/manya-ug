import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, X, ArrowRight, Lightbulb, Compass, 
    Zap, Trophy, RotateCcw, AlertCircle, Sparkles,
    Search, Puzzle
} from 'lucide-react';
import QuestHUD from '../../components/QuestHUD';
import { triggerRewardFlight } from '../../utils/fxUtils';
import { audioService } from '../../infrastructure/audio/audioService';

/**
 * SCIENCE FETCHER RENDERER
 * Pure visual component for the Science Fetcher engine.
 */
const ScienceRenderer = ({
    isLoading,
    loadingConfig,
    randomFact,
    renderError,
    questions,
    currentIdx,
    selectedOption,
    isAnswered,
    showExplanation,
    gemsEarned,
    showGemToast,
    hintUsed,
    setHintUsed,
    handleSelect,
    handleSubmit,
    nextQuestion,
    handleFinish,
    nodeType,
    correctText,
    frustration,
    SimulatorBridgeNode,
    questMeta,
    userWasCorrect,
    session
}) => {
    const correctBtnRef = useRef(null);
    const correctCount = session?.correctCount || 0;
    const streakCount = session?.streak || 0;
    const masteryScore = session?.mastery || 0;

    // Trigger flying coins and mascot reactions when user is answered
    useEffect(() => {
        if (isAnswered) {
            if (userWasCorrect) {
                // Global event for feedback layer
                window.dispatchEvent(new CustomEvent('manya-correct', { detail: { subject: 'science' } }));
                audioService.correct();



                // Flying Coins
                if (correctBtnRef.current) {
                    setTimeout(() => {
                        triggerRewardFlight(correctBtnRef.current, 'coin', 5);
                    }, 300);
                }
            } else {
                // Global event for feedback layer
                window.dispatchEvent(new CustomEvent('manya-wrong', { detail: { subject: 'science' } }));
                audioService.error();

            }
        }
    }, [isAnswered, userWasCorrect]);
    
    // --- 📥 LOADING SCREEN ---
    if (isLoading) {
        const cfg = loadingConfig;
        return (
            <div className="quest-loading-overlay" style={{ '--loader-color': cfg.color, '--loader-dark': cfg.colorDark, '--loader-bg': cfg.bgLight }}>
                <div className="loader-blob loader-blob-1" style={{ background: cfg.color }} />
                <div className="loader-blob loader-blob-2" style={{ background: cfg.color }} />
                <div className="loader-content-card">
                    <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                        <img src={cfg.mascot} alt="Kiki" className="loader-mascot-img" />
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

    // --- ❌ ERROR SCREEN ---
    if (renderError) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-500/10">
                    <X size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Engine Glitch</h3>
                <p className="text-sm text-slate-500 font-bold mb-8 max-w-xs mx-auto">Something went wrong. Let's try to reload.</p>
                <div className="w-full max-w-md bg-slate-900 text-rose-400 p-6 rounded-2xl text-left font-mono text-[10px] overflow-auto max-h-60 mb-8 border border-white/10">
                    <strong>Error:</strong> {renderError.message}
                </div>
                <button onClick={() => window.location.reload()} className="px-8 h-14 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase flex items-center gap-2 shadow-xl shadow-slate-900/10">
                    RELOAD ENGINE <RotateCcw size={18} />
                </button>
            </div>
        );
    }

    // --- 🔍 EMPTY STATE ---
    if (questions.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4"><Search size={32} /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">No Science Data</h3>
                <button onClick={handleFinish} className="px-6 h-12 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2">
                    BACK TO MAP <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    const q = questions[currentIdx];
    if (!q) return null;

    // --- 🎮 SIMULATION ROUTING ---
    if (SimulatorBridgeNode) {
        return (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
                {SimulatorBridgeNode}
            </div>
        );
    }

    // --- 📝 MCQ UI ---
    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative" style={{ maxHeight: '100%' }}>
            
            <AnimatePresence>
                {showGemToast && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-4 right-4 bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-black z-20 flex items-center gap-1 pointer-events-none shadow-lg"
                    >
                        <Trophy size={12} /> +{gemsEarned} gems
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto px-4 pt-4 no-scrollbar pb-6">
                <div className="bg-[var(--bg-card)] rounded-[2rem] border-[4.5px] border-indigo-400 px-6 py-6 mb-4 shadow-xl flex-shrink-0 relative">
                    <div className="toy-card-gloss" />
                    
                    <div className="relative">
                        <p className="text-[var(--text-main)] font-black text-[17px] leading-tight m-0 pr-12">
                            {q.question}
                        </p>

                        {!isAnswered && q.hint && (
                            <div className="absolute top-0 -right-2">
                                <button 
                                    onClick={() => setHintUsed(!hintUsed)} 
                                    className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center relative z-10 ${hintUsed ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                    aria-label="Toggle Hint"
                                >
                                    <Lightbulb size={20} strokeWidth={2.5} />
                                </button>
                                {hintUsed && (
                                    <div className="mcq-hint-bubble-v2 translate-y-2">
                                        <div className="toy-card-gloss" />
                                        <div className="mcq-hint-header"><Sparkles size={14} className="text-amber-500" /><span className="mcq-hint-badge">Research Hint</span></div>
                                        <p className="mcq-hint-text">{q.hint}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2.5">
                    {q.options?.map((opt, i) => {
                        const isThisCorrect = correctText === opt || (q.options.indexOf(opt) === (q.answer?.charCodeAt(0) - 65)); 
                        const isSelected = opt === selectedOption;
                        let cls = 'mcq-fe-btn';
                        if (isAnswered) {
                            if (isSelected && userWasCorrect) cls += ' mcq-fe-correct';
                            else if (isSelected) cls += ' mcq-fe-wrong';
                            else if (isThisCorrect && isAnswered) cls += ' mcq-fe-correct opacity-50'; 
                            else cls += ' mcq-fe-faded';
                        } else if (isSelected) cls += ' mcq-fe-selected';

                        return (
                            <motion.button 
                                key={i} 
                                className={cls} 
                                onClick={() => {
                                    handleSelect(opt);
                                    audioService.playSFX('tap');
                                }} 
                                disabled={isAnswered}
                                ref={isThisCorrect ? correctBtnRef : null}
                                whileTap={!isAnswered ? { scale: 0.98, translateY: 2 } : {}}
                            >
                                <div className="toy-card-gloss" />
                                <span className="mcq-fe-letter">{String.fromCharCode(65 + i)}</span>
                                <span className="mcq-fe-text">{opt}</span>
                                {isAnswered && isSelected && userWasCorrect && <Check size={16} className="mcq-fe-icon correct-icon" strokeWidth={3} />}
                                {isAnswered && isSelected && !userWasCorrect && <X size={16} className="mcq-fe-icon wrong-icon" strokeWidth={3} />}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-none px-4 pt-4 pb-10 w-full bg-[var(--bg-main)]">
                {!isAnswered ? (
                    <button
                        onClick={handleSubmit} disabled={selectedOption === null}
                        className={`w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                            selectedOption !== null ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:translate-y-1' : 'bg-[#e5e5e5] text-[#a0a0a0] border-b-[4px] border-[#d4d4d4]'
                        }`}
                    >
                        <span className="relative z-10 flex items-center gap-2">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                    </button>
                ) : (
                    <div className={`w-full h-14 rounded-full border-2 flex items-center justify-center gap-2 font-black text-[11px] tracking-widest uppercase animate-in slide-in-from-bottom-2 ${userWasCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                        {userWasCorrect ? <>GREAT OBSERVATION! <Check size={16} /></> : <>RECALIBRATING... <AlertCircle size={16} /></>}
                    </div>
                )}
            </div>

            {/* ── WRONG SOLUTION PORTAL ── */}
            {isAnswered && !userWasCorrect && showExplanation && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-[24px] p-8 shadow-xl border border-[var(--border-color)] animate-in zoom-in-95 duration-300">
                        <div className="bg-rose-50 text-rose-600 w-14 h-14 rounded-xl flex items-center justify-center mb-5 mx-auto">
                            <Lightbulb size={28} />
                        </div>
                        <h4 className="text-[var(--text-main)] font-black mb-1.5 text-center text-lg">Let's Research Why</h4>
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl font-black mb-6 border border-emerald-100 text-center text-base italic">
                            "{correctText}"
                        </div>
                        <div className="max-h-[25vh] overflow-y-auto no-scrollbar mb-6">
                            <p className="text-[var(--text-sub)] text-sm font-bold text-center leading-relaxed">
                                {q.explanation || "Scientific discovery often takes a few tries! Keep observing the patterns."}
                            </p>
                        </div>
                        <button onClick={nextQuestion} className="w-full h-14 bg-indigo-600 text-white rounded-xl font-black text-[10px] tracking-[0.2em] uppercase active:scale-95 transition-all">
                            CONTINUE RESEARCH
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ScienceRenderer;
