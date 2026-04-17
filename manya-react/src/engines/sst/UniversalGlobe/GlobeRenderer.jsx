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
        <div className="globe-engine-root flex flex-col h-full bg-[#fffbeb] dark:bg-[#0f172a] overflow-hidden">
            <style>{`
            .globe-engine-root { font-family: 'Plus Jakarta Sans', sans-serif; }
            .sheet-toy { 
                background: #fff;
                border-top: 5px solid #f59e0b;
                box-shadow: 0 -15px 50px rgba(0,0,0,0.1);
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="relative w-full h-[45vh] flex-shrink-0 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 to-transparent dark:from-sky-900/20 dark:to-transparent pointer-events-none" />
                {GlobeCanvas}
                <div className="absolute top-4 right-4">
                    <button onClick={() => focusOn([0, 0], 1.2)} className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/20 dark:border-white/10 flex items-center justify-center text-sky-500 active:scale-90 transition-transform">
                        <Navigation className="w-5 h-5 drop-shadow-md" />
                    </button>
                </div>
            </div>

            <div className="sheet-toy flex-1 rounded-t-[3rem] relative z-30 flex flex-col overflow-hidden">
                <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-5 mb-2" />

                <div className="flex-1 overflow-y-auto px-5 pt-3 pb-12 space-y-5 no-scrollbar">
                    {data.mode === 'study' && (
                        <div className="flex overflow-x-auto gap-2 px-1 py-1 no-scrollbar sticky top-0 z-10 bg-white shadow-sm mb-4">
                            {data.cases.map((c, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setActiveTab(i)} 
                                    className={`uppercase text-[10px] whitespace-nowrap px-5 py-2.5 font-black rounded-xl transition-all active:scale-95 border-b-[4px] ${
                                        activeTab === i 
                                            ? 'bg-amber-500 border-amber-700 text-white shadow-md shadow-amber-500/30' 
                                            : 'bg-slate-100 border-slate-200 text-slate-400'
                                    }`}
                                >
                                    {c.tabTitle}
                                </button>
                            ))}
                        </div>
                    )}

                    {data.mode === 'study' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="mcq-q-card border-[4.5px] border-amber-500 bg-white">
                                <div className="toy-card-gloss" />
                                <h1 className="text-[17px] uppercase font-black tracking-wide leading-tight text-center text-amber-600 relative z-10">
                                    {data.cases[activeTab].title}
                                </h1>
                            </div>
                            
                            <div className="space-y-3 mt-4">
                                {data.cases[activeTab].steps.map((step, i) => (
                                    <div key={i} className="flex gap-3 items-start p-4 rounded-2xl bg-white border-[3.5px] border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="toy-card-gloss opacity-30" />
                                        <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-[12px] shadow-lg shadow-amber-500/20 relative z-10">
                                            {i + 1}
                                        </div>
                                        <p className="text-[13px] font-bold leading-relaxed text-slate-700 pt-0.5 relative z-10" dangerouslySetInnerHTML={{ __html: step }} />
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                onClick={onFinishActivity}
                                className="mcq-btn-solid w-full py-4 bg-amber-500 border-b-[6px] border-amber-700 text-white rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-xl shadow-amber-500/30 active:scale-95 active:border-b-0 transition-all relative overflow-hidden"
                            >
                                <div className="toy-card-gloss" />
                                FINISH ACTIVITY
                            </button>
                        </div>
                    )}

                    {data.mode === 'quiz' && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-400">
                            <div className="flex flex-col items-center">
                                <div className="mcq-hint-badge px-4 py-1.5 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-2">
                                    <Trophy size={14} className="animate-bounce" />
                                    <span className="font-black text-[10px] tracking-widest uppercase">STAGE {activeTab + 1}</span>
                                </div>
                            </div>
                            
                            <div className="mcq-q-card border-[4.5px] border-amber-500 shadow-xl relative overflow-hidden bg-white">
                                <div className="toy-card-gloss" />
                                <p className="text-[15px] font-black leading-relaxed text-center relative z-10 text-slate-800">
                                    {data.questions[activeTab].question}
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {data.questions[activeTab].options.map((opt, i) => {
                                    const isSelected = selectedQuizOpt === opt;
                                    const isCorrect = quizFeedback?.type === 'success' && opt === data.questions[activeTab].correctAnswer;
                                    const isWrong = quizFeedback?.type === 'error' && opt === quizFeedback.selectedOpt;

                                    let cardClass = "mcq-option bg-white py-4 px-5 rounded-2xl border-[3.5px] transition-all relative overflow-hidden";
                                    let borderStyle = isSelected ? { borderColor: '#f59e0b' } : { borderColor: '#f1f5f9' };

                                    if (isCorrect) borderStyle = { borderColor: '#22c55e', backgroundColor: '#f0fdf4' };
                                    if (isSelected && !isCorrect && !isWrong) borderStyle = { borderColor: '#f59e0b', backgroundColor: '#fffbeb', transform: 'translateY(-2px)' };
                                    if (isWrong) borderStyle = { borderColor: '#f43f5e', backgroundColor: '#fff1f2' };

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
                                                <span className={`font-black text-[13px] ${isCorrect ? 'text-green-700' : isWrong ? 'text-rose-700' : isSelected ? 'text-amber-700' : 'text-slate-600'}`}>
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
                                    className="mcq-btn-solid bg-amber-500 border-b-[6px] border-amber-700 text-white rounded-2xl py-4 font-black text-[14px] uppercase tracking-widest shadow-xl shadow-amber-500/30 mt-4 active:scale-95 active:border-b-0 transition-all relative overflow-hidden"
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
                                            : 'bg-white border-slate-100 text-slate-700 active:border-amber-500'
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
