import React from 'react';
import { createPortal } from 'react-dom';
import { 
  Map as MapIcon, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Puzzle,
  Navigation,
  Trophy,
  X,
  Zap
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
    onNext,
    mode,
    puzzleFeedback
}) => {
    return (
        <div className="globe-engine-root flex flex-col h-full bg-[#0B0E14] overflow-hidden">
            <style>{`
            .globe-engine-root { font-family: 'Plus Jakarta Sans', sans-serif; }
            .sheet-toy { 
                background: #151921;
                border-top: 5px solid #7c3aed;
                box-shadow: 0 -15px 50px rgba(0,0,0,0.4);
                border-radius: 3rem 3rem 0 0;
                margin-top: -2rem;
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
                        <div className="flex bg-slate-800/80 p-1 rounded-xl gap-0 mb-3 border border-slate-700/50">
                            {data.cases.map((c, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setActiveTab(i)} 
                                    className={`flex-1 uppercase text-[8px] whitespace-nowrap py-2 font-black rounded-lg transition-all active:scale-95 ${
                                        activeTab === i 
                                            ? 'bg-indigo-600 text-white shadow-lg' 
                                            : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {c.tabTitle || c.label || `P${i+1}`}
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'study' && data.cases && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="text-center py-1">
                                <span className="uppercase font-black tracking-[0.2em] text-indigo-400 opacity-80" style={{ fontSize: '10px', display: 'block' }}>
                                    {data.cases[activeTab]?.title}
                                </span>
                            </div>
                            
                            <div className="grid gap-2">
                                {data.cases[activeTab]?.steps.map((step, i) => (
                                    <div key={i} className="flex gap-3 items-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 relative overflow-hidden">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-[10px] border border-indigo-500/30">
                                            {i + 1}
                                        </div>
                                        <p className="text-[12px] font-medium leading-snug text-slate-300" dangerouslySetInnerHTML={{ __html: step }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'quiz' && data.questions && (
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
                                    const isCorrect = quizFeedback !== null && opt === data.questions[activeTab].correctAnswer;
                                    const isWrong = quizFeedback?.type === 'error' && isSelected;

                                    return (
                                        <button
                                            key={i}
                                            disabled={quizFeedback !== null}
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
                                    className="w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:translate-y-1 mt-4"
                                >
                                    <span className="relative z-10 flex items-center gap-2">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                                </button>
                            )}

                            {quizFeedback?.type === 'error' && data.questions[activeTab].explanation && createPortal(
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} onClick={onNext} />
                                    <div className="relative w-full max-w-md z-[10000] rounded-[2.5rem] overflow-hidden bg-[#151921] p-6 shadow-2xl border border-white/10 animate-in zoom-in duration-300">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-11 h-11 rounded-xl bg-red-100/10 flex items-center justify-center text-red-500"><X size={20} strokeWidth={3} /></div>
                                            <div>
                                                <div className="font-black text-lg text-white">Not quite!</div>
                                                <div className="text-xs text-slate-400 font-bold">Here's how to solve it</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs font-bold text-emerald-400 mb-4">
                                            <CheckCircle2 size={14} strokeWidth={3} /><span>Correct Answer:</span><strong>{data.questions[activeTab].correctAnswer}</strong>
                                        </div>
                                        <div className="no-scrollbar mb-5 max-h-[45vh] overflow-y-auto pr-1">
                                            <p 
                                                className="text-slate-300 font-bold text-sm leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: data.questions[activeTab].explanation || 'Detailed concept explanation coming soon.' }}
                                            />
                                        </div>
                                        <button onClick={onNext} className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black text-sm tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2">
                                            Continue <ChevronRight size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>,
                                document.body
                            )}
                        </div>
                    )}

                    {mode === 'study' && !data.cases && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                             <div className="text-center py-1 mb-2">
                                <span className="uppercase font-black tracking-[0.2em] text-indigo-400 opacity-80" style={{ fontSize: '10px', display: 'block' }}>
                                    {data.title || data.topic || data.concept || 'Lesson Overview'}
                                </span>
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
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="text-center py-1 mb-2">
                                <span className="uppercase font-black tracking-[0.2em] text-indigo-400 opacity-80" style={{ fontSize: '10px', display: 'block' }}>
                                    {data.title || data.topic || data.concept || 'Puzzle Challenge'}
                                </span>
                            </div>
                            
                            <p className="text-[14px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed px-2 text-center">
                                {data.text || data.question || data.description || data.body || 'Drag the puzzle pieces to their correct locations on the globe!'}
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                {data.pieces?.map((p, i) => {
                                    const isPlaced = placedPieces.includes(p.id);
                                    const isCorrectTarget = p.target;
                                    const isDisabled = isPlaced || puzzleFeedback !== null;

                                    let cardClass = 'bg-white border-slate-100 text-slate-700 active:border-indigo-500';
                                    if (isPlaced) {
                                        cardClass = 'bg-green-500/10 border-green-500/30 text-green-600 opacity-50 scale-95';
                                    } else if (puzzleFeedback === 'error' && isCorrectTarget) {
                                        cardClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500 scale-95 font-black shadow-lg';
                                    } else if (puzzleFeedback === 'error') {
                                        cardClass = 'bg-slate-800/20 border-slate-800/10 text-slate-600 opacity-30 scale-95';
                                    }

                                    return (
                                        <div key={i} 
                                            onMouseDown={e => !isDisabled && handleDragStart(e, p)} 
                                            onTouchStart={e => !isDisabled && handleDragStart(e, p)}
                                            className={`p-4 rounded-2xl text-center font-black text-[12px] border-[3.5px] uppercase transition-all shadow-md select-none relative overflow-hidden ${
                                                isDisabled ? '' : 'active:scale-90 cursor-grab active:cursor-grabbing'
                                            } ${cardClass}`}
                                        >
                                            <div className="toy-card-gloss opacity-40" />
                                            <span className="relative z-10">{p.label}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {puzzleFeedback === 'error' && createPortal(
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                    <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }} onClick={onNext} />
                                    <div className="relative w-full max-w-md z-[10000] rounded-[2.5rem] overflow-hidden bg-[#151921] p-6 shadow-2xl border border-white/10 animate-in zoom-in duration-300">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-11 h-11 rounded-xl bg-red-100/10 flex items-center justify-center text-red-500"><X size={20} strokeWidth={3} /></div>
                                            <div>
                                                <div className="font-black text-lg text-white">Not quite!</div>
                                                <div className="text-xs text-slate-400 font-bold">Here's how to solve it</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs font-bold text-emerald-400 mb-4">
                                            <CheckCircle2 size={14} strokeWidth={3} /><span>Correct Answer:</span><strong>{data.pieces?.find(x => x.target)?.label || 'N/A'}</strong>
                                        </div>
                                        <div className="no-scrollbar mb-5 max-h-[45vh] overflow-y-auto pr-1">
                                            <p 
                                                className="text-slate-300 font-bold text-sm leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: data.explanation || data.text || 'Drag the piece to its corresponding degree line on the globe to calculate the time difference.' }}
                                            />
                                        </div>
                                        <button onClick={onNext} className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black text-sm tracking-wide active:scale-95 transition-all flex items-center justify-center gap-2">
                                            Continue <ChevronRight size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>,
                                document.body
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobeRenderer;
