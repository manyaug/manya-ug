import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, X, ArrowRight, Lightbulb, Compass, 
    Zap, Trophy, RotateCcw, AlertCircle, Sparkles,
    Search, Puzzle
} from 'lucide-react';

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
    userWasCorrect
}) => {
    
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

            <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden">
                <div className="flex gap-1.5 justify-center mb-5 overflow-x-auto no-scrollbar flex-shrink-0">
                    {questions.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${i === currentIdx ? 'bg-indigo-600 w-5' : (i < currentIdx ? 'bg-indigo-600 opacity-35 w-1.5' : 'bg-slate-200 w-1.5')}`} />
                    ))}
                </div>

                {q.isRephrased && <div className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">🔄 Let's try this rule again with different words</div>}
                {frustration?.level === 'high' && <div className="text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2 font-bold mb-3 text-center flex-shrink-0">💪 You're doing great. Keep going!</div>}

                <div className="bg-[var(--bg-card)] rounded-[2rem] border-[4.5px] border-indigo-400 px-6 py-6 mb-4 shadow-xl flex-shrink-0 relative">
                    <div className="toy-card-gloss" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-indigo-500/10 rounded-lg flex items-center justify-center"><Compass size={12} className="text-indigo-600" /></div>
                            <span className="text-indigo-600 font-black text-[9px] tracking-widest uppercase opacity-80">
                                {nodeType} · {currentIdx + 1}/{questions.length}
                            </span>
                        </div>
                        {!isAnswered && q.hint && (
                            <div className="relative">
                                <button onClick={() => setHintUsed(!hintUsed)} className={`p-2 rounded-xl transition-all relative z-10 ${hintUsed ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    <Lightbulb size={18} />
                                </button>
                                {hintUsed && (
                                    <div className="mcq-hint-bubble">
                                        <div className="toy-card-gloss" />
                                        <div className="mcq-hint-header"><Sparkles size={14} className="text-amber-500" /><span className="mcq-hint-badge">Research Hint</span></div>
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
                        const isThisCorrect = correctText === opt || (q.options.indexOf(opt) === (q.answer?.charCodeAt(0) - 65)); // Simple check, Logic handles robustness
                        const isSelected = opt === selectedOption;
                        let cls = 'mcq-fe-btn';
                        if (isAnswered) {
                            if (isSelected && userWasCorrect) cls += ' mcq-fe-correct';
                            else if (isSelected) cls += ' mcq-fe-wrong';
                            else if (isThisCorrect && isAnswered) cls += ' mcq-fe-correct opacity-50'; // Show correct if missed
                            else cls += ' mcq-fe-faded';
                        } else if (isSelected) cls += ' mcq-fe-selected';

                        return (
                            <button key={i} className={cls} onClick={() => handleSelect(opt)} disabled={isAnswered}>
                                <div className="toy-card-gloss" />
                                <span className="mcq-fe-letter">{String.fromCharCode(65 + i)}</span>
                                <span className="mcq-fe-text">{opt}</span>
                                {isAnswered && isSelected && userWasCorrect && <Check size={16} className="mcq-fe-icon correct-icon" strokeWidth={3} />}
                                {isAnswered && isSelected && !userWasCorrect && <X size={16} className="mcq-fe-icon wrong-icon" strokeWidth={3} />}
                            </button>
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
                            {userWasCorrect ? <>GREAT OBSERVATION! <Check size={16} /></> : <>RECALIBRATING... <AlertCircle size={16} /></>}
                        </div>
                    )}
                </div>
            </div>

            {/* ── WRONG SOLUTION PORTAL ── */}
            {isAnswered && !userWasCorrect && showExplanation && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-[var(--bg-card)] rounded-[3rem] p-10 shadow-2xl border border-[var(--border-color)] animate-in zoom-in-95 duration-300">
                        <div className="bg-rose-50 text-rose-600 w-16 h-16 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                            <Lightbulb size={32} />
                        </div>
                        <h4 className="text-[var(--text-main)] font-black mb-2 text-center text-xl">Let's Research Why</h4>
                        <div className="bg-emerald-50 text-emerald-700 p-5 rounded-[2rem] font-black mb-6 border-2 border-emerald-100 text-center text-lg italic animate-in fade-in slide-in-from-bottom-2 duration-700">
                            "{correctText}"
                        </div>
                        <div className="max-h-[30vh] overflow-y-auto no-scrollbar mb-8">
                            <p className="text-[var(--text-sub)] text-base font-bold text-center leading-relaxed">
                                {q.explanation || "Scientific discovery often takes a few tries! Keep observing the patterns."}
                            </p>
                        </div>
                        <button onClick={nextQuestion} className="w-full h-16 bg-indigo-600 text-white rounded-[2rem] font-black text-xs tracking-[0.2em] uppercase shadow-xl shadow-indigo-500/40 active:scale-95 transition-all">
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
