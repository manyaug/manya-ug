import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES } from '../config/assetUrls';

const CHARACTER_DATA = {
    science: { name: 'Kiki', icon: IMAGES.kiki_icon, full: IMAGES.kiki_full, color: '#fbbf24' },
    math: { name: 'Manya', icon: IMAGES.manya_icon, full: IMAGES.manya_icon, color: '#667eea' },
    sst: { name: 'Polly', icon: IMAGES.polly_icon, full: IMAGES.polly_full, color: '#48bb78' },
    english: { name: 'Zany', icon: IMAGES.manya_icon, full: IMAGES.manya_icon, color: '#ff6b6b' }
};

let globalAttemptCounter = 0;
let globalStreak = 0;

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
            const { text, duration, subject } = e.detail;
            if (subject) setActiveSub(subject);
            // Standard explicit calls bypass streak logic
            showMessage(text, duration);
        };

        const handleCorrect = (e) => {
            if (e.detail?.subject) setActiveSub(e.detail.subject);
            globalStreak++;
            if (globalStreak === 3) showMessage("3 in a row! You're on fire! ≡ƒöÑ");
            else if (globalStreak === 5) showMessage("5 correct! Unstoppable! ≡ƒÜÇ");
            else if (globalStreak === 10) showMessage("10 in a row?! Absolute genius! ≡ƒºá");
            else if (globalStreak > 5 && globalStreak % 3 === 0) {
                const generic = ["Flawless!", "Incredible momentum!", "You're doing amazing!"];
                showMessage(generic[Math.floor(Math.random() * generic.length)]);
            }
        };

        const handleWrong = (e) => {
            if (e.detail?.subject) setActiveSub(e.detail.subject);
            if (globalStreak >= 3) {
                showMessage("Oh no! Streak broken! Keep going! ≡ƒÆö", 4000);
            } else if (Math.random() > 0.8) {
                showMessage("That was tricky. Let's learn from it! ≡ƒôÜ", 4000);
            }
            globalStreak = 0;
        };

        window.addEventListener('manya-mascot-speak', handleSpeak);
        window.addEventListener('manya-correct', handleCorrect);
        window.addEventListener('manya-wrong', handleWrong);
        
        return () => {
            window.removeEventListener('manya-mascot-speak', handleSpeak);
            window.removeEventListener('manya-correct', handleCorrect);
            window.removeEventListener('manya-wrong', handleWrong);
            if (timer) clearTimeout(timer);
        };
    }, []);

    return (
        <div className="fixed bottom-6 right-6 z-[20000] flex flex-col items-end gap-3 pointer-events-none">
            <AnimatePresence>
                {message && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, x: 20, y: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="bg-white text-slate-800 p-3 rounded-[1.25rem] rounded-br-none shadow-xl border-2 border-slate-100 max-w-[200px] relative mb-1"
                        >
                            <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-white border-r-2 border-b-2 border-slate-100 rotate-45" />
                            <p className="text-xs font-bold leading-relaxed">{message}</p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 50, rotate: 15 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, y: 50, rotate: -15 }}
                            whileHover={{ scale: 1.1 }}
                            className="w-20 h-20 relative flex-shrink-0"
                            style={{ 
                                filter: `drop-shadow(0 10px 20px ${char.color}80)` 
                            }}
                        >
                            <img 
                                src={char.icon} 
                                alt={char.name} 
                                className="w-full h-full object-contain"
                            />
                        </motion.div>
                    </>
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
