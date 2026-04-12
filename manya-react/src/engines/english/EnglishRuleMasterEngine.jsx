import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, Trophy, Book, MessageSquare, ArrowRight, Zap, GraduationCap, Sparkles } from 'lucide-react';

/**
 * MANYA ENGLISH: RULE MASTER ENGINE (React v1.0)
 * ---------------------------------------------
 * - Adaptive layout for Vocabulary lists and Grammar rules.
 * - Interactive rule toggles (Case A / Case B).
 * - Premium bento-style "Formula Boards" and "Pro-Tips".
 * - Smooth step-based navigation for multi-rule quests.
 */

const EnglishRuleMasterEngine = ({ data, onComplete }) => {
    const [step, setStep] = useState(0);
    const [tab, setTab] = useState('A');
    const [isDark, setIsDark] = useState(false);

    const actualData = useMemo(() => data?.data || data || {}, [data]);
    const rules = useMemo(() => actualData.rules || [], [actualData]);
    const currentRule = rules[step];

    // Safely detect if there's no data (broken CDN ref or missing properties)
    const hasData = rules.length > 0 || actualData.type === "VOCABULARY_LIST";

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    if (!hasData) {
        return (
            <div className={`flex flex-col h-full items-center justify-center p-8 text-center ${isDark ? 'bg-[#0B0E14] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 text-rose-500">
                    <Zap size={32} />
                </div>
                <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Grammar Archive Missing</h3>
                <p className="text-sm font-bold opacity-70 max-w-xs">The rule set for this quest could not be retrieved from the CDN. Please check the referencePath in your quest JSON.</p>
                <button onClick={onComplete} className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Skip Step</button>
            </div>
        );
    }

    const nextStep = () => {
        window.QuestRunner?.setIsTyping?.(false);
        if (step < rules.length - 1) {
            setStep(s => s + 1);
            setTab('A');
        } else {
            onComplete();
        }
    };

    if (actualData.type === "VOCABULARY_LIST") {
        return (
            <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-700 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
                {/* Header Section: Cinematic HUD */}
                <div className="flex-none p-8 sm:p-14 sm:pb-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/10 blur-[130px] rounded-full -z-10" />
                    
                    <div className={`inline-flex px-6 py-2.5 rounded-2xl text-[10px] font-black tracking-[0.25em] uppercase items-center gap-3 mb-6 animate-in slide-in-from-top-4 duration-700 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white text-indigo-600 border border-indigo-100 shadow-xl shadow-indigo-500/5'}`}>
                        <Book size={16} className="text-indigo-500" /> Language Vault
                    </div>
                    
                    <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tighter leading-[0.9] animate-in fade-in duration-1000">
                        {actualData.topicTitle || 'Essential Words'}
                    </h1>
                    <p className={`text-xs sm:text-base font-bold opacity-60 max-w-sm mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Unlock the lexicon required to master high-level grammar.
                    </p>
                </div>

                {/* Word Gallery: High-Fidelity Cards */}
                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-4 space-y-4 sm:space-y-6 scrollbar-hide">
                    <div className="grid grid-cols-1 gap-6 max-w-2xl mx-auto pb-24">
                        {rules.map((word, i) => (
                            <div 
                                key={i}
                                className={`group p-8 rounded-[40px] border transition-all duration-500 hover:scale-[1.01] active:scale-[0.98] animate-in slide-in-from-bottom-12 ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10 shadow-2xl shadow-black/30' : 'bg-white border-slate-100 shadow-2xl shadow-slate-200/40 hover:border-indigo-100'}`}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-3 h-12 rounded-full bg-indigo-600 group-hover:scale-y-110 transition-transform origin-center" />
                                            <h3 className={`text-3xl sm:text-4xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {word.word}
                                            </h3>
                                        </div>
                                        <div className={`p-4 rounded-2xl border-l-[6px] ${isDark ? 'bg-white/5 border-emerald-500/50 text-slate-300' : 'bg-slate-50 border-emerald-500 text-slate-700'}`}>
                                            <p className="text-base sm:text-lg font-bold leading-relaxed italic">
                                                {word.meaning}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex w-16 h-16 rounded-[28px] items-center justify-center transition-all shadow-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                        <Zap size={28} fill="currentColor" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="flex-none p-10 pt-4 pb-12 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-[#0B0E14] dark:via-[#0B0E14]">
                    <button 
                        onClick={onComplete}
                        className="w-full h-20 bg-indigo-600 text-white rounded-[32px] font-black text-[13px] tracking-[0.25em] uppercase flex items-center justify-center gap-5 shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-600/60 active:scale-95 transition-all group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                        <span className="relative">Proceed to Rules</span>
                        <ArrowRight size={24} className="relative group-hover:translate-x-4 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-all duration-700 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* 1. COMPACT APP HEADER */}
            <div className="flex-none px-6 pt-4 pb-2 text-center relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/10">
                    <Zap size={12} fill="currentColor" /> Logic Map
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mt-1">
                    {currentRule?.title || 'The Rule'}
                </h1>
                <div className="flex items-center justify-center gap-1 mt-2">
                    {rules.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-indigo-600' : 'w-1 bg-slate-300 dark:bg-slate-700'}`} />
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-4 scrollbar-hide pb-28">
                
                {/* 2. PRECISION LOGIC MODULE (Horizontal) */}
                <div className={`relative p-5 rounded-[32px] overflow-hidden transition-all duration-500 ${isDark ? 'bg-white/5 border border-white/5 shadow-2xl' : 'bg-white border border-slate-100 shadow-xl shadow-slate-200/50'}`}>
                    <div className="flex flex-col gap-3">
                        {currentRule?.formula?.split('|').map((branch, bIdx) => (
                            <div key={bIdx} className="flex items-center justify-between gap-2 bg-slate-100/50 dark:bg-white/5 p-3 rounded-2xl relative">
                                {branch.split('->').map((part, pIdx) => (
                                    <React.Fragment key={pIdx}>
                                        {pIdx > 0 && <ArrowRight size={16} className="text-indigo-500 opacity-40 shrink-0" />}
                                        <div className="flex-1 text-center font-black text-[13px] sm:text-base font-mono tracking-tight text-indigo-600 dark:text-indigo-400 truncate">
                                            {part.trim()}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. APP TOGGLES */}
                {currentRule?.toggleA && (
                    <div className={`p-1.5 rounded-2xl flex gap-1 ${isDark ? 'bg-white/5' : 'bg-slate-200/50'}`}>
                        <button 
                            onClick={() => setTab('A')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'A' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            {currentRule?.toggleA}
                        </button>
                        <button 
                            onClick={() => setTab('B')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'B' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            {currentRule?.toggleB}
                        </button>
                    </div>
                )}

                {/* 4. COMPACT EXAMPLE CARD */}
                <div key={`${step}-${tab}`} className={`relative p-6 rounded-[32px] transition-all duration-500 animate-in slide-in-from-right-4 ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white shadow-xl shadow-slate-200/30 border border-slate-50'}`}>
                    <div className="absolute top-0 right-6 px-3 py-1 bg-emerald-500 text-white rounded-b-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                        In Action
                    </div>
                    
                    <div className="space-y-4 pt-2">
                        <div 
                            className={`text-xl font-black leading-snug tracking-tight pr-4 ${isDark ? 'text-white' : 'text-slate-800'}`}
                            dangerouslySetInnerHTML={{ __html: tab === 'A' ? currentRule?.exampleA : currentRule?.exampleB }}
                        />
                        
                        <div className={`p-4 rounded-2xl flex gap-3 shadow-inner ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <Sparkles size={20} fill="currentColor" />
                            </div>
                            <p className={`text-xs sm:text-sm font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {tab === 'A' ? currentRule?.explainA : currentRule?.explainB}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 5. STRATEGY CHIP */}
                {currentRule?.teacherNote && (
                    <div className={`p-5 rounded-3xl bg-amber-500 text-white flex gap-4 items-center shadow-lg shadow-amber-500/20 active:scale-95 transition-all`}>
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                            <Lightbulb size={24} fill="currentColor" />
                        </div>
                        <div className="space-y-0.5">
                            <div className="text-[9px] font-black uppercase tracking-widest opacity-70">Pro Tip</div>
                            <p className="text-xs sm:text-sm font-black leading-tight">
                                {currentRule?.teacherNote}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 6. FIXED UTILITY ACTION BAR */}
            <div className="flex-none p-4 pb-8 bg-white/80 dark:bg-[#0B0E14]/80 backdrop-blur-xl border-t border-slate-100 dark:border-white/10 relative z-20">
                <button 
                    onClick={nextStep}
                    className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all group overflow-hidden"
                >
                    <span className="relative">
                        {step < rules.length - 1 ? 'Master This Rule' : 'Ignite Practice'}
                    </span>
                    <ArrowRight size={20} className="relative group-hover:translate-x-2 transition-transform duration-300" />
                </button>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                b, strong { color: #818cf8; font-weight: 900; }
                u { text-decoration: none; border-bottom: 3px solid #10b981; padding-bottom: 1px; }
                .dark u { border-color: #34d399; }
                #SimulationBridge { background: transparent !important; }
            `}</style>
        </div>
    );
}
;

EnglishRuleMasterEngine.hideGlobalFooter = true;
export default EnglishRuleMasterEngine;
