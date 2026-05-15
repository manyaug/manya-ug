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

    const actualData = useMemo(() => initializeRuleData(data?.data || data), [data]);
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

    // 🛡️ AUTO-SKIP: If we have no valid rules, don't block the student.
    // Auto-complete this step so the quest advances to the next content.
    useEffect(() => {
        const isVocab = actualData.type === "VOCABULARY_LIST";
        if (!hasValidRules(rules, actualData.type) && !isVocab) {
            const hasRef = data?.referencePath || data?.data?.referencePath;
            console.warn(`[RuleMaster] No rules in data — auto-skipping step.`, { 
                id: data?.id,
                hasReferencePath: !!hasRef,
                ref: hasRef,
                dataKeys: Object.keys(data || {}) 
            });
            const timer = setTimeout(() => onComplete?.(), 50);
            return () => clearTimeout(timer);
        }
    }, [rules, actualData.type, onComplete, data]);

    if (!hasValidRules(rules, actualData.type)) {
        return null; // Render nothing while auto-skip fires
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
