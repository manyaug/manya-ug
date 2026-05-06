import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, AlertCircle, RefreshCw, ArrowRight, Lightbulb } from 'lucide-react';

/**
 * HANGMAN RENDERER
 * Stateless UI component for the gallows and word-discovery zone.
 */

const HangmanRenderer = ({ 
    isDark, 
    wordIdx, 
    words, 
    currentWord, 
    hint, 
    guessedLetters, 
    incorrectCount, 
    status, 
    handleGuess, 
    resetWord, 
    nextWord 
}) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ'".split('');

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-50 text-slate-900'}`}>
            {/* 1. Gallows Area */}
            <div className="flex-none sm:flex-[1.2] relative flex flex-col items-center justify-center p-4 sm:p-6 min-h-[220px] sm:min-h-[300px]">
                <div className="absolute top-4 sm:top-6 inset-x-4 sm:inset-x-6 flex justify-between items-center z-10">
                    <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-[15px] sm:rounded-2xl text-[9px] sm:text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10' : 'bg-white text-indigo-600 border border-slate-100 shadow-sm'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Hangman Challenge
                    </div>
                </div>

                {/* Gallows SVG */}
                <svg viewBox="0 0 100 120" className="w-full max-w-[160px] sm:max-w-[200px] h-auto drop-shadow-2xl mt-8 sm:mt-0">
                    <path d="M20 110 L80 110 M30 110 L30 20 L70 20 L70 35" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-20" />
                    <circle cx="70" cy="45" r="10" stroke="#ef4444" strokeWidth="4" fill="none" className={`transition-all duration-500 ${incorrectCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-80'}`} />
                    <line x1="70" y1="55" x2="70" y2="85" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`transition-all duration-500 ${incorrectCount > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-80'}`} />
                    <line x1="70" y1="65" x2="55" y2="75" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`transition-all duration-500 ${incorrectCount > 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-80'}`} />
                    <line x1="70" y1="65" x2="85" y2="75" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`transition-all duration-500 ${incorrectCount > 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-80'}`} />
                    <line x1="70" y1="85" x2="55" y2="100" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`transition-all duration-500 ${incorrectCount > 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-80'}`} />
                    <line x1="70" y1="85" x2="85" y2="100" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className={`transition-all duration-500 ${incorrectCount > 5 ? 'opacity-100 scale-100' : 'opacity-0 scale-80'}`} />
                </svg>

                {/* Word Slots */}
                <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-1.5 sm:gap-2">
                    {currentWord.split('').map((char, i) => {
                        const isAlpha = /^[A-Z']$/.test(char);
                        const isVisible = guessedLetters.has(char) || !isAlpha;
                        return (
                            <div key={i} className={`w-6 h-8 sm:w-8 sm:h-10 border-b-2 sm:border-b-4 flex items-center justify-center text-xl sm:text-2xl font-black transition-all duration-300 ${char === ' ' ? 'border-transparent w-3' : (isVisible ? 'border-indigo-500 text-indigo-500 scale-110' : 'border-slate-300 text-transparent')}`}>
                                {isVisible ? char : ''}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 2. Gameplay Area */}
            <div className={`flex-1 flex flex-col rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.05)] relative z-10 overflow-hidden ${isDark ? 'bg-[#151921]' : 'bg-white'}`}>
                <div className={`px-8 py-4 flex items-center gap-3 border-b ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Lightbulb size={16} />
                    </div>
                    <p className="text-xs font-bold leading-tight text-slate-400">{hint}</p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                    {status === 'playing' ? (
                        <div className="grid grid-cols-7 sm:grid-cols-9 gap-2">
                            {alphabet.map(letter => {
                                const isGuessed = guessedLetters.has(letter);
                                const isCorrect = isGuessed && currentWord.includes(letter);
                                return (
                                    <button
                                        key={letter} onClick={() => handleGuess(letter)} disabled={isGuessed}
                                        className={`h-11 rounded-xl text-sm font-black transition-all active:scale-90 ${isGuessed ? (isCorrect ? 'bg-emerald-500 text-white shadow-none' : 'bg-slate-200 text-slate-400 dark:bg-white/5') : `bg-white dark:bg-[#1E2530] border-2 ${isDark ? 'border-white/5 text-slate-300' : 'border-slate-100 text-slate-700'}`}`}
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
                            <h2 className="text-3xl font-black mb-2 tracking-tight">{status === 'won' ? 'Magnificent!' : 'Mistakes Made...'}</h2>
                            <p className="text-slate-500 font-bold mb-8 text-sm max-w-[240px]">{status === 'won' ? `You identified "${currentWord}"!` : `It was "${currentWord}".`}</p>
                            <div className="flex gap-3 w-full max-w-xs">
                                {status === 'lost' && <button onClick={resetWord} className="flex-1 h-14 rounded-2xl font-black text-xs tracking-widest uppercase border-2 flex items-center justify-center gap-2"><RefreshCw size={18} /> Retry</button>}
                                <button onClick={nextWord} className={`flex-[2] h-14 rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg ${status === 'won' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>{wordIdx === words.length - 1 ? 'Finish' : 'Continue'} <ArrowRight size={18} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HangmanRenderer;
