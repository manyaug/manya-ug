/**
 * FXLayer
 * =======
 * A global overlay that manages flying rewards (coins, gems).
 * Listens for 'manya-fx-flight' events and spawns particles.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGem } from '../config/assetUrls.js';
import { audioService } from '../infrastructure/audio/audioService';

const PARTICLE_ICONS = {
    coin: '🪙',
    gem:  '💎',
    xp:   '⭐'
};

const FXLayer = () => {
    const [particles, setParticles] = useState([]);

    const handleFlight = useCallback((e) => {
        const { x, y, type, amount } = e.detail;
        const particleCount = type === 'coin' ? 6 : 3;
        
        // Find target
        const targetId = type === 'coin' ? 'hud-coin-pill' : 'hud-gem-pill';
        const targetEl = document.getElementById(targetId);
        let targetX = window.innerWidth - 60;
        let targetY = 40;

        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
        }

        // SFX: Play WHOOSH on start
        audioService.playSFX('whoosh');

        for (let i = 0; i < particleCount; i++) {
            const id = `${Math.random().toString(36).substr(2, 9)}-${i}`;
            const delay = i * 0.05; // Cascading delay
            const offset = (Math.random() - 0.5) * 40; // Random scatter

            const newParticle = { 
                id, x: x + offset, y: y + offset, 
                targetX, targetY, type, 
                delay,
                isLead: i === 0 // only lead particle shows the +Amount
            };

            setParticles(prev => [...prev, newParticle]);

            // Signaling HUD & Cleanup
            setTimeout(() => {
                // SFX: Play COLLECT on arrival (one per shower to avoid spam)
                if (i === 0) {
                    audioService.playSFX('collect-points');
                    window.dispatchEvent(new CustomEvent('manya-reward-arrived', { detail: { type } }));
                }
                setParticles(prev => prev.filter(p => p.id !== id));
            }, 800 + (delay * 1000)); 
        }
    }, []);

    useEffect(() => {
        window.addEventListener('manya-fx-flight', handleFlight);
        return () => window.removeEventListener('manya-fx-flight', handleFlight);
    }, [handleFlight]);

    return (
        <div className="fx-layer-overlay" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
            <AnimatePresence>
                {particles.map(p => (
                    <React.Fragment key={p.id}>
                        <motion.div
                            initial={{ x: p.x - 15, y: p.y - 15, scale: 0, opacity: 1 }}
                            animate={{ 
                                x: p.targetX - 15, 
                                y: p.targetY - 15, 
                                scale: [0, 1.3, 1, 0], 
                                opacity: [1, 1, 1, 0] 
                            }}
                            transition={{ 
                                duration: 0.7, 
                                delay: p.delay,
                                ease: [0.16, 1, 0.3, 1] // Custom snappy ease
                            }}
                            style={{ position: 'absolute', width: '30px', height: '30px' }}
                        >
                            <img 
                                src={p.type === 'coin' ? getGem('coin.svg') : getGem(`${p.type}_gem.svg`)} 
                                alt={p.type} 
                                style={{ 
                                    width: '100%', height: '100%', 
                                    filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))' 
                                }} 
                            />
                        </motion.div>

                        {/* Amount Bubble (Only for lead) */}
                        {p.isLead && (
                            <motion.div
                                initial={{ x: p.x, y: p.y - 40, opacity: 0, scale: 0.5 }}
                                animate={{ y: p.y - 140, opacity: [0, 1, 0], scale: 1.5 }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                style={{ 
                                    position: 'absolute', 
                                    color: p.type === 'coin' ? '#fbbf24' : '#60a5fa', 
                                    fontWeight: '950', 
                                    fontSize: '32px',
                                    fontFamily: 'Outfit, sans-serif',
                                    textShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                            >
                                +{p.amount || 5}
                            </motion.div>
                        )}
                    </React.Fragment>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default FXLayer;
