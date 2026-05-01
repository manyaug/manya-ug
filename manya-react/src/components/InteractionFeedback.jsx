import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * InteractionFeedback
 * =====================
 * High-fidelity feedback layer for student interactions.
 * Ported from manya_logic quest/ui.js
 */
const InteractionFeedback = () => {
    const [flash, setFlash] = useState(null); // 'correct' | 'wrong'
    const [word, setWord] = useState(null);   // "EXCELLENT!", etc.
    const [growthMessage, setGrowthMessage] = useState(null);
    const [milestone, setMilestone] = useState(null); // { val: 25 | 50 | 75 | 100 }
    const [showComplete, setShowComplete] = useState(false);

    useEffect(() => {
        const handleCorrect = (e) => {
            setFlash('correct');
            setTimeout(() => setFlash(null), 600);

            // 100% chance for a royal word flash on every correct answer
            const cheers = [
                "AMAZING!", "AWESOME!", "BRILLIANT!", "WOW!", "EXCELLENT!", 
                "CHAMPION!", "SUPERB!", "MAGNIFICENT!", "SPOT ON!", "ROYAL WIN!"
            ];
            setWord(cheers[Math.floor(Math.random() * cheers.length)]);
            setTimeout(() => setWord(null), 800);
        };

        const handleWrong = () => {
            setFlash('wrong');
            setTimeout(() => setFlash(null), 600);

            // Show growth mindset message
            const messages = [
                "🌱 We grow from this!",
                "🧠 Mistakes build knowledge!",
                "💪 Every try counts!",
                "✨ Learning is a journey!",
                "🎯 Closer every time!",
                "🌟 Great effort! Let's see why.",
                "🚀 Keep going, you've got this!"
            ];
            setGrowthMessage(messages[Math.floor(Math.random() * messages.length)]);
            setTimeout(() => setGrowthMessage(null), 2500);
        };

        const handleMilestone = (e) => {
            const val = e.detail?.milestone;
            if (val === 100) {
                setShowComplete(true);
                setTimeout(() => setShowComplete(false), 3000);
                return;
            }
            setMilestone(val);
            setTimeout(() => setMilestone(null), 3000);
        };

        window.addEventListener('manya-correct', handleCorrect);
        window.addEventListener('manya-wrong', handleWrong);
        window.addEventListener('manya-milestone', handleMilestone);

        return () => {
            window.removeEventListener('manya-correct', handleCorrect);
            window.removeEventListener('manya-wrong', handleWrong);
            window.removeEventListener('manya-milestone', handleMilestone);
        };
    }, []);

    return (
        <div className="interaction-feedback-layer pointer-events-none fixed inset-0 z-[10000]">
            {/* Screen Flash */}
            <AnimatePresence>
                {flash && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.25 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 ${flash === 'correct' ? 'bg-emerald-400' : 'bg-rose-400'}`}
                    />
                )}
            </AnimatePresence>

            {/* Word Flash */}
            <AnimatePresence>
                {word && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center"
                    >
                        <span className="text-5xl md:text-7xl font-black italic text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] tracking-tighter">
                            {word}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mastery Milestone Pill (Slide from Right) */}
            <AnimatePresence mode="wait">
                {milestone && (
                    <motion.div
                        key={milestone}
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
                        className="fixed top-24 right-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border-2 border-white/20"
                    >
                        <div className="bg-white/20 p-2 rounded-xl">
                            <span className="text-2xl">🎯</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Milestone Reached</p>
                            <h4 className="text-xl font-black tracking-tight">{milestone}% MASTERY</h4>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 100% Burst Celebration */}
            <AnimatePresence>
                {showComplete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center bg-white/10 backdrop-blur-[2px]"
                    >
                        <div className="relative">
                            {[...Array(12)].map((_, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                                    animate={{ 
                                        x: (i % 2 === 0 ? 1 : -1) * (50 + Math.random() * 200), 
                                        y: (i < 6 ? 1 : -1) * (50 + Math.random() * 200),
                                        opacity: 0,
                                        scale: 2 
                                    }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                    className="absolute text-5xl"
                                >
                                    {i % 2 === 0 ? '✨' : '🎉'}
                                </motion.span>
                            ))}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 1.5, opacity: 0 }}
                                className="text-center"
                            >
                                <h2 className="text-7xl font-black text-amber-500 drop-shadow-2xl italic tracking-tighter">100% MASTERED!</h2>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Growth Mindset Pop-up */}
            <AnimatePresence>
                {growthMessage && (
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 0.9 }}
                        className="fixed bottom-[120px] left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-6 py-4 rounded-[2rem] shadow-2xl border-2 border-white flex items-center gap-3"
                    >
                        <span className="text-xl">{growthMessage.split(' ')[0]}</span>
                        <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                            {growthMessage.substring(growthMessage.indexOf(' ') + 1)}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InteractionFeedback;
