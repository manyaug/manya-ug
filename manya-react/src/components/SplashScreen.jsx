import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES } from '../config/assetUrls';

function SplashScreen({ onFinish }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleComplete = () => {
        setIsExiting(true);
        // Fire the parent finish callback after the exit animation completes
        setTimeout(onFinish, 600); 
    };

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div 
                    key="splash-screen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#030712] overflow-hidden"
                >
                    {/* Ambient Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] max-w-[900px] max-h-[900px] bg-sky-900/15 rounded-full blur-[100px] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col items-center">
                        {/* Logo Reveal */}
                        <motion.div
                            initial={{ scale: 0.6, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="relative w-32 h-32 mb-8"
                        >
                            {/* Pulsing Backlight */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: [0, 1, 0.6], scale: [0.8, 1.25, 1] }}
                                transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                                className="absolute inset-0 bg-sky-500/20 rounded-full blur-[35px]" 
                            />
                            <img 
                                src={IMAGES.manya_icon} 
                                alt="Manya Logo" 
                                className="w-full h-full object-contain drop-shadow-2xl relative z-10"
                            />
                        </motion.div>

                        {/* Typography */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                            className="text-5xl font-black text-white tracking-[0.25em] uppercase mb-3 drop-shadow-xl"
                        >
                            Manya
                        </motion.h1>
                        
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.7 }}
                            className="text-[11px] font-black text-sky-400/70 tracking-[0.4em] uppercase mb-16"
                        >
                            Cognitive Engine
                        </motion.p>

                        {/* Smooth Loader Track */}
                        <motion.div 
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 220 }}
                            transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
                            className="h-[3px] bg-slate-800/60 rounded-full overflow-hidden shadow-inner relative"
                        >
                            {/* Moving Loading Bar */}
                            <motion.div 
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2.2, delay: 0.9, ease: "easeInOut" }}
                                onAnimationComplete={() => {
                                    setTimeout(handleComplete, 300); // Tiny pause at 100%
                                }}
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-500 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.8)]"
                            />
                        </motion.div>
                    </div>

                    {/* Subtle Skip Option */}
                    <motion.button 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 2.5 }}
                        onClick={handleComplete}
                        className="absolute bottom-12 text-[10px] font-black tracking-widest text-slate-600 uppercase hover:text-white transition-colors px-6 py-3 rounded-full hover:bg-white/5"
                    >
                        Skip
                    </motion.button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SplashScreen;
