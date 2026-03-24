import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Lightbulb, Trophy, PenTool, Sparkles, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * MANYA ENGLISH: SYNTAX ARCHITECT ENGINE (React v1.0)
 * --------------------------------------------------
 * - Interactive fill-in-the-blank with intelligent word bank.
 * - Dynamic retry queue for mastery-based learning.
 * - Premium bento-card question layout.
 * - Real-time validation and tactile feedback.
 */

const SyntaxArchitectEngine = ({ data, onComplete }) => {
    const [pool, setPool] = useState([]);
    const [index, setIndex] = useState(0);
    const [wrongQueue, setWrongQueue] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg: '...' }
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const initialQuestions = useMemo(() => data?.questions || [], [data]);
    const currentQ = pool[index];

    // 1. Initialize Game
    useEffect(() => {
        setPool([...initialQuestions]);
        setIndex(0);
        setWrongQueue([]);
        setFeedback(null);
        setShowFinish(false);
    }, [initialQuestions]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const normalize = (text) => {
        if (!text) return "";
        return String(text).toLowerCase().replace(/[.,!?]$/, "").trim();
    };

    const handleCheck = () => {
        if (!currentQ || feedback?.type === 'success') return;

        const isCorrect = normalize(inputValue) === normalize(currentQ.expected);

        if (isCorrect) {
            setFeedback({ type: 'success', msg: 'Perfectly Constructed!' });
            window.ManyaAudio?.success?.();
        } else {
            setFeedback({ type: 'error', msg: currentQ.hint || 'Check your spelling or grammar!' });
            if (!wrongQueue.some(q => q.prompt === currentQ.prompt)) {
                setWrongQueue(prev => [...prev, currentQ]);
            }
            window.ManyaAudio?.error?.();
        }
    };

    const handleNext = () => {
        window.QuestRunner?.setIsTyping?.(false);
        setFeedback(null);
        setInputValue('');
        
        if (index < pool.length - 1) {
            setIndex(i => i + 1);
        } else if (wrongQueue.length > 0) {
            // Mastery Loop: Retry wrong answers
            setPool([...wrongQueue]);
            setWrongQueue([]);
            setIndex(0);
        } else {
            setShowFinish(true);
        }
    };

    const fillInput = (option) => {
        if (feedback?.type === 'success') return;
        setInputValue(option);
        setFeedback(null);
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* Header HUD */}
            <div className="flex-none p-8 text-center pb-2">
                <div className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase items-center gap-2 mb-4 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'}`}>
                    <PenTool size={12} /> Syntax Architect
                </div>
                <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-40">Exercise {index + 1} / {pool.length}</span>
                    {wrongQueue.length > 0 && <span className="text-[10px] font-black text-rose-500 animate-pulse">Mastery Loop: {wrongQueue.length} Left</span>}
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 scrollbar-hide">
                <div className={`p-8 rounded-[40px] border transition-all animate-in zoom-in duration-500 ${isDark ? 'bg-white/5 border-white/5 shadow-2xl shadow-indigo-500/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight mb-8">
                        {currentQ?.prompt}
                    </h2>

                    <div className="space-y-4">
                        <input 
                            type="text"
                            value={inputValue}
                            onChange={(e) => { setInputValue(e.target.value); setFeedback(null); }}
                            placeholder="Type or select an answer..."
                            className={`w-full h-16 px-6 rounded-2xl border-4 text-lg font-black transition-all outline-none ${feedback?.type === 'success' ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : (feedback?.type === 'error' ? 'border-rose-500 text-rose-500 bg-rose-50' : (isDark ? 'bg-white/5 border-white/5 focus:border-indigo-500 focus:text-indigo-400' : 'bg-slate-50 border-slate-100 focus:border-indigo-500 focus:bg-white text-indigo-700'))}`}
                        />

                        <div className="flex flex-wrap gap-2">
                            {currentQ?.options?.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => fillInput(opt)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all active:scale-95 ${isDark ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {feedback && (
                    <div className={`p-6 rounded-[32px] flex items-start gap-4 animate-in slide-in-from-top-4 duration-300 ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                        <p className="text-xs font-black italic mt-1.5">{feedback.msg}</p>
                    </div>
                )}
            </div>

            {/* Footer Action */}
            <div className="flex-none p-8 pt-2">
                {!feedback || feedback.type === 'error' ? (
                    <button 
                        onClick={handleCheck}
                        disabled={!inputValue.trim()}
                        className="w-full h-16 bg-indigo-600 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                    >
                        Check Construction <Zap size={18} fill="currentColor" />
                    </button>
                ) : (
                    <button 
                        onClick={handleNext}
                        className="w-full h-16 bg-emerald-500 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/30 active:scale-95 transition-all"
                    >
                        {index < pool.length - 1 ? 'Next Exercise' : (wrongQueue.length > 0 ? 'Retry Misconstructions' : 'Complete Architecture')} <ArrowRight size={18} />
                    </button>
                )}
            </div>

            {/* Finish Overlay */}
            {showFinish && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl bg-white/10">
                    <div className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl border border-white/10 scale-in-center">
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                            <Trophy size={48} />
                        </div>
                        <h2 className="text-4xl font-black mb-2 tracking-tight">Architect!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 text-lg">
                            Quest Successfully Completed
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={onComplete}
                                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Submit & Continue <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scale-in-center { animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

SyntaxArchitectEngine.hideGlobalFooter = true;
export default SyntaxArchitectEngine;
