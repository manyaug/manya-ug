import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/PremiumChest.css';

/**
 * PREMIUM CSS-ONLY 3D CHEST
 * ============================================================
 * Implements a high-fidelity chest with CSS 3D transforms.
 * No external images required.
 */
const PremiumChest = ({ 
    type = 'wood', 
    phase = 'closed', // closed | opening | open
    onClick 
}) => {
    // Rarity Configuration
    const rarityConfig = {
        wood: { primary: '#5d4037', secondary: '#3e2723', accent: '#795548', glow: 'rgba(93, 64, 55, 0.3)' },
        bronze: { primary: '#cd7f32', secondary: '#8b4513', accent: '#ffa726', glow: 'rgba(205, 127, 50, 0.4)' },
        silver: { primary: '#9e9e9e', secondary: '#616161', accent: '#e0e0e0', glow: 'rgba(158, 158, 158, 0.5)' },
        gold: { primary: '#ffc107', secondary: '#ff8f00', accent: '#fff176', glow: 'rgba(255, 193, 7, 0.6)' }
    };

    const config = rarityConfig[type.toLowerCase()] || rarityConfig.wood;

    return (
        <div 
            className={`chest-3d-scene ${type} ${phase}`}
            onClick={onClick}
            style={{ '--chest-primary': config.primary, '--chest-secondary': config.secondary, '--chest-accent': config.accent, '--chest-glow': config.glow }}
        >
            <motion.div 
                className="chest-body"
                animate={phase === 'opening' ? {
                    rotateY: [0, -5, 5, -5, 5, 0],
                    scale: [1, 1.1, 1],
                } : {
                    y: [0, -10, 0]
                }}
                transition={phase === 'opening' ? { duration: 0.5, repeat: Infinity } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* ── TOP LID ── */}
                <motion.div 
                    className="chest-lid"
                    animate={phase === 'open' ? { rotateX: -110 } : { rotateX: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 80 }}
                >
                    <div className="lid-front face" />
                    <div className="lid-back face" />
                    <div className="lid-top face" />
                    <div className="lid-left face" />
                    <div className="lid-right face" />
                    <div className="lid-lock" />
                </motion.div>

                {/* ── BASE ── */}
                <div className="chest-base">
                    <div className="base-front face" />
                    <div className="base-back face" />
                    <div className="base-bottom face" />
                    <div className="base-left face" />
                    <div className="base-right face" />
                </div>

                {/* ── REWARD BEAM ── */}
                {phase === 'open' && (
                    <motion.div 
                        className="reward-beam"
                        initial={{ scaleY: 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: 1 }}
                    />
                )}
            </motion.div>
        </div>
    );
};

export default PremiumChest;
