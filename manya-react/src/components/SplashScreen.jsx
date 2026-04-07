import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES } from '../config/assetUrls';
import '../styles/splash.css';

function SplashScreen({ onFinish }) {
    const [isExiting, setIsExiting] = useState(false);
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 700);
        const t2 = setTimeout(() => setPhase(2), 2000);
        const t3 = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onFinish, 800);
        }, 3400);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onFinish]);

    const handleSkip = () => {
        setIsExiting(true);
        setTimeout(onFinish, 800);
    };

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div
                    key="splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.08 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="splash-screen"
                    onClick={handleSkip}
                >
                    {/* Warm background blobs */}
                    <div className="splash-blob splash-blob-1" />
                    <div className="splash-blob splash-blob-2" />
                    <div className="splash-blob splash-blob-3" />

                    {/* Floating bubbles */}
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className={`splash-bubble splash-bubble-${i + 1}`}
                            animate={{
                                y: [0, -(15 + i * 8), 0],
                                x: [0, (i % 2 === 0 ? 8 : -8), 0],
                            }}
                            transition={{
                                duration: 4 + i * 1.2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: i * 0.3,
                            }}
                        />
                    ))}

                    {/* ── CENTER STAGE ── */}
                    <div className="splash-stage">

                        {/* MASCOT — the hero */}
                        <motion.div
                            className="splash-mascot-zone"
                            initial={{ scale: 0, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 160,
                                damping: 10,
                                delay: 0.15,
                            }}
                        >
                            {/* Glowing backdrop circle */}
                            <motion.div
                                className="splash-mascot-glow"
                                animate={{
                                    scale: [1, 1.15, 1],
                                    opacity: [0.5, 0.8, 0.5],
                                }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            {/* Spinning dashed ring */}
                            <motion.div
                                className="splash-mascot-ring"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            />
                            {/* The bird! Bobbing happily */}
                            <motion.img
                                src={IMAGES.manya_icon}
                                alt="Manya"
                                className="splash-mascot-img"
                                animate={{ y: [0, -8, 0], rotate: [0, 2, -2, 0] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                        </motion.div>

                        {/* Star burst emojis */}
                        <div className="splash-emoji-ring">
                            {['⭐', '💜', '🌟', '🎮', '✨'].map((e, i) => (
                                <motion.span
                                    key={i}
                                    className="splash-emoji"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.85] }}
                                    transition={{
                                        delay: 0.6 + i * 0.12,
                                        duration: 0.5,
                                        ease: 'backOut',
                                    }}
                                >
                                    {e}
                                </motion.span>
                            ))}
                        </div>

                        {/* Brand name — big, rounded, warm */}
                        <motion.h1
                            className="splash-title"
                            initial={{ opacity: 0, y: 30, scale: 0.8 }}
                            animate={{
                                opacity: phase >= 1 ? 1 : 0,
                                y: phase >= 1 ? 0 : 30,
                                scale: phase >= 1 ? 1 : 0.8,
                            }}
                            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                        >
                            Manya
                        </motion.h1>

                        {/* Tagline */}
                        <motion.p
                            className="splash-tagline"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                                opacity: phase >= 1 ? 1 : 0,
                                y: phase >= 1 ? 0 : 10,
                            }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            Learn · Play · Grow 🌱
                        </motion.p>

                        {/* Chunky candy progress bar */}
                        <motion.div
                            className="splash-bar-track"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{
                                opacity: phase >= 1 ? 1 : 0,
                                width: phase >= 1 ? 200 : 0,
                            }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <motion.div
                                className="splash-bar-fill"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: phase >= 2 ? 1 : phase >= 1 ? 0.5 : 0 }}
                                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            />
                        </motion.div>

                        {/* Fun loading text */}
                        <motion.span
                            className="splash-status"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: phase >= 1 ? 1 : 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            {phase < 2 ? 'Getting things ready...' : 'Here we go! 🚀'}
                        </motion.span>
                    </div>

                    {/* Tap hint */}
                    <motion.span
                        className="splash-tap-hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: phase >= 2 ? 0.4 : 0 }}
                    >
                        tap to skip
                    </motion.span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SplashScreen;
