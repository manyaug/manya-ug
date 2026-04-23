import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IMAGES } from '../config/assetUrls';

const CHARACTER_DATA = {
    science: { name: 'Kiki', icon: IMAGES.kiki_icon, full: IMAGES.kiki_full, color: '#fbbf24' },
    math: { name: 'Manya', icon: IMAGES.manya_icon, full: IMAGES.manya_icon, color: '#667eea' },
    sst: { name: 'Polly', icon: IMAGES.polly_icon, full: IMAGES.polly_full, color: '#48bb78' },
    english: { name: 'Zany', icon: IMAGES.manya_icon, full: IMAGES.manya_icon, color: '#ff6b6b' }
};

const MascotReaction = ({ subject = 'science' }) => {
    const [message, setMessage] = useState(null);
    const char = CHARACTER_DATA[subject.toLowerCase()] || CHARACTER_DATA.science;

    useEffect(() => {
        const handler = (e) => {
            const { text, duration = 3000 } = e.detail;
            setMessage(text);
            
            // Auto-hide after duration
            const timer = setTimeout(() => setMessage(null), duration);
            return () => clearTimeout(timer);
        };

        window.addEventListener('manya-mascot-speak', handler);
        return () => window.removeEventListener('manya-mascot-speak', handler);
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
                            className="bg-white text-slate-800 p-4 rounded-[1.5rem] rounded-br-none shadow-2xl border-2 border-slate-100 max-w-[240px] relative mb-2"
                        >
                            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-r-2 border-b-2 border-slate-100 rotate-45" />
                            <p className="text-sm font-bold leading-relaxed">{message}</p>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 50, rotate: 15 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, y: 50, rotate: -15 }}
                            whileHover={{ scale: 1.1 }}
                            className="w-32 h-32 relative flex-shrink-0"
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
