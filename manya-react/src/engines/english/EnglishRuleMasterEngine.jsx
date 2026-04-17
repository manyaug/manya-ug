import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';

// Decoupled Resources
import { initializeRuleData, hasValidRules, calculateRuleScoring } from './RuleMaster/RuleLogic';
import RuleRenderer from './RuleMaster/RuleRenderer';

/**
 * MANYA ENGLISH: RULE MASTER ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates instructional logic from Rule-card rendering.
 */

const EnglishRuleMasterEngine = ({ data, onComplete }) => {
    const [step, setStep] = useState(0);
    const [tab, setTab] = useState('A');
    const [isDark, setIsDark] = useState(false);
    const startTimeRef = useRef(Date.now());

    const actualData = useMemo(() => initializeRuleData(data), [data]);
    const rules = actualData.rules;
    const currentRule = rules[step];

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    if (!hasValidRules(rules, actualData.type)) {
        return (
            <div className={`flex flex-col h-full items-center justify-center p-8 text-center ${isDark ? 'bg-[#0B0E14] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Grammar Archive Missing</h3>
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
            handleFinish();
        }
    };

    const handleFinish = () => {
        const result = calculateRuleScoring(step, rules.length, startTimeRef.current);
        if (onComplete) onComplete(result);
    };

    return (
        <RuleRenderer 
            isDark={isDark} step={step} tab={tab} totalRules={rules.length} 
            currentRule={currentRule} actualData={actualData} setTab={setTab} 
            onNext={nextStep} onComplete={handleFinish} 
        />
    );
};

EnglishRuleMasterEngine.hideGlobalFooter = true;
export default EnglishRuleMasterEngine;
