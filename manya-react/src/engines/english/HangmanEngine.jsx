import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';

// Decoupled Resources
import { initializeHangmanData, processGuess, calculateHangmanScoring } from './Hangman/HangmanLogic';
import HangmanRenderer from './Hangman/HangmanRenderer';

/**
 * MANYA ENGLISH: HANGMAN ENGINE v2.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates word validation and gallows logic from the visual layer.
 */

const HangmanEngine = ({ data, onComplete }) => {
    const [wordIdx, setWordIdx] = useState(0);
    const [guessedLetters, setGuessedLetters] = useState(new Set());
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [status, setStatus] = useState('playing'); // playing | won | lost
    const [isDark, setIsDark] = useState(false);
    const resultsRef = useRef([]);
    const startTimeRef = useRef(Date.now());

    const words = useMemo(() => initializeHangmanData(data), [data]);
    const currentWordData = words[wordIdx];

    // --- 🪄 THEME SYNC ---
    useLayoutEffect(() => {
        const checkTheme = () => setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
        checkTheme();
        const obs = new MutationObserver(checkTheme);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => obs.disconnect();
    }, []);

    const handleGuess = useCallback((letter) => {
        if (status !== 'playing' || guessedLetters.has(letter)) return;

        const { isCorrect, nextIncorrect, nextGuessed, status: nextStatus } = processGuess(
            letter, 
            currentWordData.word, 
            guessedLetters, 
            incorrectCount
        );

        setGuessedLetters(nextGuessed);
        setIncorrectCount(nextIncorrect);
        setStatus(nextStatus);

        if (isCorrect) audioService.success?.();
        else audioService.error?.();
    }, [status, guessedLetters, currentWordData.word, incorrectCount]);

    const nextWord = () => {
        // Track results for final scoring
        resultsRef.current[wordIdx] = { word: currentWordData.word, status };

        if (wordIdx < words.length - 1) {
            setWordIdx(prev => prev + 1);
            setGuessedLetters(new Set());
            setIncorrectCount(0);
            setStatus('playing');
        } else {
            const finalResult = calculateHangmanScoring(resultsRef.current, startTimeRef.current);
            if (onComplete) onComplete(finalResult);
        }
    };

    const resetWord = () => {
        setGuessedLetters(new Set());
        setIncorrectCount(0);
        setStatus('playing');
    };

    return (
        <HangmanRenderer 
            isDark={isDark} wordIdx={wordIdx} words={words} 
            currentWord={currentWordData.word} hint={currentWordData.hint} 
            guessedLetters={guessedLetters} incorrectCount={incorrectCount} 
            status={status} handleGuess={handleGuess} 
            resetWord={resetWord} nextWord={nextWord} 
        />
    );
};

HangmanEngine.hideGlobalFooter = true;
export default HangmanEngine;
