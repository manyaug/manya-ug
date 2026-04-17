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
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/10 blur-[130px] rounded-full -z-10" />
                    <div className={`inline-flex px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase items-center gap-3 mb-6 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white shadow-xl shadow-indigo-500/5 text-indigo-600 border'}`}>
                        <Book size={16} /> Language Vault
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tighter leading-none animate-in fade-in duration-1000">
                        {actualData.topicTitle}
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 scrollbar-hide">
                    <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto pb-24">
                        {actualData.rules.map((word, i) => (
                            <motion.div 
                                key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
                                className={`group p-8 rounded-[40px] border transition-all duration-500 hover:scale-[1.01] ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-2xl shadow-slate-200/40'}`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-3 h-12 rounded-full bg-indigo-600 transition-transform" />
                                            <h3 className="text-3xl font-black tracking-tighter">{word.word}</h3>
                                        </div>
                                        <div className={`p-4 rounded-2xl border-l-[6px] ${isDark ? 'bg-white/5 border-emerald-500/50 text-slate-300' : 'bg-slate-50 border-emerald-500 text-slate-700'}`}>
                                            <p className="text-base font-bold leading-relaxed italic">{word.meaning}</p>
                                        </div>
                                    </div>
                                    <div className={`flex w-16 h-16 rounded-[28px] items-center justify-center transition-all shadow-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                        <Zap size={28} fill="currentColor" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="flex-none p-10 pt-4 pb-12 bg-gradient-to-t from-slate-50 dark:from-[#0B0E14]">
                    <button onClick={onComplete} className="w-full h-20 bg-indigo-600 text-white rounded-[32px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-5 shadow-2xl active:scale-95 transition-all outline-none">
                        Proceed to Rules <ArrowRight size={24} />
                    </button>
                </div>
            </div>
        );
    }

    // 2. Grammar Rules View
    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-all duration-700 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            <div className="flex-none px-6 pt-6 pb-2 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/10">
                    <Zap size={12} fill="currentColor" /> Logic Map
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mt-1">
                    {currentRule?.title || 'The Rule'}
                </h1>
                <div className="flex items-center justify-center gap-1 mt-2">
                    {Array.from({ length: totalRules }).map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-indigo-600' : 'w-1 bg-slate-300 dark:bg-slate-700'}`} />
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 scrollbar-hide pb-28">
                {/* Rule Formula Chips */}
                <div className={`relative p-5 rounded-[32px] transition-all duration-500 ${isDark ? 'bg-white/5 border border-white/5 shadow-2xl' : 'bg-white border border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                    <div className="flex flex-col gap-3">
                        {currentRule?.formula?.split('|').map((branch, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between gap-2 bg-slate-100/50 dark:bg-white/5 p-3 rounded-2xl">
                                {branch.split('->').map((part, pIdx) => (
                                    <React.Fragment key={pIdx}>
                                        {pIdx > 0 && <ArrowRight size={16} className="text-indigo-500 opacity-40 shrink-0" />}
                                        <div className="flex-1 text-center font-black text-sm tracking-tight text-indigo-600 dark:text-indigo-400 truncate uppercase">
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
                    <div className={`p-1.5 rounded-2xl flex gap-1 ${isDark ? 'bg-white/5' : 'bg-slate-200/50'}`}>
                        <button onClick={() => setTab('A')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'A' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
                            {currentRule?.toggleA}
                        </button>
                        <button onClick={() => setTab('B')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>
                            {currentRule?.toggleB}
                        </button>
                    </div>
                )}

                {/* Example Content */}
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={`${step}-${tab}`} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                        className={`relative p-6 rounded-[32px] transition-all duration-500 ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white shadow-xl shadow-slate-200/30 border border-slate-50'}`}
                    >
                        <div className="absolute top-0 right-6 px-3 py-1 bg-emerald-500 text-white rounded-b-xl text-[8px] font-black uppercase tracking-widest shadow-lg">
                            In Action
                        </div>
                        <div className="space-y-4 pt-2">
                            <div className={`text-xl font-black leading-snug tracking-tight pr-4 ${isDark ? 'text-white' : 'text-slate-800'}`} dangerouslySetInnerHTML={{ __html: tab === 'A' ? currentRule?.exampleA : currentRule?.exampleB }} />
                            <div className={`p-4 rounded-2xl flex gap-3 shadow-inner ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                                <Sparkles size={20} className="text-emerald-500 shrink-0" />
                                <p className={`text-xs sm:text-sm font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {tab === 'A' ? currentRule?.explainA : currentRule?.explainB}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Strategy Note */}
                {currentRule?.teacherNote && (
                    <div className="p-5 rounded-3xl bg-amber-500 text-white flex gap-4 items-center shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                        <Lightbulb size={24} className="shrink-0" />
                        <div className="space-y-0.5">
                            <div className="text-[9px] font-black uppercase tracking-widest opacity-70">Pro Tip</div>
                            <p className="text-xs sm:text-sm font-black leading-tight">{currentRule?.teacherNote}</p>
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
