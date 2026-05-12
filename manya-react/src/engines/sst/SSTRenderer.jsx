import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
    Check, X, ArrowRight, Lightbulb, Compass, 
    Zap, Trophy, RotateCcw, Search, Sparkles, AlertCircle
} from 'lucide-react';
import QuestHUD from '../../components/QuestHUD';
import { triggerRewardFlight } from '../../utils/fxUtils';
import { audioService } from '../../infrastructure/audio/audioService';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * SST FETCHER RENDERER
 * Pure visual component for the SST Fetcher engine.
 */
const SSTRenderer = ({
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
    handleSelect,
    handleSubmit,
    nextQuestion,
    handleFinish,
    nodeType,
    userWasCorrect,
    correctText,
    frustration,
    SimulatorBridgeNode,
    isLast,
    session,
    currentMode
}) => {
    const [timeLeft, setTimeLeft] = React.useState(null);
    const [maxTime, setMaxTime] = React.useState(18);
    const [hintUsed, setHintUsed] = useState(false);
    const correctBtnRef = useRef(null);
    const score = session?.correctCount || 0;
    const masteryScore = session?.mastery || 0;

    const isCorrect = isAnswered && userWasCorrect;

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

    useEffect(() => {
        if (isAnswered) {
            if (isCorrect) {
                window.dispatchEvent(new CustomEvent('manya-correct', { detail: { subject: 'sst' } }));
                if (correctBtnRef.current) {
                    setTimeout(() => {
                        triggerRewardFlight(correctBtnRef.current, 'coin', 5);
                    }, 300);
                }
            } else {
                window.dispatchEvent(new CustomEvent('manya-wrong', { detail: { subject: 'sst' } }));
            }
        }
    }, [isAnswered, userWasCorrect, correctText]);
    
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

    if (renderError) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-500/10">
                    <X size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Engine Glitch</h3>
                <p className="text-sm text-slate-500 font-bold mb-8 max-w-xs mx-auto">Something went wrong. Let's try to reload.</p>
                <button onClick={() => window.location.reload()} className="px-8 h-14 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase flex items-center gap-2 shadow-xl shadow-slate-900/10">
                    RELOAD ENGINE <RotateCcw size={18} />
                </button>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4"><Search size={32} /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">No Questions Found</h3>
                <button onClick={handleFinish} className="px-6 h-12 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2">
                    BACK TO MAP <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    const q = questions[currentIdx];
    if (!q) return null;

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative" style={{ maxHeight: '100%' }}>

            <div className="flex-1 overflow-y-auto no-scrollbar relative">
                {SimulatorBridgeNode ? (
                    <div className="!w-full !h-full flex flex-col overflow-hidden">
                        {SimulatorBridgeNode}
                    </div>
                ) : (
                    <div className="px-4 pt-4 pb-6">
                        <div className="bg-[var(--bg-card)] rounded-b-[2rem] rounded-t-none border-[4.5px] border-[#7c3aed] px-6 py-6 mb-4 shadow-xl flex-shrink-0 relative">
                            <div className="toy-card-gloss" />
                            <div className="flex items-center justify-between mb-4">
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

                                {!isAnswered && q.hint && (
                                    <div className="relative">
                                        <button onClick={() => setHintUsed(!hintUsed)} className={`p-2 rounded-xl transition-all relative z-10 ${hintUsed ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            <Lightbulb size={18} />
                                        </button>
                                        {hintUsed && (
                                            <div className="mcq-hint-bubble">
                                                <div className="toy-card-gloss" />
                                                <div className="mcq-hint-header"><Sparkles size={14} className="text-indigo-500" /><span className="mcq-hint-badge">Tutor Hint</span></div>
                                                <p className="mcq-hint-text">{q.hint}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-[var(--text-main)] font-bold text-[17px] leading-snug m-0">{q.question}</p>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {q.options?.map((opt, i) => {
                                const isThisCorrect = opt === correctText;
                                const isSelected = opt === selectedOption;
                                let cls = 'mcq-fe-btn';
                                if (isAnswered) {
                                    if (isThisCorrect) cls += ' mcq-fe-correct';
                                    else if (isSelected) cls += ' mcq-fe-wrong';
                                    else cls += ' mcq-fe-faded';
                                } else if (isSelected) cls += ' mcq-fe-selected';

                                return (
                                    <motion.button 
                                        key={i} 
                                        className={cls} 
                                        onClick={() => handleSelect(opt)} 
                                        disabled={isAnswered}
                                        ref={isThisCorrect ? correctBtnRef : null}
                                        whileTap={!isAnswered ? { scale: 0.98, translateY: 2 } : {}}
                                    >
                                        <div className="toy-card-gloss" />
                                        <span className="mcq-fe-letter">{String.fromCharCode(65 + i)}</span>
                                        <span className="mcq-fe-text">{opt}</span>
                                        {isAnswered && isThisCorrect && <Check size={16} className="mcq-fe-icon correct-icon" strokeWidth={3} />}
                                        {isAnswered && isSelected && !isThisCorrect && <X size={16} className="mcq-fe-icon wrong-icon" strokeWidth={3} />}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {!SimulatorBridgeNode && (
                <div className="flex-none p-4 pb-8 w-full bg-[var(--bg-main)]/80 backdrop-blur-lg border-t border-white/5 relative z-50">
                    {!isAnswered ? (
                        <button onClick={handleSubmit} disabled={!selectedOption} className={`w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${selectedOption ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:translate-y-1' : 'bg-[#e5e5e5] text-[#a0a0a0] border-b-[4px] border-[#d4d4d4]'}`}>
                            <span className="relative z-10 flex items-center gap-2">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                        </button>
                    ) : (
                        <div className={`w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 font-black text-[10px] tracking-widest uppercase border-2 transition-all duration-500 ${userWasCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                            {userWasCorrect ? <>Magnificent! Keep going! <Check size={18} /></> : <>Analyzing solution... <AlertCircle size={18} /></>}
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {showGemToast && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        className="absolute top-20 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-black z-20 flex items-center gap-1 pointer-events-none shadow-lg"
                    >
                        <Trophy size={12} /> +{gemsEarned} gems
                    </motion.div>
                )}
            </AnimatePresence>

            {isAnswered && selectedOption !== q.answer && showExplanation && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} onClick={nextQuestion} />
                    <div className="relative w-full max-w-md z-[10000] rounded-[2.5rem] overflow-hidden bg-[var(--bg-card)] p-6 shadow-2xl border border-white/10 animate-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-red-500"><X size={20} strokeWidth={3} /></div>
                            <div><div className="font-black text-lg text-[var(--text-main)]">Not quite!</div><div className="text-xs text-[var(--text-sub)] font-bold">Here's how to solve it</div></div>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-bold text-emerald-600 mb-4">
                            <Check size={14} strokeWidth={3} /><span>Correct Answer:</span><strong>{correctText}</strong>
                        </div>
                        <div className="no-scrollbar mb-5 maxHeight-[45vh] overflow-y-auto">
                            <p className="text-[var(--text-main)] font-bold text-sm leading-relaxed">{q.explanation || 'Detailed concept explanation coming soon.'}</p>
                        </div>
                        <button onClick={nextQuestion} className="w-full h-14 rounded-2xl bg-red-500 text-white font-black text-sm tracking-wide shadow-[0_6px_0_#b91c1c] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2">
                            {isLast ? 'FINISH QUEST' : 'Continue'} <ArrowRight size={18} strokeWidth={3} />
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SSTRenderer;
