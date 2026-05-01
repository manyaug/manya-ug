import React from 'react';
import { 
  Map as MapIcon, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Puzzle,
  Navigation,
  Trophy,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * UNIVERSAL GLOBE RENDERER
 * Purely stateless visual component for the Globe Engine.
 */
const GlobeRenderer = ({
    isDark,
    GlobeCanvas,
    data,
    activeTab,
    setActiveTab,
    placedPieces,
    quizFeedback,
    selectedQuizOpt,
    handleQuizAnswer,
    submitQuizAnswer,
    handleDragStart,
    focusOn,
    onFinishActivity
}) => {
    return (
        <div className="globe-engine-root flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            <style>{`
            .globe-engine-root { font-family: 'Plus Jakarta Sans', sans-serif; }
            .sheet-toy { 
                background: var(--sheet-bg, #fff);
                border-top: 5px solid #7c3aed;
                box-shadow: 0 -15px 50px rgba(0,0,0,0.1);
            }
            .dark .sheet-toy {
                background: #0f172a;
                box-shadow: 0 -15px 50px rgba(0,0,0,0.4);
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="relative w-full h-[45vh] flex-shrink-0 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-400/20 to-transparent dark:from-indigo-900/20 dark:to-transparent pointer-events-none" />
                {GlobeCanvas}
                <div className="absolute top-4 right-4">
                    <button onClick={() => focusOn([0, 0], 1.2)} className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/20 dark:border-white/10 flex items-center justify-center text-indigo-500 active:scale-90 transition-transform">
                        <Navigation className="w-5 h-5 drop-shadow-md" />
                    </button>
                </div>
            </div>

            <div className="sheet-toy flex-1 relative z-30 flex flex-col overflow-hidden">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-5 mb-2" />

                <div className="flex-1 overflow-y-auto px-5 pt-3 pb-12 space-y-5 no-scrollbar">
                    {data.mode === 'study' && (
                        <div className="flex overflow-x-auto gap-2 px-1 py-1 no-scrollbar sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-sm mb-4">
                            {data.cases.map((c, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setActiveTab(i)} 
                                    className={`uppercase text-[10px] whitespace-nowrap px-5 py-2.5 font-black rounded-xl transition-all active:scale-95 border-b-[4px] ${
                                        activeTab === i 
                                            ? 'bg-indigo-600 border-indigo-800 text-white shadow-md shadow-indigo-500/30' 
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                    }`}
                                >
                                    {c.tabTitle}
                                </button>
                            ))}
                        </div>
                    )}

                    {data.mode === 'study' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="mcq-q-card border-[4.5px] border-indigo-500 bg-white dark:bg-slate-800">
                                <div className="toy-card-gloss" />
                                <h1 className="text-[17px] uppercase font-black tracking-wide leading-tight text-center text-indigo-600 dark:text-indigo-400 relative z-10">
                                    {data.cases[activeTab].title}
                                </h1>
                            </div>
                            
                            <div className="space-y-3 mt-4">
                                {data.cases[activeTab].steps.map((step, i) => (
                                    <div key={i} className="flex gap-3 items-start p-4 rounded-2xl bg-white dark:bg-slate-800 border-[3.5px] border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                        <div className="toy-card-gloss opacity-30" />
                                        <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-black text-[12px] shadow-lg shadow-indigo-500/20 relative z-10">
                                            {i + 1}
                                        </div>
                                        <p className="text-[13px] font-bold leading-relaxed text-slate-700 dark:text-slate-300 pt-0.5 relative z-10" dangerouslySetInnerHTML={{ __html: step }} />
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={onFinishActivity}
                                className="mcq-btn-solid w-full py-4 bg-indigo-600 border-b-[6px] border-indigo-800 text-white rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-xl shadow-indigo-500/30 active:scale-95 active:border-b-0 transition-all relative overflow-hidden"
                            >
                                <div className="toy-card-gloss" />
                                FINISH ACTIVITY
                            </button>
                        </div>
                    )}

                    {data.mode === 'quiz' && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-400">
                            <div className="mcq-q-card border-[4.5px] border-indigo-500 shadow-xl relative overflow-hidden bg-white dark:bg-slate-800">
                                <div className="toy-card-gloss" />
                                <p className="text-[15px] font-black leading-relaxed text-center relative z-10 text-slate-800 dark:text-slate-200">
                                    {data.questions[activeTab].question}
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {data.questions[activeTab].options.map((opt, i) => {
                                    const isSelected = selectedQuizOpt === opt;
                                    const isCorrect = quizFeedback?.type === 'success' && opt === data.questions[activeTab].correctAnswer;
                                    const isWrong = quizFeedback?.type === 'error' && opt === quizFeedback.selectedOpt;

                                    let cardClass = "mcq-option bg-white dark:bg-slate-800 py-4 px-5 rounded-2xl border-[3.5px] transition-all relative overflow-hidden";
                                    let borderStyle = isSelected ? { borderColor: '#7c3aed' } : { borderColor: isDark ? '#1e293b' : '#f1f5f9' };

                                    if (isCorrect) borderStyle = { borderColor: '#22c55e', backgroundColor: isDark ? '#064e3b' : '#f0fdf4' };
                                    if (isSelected && !isCorrect && !isWrong) borderStyle = { borderColor: '#7c3aed', backgroundColor: isDark ? '#1e1b4b' : '#f5f3ff', transform: 'translateY(-2px)' };
                                    if (isWrong) borderStyle = { borderColor: '#f43f5e', backgroundColor: isDark ? '#450a0a' : '#fff1f2' };

                                    return (
                                        <button
                                            key={i}
                                            disabled={quizFeedback?.type === 'success'}
                                            onClick={() => handleQuizAnswer(opt)}
                                            className={cardClass}
                                            style={borderStyle}
                                        >
                                            <div className="toy-card-gloss opacity-40" />
                                            <div className="flex items-center justify-between relative z-10">
                                                <span className={`font-black text-[13px] ${isCorrect ? 'text-green-700 dark:text-green-400' : isWrong ? 'text-rose-700 dark:text-rose-400' : isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {opt}
                                                </span>
                                                {isCorrect && <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"><CheckCircle2 size={14} /></div>}
                                                {isWrong && <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg"><X size={14} /></div>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedQuizOpt && !quizFeedback && (
                                <button
                                    onClick={submitQuizAnswer}
                                    className="mcq-btn-solid bg-indigo-600 border-b-[6px] border-indigo-800 text-white rounded-2xl py-4 font-black text-[14px] uppercase tracking-widest shadow-xl shadow-indigo-500/30 mt-4 active:scale-95 active:border-b-0 transition-all relative overflow-hidden"
                                >
                                    <div className="toy-card-gloss" />
                                    SUBMIT ANSWER
                                </button>
                            )}
                        </div>
                    )}

                    {data.mode === 'puzzle' && (
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            {data.pieces?.map((p, i) => (
                                <div key={i} onMouseDown={e => handleDragStart(e, p)} onTouchStart={e => handleDragStart(e, p)}
                                    className={`p-4 rounded-2xl text-center font-black text-[12px] border-[3.5px] uppercase transition-all shadow-md active:scale-90 select-none cursor-grab active:cursor-grabbing relative overflow-hidden ${
                                        placedPieces.includes(p.id) 
                                            ? 'bg-green-500/10 border-green-500/30 text-green-600 opacity-50 scale-95' 
                                            : 'bg-white border-slate-100 text-slate-700 active:border-indigo-500'
                                    }`}>
                                    <div className="toy-card-gloss opacity-40" />
                                    <span className="relative z-10">{p.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobeRenderer;
