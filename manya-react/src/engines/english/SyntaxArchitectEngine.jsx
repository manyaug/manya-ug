import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { normalizeSyntax, validateStructure, calculateSyntaxScoring } from './SyntaxArchitect/SyntaxLogic';
import SyntaxRenderer from './SyntaxArchitect/SyntaxRenderer';
import { useBehavioralTracker } from '../../hooks/useBehavioralTracker';

/**
 * MANYA ENGLISH: SYNTAX ARCHITECT ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates structural validation from the bento-card UI and mastery-loop.
 */

const SyntaxArchitectEngine = ({ data, onResult, onComplete }) => {
    const [pool, setPool] = useState([]);
    const [index, setIndex] = useState(0);
    const [wrongQueue, setWrongQueue] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState(null); 
    const [isDark, setIsDark] = useState(false);
    const [kbOpen, setKbOpen] = useState(false);

    const startTimeRef = useRef(Date.now());
    const mistakesRef = useRef(0);

    const { 
        metrics, 
        recordAnswerSelection, 
        onOptionHoverStart, 
        onOptionHoverEnd, 
        resetMetrics 
    } = useBehavioralTracker(!!pool.length);
    const initialQuestions = useMemo(() => {
        // v9.9: Hardened Data Extraction
        const payload = data?.data || data;
        const raw = payload?.questions || payload?.queries || payload?.items || payload?.items_list || [];
        
        if (Array.isArray(raw) && raw.length > 0) return raw;
        return [{
            prompt: "She ___ (to be) a doctor.",
            options: ["is", "am", "are"],
            expected: "is",
            hint: "Third person singular of 'to be'."
        }];
    }, [data]);
    const currentQ = pool[index] || { prompt: "", options: [], expected: "" };

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    // 1. Initialize Game
    useEffect(() => {
        setPool([...initialQuestions]);
        setIndex(0);
        setWrongQueue([]);
        setFeedback(null);
        resetMetrics();
    }, [initialQuestions, resetMetrics]);

    const handleCheck = () => {
        if (!currentQ || feedback?.type === 'success') return;

        const isCorrect = validateStructure(inputValue, currentQ.expected);

        if (isCorrect) {
            setFeedback({ type: 'success', msg: 'Perfectly Constructed!' });
            audioService.success?.();
        } else {
            setFeedback({ type: 'error', msg: currentQ.hint || 'Check your spelling or grammar!' });
            if (!wrongQueue.some(q => q.prompt === currentQ.prompt)) {
                setWrongQueue(prev => [...prev, currentQ]);
                mistakesRef.current += 1;
            }
            audioService.error?.();
        }
    };

    const handleNext = () => {
        window.QuestRunner?.setIsTyping?.(false);
        setFeedback(null);
        setInputValue('');
        
        if (index < pool.length - 1) {
            setIndex(i => i + 1);
        } else if (wrongQueue.length > 0) {
            setPool([...wrongQueue]);
            setWrongQueue([]);
            setIndex(0);
            resetMetrics();
        } else {
            handleFinishResult();
        }
    };

    const fillInput = (option) => {
        if (feedback?.type === 'success') return;
        setInputValue(option);
        setFeedback(null);
        recordAnswerSelection(option);
    };

    const handleFinishResult = () => {
        const baseResult = calculateSyntaxScoring(mistakesRef.current, initialQuestions.length, startTimeRef.current);
        const result = {
            ...baseResult,
            ...metrics, // Inject [idleTimeMs, hesitationCount, tabSwitched, etc.]
            engineType: 'SYNTAX_ENGINE',
            type: 'simulation'
        };
        if (onResult) onResult(result);
        if (onComplete) onComplete();
    };

    const handleKbInput = (val) => setInputValue(p => p + val);
    const handleKbDelete = () => setInputValue(p => p.slice(0, -1));

    return (
        <SyntaxRenderer 
            isDark={isDark} pool={pool} index={index} 
            wrongQueue={wrongQueue} currentQ={currentQ} 
            inputValue={inputValue} feedback={feedback} 
            setInputValue={setInputValue} 
            handleCheck={handleCheck} handleNext={handleNext} 
            fillInput={fillInput} onComplete={handleFinishResult} 
            kbOpen={kbOpen} setKbOpen={setKbOpen}
            onKbInput={handleKbInput} onKbDelete={handleKbDelete}
            onOptionHoverStart={onOptionHoverStart}
            onOptionHoverEnd={onOptionHoverEnd}
        />
    );
};

SyntaxArchitectEngine.hideGlobalFooter = true;
export default SyntaxArchitectEngine;
