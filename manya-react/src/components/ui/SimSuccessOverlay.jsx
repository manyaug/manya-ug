import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { audioService } from '../../infrastructure/audio/audioService';

const MotivationalMessages = {
    science: ['Scientific Discovery!', 'Research Master!', 'Data Validated!', 'Lab Expert!'],
    math: ['Math Legend!', 'Theorem Unlocked!', 'Logic Master!', 'Number Cruncher!'],
    sst: ['Geographic Genius!', 'Historical Expert!', 'Cultural Master!', 'Citizen Pro!'],
    english: ['Literary Legend!', 'Grammar Guru!', 'Story Master!', 'Wordsmith!'],
    default: ['Awesome!', 'Victory!', 'Well Done!', 'Great Job!']
};

const SimSuccessOverlay = ({ subject = 'science', show = false, onDismiss }) => {
    useEffect(() => {
        if (show) {
            // 1. Play High-Fidelity Audio
            audioService.success?.();

            // 2. Trigger Global Coin Flight
            const triggerBurst = () => {
                window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                    detail: {
                        x: window.innerWidth / 2,
                        y: window.innerHeight / 2,
                        type: 'coin',
                        amount: 5
                    }
                }));
            };

            setTimeout(triggerBurst, 100);
            
            // 3. Auto-Dismiss
            const timer = setTimeout(onDismiss, 1800);
            return () => clearTimeout(timer);
        }
    }, [show, onDismiss]);

    const randomMsg = React.useMemo(() => {
        const msgs = MotivationalMessages[subject.toLowerCase()] || MotivationalMessages.default;
        return msgs[Math.floor(Math.random() * msgs.length)];
    }, [subject, show]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className="fixed inset-0 z-[100000] flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* DIM LIGHTS EFFECT */}
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

                    {/* ULTRA-MINIMAL MOTIVATIONAL LABEL */}
                    <motion.div
                        className="relative flex flex-col items-center"
                        initial={{ scale: 0.8, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ type: "spring", damping: 15, stiffness: 200 }}
                    >
                        <div className="text-center">
                            <motion.h2 
                                className="text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_10px_20px_rgba(255,255,255,0.2)] uppercase italic leading-none"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                            >
                                {randomMsg}
                            </motion.h2>
                            
                            {/* Sub-glow effect for text */}
                            <motion.div
                                className="mt-4 h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full shadow-[0_0_20px_#fbbf24]"
                                initial={{ width: 0 }}
                                animate={{ width: 128 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SimSuccessOverlay;
