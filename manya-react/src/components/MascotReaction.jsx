import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES } from '../config/assetUrls';

const CHARACTER_DATA = {
    science: { name: 'Kiki', icon: IMAGES.kiki_icon, color: '#fbbf24' },
    math: { name: 'Manya', icon: IMAGES.manya_icon, color: '#667eea' },
    sst: { name: 'Zanny', icon: IMAGES.zany_icon, color: '#ff6b6b' },
    english: { name: 'Polly', icon: IMAGES.polly_icon, color: '#48bb78' }
};

const MascotReaction = ({ subject = 'science' }) => {
    const [message, setMessage] = useState(null);
    const [activeSub, setActiveSub] = useState(subject);
    const char = CHARACTER_DATA[activeSub.toLowerCase()] || CHARACTER_DATA.science;

    useEffect(() => {
        let timer = null;

        const showMessage = (text, duration = 3000) => {
            setMessage(text);
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => setMessage(null), duration);
        };

        const handleSpeak = (e) => {
            const { text, duration, subject: eventSub } = e.detail;
            if (eventSub) setActiveSub(eventSub);
            showMessage(text, duration || 3000);
        };

        const handleTimeout = () => {
            showMessage("Time's up! Don't worry, let's try the next one! ⏱️", 4000);
        };

        window.addEventListener('manya-mascot-speak', handleSpeak);
        window.addEventListener('manya-engine-timeout', handleTimeout);
        
        return () => {
            window.removeEventListener('manya-mascot-speak', handleSpeak);
            window.removeEventListener('manya-engine-timeout', handleTimeout);
            if (timer) clearTimeout(timer);
        };
    }, []);

    return (
        <div className="fixed bottom-6 right-6 z-[20000] pointer-events-none">
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.8 }}
                        className="flex flex-col items-end gap-2"
                    >
                        {/* 💬 Speech Bubble (Premium Glassmorphism) */}
                        <div className="bg-white/95 backdrop-blur-md text-slate-800 p-4 rounded-[1.5rem] rounded-br-none shadow-2xl border-2 border-white/50 max-w-[220px] relative">
                            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white/95 border-r-2 border-b-2 border-white/50 rotate-45" />
                            <p className="text-xs font-black leading-relaxed tracking-tight">{message}</p>
                        </div>

                        {/* 🎭 Mascot Icon */}
                        <div 
                            className="w-12 h-12 relative flex-shrink-0"
                            style={{ 
                                filter: `drop-shadow(0 0 15px ${char.color}88)` 
                            }}
                        >
                            <img 
                                src={char.icon} 
                                alt={char.name} 
                                className="w-full h-full object-contain"
                                onError={(e) => { 
                                    console.warn(`[Mascot] Icon failed: ${char.icon}. Falling back to Manya.`);
                                    e.target.src = IMAGES.manya_icon; 
                                }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MascotReaction;

/**
 * Utility to trigger a mascot message from anywhere
 */
export const mascotSpeak = (text, duration = 3000) => {
    window.dispatchEvent(new CustomEvent('manya-mascot-speak', { detail: { text, duration } }));
};
