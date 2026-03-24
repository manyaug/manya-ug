import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, Trophy, Book, MessageSquare, ArrowRight, Zap, GraduationCap } from 'lucide-react';

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

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

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
            <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
                {/* Header Section */}
                <div className="flex-none p-10 pb-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -z-10" />
                    
                    <div className={`inline-flex px-5 py-2.5 rounded-[20px] text-[10px] font-black tracking-[0.2em] uppercase items-center gap-3 mb-6 animate-in slide-in-from-top-4 duration-700 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white text-indigo-600 border border-indigo-100 shadow-xl shadow-indigo-500/5'}`}>
                        <Book size={14} className="animate-pulse" /> Language Vault
                    </div>
                    
                    <h1 className="text-4xl font-black mb-4 tracking-tight leading-tight animate-in fade-in duration-1000">
                        {actualData.topicTitle || 'Essential Words'}
                    </h1>
                    <p className={`text-sm font-bold opacity-60 max-w-xs mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Master these key terms to unlock the secrets of this quest.
                    </p>
                </div>

                {/* Word Gallery */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-hide">
                    <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                        {rules.map((word, i) => (
                            <div 
                                key={i}
                                className={`group p-8 rounded-[40px] border transition-all duration-500 hover:scale-[1.02] active:scale-95 animate-in slide-in-from-bottom-8 ${isDark ? 'bg-white/5 border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 shadow-2xl shadow-black/20' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/40 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/10'}`}
                                style={{ animationDelay: `${i * 120}ms` }}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-8 rounded-full bg-indigo-500 group-hover:h-10 transition-all duration-300" />
                                            <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                {word.word}
                                            </h3>
                                        </div>
                                        <p className={`text-sm sm:text-base font-bold pl-5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {word.meaning}
                                        </p>
                                    </div>
                                    <div className={`hidden sm:flex w-12 h-12 rounded-2xl items-center justify-center transition-all ${isDark ? 'bg-white/5 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                        <Zap size={20} fill="currentColor" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="flex-none p-8 pt-4">
                    <button 
                        onClick={onComplete}
                        className="w-full h-18 bg-indigo-600 text-white rounded-[32px] font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 active:scale-95 transition-all group overflow-hidden relative"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <span className="relative">Ready to Practice</span>
                        <ArrowRight size={20} className="relative group-hover:translate-x-2 transition-transform" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* Header HUD */}
            <div className="flex-none p-8 text-center pb-0">
                <div className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase items-center gap-2 mb-4 ${isDark ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    <GraduationCap size={12} fill="currentColor" /> Rule {step + 1} of {rules.length}
                </div>
                <h1 className="text-2xl font-black mb-6 tracking-tight leading-tight">{currentRule?.title}</h1>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 scrollbar-hide">
                
                {/* 1. Formula Board */}
                <div className={`p-8 rounded-[40px] border-l-8 border-indigo-500 text-center transition-all animate-in zoom-in duration-500 ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200 shadow-inner'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">Key Formula</span>
                    <div className={`text-xl font-black font-mono ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                        {currentRule?.formula}
                    </div>
                </div>

                {/* 2. Toggle Tabs */}
                <div className="flex p-1 rounded-2xl bg-slate-200 dark:bg-white/5 gap-1">
                    <button 
                        onClick={() => setTab('A')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'A' ? 'bg-white dark:bg-indigo-600 shadow-md text-slate-900 dark:text-white' : 'text-slate-500'}`}
                    >
                        {currentRule?.toggleA}
                    </button>
                    <button 
                        onClick={() => setTab('B')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'B' ? 'bg-white dark:bg-indigo-600 shadow-md text-slate-900 dark:text-white' : 'text-slate-500'}`}
                    >
                        {currentRule?.toggleB}
                    </button>
                </div>

                {/* 3. Example Display */}
                <div key={tab} className={`p-8 rounded-[40px] border transition-all animate-in slide-in-from-right-4 duration-500 ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-lg'}`}>
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                            <MessageSquare size={18} />
                        </div>
                        <div className={`text-base sm:text-lg font-black leading-snug ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            {tab === 'A' ? currentRule?.exampleA : currentRule?.exampleB}
                        </div>
                    </div>
                    <p className={`text-sm font-bold pl-14 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {tab === 'A' ? currentRule?.explainA : currentRule?.explainB}
                    </p>
                </div>

                {/* 4. Pro-Tip */}
                <div className={`p-6 rounded-[32px] flex items-start gap-4 transition-all ${isDark ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Lightbulb size={20} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1 block">Teacher's Note</span>
                        <p className={`text-xs font-black leading-relaxed ${isDark ? 'text-amber-200/70' : 'text-amber-900/70'}`}>
                            {currentRule?.teacherNote}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-none p-8 pt-2">
                <button 
                    onClick={nextStep}
                    className="w-full h-16 bg-indigo-600 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 active:scale-95 transition-all"
                >
                    {step < rules.length - 1 ? 'Next Rule' : 'Begin Practice'} <ArrowRight size={18} />
                </button>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    );
};

EnglishRuleMasterEngine.hideGlobalFooter = true;
export default EnglishRuleMasterEngine;
