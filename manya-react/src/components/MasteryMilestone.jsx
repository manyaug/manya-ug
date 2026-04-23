import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, PartyPopper, Sparkles } from 'lucide-react';

const MasteryMilestone = ({ milestone, onClose }) => {
    const config = {
        25: { label: 'Good Start!', sub: 'The journey begins!', color: '#6366f1' },
        50: { label: 'Halfway Mark!', sub: 'Pushing the limits!', color: '#f59e0b' },
        75: { label: 'Elite Pursuit!', sub: 'Almost at the peak!', color: '#db2777' },
        100: { label: 'Quest Master!', sub: 'Total Domination!', color: '#10b981' }
    };

    const cfg = config[milestone] || config[25];

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-6"
        >
            {/* Backdrop Blur */}
            <div className="absolute inset-0 bg-[#0B0E14]/70 backdrop-blur-xl" />

            <motion.div 
                initial={{ scale: 0.8, y: 30, rotateX: 20 }}
                animate={{ scale: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 1.1, opacity: 0 }}
                style={{ '--accent': cfg.color }}
                className="w-full max-w-sm bg-[#151921]/90 rounded-[3.5rem] border-[3px] border-[var(--accent)]/30 neon-glow-master relative overflow-hidden flex flex-col items-center py-10 px-6 shadow-[0_0_80px_rgba(0,0,0,0.5)]"
            >
                <div className="milestone-shine-overlay" />
                
                {/* Milestone Counter Jewel */}
                <div className="relative mb-8">
                    <motion.div 
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-white/10 to-transparent border border-white/20 flex items-center justify-center relative z-10"
                    >
                        <Trophy size={48} color={cfg.color} strokeWidth={2.5} />
                    </motion.div>
                    <div className="absolute inset-0 blur-3xl opacity-40 bg-[var(--accent)]" />
                </div>

                {/* Text Content */}
                <div className="text-center mb-8">
                    <motion.span 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-[var(--accent)] font-black text-xs tracking-[0.3em] uppercase mb-4 block"
                    >
                        Milestone Reached
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl font-black text-white tracking-tighter mb-2"
                    >
                        {milestone}% <span className="opacity-40">Complete</span>
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-white/60 font-medium text-lg leading-tight"
                    >
                        {cfg.label}<br/>
                        <span className="text-xs uppercase tracking-widest opacity-60 font-black">{cfg.sub}</span>
                    </motion.p>
                </div>

                {/* Burst FX */}
                <Sparkles className="absolute top-10 right-10 text-[var(--accent)] opacity-20" size={40} />
                <Zap className="absolute bottom-10 left-10 text-[var(--accent)] opacity-20" size={30} />
                
                {/* Sparkle Particles */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        animate={{ 
                            y: [-10, 10, -10],
                            opacity: [0.2, 0.5, 0.2]
                        }}
                        transition={{ duration: 2 + i, repeat: Infinity }}
                        className="absolute w-1 h-1 rounded-full bg-white/40"
                        style={{ 
                            top: `${Math.random() * 80}%`,
                            left: `${Math.random() * 80}%`
                        }}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
};

export default MasteryMilestone;
