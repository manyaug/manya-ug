import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Lightbulb, Trophy, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

/**
 * MANYA ENGLISH: HANGMAN ENGINE (React v1.0)
 * -----------------------------------------
 * - Sleek SVG-based gallows and figure animations.
 * - Premium glassmorphic UI with tactile keyboard.
 * - Adaptive layout for mobile and desktop.
 * - Multi-word support with progress tracking.
 */

const HangmanEngine = ({ data, onComplete }) => {
    const [wordIdx, setWordIdx] = useState(0);
    const [guessedLetters, setGuessedLetters] = useState(new Set());
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [status, setStatus] = useState('playing'); // playing | won | lost
    const [isDark, setIsDark] = useState(false);

    const maxIncorrect = 6;
    const words = useMemo(() => {
        if (!data || !data.words) return [{ word: 'MANYA', hint: 'The learning app.' }];
        return data.words.map(w => {
            if (typeof w === 'string') return { word: w.toUpperCase(), hint: 'A mystery word.' };
            return { word: w.word.toUpperCase(), hint: w.hint || 'A mystery word.' };
        });
    }, [data]);

    const currentWordData = words[wordIdx];
    const currentWord = currentWordData.word;
    const hint = currentWordData.hint;

    // Detect dark mode
    useEffect(() => {
        const checkDark = () => {
            const isDarkSet = document.documentElement.classList.contains('dark') || 
                             getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)';
            setIsDark(isDarkSet);
        };
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleGuess = useCallback((letter) => {
        if (status !== 'playing' || guessedLetters.has(letter)) return;

        const newGuessed = new Set(guessedLetters);
        newGuessed.add(letter);
        setGuessedLetters(newGuessed);

        if (!currentWord.includes(letter)) {
            setIncorrectCount(prev => prev + 1);
            window.ManyaAudio?.error?.();
        } else {
            window.ManyaAudio?.success?.();
        }
    }, [status, guessedLetters, currentWord]);

    // Check Win/Loss
    useEffect(() => {
        const wordChars = currentWord.replace(/[^A-Z]/g, '').split('');
        const isWon = wordChars.every(char => guessedLetters.has(char));
        const isLost = incorrectCount >= maxIncorrect;

        if (isWon) setStatus('won');
        else if (isLost) setStatus('lost');
    }, [guessedLetters, incorrectCount, currentWord]);

    const nextWord = () => {
        if (wordIdx < words.length - 1) {
            setWordIdx(prev => prev + 1);
            setGuessedLetters(new Set());
            setIncorrectCount(0);
            setStatus('playing');
        } else {
            onComplete();
        }
    };

    const resetWord = () => {
        setGuessedLetters(new Set());
        setIncorrectCount(0);
        setStatus('playing');
    };

    // Render Helpers
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    // SVG Gallows Figure Parts
    const renderFigure = () => {
        const parts = [
            <circle key="head" cx="70" cy="45" r="10" stroke="#ef4444" strokeWidth="4" fill="none" className={`hangman-part ${incorrectCount > 0 ? 'visible' : ''}`} />,
            <line key="body" x1="70" y1="55" x2="70" y2="85" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`hangman-part ${incorrectCount > 1 ? 'visible' : ''}`} />,
            <line key="l-arm" x1="70" y1="65" x2="55" y2="75" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`hangman-part ${incorrectCount > 2 ? 'visible' : ''}`} />,
            <line key="r-arm" x1="70" y1="65" x2="85" y2="75" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`hangman-part ${incorrectCount > 3 ? 'visible' : ''}`} />,
            <line key="l-leg" x1="70" y1="85" x2="55" y2="100" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`hangman-part ${incorrectCount > 4 ? 'visible' : ''}`} />,
            <line key="r-leg" x1="70" y1="85" x2="85" y2="100" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`hangman-part ${incorrectCount > 5 ? 'visible' : ''}`} />,
        ];
        return parts;
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* 1. Header & Gallows Area */}
            <div className="flex-[1.2] relative flex flex-col items-center justify-center p-6">
                <div className="absolute top-6 inset-x-6 flex justify-between items-center z-10">
                    <div className={`px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-white text-indigo-600 border border-slate-100 shadow-sm'}`}>
                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                        Hangman Challenge
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold ${isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-200/50 text-slate-400'}`}>
                        {wordIdx + 1} / {words.length}
                    </div>
                </div>

                {/* Gallows SVG */}
                <svg viewBox="0 0 100 120" className="w-full max-w-[200px] h-auto drop-shadow-2xl">
                    <path d="M20 110 L80 110 M30 110 L30 20 L70 20 L70 35" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-20" />
                    {renderFigure()}
                </svg>

                {/* Word Slots */}
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                    {currentWord.split('').map((char, i) => {
                        const isVisible = guessedLetters.has(char) || char === ' ' || char === '-';
                        return (
                            <div 
                                key={i} 
                                className={`w-8 h-10 border-b-4 flex items-center justify-center text-2xl font-black transition-all duration-300 ${char === ' ' ? 'border-transparent w-4' : (isVisible ? 'border-indigo-500 text-indigo-500 scale-110' : 'border-slate-300 text-transparent')}`}
                            >
                                {isVisible ? char : ''}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 2. Gameplay Area */}
            <div className={`flex-1 flex flex-col rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] relative z-10 overflow-hidden ${isDark ? 'bg-[#151921]' : 'bg-white'}`}>
                
                {/* Hint Bar */}
                <div className={`px-8 py-4 flex items-center gap-3 border-b ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Lightbulb size={16} />
                    </div>
                    <p className={`text-xs font-bold leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {hint}
                    </p>
                </div>

                {/* Keyboard Grid */}
                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                    {status === 'playing' ? (
                        <div className="grid grid-cols-7 sm:grid-cols-9 gap-2">
                            {alphabet.map(letter => {
                                const isGuessed = guessedLetters.has(letter);
                                const isCorrect = isGuessed && currentWord.includes(letter);
                                return (
                                    <button
                                        key={letter}
                                        onClick={() => handleGuess(letter)}
                                        disabled={isGuessed}
                                        className={`h-11 rounded-xl text-sm font-black transition-all active:scale-90 ${
                                            isGuessed 
                                                ? (isCorrect ? 'bg-emerald-500 text-white shadow-none' : 'bg-slate-200 text-slate-400 opacity-50 dark:bg-white/5') 
                                                : `bg-white dark:bg-[#1E2530] border-2 shadow-[0_4px_0_rgba(0,0,0,0.05)] active:translate-y-1 active:shadow-none ${isDark ? 'border-white/5 text-slate-300' : 'border-slate-100 text-slate-700'}`
                                        }`}
                                    >
                                        {letter}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center animate-in zoom-in duration-500 p-4">
                            <div className={`w-20 h-20 rounded-[30px] flex items-center justify-center mb-6 shadow-2xl ${status === 'won' ? 'bg-emerald-500 text-white rotate-12' : 'bg-rose-500 text-white -rotate-12'}`}>
                                {status === 'won' ? <Trophy size={40} /> : <AlertCircle size={40} />}
                            </div>
                            <h2 className={`text-3xl font-black mb-2 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {status === 'won' ? 'Magnificent!' : 'Mistakes Made...'}
                            </h2>
                            <p className="text-slate-500 font-bold mb-8 text-sm max-w-[240px]">
                                {status === 'won' ? `You correctly identified "${currentWord}"!` : `The hidden word was "${currentWord}". Better luck next time!`}
                            </p>
                            
                            <div className="flex gap-3 w-full max-w-xs">
                                {status === 'lost' && (
                                    <button 
                                        onClick={resetWord}
                                        className={`flex-1 h-14 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <RefreshCw size={18} /> Retry
                                    </button>
                                )}
                                <button 
                                    onClick={nextWord}
                                    className={`flex-[2] h-14 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${status === 'won' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-indigo-600 text-white shadow-indigo-600/20'}`}
                                >
                                    {wordIdx === words.length - 1 ? 'Finish' : 'Continue'} <ArrowRight size={18} strokeWidth={4} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .hangman-part {
                    opacity: 0;
                    transform: scale(0.8);
                    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .hangman-part.visible {
                    opacity: 1;
                    transform: scale(1);
                }
                .drop-shadow-2xl {
                    filter: drop-shadow(0 20px 30px rgba(0,0,0,0.1));
                }
            `}</style>
        </div>
    );
};

HangmanEngine.hideGlobalFooter = true;
export default HangmanEngine;
