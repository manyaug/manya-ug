import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BINARY POWER RENDERER
 * Stateless visual component for the atomic orbit generator.
 */

const BinaryRenderer = ({ 
    n, 
    isResolved, 
    isError, 
    coreSize, 
    getElectronMapping 
}) => {
    const electrons = Array.from({ length: n });

    return (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden z-0">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900" />

            {/* Orbit System */}
            <div className="relative flex items-center justify-center pointer-events-none" style={{ width: 'min(75vw, 300px)', height: 'min(75vw, 300px)', transform: `scale(${0.8 + (n * 0.02)})` }}>
                {/* Orbit Rings */}
                <div className="absolute inset-0 border-2 border-slate-700/30 rounded-full scale-[0.4]" />
                <div className="absolute inset-0 border-2 border-slate-700/30 rounded-full scale-[0.7]" />
                <div className="absolute inset-0 border-2 border-slate-700/30 rounded-full scale-[1.0]" />
                <div className="absolute inset-0 border-2 border-slate-700/30 rounded-full scale-[1.3]" />

                {/* Core Power Plant */}
                <motion.div 
                    className="relative flex items-center justify-center rounded-full z-10 shadow-[0_0_30px_rgba(124,58,237,0.5)]"
                    style={{ width: coreSize, height: coreSize }}
                    animate={{
                        backgroundColor: isResolved ? '#22c55e' : '#7c3aed',
                        scale: isResolved ? [1, 1.2, 1] : 1
                    }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="font-bold text-xl font-mono text-white">2ⁿ</span>
                </motion.div>

                {/* Electrons / Subsets */}
                <AnimatePresence>
                    {electrons.map((_, i) => {
                        const { shellIndex, radius, angle } = getElectronMapping(i);
                        
                        return (
                            <motion.div
                                key={`electron-${i}`}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ 
                                    scale: 1, 
                                    opacity: 1,
                                    rotate: [angle, angle + 360] 
                                }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{
                                    rotate: {
                                        duration: (isResolved ? 2 : 12 - (shellIndex * 1.5)),
                                        repeat: Infinity,
                                        ease: "linear"
                                    },
                                    scale: { duration: 0.3 }
                                }}
                                className="absolute inset-0 origin-center pointer-events-none"
                            >
                                <div 
                                    className="absolute bg-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                                    style={{ 
                                        width: 22, height: 22, 
                                        top: '50%', left: '50%', 
                                        marginTop: -11, marginLeft: -11,
                                        transform: `rotate(${-angle}deg) translateY(-${radius}px)` 
                                    }}
                                >
                                    <span className="text-[9px] font-black text-emerald-950">{i + 1}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BinaryRenderer;
