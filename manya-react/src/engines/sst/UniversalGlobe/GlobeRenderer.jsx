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
    onFinishActivity,
    mode
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
                    {mode === 'study' && data.cases && (
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
                                    {c.tabTitle || c.label || `Part ${i+1}`}
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'study' && data.cases && (
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

                    {mode === 'quiz' && data.questions && (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-400">
                            <div className="mcq-q-card border-[4.5px] border-indigo-500 shadow-xl relative overflow-hidden bg-white dark:bg-slate-800">
                                <div className="toy-card-gloss" />
                                <h1 className="text-[14px] font-black tracking-wide leading-tight text-center text-slate-400 dark:text-slate-500 uppercase mb-2">Quest {activeTab + 1}/{data.questions.length}</h1>
                                <p className="text-[15px] font-black leading-relaxed text-center relative z-10 text-slate-800 dark:text-slate-200">
                                    {data.questions[activeTab].question}
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {data.questions[activeTab].options.map((opt, i) => {
                                    const isSelected = selectedQuizOpt === opt;
                                    const isCorrect = quizFeedback?.type === 'success' && opt === data.questions[activeTab].correctAnswer;
                                    const isWrong = quizFeedback?.type === 'error' && isSelected;

                                    return (
                                        <button
                                            key={i}
                                            disabled={quizFeedback?.type === 'success'}
                                            onClick={() => handleQuizAnswer(opt)}
                                            className={`mcq-fe-btn relative overflow-hidden transition-all ${
                                                isCorrect ? 'mcq-fe-correct' : 
                                                isWrong ? 'mcq-fe-wrong' : 
                                                isSelected ? 'mcq-fe-selected' : ''
                                            }`}
                                        >
                                            <div className="toy-card-gloss" />
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-xs text-slate-400">{String.fromCharCode(65 + i)}</div>
                                                <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">{opt}</span>
                                                {isCorrect && <div className="ml-auto"><CheckCircle2 size={18} className="text-emerald-500" strokeWidth={3} /></div>}
                                                {isWrong && <div className="ml-auto"><X size={18} className="text-rose-500" strokeWidth={3} /></div>}
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

                    {mode === 'study' && !data.cases && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                             <div className="mcq-q-card border-[4.5px] border-indigo-500 bg-white dark:bg-slate-800">
                                <div className="toy-card-gloss" />
                                <h1 className="text-[17px] uppercase font-black tracking-wide leading-tight text-center text-indigo-600 dark:text-indigo-400 relative z-10">
                                    {data.title || data.topic || data.concept || 'Lesson Overview'}
                                </h1>
                            </div>
                            
                             <p className="text-[14px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed px-2">
                                {data.text || data.question || data.description || data.body || 'Global Concept Discovery'}
                            </p>

                            {(data.explanation || data.content || data.body || data.notes || data.q_explanation || data.question_explanation || data.explanation_text) && (
                                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-[13px] font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed italic">
                                    {data.explanation || data.content || data.body || data.notes || data.q_explanation || data.question_explanation || data.explanation_text}
                                </div>
                            )}

                            {data.sections && data.sections.map((sec, idx) => (
                                <div key={idx} className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700">
                                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{sec.title || sec.label}</h4>
                                    <p className="text-[12px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {sec.content || sec.text || sec.body}
                                    </p>
                                </div>
                            ))}

                            {(data.markers || data.points) && (
                                <div className="space-y-3 mt-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Discovery Points</h4>
                                    {(data.markers || data.points).map((p, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-500 shadow-sm"><Navigation size={16} /></div>
                                                <div className="text-[13px] font-black text-slate-800 dark:text-slate-200">{p.label || p.title}</div>
                                            </div>
                                            {(p.description || p.text || p.content) && (
                                                <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed pl-11">
                                                    {p.description || p.text || p.content}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(data.steps || data.points || data.features || data.items || data.recap_facts || data.facts) && (
                                <div className="space-y-3 mt-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Key Highlights</h4>
                                    {(data.steps || data.points || data.features || data.items || data.recap_facts || data.facts).map((step, i) => (
                                        <div key={i} className="flex gap-3 items-start p-4 rounded-2xl bg-white dark:bg-slate-800 border-[3.5px] border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                            <div className="toy-card-gloss opacity-30" />
                                            <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-black text-[12px] shadow-lg shadow-indigo-500/20 relative z-10">
                                                {i + 1}
                                            </div>
                                            <p className="text-[13px] font-bold leading-relaxed text-slate-700 dark:text-slate-300 pt-0.5 relative z-10">
                                                {typeof step === 'string' ? step : step.label || step.text || step.content || step.fact}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {mode === 'study' && (
                        <button
                            onClick={onFinishActivity}
                            className="mcq-btn-solid w-full bg-indigo-600 border-b-[6px] border-indigo-800 text-white rounded-2xl py-4 font-black text-[14px] uppercase tracking-widest shadow-xl shadow-indigo-500/30 mt-6 active:scale-95 active:border-b-0 transition-all relative overflow-hidden"
                        >
                            <div className="toy-card-gloss" />
                            FINISH ACTIVITY
                        </button>
                    )}

                    {mode === 'puzzle' && (
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
