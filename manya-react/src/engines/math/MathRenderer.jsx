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

import MathSolutionSteps from '../../components/MathSolutionSteps';

/**
 * SOLUTION DISPLAYER
 * Specialized component to parse and render step-by-step Math solutions.
 */
const SolutionDisplayer = ({ explanation }) => {
    if (!explanation) return <p className="text-[var(--text-sub)] text-[13px] italic text-center">Detailed concept explanation coming soon.</p>;

    // Handle the new array-of-steps format
    if (Array.isArray(explanation)) {
        return <MathSolutionSteps steps={explanation} />;
    }

    const sol = explanation;

    if (sol && (sol.logic || sol.calculation || sol.answer)) {
        return (
            <div className="flex flex-col gap-4">
                {sol.logic && (
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 mt-1">
                            <Lightbulb size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Logic</p>
                            <p className="text-[var(--text-main)] text-[14px] font-bold leading-relaxed">{sol.logic}</p>
                        </div>
                    </div>
                )}
                {sol.calculation && (
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0 mt-1">
                            <Zap size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Working</p>
                            <div className="text-[var(--text-main)] text-[14px] font-medium leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-[var(--border-color)]">
                                {sol.calculation}
                            </div>
                        </div>
                    </div>
                )}
                {sol.answer && (
                    <div className="flex gap-3 items-center bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                            <Check size={14} strokeWidth={4} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Final Answer:</p>
                            <p className="text-[var(--text-main)] font-black text-[16px]">{sol.answer}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <p className="text-[var(--text-main)] font-bold text-[14px] leading-relaxed text-center">{String(explanation)}</p>;
};

/**
 * MATH FETCHER RENDERER
 * Pure visual component for the Math Fetcher engine.
 */
const MathRenderer = ({
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
    onSkip,
    nextQuestion,
    handleFinish,
    nodeType,
    correctText,
    frustration,
    SimulatorBridgeNode,
    userWasCorrect,
    isLast,
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
                window.dispatchEvent(new CustomEvent('manya-correct', { detail: { subject: 'math' } }));
                audioService.correct();

                // Flying Coins
                if (correctBtnRef.current) {
                    setTimeout(() => {
                        triggerRewardFlight(correctBtnRef.current, 'coin', 5);
                    }, 300);
                }
            } else {
                // Global event for feedback layer
                window.dispatchEvent(new CustomEvent('manya-wrong', { detail: { subject: 'math' } }));
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
                        <img src={cfg.mascot} alt="Manya" className="loader-mascot-img" />
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
                <h3 className="text-2xl font-black text-slate-900 mb-2">Math Glitch</h3>
                <p className="text-sm text-slate-500 font-bold mb-8 max-w-xs mx-auto">Something went wrong while calculating the adaptive curriculum.</p>
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
                <h3 className="text-xl font-black text-slate-800 mb-2">No Challenges Found</h3>
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
            <div className="flex-1 h-full flex flex-col overflow-hidden relative">
                {SimulatorBridgeNode}
            </div>
        );
    }

    // --- 🛡️ DEFENSIVE DATA CHECK ---
    const isBroken = !q.question && (!q.options || q.options.length === 0);
    if (isBroken) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/40 backdrop-blur-md rounded-[3rem] m-4 border-2 border-slate-200">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4"><Puzzle size={32} /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Content Loading Error</h3>
                <p className="text-sm text-slate-500 mb-6">Unable to load this particular challenge safely.</p>
                <button onClick={onSkip} className="px-6 h-12 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2">
                    SKIP CHALLENGE <ArrowRight size={18} />
                </button>
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
                        className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-black z-20 flex items-center gap-1 pointer-events-none shadow-lg"
                    >
                        <Trophy size={12} /> +{gemsEarned} gems
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden">
                <div className="bg-[var(--bg-card)] rounded-[2rem] border-[4.5px] border-amber-400 px-6 py-6 mb-4 shadow-xl flex-shrink-0 relative">
                    <div className="toy-card-gloss" />
                    <div className="flex items-center justify-end mb-4">
                        {!isAnswered && q.hint && (
                            <div className="relative">
                                <button onClick={() => setHintUsed(!hintUsed)} className={`p-2 rounded-xl transition-all relative z-10 ${hintUsed ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    <Lightbulb size={18} />
                                </button>
                                {hintUsed && (
                                    <div className="mcq-hint-bubble">
                                        <div className="toy-card-gloss" />
                                        <div className="mcq-hint-header"><Sparkles size={14} className="text-indigo-500" /><span className="mcq-hint-badge">Logic Hint</span></div>
                                        <p className="mcq-hint-text">{q.hint}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-[var(--text-main)] font-bold text-[17px] leading-snug m-0">{q.question}</p>
                </div>

                <div className="flex flex-col gap-2.5 flex-shrink-0">
                    {q.options?.map((opt, i) => {
                        const isThisCorrect = correctText === opt;
                        const isSelected = opt === selectedOption;
                        let cls = 'mcq-fe-btn';
                        if (isAnswered) {
                            if (isSelected && userWasCorrect) cls += ' mcq-fe-correct';
                            else if (isSelected) cls += ' mcq-fe-wrong';
                            else if (isThisCorrect) cls += ' mcq-fe-correct opacity-50';
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

                <div className="mt-auto pt-4 pb-6 w-full flex-shrink-0">
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
                            {userWasCorrect ? <>EXCELLENT WORK! <Check size={16} /></> : <>REVIEWING STEPS... <AlertCircle size={16} /></>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── WRONG SOLUTION PORTAL ── */}
            {isAnswered && !userWasCorrect && showExplanation && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-[3rem] p-8 shadow-2xl border border-[var(--border-color)] animate-in zoom-in-95 duration-300">
                        <div className="bg-red-50 text-red-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <Puzzle size={28} />
                        </div>
                        <h4 className="text-[var(--text-main)] font-black mb-4 text-center text-xl">Let's Step Through It</h4>
                        
                        <div className="max-h-[45vh] overflow-y-auto no-scrollbar mb-8">
                            <SolutionDisplayer explanation={q.explanation} />
                        </div>

                        <button onClick={nextQuestion} className="w-full h-16 bg-red-500 text-white rounded-[2rem] font-black text-xs tracking-[0.2em] uppercase shadow-[0_6px_0_#b91c1c] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2">
                            {isLast ? 'FINISH QUEST' : 'CONTINUE QUEST'} <ArrowRight size={18} strokeWidth={3} />
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default MathRenderer;
