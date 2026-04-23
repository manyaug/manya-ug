import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, X, Zap, Trophy, Compass, Lightbulb, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import QuestHUD from '../../components/QuestHUD';
import { triggerRewardFlight } from '../../utils/fxUtils';
import { mascotSpeak } from '../../components/MascotReaction';
import { audioService } from '../../infrastructure/audio/audioService';

/**
 * ENGLISH RENDERER v3.1 (SST Elite Style + Fixed Hint)
 * --------------------------------------------------
 * - STICKY FOOTER: Submit button stays at bottom.
 * - SCROLLABLE HEART: Question + Options scroll if too long.
 * - INSIGHT BANNER: Fixed hint overlap and readability.
 */
const EnglishRenderer = ({
    currentQ,
    currentIdx,
    totalQuestions,
    nodeType,
    selectedOption,
    isAnswered,
    hintUsed,
    setHintUsed,
    setSelectedOption,
    handleSubmit,
    correctText,
    userWasCorrect,
    frustration,
    questMeta,
    gemsEarned,
    showGemToast,
    onContinue
}) => {
    const correctBtnRef = useRef(null);

    // Trigger flying coins and mascot reactions when user is answered
    useEffect(() => {
        if (isAnswered) {
            if (userWasCorrect) {
                // Global event for feedback layer
                window.dispatchEvent(new CustomEvent('manya-correct'));
                audioService.playSFX('correct');

                // Mascot Reaction (Zany/English character)
                const phrases = [
                    "Spot on! Your English is top-tier! ✨",
                    "Word Wizard in the house! 🧙‍♂️",
                    "Magnificent! Your grammar is perfect! 📝",
                    "Excellent! You've got a way with words! 🎉"
                ];
                mascotSpeak(phrases[Math.floor(Math.random() * phrases.length)]);

                // Flying Coins
                if (correctBtnRef.current) {
                    setTimeout(() => {
                        triggerRewardFlight(correctBtnRef.current, 'coin', 5);
                    }, 300);
                }
            } else {
                // Global event for feedback layer
                window.dispatchEvent(new CustomEvent('manya-wrong'));
                audioService.playSFX('mistake');

                // Mascot Encouragement
                mascotSpeak("Language is a journey! Let's analyze this one. 📖", 4000);
            }
        }
    }, [isAnswered, userWasCorrect]);
    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative bg-[#0B0E14]" style={{ maxHeight: '100%' }}>
            {/* Scrollable primary area */}

            {/* --- SCROLLABLE CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 scrollbar-hide pb-4">

                {currentQ?.isRephrased && (
                    <div className="text-[10px] uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 font-black mb-4 text-center">
                        🔄 Concept Replay: Different Wording
                    </div>
                )}
                
                {frustration?.level === 'high' && (
                    <div className="text-[10px] uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2 font-black mb-4 text-center">
                        💡 Tutor Tip: Watch the structure!
                    </div>
                )}

                {/* QUESTION CARD (Glowing & Glossy) */}
                <div className="bg-[#151921] rounded-[2.5rem] border-[4px] border-indigo-500/40 neon-glow-violet px-7 py-8 mb-6 shadow-2xl relative transition-all duration-500">
                    <div className="toy-card-gloss" />
                    <div className="flex items-center justify-end mb-5 relative z-10">
                        {!isAnswered && currentQ?.hint && (
                            <div className="relative">
                                <button 
                                    onClick={() => setHintUsed(!hintUsed)} 
                                    className={`p-2.5 rounded-2xl transition-all relative z-20 ${hintUsed ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <Lightbulb size={20} className={hintUsed ? "animate-pulse" : ""} />
                                </button>
                                
                                <AnimatePresence>
                                    {hintUsed && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                            className="mcq-hint-bubble"
                                            style={{ 
                                                right: '-5px', 
                                                top: '55px', 
                                                width: '240px',
                                                background: '#ffffff',
                                                opacity: 1,
                                                border: '3px solid #f59e0b'
                                            }}
                                        >
                                            <div className="toy-card-gloss" />
                                            <div className="mcq-hint-header">
                                                <Sparkles size={14} className="text-amber-500" />
                                                <span className="mcq-hint-badge" style={{ color: '#f59e0b' }}>Tutor Hint</span>
                                            </div>
                                            <p className="mcq-hint-text" style={{ color: '#1e293b', opacity: 1 }}>
                                                "{currentQ.hint}"
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    <p className="text-white font-bold text-xl leading-snug relative z-10">
                        {currentQ?.question || currentQ?.question_text}
                    </p>
                </div>

                {/* OPTIONS (SST-Style Premium Buttons) */}
                <div className="flex flex-col gap-3">
                    {currentQ?.options?.map((opt, i) => {
                        const isSelected = opt === selectedOption;
                        let cls = "mcq-fe-btn transition-all duration-300";
                        if (isAnswered) {
                            if (opt === correctText) cls += " mcq-fe-correct";
                            else if (isSelected) cls += " mcq-fe-wrong";
                            else cls += " mcq-fe-faded";
                        } else if (isSelected) {
                            cls += " mcq-fe-selected";
                        }

                        return (
                            <motion.button
                                key={i}
                                disabled={isAnswered}
                                onClick={() => {
                                    setSelectedOption(opt);
                                    audioService.playSFX('tap');
                                }}
                                className={cls}
                                ref={opt === correctText ? correctBtnRef : null}
                                whileTap={!isAnswered ? { scale: 0.98, translateY: 2 } : {}}
                                style={{
                                    borderColor: isSelected && !isAnswered ? 'rgba(129, 140, 248, 0.8)' : undefined,
                                    background: isSelected && !isAnswered ? 'rgba(129, 140, 248, 0.1)' : undefined
                                }}
                            >
                                <div className="toy-card-gloss" />
                                <span className={`mcq-fe-letter ${isSelected && !isAnswered ? 'bg-indigo-500 text-white' : ''}`}>
                                    {String.fromCharCode(65 + i)}
                                </span>
                                <span className="mcq-fe-text">{opt}</span>
                                {isAnswered && opt === correctText && <Check size={18} className="mcq-fe-icon correct-icon" strokeWidth={4} />}
                                {isAnswered && isSelected && opt !== correctText && <X size={18} className="mcq-fe-icon wrong-icon" strokeWidth={4} />}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* --- STICKY FOOTER --- */}
            <div className="flex-none p-6 pb-10 bg-gradient-to-t from-[#0B0E14] via-[#0B0E14]/90 to-transparent">
                {!isAnswered ? (
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedOption}
                        className={`w-full h-16 rounded-[2rem] font-black text-sm tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-3 relative overflow-hidden shadow-2xl ${
                            selectedOption 
                            ? 'bg-[#58cc02] text-white shadow-[0_8px_0_#46a302] active:translate-y-1 active:shadow-none' 
                            : 'bg-white/5 text-white/20 border border-white/5'
                        }`}
                    >
                        {selectedOption && <div className="btn-toy-gloss" />}
                        <span className="relative z-10 flex items-center gap-2">SUBMIT ANSWER <Zap size={16} fill="currentColor" /></span>
                    </button>
                ) : (
                    <div className={`w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 font-black text-[10px] tracking-widest uppercase border-2 transition-all duration-500 ${userWasCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {userWasCorrect ? <>Magnificent! Keep going! <Check size={18} /></> : <>Analyzing solution... <AlertCircle size={18} /></>}
                    </div>
                )}
            </div>

            {/* --- SOLUTION PORTAL (Portals to Body) --- */}
            {isAnswered && !userWasCorrect && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-[#151921] rounded-[3rem] p-8 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                        <div className="toy-card-gloss" />
                        
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500">
                                <X size={28} strokeWidth={3} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Not quite!</h3>
                                <p className="text-xs font-bold text-slate-400">Let's see what happened...</p>
                            </div>
                        </div>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 mb-6">
                            <Check size={20} className="text-emerald-500" strokeWidth={3} />
                            <div className="text-sm font-bold text-emerald-400">
                                Correct Answer: <span className="text-white ml-1">{correctText}</span>
                            </div>
                        </div>

                        <div className="max-h-[30vh] overflow-y-auto pr-2 mb-8 scrollbar-hide">
                            <p className="text-slate-300 font-bold leading-relaxed text-base italic">
                                "{currentQ.explanation || 'Look closely at the grammar rule applied here. Practice makes perfect!'}"
                            </p>
                        </div>

                        <button 
                            onClick={onContinue}
                            className="w-full h-16 bg-rose-500 text-white rounded-[2rem] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-[0_8px_0_#9f1239] active:translate-y-1 active:shadow-none transition-all"
                        >
                            <div className="btn-toy-gloss" />
                            Keep Exploring <ArrowRight size={20} />
                        </button>
                    </div>
                </div>,
                document.body
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .mcq-fe-letter.bg-indigo-500 { background-color: #6366f1 !important; border-color: #6366f1 !important; }
            `}</style>
        </div>
    );
};

export default EnglishRenderer;
