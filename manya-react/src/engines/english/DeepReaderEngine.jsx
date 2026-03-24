import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen, Trophy, ArrowRight, BarChart3, Table as TableIcon, FileText, Quote, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

/**
 * MANYA ENGLISH: DEEP READER ENGINE (React v1.0)
 * --------------------------------------------
 * - Multimodal comprehension: Text, Poetry, Tables, Charts.
 * - Persistent media pane with interactive question flow.
 * - Premium glassmorphic HUD and adaptive layouts.
 * - Real-time validation and progress tracking.
 */

const DeepReaderEngine = ({ data, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isResolved, setIsResolved] = useState(false);
    const [score, setScore] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const questions = useMemo(() => data?.questions || [], [data]);
    const media = data?.media || { type: 'PASSAGE', content: 'No content provided.' };
    const currentQ = questions[currentStep];

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleOptionSelect = (opt) => {
        if (isResolved) return;
        setSelectedOption(opt);
        const isCorrect = opt === currentQ.answer;
        
        if (isCorrect) {
            setIsResolved(true);
            setScore(s => s + 1);
            window.ManyaAudio?.success?.();
        } else {
            window.ManyaAudio?.error?.();
        }
    };

    const nextStep = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
            setSelectedOption(null);
            setIsResolved(false);
        } else {
            setShowFinish(true);
        }
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* 1. Media Pane (Persistent Top) */}
            <div className={`flex-[0.5] overflow-y-auto p-6 border-b transition-colors ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        {media.type === 'PASSAGE' && <FileText size={12} />}
                        {media.type === 'POEM' && <Quote size={12} />}
                        {media.type === 'TABLE' && <TableIcon size={12} />}
                        {media.type === 'GRAPH' && <BarChart3 size={12} />}
                        {media.type}
                    </div>
                </div>

                <div className="animate-in fade-in duration-700">
                    {media.type === 'PASSAGE' && (
                        <p className={`text-sm sm:text-base leading-relaxed font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {media.content}
                        </p>
                    )}
                    {media.type === 'POEM' && (
                        <div className={`text-center italic whitespace-pre-line leading-loose font-serif ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {media.content}
                        </div>
                    )}
                    {media.type === 'TABLE' && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                            <table className="w-full text-xs text-left">
                                <thead className={isDark ? 'bg-white/5' : 'bg-slate-50'}>
                                    <tr>
                                        {media.headers?.map((h, i) => <th key={i} className="px-4 py-3 font-black uppercase tracking-wider">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {media.rows?.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => <td key={j} className="px-4 py-3 font-medium">{cell}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {media.type === 'GRAPH' && (
                        <div className="flex flex-col items-center">
                            <h3 className="text-xs font-black mb-6 uppercase tracking-widest opacity-50">{media.title}</h3>
                            <div className="flex items-end gap-3 h-40 w-full max-w-md px-4 border-b-2 border-slate-200 dark:border-white/10">
                                {media.data?.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center group">
                                        <div 
                                            className="w-full bg-indigo-500 rounded-t-lg transition-all duration-1000 relative group-hover:bg-indigo-400"
                                            style={{ height: `${(d.value / (media.max || 100)) * 100}%` }}
                                        >
                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black">{d.value}</span>
                                        </div>
                                        <span className="text-[10px] font-bold mt-2 truncate w-full text-center opacity-60">
                                            {d.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Question Pane (Bottom) */}
            <div className="flex-[0.5] flex flex-col p-6 overflow-y-auto relative bg-[#FDFBF7] dark:bg-black/20">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-40">Question {currentStep + 1} of {questions.length}</span>
                    <div className="flex gap-1">
                        {questions.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentStep ? 'bg-indigo-500' : (i < currentStep ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/10')}`} />
                        ))}
                    </div>
                </div>

                <div className="mb-6 animate-in slide-in-from-bottom-2 duration-500">
                    <h2 className="text-base sm:text-lg font-black leading-tight">
                        {currentQ?.text}
                    </h2>
                </div>

                <div className="grid gap-3 mb-20">
                    {currentQ?.options?.map((opt, i) => {
                        const isCorrect = isResolved && opt === currentQ.answer;
                        const isWrong = selectedOption === opt && opt !== currentQ.answer;
                        
                        return (
                            <button
                                key={i}
                                onClick={() => handleOptionSelect(opt)}
                                disabled={isResolved}
                                className={`group flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${isCorrect ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : (isWrong ? 'bg-rose-500 border-rose-400 text-white animate-pulse' : (isDark ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-100 text-slate-700 hover:border-indigo-200 hover:shadow-sm'))}`}
                            >
                                <span className="text-sm font-bold">{opt}</span>
                                {isCorrect && <CheckCircle2 size={18} />}
                                {isWrong && <XCircle size={18} />}
                            </button>
                        );
                    })}
                </div>

                {/* Next Button Overlay */}
                {isResolved && (
                    <div className="absolute bottom-6 inset-x-6 z-10 animate-in slide-in-from-bottom-4 duration-500">
                        <button 
                            onClick={nextStep}
                            className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 active:scale-95 transition-all"
                        >
                            {currentStep < questions.length - 1 ? 'Next Question' : 'Finish Reading'} <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* Finish Overlay */}
            {showFinish && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl bg-white/10">
                    <div className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl border border-white/10 scale-in-center">
                        <div className="w-24 h-24 bg-indigo-600 text-white rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                            <BookOpen size={48} />
                        </div>
                        <h2 className="text-4xl font-black mb-2 tracking-tight">Literacy Master!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 text-lg">
                            Score: {score}/{questions.length}
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={onComplete}
                                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Submit Results <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scale-in-center { animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

DeepReaderEngine.hideGlobalFooter = true;
export default DeepReaderEngine;
