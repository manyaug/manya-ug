import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Book, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';

/**
 * RULE MASTER RENDERER
 * Stateless UI component for grammar rules and focus-vocabulary galleries.
 */

const RuleRenderer = ({ 
    isDark, 
    step, 
    tab, 
    totalRules, 
    currentRule, 
    actualData, 
    setTab, 
    onNext, 
    onComplete 
}) => {
    // 1. Vocabulary View
    if (actualData.type === "VOCABULARY_LIST") {
        return (
            <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-700 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
                <div className="flex-none p-10 sm:p-14 sm:pb-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -z-10" />
                    <div className={`inline-flex px-4 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase items-center gap-2 mb-4 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white shadow-sm text-indigo-600 border border-slate-100'}`}>
                        <Book size={14} /> Language Vault
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black mb-2 tracking-tighter leading-tight animate-in fade-in duration-1000">
                        {actualData.topicTitle}
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 scrollbar-hide">
                    <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto pb-24">
                        {actualData.rules.map((word, i) => (
                            <motion.div 
                                key={i} initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}
                                className={`group p-6 rounded-3xl border transition-all duration-300 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
                                            <h3 className="text-xl font-black tracking-tight">{word.word}</h3>
                                        </div>
                                        <div className={`p-3 rounded-xl border-l-[4px] ${isDark ? 'bg-white/5 border-emerald-500/30 text-slate-400' : 'bg-slate-50 border-emerald-500/50 text-slate-600'}`}>
                                            <p className="text-sm font-bold leading-relaxed">{word.meaning}</p>
                                        </div>
                                    </div>
                                    <div className={`flex w-12 h-12 rounded-2xl items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                                        <Zap size={20} fill="currentColor" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="flex-none p-6 pt-2 pb-8 bg-gradient-to-t from-slate-50 dark:from-[#0B0E14]">
                    <button onClick={onComplete} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all outline-none">
                        Proceed to Rules <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    // 2. Grammar Rules View
    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-all duration-700 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            <div className="flex-none px-6 pt-3 pb-1 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest border border-indigo-500/10">
                    <Zap size={10} fill="currentColor" /> Logic Map
                </div>
                <h1 className="text-2xl font-black tracking-tight leading-tight mt-1">
                    {currentRule?.title || 'The Rule'}
                </h1>
                <div className="flex items-center justify-center gap-1 mt-2">
                    {Array.from({ length: totalRules }).map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-300 dark:bg-slate-800'}`} />
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 scrollbar-hide pb-28">
                {/* Rule Formula Chips */}
                <div className={`relative p-5 rounded-3xl transition-all duration-500 ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white border border-slate-100 shadow-sm'}`}>
                    <div className="flex flex-col gap-2">
                        {currentRule?.formula?.split('|').map((branch, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between gap-2 bg-slate-100/30 dark:bg-white/5 p-3 rounded-2xl border border-transparent dark:border-white/5">
                                {branch.split('->').map((part, pIdx) => (
                                    <React.Fragment key={pIdx}>
                                        {pIdx > 0 && <ArrowRight size={14} className="text-indigo-500 opacity-40 shrink-0" />}
                                        <div className="flex-1 text-center font-black text-xs tracking-tight text-indigo-500 truncate uppercase">
                                            {part.trim()}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Case Toggles */}
                {currentRule?.toggleA && (
                    <div className={`p-1 rounded-2xl flex gap-1 ${isDark ? 'bg-white/5' : 'bg-slate-200/50'}`}>
                        <button onClick={() => setTab('A')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'A' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500'}`}>
                            {currentRule?.toggleA}
                        </button>
                        <button onClick={() => setTab('B')} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'B' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500'}`}>
                            {currentRule?.toggleB}
                        </button>
                    </div>
                )}

                {/* Example Content */}
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={`${step}-${tab}`} initial={{ x: 15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -15, opacity: 0 }}
                        className={`relative p-5 rounded-3xl transition-all duration-500 ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white shadow-sm border border-slate-50'}`}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                In Action
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className={`text-lg font-black leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`} dangerouslySetInnerHTML={{ __html: tab === 'A' ? currentRule?.exampleA : currentRule?.exampleB }} />
                            <div className={`p-3.5 rounded-2xl flex gap-3 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                                <Sparkles size={18} className="text-emerald-500 shrink-0" />
                                <p className={`text-xs font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {tab === 'A' ? currentRule?.explainA : currentRule?.explainB}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Strategy Note */}
                {currentRule?.teacherNote && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex gap-3 items-start">
                        <Lightbulb size={18} className="shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                            <div className="text-[8px] font-black uppercase tracking-widest opacity-80">Pro Tip</div>
                            <p className="text-xs font-bold leading-tight">{currentRule?.teacherNote}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="flex-none p-4 pb-10 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-t border-slate-100 dark:border-white/10 relative z-20">
                <button onClick={onNext} className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                    {step < totalRules - 1 ? 'Master This Rule' : 'Ignite Practice'} <ArrowRight size={20} />
                </button>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                b, strong { color: #818cf8; font-weight: 900; }
                u { text-decoration: none; border-bottom: 3px solid #10b981; padding-bottom: 1px; }
            `}</style>
        </div>
    );
};

export default RuleRenderer;
