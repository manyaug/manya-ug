import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { normalizeSyntax, validateStructure, calculateSyntaxScoring } from './SyntaxArchitect/SyntaxLogic';
import SyntaxRenderer from './SyntaxArchitect/SyntaxRenderer';

/**
 * MANYA ENGLISH: SYNTAX ARCHITECT ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates structural validation from the bento-card UI and mastery-loop.
 */

const SyntaxArchitectEngine = ({ data, onComplete }) => {
    const [pool, setPool] = useState([]);
    const [index, setIndex] = useState(0);
    const [wrongQueue, setWrongQueue] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [feedback, setFeedback] = useState(null); 
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const startTimeRef = useRef(Date.now());
    const mistakesRef = useRef(0);
    const initialQuestions = useMemo(() => data?.questions || [], [data]);
    const currentQ = pool[index];

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
        setShowFinish(false);
    }, [initialQuestions]);

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
        } else {
            setShowFinish(true);
        }
    };

    const fillInput = (option) => {
        if (feedback?.type === 'success') return;
        setInputValue(option);
        setFeedback(null);
    };

    const handleFinishResult = () => {
        const result = calculateSyntaxScoring(mistakesRef.current, initialQuestions.length, startTimeRef.current);
        if (onComplete) onComplete(result);
    };

    return (
        <SyntaxRenderer 
            isDark={isDark} pool={pool} index={index} 
            wrongQueue={wrongQueue} currentQ={currentQ} 
            inputValue={inputValue} feedback={feedback} 
            showFinish={showFinish} setInputValue={setInputValue} 
            handleCheck={handleCheck} handleNext={handleNext} 
            fillInput={fillInput} onComplete={handleFinishResult} 
        />
    );
};

SyntaxArchitectEngine.hideGlobalFooter = true;
export default SyntaxArchitectEngine;
