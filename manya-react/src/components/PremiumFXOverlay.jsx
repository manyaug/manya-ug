import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioService } from '../infrastructure/audio/audioService.js';
import { getSfx } from '../config/assetUrls.js';

/**
 * PremiumFXOverlay
 * ================
 * Handles all global visual effects for premium modes:
 * - Earthquake (Screen Shake)
 * - Streak Power (Particle Burst)
 * - Speedrun Drama (Blackout Pulse + Timer Bar)
 */
const PremiumFXOverlay = () => {
    const [isEarthquake, setIsEarthquake] = useState(false);
    const [streakCount, setStreakCount] = useState(0);
    const [speedrun, setSpeedrun] = useState(null); // { duration, timeLeft }
    const [motivation, setMotivation] = useState(null); // { word, id }
    
    const timerRef = useRef(null);
    const drumrollAudioRef = useRef(null);

    useEffect(() => {
        const handleCorrect = () => {
            // Trigger celebration FX (particles + pulse) without text
            setMotivation({ id: Math.random() });
            setTimeout(() => setMotivation(null), 2500);
        };

        const handleEarthquake = () => {
            setIsEarthquake(true);
            const shell = document.querySelector('.quest-runner-shell');
            if (shell) shell.classList.add('manya-earthquake-shake');
            
            setTimeout(() => {
                setIsEarthquake(false);
                if (shell) shell.classList.remove('manya-earthquake-shake');
            }, 3000);
        };

        const handleStreak = (e) => {
            setStreakCount(e.detail?.count || 4);
            setTimeout(() => setStreakCount(0), 3500);
        };

        const handleSpeedrunStart = (e) => {
            const duration = e.detail?.duration || 18;
            setSpeedrun({ duration, timeLeft: duration });
            
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setSpeedrun(prev => {
                    if (!prev || prev.timeLeft <= 0) {
                        clearInterval(timerRef.current);
                        if (drumrollAudioRef.current) {
                            try {
                                drumrollAudioRef.current.pause();
                                drumrollAudioRef.current.currentTime = 0;
                            } catch (err) {}
                        }
                        return null;
                    }
                    return { ...prev, timeLeft: prev.timeLeft - 1 };
                });
            }, 1000);

            // Play loop tense drumroll/heartbeat SFX
            try {
                if (!drumrollAudioRef.current) {
                    const audio = new Audio(getSfx('drumroll'));
                    audio.loop = true;
                    drumrollAudioRef.current = audio;
                }
                const prefs = audioService.getAudioPreferences?.() || { volume: 0.5, isMuted: false };
                if (!prefs.isMuted) {
                    drumrollAudioRef.current.volume = Math.min(1.0, (prefs.volume ?? 0.5) * 1.5);
                    drumrollAudioRef.current.currentTime = 0;
                    drumrollAudioRef.current.play().catch(() => {});
                }
            } catch (err) {
                console.error("[SpeedrunAudio] Failed to play drumroll:", err);
            }
        };

        const handleSpeedrunStop = () => {
            setSpeedrun(null);
            if (timerRef.current) clearInterval(timerRef.current);

            // Pause loop audio
            if (drumrollAudioRef.current) {
                try {
                    drumrollAudioRef.current.pause();
                    drumrollAudioRef.current.currentTime = 0;
                } catch (err) {}
            }
        };

        window.addEventListener('manya-fx-correct', handleCorrect);
        window.addEventListener('manya-fx-earthquake', handleEarthquake);
        window.addEventListener('manya-fx-streak', handleStreak);
        window.addEventListener('manya-fx-speedrun-start', handleSpeedrunStart);
        window.addEventListener('manya-fx-speedrun-stop', handleSpeedrunStop);

        return () => {
            window.removeEventListener('manya-fx-correct', handleCorrect);
            window.removeEventListener('manya-fx-earthquake', handleEarthquake);
            window.removeEventListener('manya-fx-streak', handleStreak);
            window.removeEventListener('manya-fx-speedrun-start', handleSpeedrunStart);
            window.removeEventListener('manya-fx-speedrun-stop', handleSpeedrunStop);
            if (timerRef.current) clearInterval(timerRef.current);
            if (drumrollAudioRef.current) {
                try {
                    drumrollAudioRef.current.pause();
                } catch (err) {}
            }
        };
    }, []);

    // v9.9: Audio now managed centrally by feedbackService

    return (
        <div className="premium-fx-container pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {/* 🌋 Earthquake Effect */}
            <AnimatePresence>
                {isEarthquake && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ 
                            opacity: [0, 0.3, 0.1, 0.4, 0],
                            x: [0, -10, 10, -5, 5, 0],
                            y: [0, 5, -5, 10, -10, 0]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="fixed inset-0 bg-orange-500/10 pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* 🎉 Celebration Ambient & Particles */}
            <AnimatePresence mode="wait">
        {motivation && (
                    <div key={motivation.id} className="fixed inset-0 flex items-center justify-center pointer-events-none">
                        {/* 🌟 Rotating Light Rays / Flares (v8.2) */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={`ray-${i}`}
                                    initial={{ scale: 0, opacity: 0, rotate: i * 45 }}
                                    animate={{ 
                                        scale: [0, 2.5, 3], 
                                        opacity: [0, 0.4, 0],
                                        rotate: [i * 45, i * 45 + 90]
                                    }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="absolute w-[100vw] h-2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent blur-sm"
                                />
                            ))}
                        </div>

                        {/* 🟢 Full Screen Ambient Pulse */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.6, 0] }}
                            transition={{ duration: 1 }}
                            className="fixed inset-0 bg-emerald-500/20 mix-blend-screen"
                        />

                        {/* ✨ Physics-y Particle Confetti Burst */}
                        <div className="absolute inset-0">
                            {[...Array(60)].map((_, i) => {
                                const angle = (i / 60) * Math.PI * 2 + (Math.random() * 0.5);
                                const velocity = 300 + Math.random() * 600;
                                const tx = Math.cos(angle) * velocity;
                                const ty = Math.sin(angle) * velocity;
                                
                                return (
                                    <motion.span
                                        key={`part-${motivation.id}-${i}`}
                                        initial={{ x: '50vw', y: '50vh', opacity: 1, scale: 0 }}
                                        animate={{ 
                                            x: `calc(50vw + ${tx}px)`,
                                            y: `calc(50vh + ${ty}px)`,
                                            opacity: 0,
                                            scale: Math.random() * 3 + 0.5,
                                            rotate: Math.random() * 2000,
                                            filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
                                        }}
                                        transition={{ duration: 1.2 + Math.random() * 0.8, ease: "easeOut" }}
                                        className="absolute text-4xl drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                                    >
                                        {['✨', '⭐', '💎', '💎', '🔥', '💫'][i % 6]}
                                    </motion.span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* ✨ Streak Power Particles */}
            <AnimatePresence>
                {streakCount > 0 && (
                    <motion.div className="fixed inset-0 flex items-center justify-center">
                        {[...Array(20)].map((_, i) => (
                            <motion.span
                                key={`streak-${i}`}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ 
                                    x: (Math.random() - 0.5) * window.innerWidth,
                                    y: (Math.random() - 0.5) * window.innerHeight,
                                    opacity: 0,
                                    scale: 2,
                                    rotate: 360
                                }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute text-3xl"
                            >
                                {['✨', '⭐', '🔥', '⚡'][i % 4]}
                            </motion.span>
                        ))}
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            className="bg-slate-900/80 backdrop-blur-md px-10 py-6 rounded-[3rem] border-2 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.5)]"
                        >
                            <h2 className="text-4xl font-black text-amber-400 tracking-tighter italic">STREAK POWER!</h2>
                            <p className="text-center text-white font-bold text-sm uppercase tracking-widest mt-1">{streakCount} IN A ROW</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ⚡ Speedrun Drama */}
            <AnimatePresence>
                {speedrun && (
                    <>
                        {/* Blackout Pulse in last 5s */}
                        {speedrun.timeLeft <= 5 && (
                            <motion.div
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="fixed inset-0 bg-red-900/30 shadow-[inset_0_0_100px_rgba(255,0,0,0.5)]"
                            />
                        )}
                        
                        {/* Timer UI */}
                        <motion.div 
                            initial={{ y: -100 }}
                            animate={{ y: 0 }}
                            exit={{ y: -100 }}
                            className="fixed top-12 left-1/2 -translate-x-1/2 w-[280px] bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl"
                        >
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">⚡ Speed Challenge</span>
                                <span className={`text-2xl font-mono font-black ${speedrun.timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                    {speedrun.timeLeft}s
                                </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: '100%' }}
                                    animate={{ width: `${(speedrun.timeLeft / speedrun.duration) * 100}%` }}
                                    transition={{ duration: 1, ease: "linear" }}
                                    className={`h-full ${speedrun.timeLeft <= 5 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-amber-400'}`}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PremiumFXOverlay;
