import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Trophy, ArrowRight, Zap, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import ManyaKeyboard from '../../../components/engine/ManyaKeyboard';

/**
 * SYNTAX ARCHITECT RENDERER
 * Stateless UI component for the bento-card sentence construction engine.
 */

const SyntaxRenderer = ({ 
    isDark, 
    pool, 
    index, 
    wrongQueue, 
    currentQ, 
    inputValue, 
    feedback, 
    setInputValue, 
    handleCheck, 
    handleNext, 
    fillInput,
    onComplete,
    kbOpen,
    setKbOpen,
    onKbInput,
    onKbDelete,
    onOptionHoverStart,
    onOptionHoverEnd
}) => {
    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* Header HUD */}
            <div className="flex-none p-8 text-center pb-2">
                <div className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase items-center gap-2 mb-4 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-lg' : 'bg-white text-indigo-600 border border-slate-100 shadow-sm'}`}>
                    <PenTool size={12} className="animate-pulse" /> Syntax Architect
                </div>
                <div className="flex justify-between items-center mb-2 px-2">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-40">Exercise {index + 1} / {pool.length}</span>
                    {wrongQueue.length > 0 && <span className="text-[10px] font-black text-rose-500 animate-pulse">Mastery Loop: {wrongQueue.length} Left</span>}
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 scrollbar-hide">
                <motion.div 
                    layout
                    className={`p-6 rounded-3xl border transition-all ${isDark ? 'bg-white/5 border-white/5 shadow-2xl' : 'bg-white border-slate-100 shadow-lg'}`}
                >
                    <h2 
                        className="text-lg sm:text-xl font-black leading-tight mb-8 tracking-tight"
                        dangerouslySetInnerHTML={{ __html: currentQ?.prompt }}
                    />

                    <div className="space-y-4">
                        <button 
                            onClick={() => setKbOpen(true)}
                            className={`w-full h-16 px-6 rounded-2xl border-2 text-base font-black transition-all flex items-center justify-between ${
                                feedback?.type === 'success' 
                                ? 'border-emerald-500 text-emerald-500 bg-emerald-50' 
                                : (feedback?.type === 'error' ? 'border-rose-500 text-rose-500 bg-rose-50' : (isDark ? 'bg-[#1E2530] border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-indigo-700'))
                            }`}
                        >
                            <span>{inputValue || <span className="opacity-30">Construct your sentence...</span>}</span>
                            {!feedback && <ChevronDown size={18} className="opacity-40" />}
                        </button>

                        <div className="flex flex-wrap gap-2">
                            {currentQ?.options?.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => fillInput(opt)}
                                    onMouseEnter={() => onOptionHoverStart?.(opt)}
                                    onMouseLeave={() => onOptionHoverEnd?.(opt)}
                                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${isDark ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10' : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-white hover:shadow-lg'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {feedback && (
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: 20, opacity: 0 }}
                            className={`p-5 rounded-2xl flex items-start gap-3 ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}
                        >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            </div>
                            <p className="text-[11px] font-black italic mt-1 leading-relaxed">{feedback.msg}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex-none p-8 pt-2">
                <AnimatePresence mode="wait">
                    {!feedback || feedback.type === 'error' ? (
                        <motion.button 
                            key="check"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={handleCheck}
                            disabled={!inputValue.trim()}
                            className={`w-full h-16 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                                inputValue.trim() ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-b-[4px] border-indigo-800 active:translate-y-1' : 'bg-slate-200 text-slate-400 border-b-[4px] border-slate-300'
                            }`}
                        >
                            <span className="relative z-10 flex items-center gap-2">Check Construction <Zap size={16} fill="currentColor" /></span>
                        </motion.button>
                    ) : (
                        <motion.button 
                            key="next"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={handleNext}
                            className="w-full h-16 bg-[#58cc02] hover:bg-[#46a302] text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 border-b-[4px] border-[#46a302] active:translate-y-1 transition-all"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {index < pool.length - 1 ? 'Next Blueprint' : (wrongQueue.length > 0 ? 'Retry Structural Errors' : 'Complete Architecture')} <ArrowRight size={18} />
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <ManyaKeyboard 
                isOpen={kbOpen}
                value={inputValue}
                onInput={onKbInput}
                onDelete={onKbDelete}
                onClose={() => setKbOpen(false)}
                onDone={() => setKbOpen(false)}
            />

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                b, strong { color: #818cf8; font-weight: 900; }
            `}</style>
        </div>
    );
};

export default SyntaxRenderer;
