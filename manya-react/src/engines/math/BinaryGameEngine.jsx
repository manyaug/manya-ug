import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, Zap, AlertTriangle, Minus, Plus } from 'lucide-react';

export default function BinaryGameEngine({ data, onComplete, onResult, onAttempt }) {
    // Data expected: data.questions[0].targetVal (e.g., 16), data.questions[0].prompt
    const target = data?.questions?.[0]?.targetVal || 16;
    const prompt = data?.questions?.[0]?.prompt || "Generate the target power!";

    const [n, setN] = useState(0);
    const [isResolved, setIsResolved] = useState(false);
    const [isError, setIsError] = useState(false);
    const [mistakes, setMistakes] = useState(0);

    const startTimeRef = React.useRef(Date.now());

    // Stop propagation of typing events if any
    useEffect(() => {
        if (window.QuestRunner) {
            window.QuestRunner.disableButton?.();
        }
    }, []);

    const modify = (delta) => {
        if (isResolved) return;
        setN(prev => Math.max(0, Math.min(8, prev + delta)));
        // Provide haptic feedback
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
        window.ManyaAudio?.tap?.();
    };

    const check = () => {
        if (isResolved) return;
        
        const currentPower = Math.pow(2, n);
        const isCorrect = currentPower === target;
        const duration = Date.now() - startTimeRef.current;

        // ── RECORD GRANULAR ATTEMPT ──
        if (onAttempt) {
            onAttempt({
                isCorrect,
                label: `Binary Power: 2^${n} Target: ${target}`,
                duration,
                mistakes: isCorrect ? 0 : 1
            });
        }

        if (isCorrect) {
            setIsResolved(true);
            window.ManyaAudio?.success?.();
            if (window.navigator?.vibrate) window.navigator.vibrate([30, 50, 30]);
            
            // Notify DB/Parent
            if (onResult) {
                onResult({
                    isCorrect: true,
                    score: 1,
                    total: 1,
                    type: 'simulation'
                });
            }

            setTimeout(() => {
                if (onComplete) onComplete({
                    isCorrect: true,
                    score: 1,
                    total: 1,
                    mistakes: mistakes,
                    type: 'simulation'
                });
            }, 2500); // Wait for success animation before navigating
        } else {
            setIsError(true);
            setMistakes(prev => prev + 1);
            window.ManyaAudio?.error?.();
            if (window.navigator?.vibrate) window.navigator.vibrate([50, 100, 50]);
            
            setTimeout(() => setIsError(false), 1000);
        }
    };

    // Derived values for the orbit visualization
    const electrons = Array.from({ length: n });
    const currentPower = Math.pow(2, n);
    const coreSize = 40 + (n * 3);

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 overflow-hidden relative selection:bg-transparent text-slate-100">
            {/* CANVAS / VISUALIZATION AREA */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900" />

                {/* Orbit System */}
                <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
                    {/* Orbit Rings */}
                    <div className="absolute inset-0 border-2 border-slate-700/50 rounded-full scale-[0.6]" />
                    <div className="absolute inset-0 border-2 border-slate-700/50 rounded-full scale-[1.2]" />

                    {/* Core */}
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

                    {/* Electrons */}
                    <AnimatePresence>
                        {electrons.map((_, i) => {
                            // Determine electron position on a circle
                            const angle = (i / Math.max(1, n)) * 360;
                            const radius = 90 + (i % 2 === 0 ? -10 : 10); // slightly varied orbit paths
                            
                            return (
                                <motion.div
                                    key={`electron-${i}`}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ 
                                        scale: 1, 
                                        opacity: 1,
                                        rotate: [0, 360] 
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{
                                        rotate: {
                                            duration: isResolved ? 2 : 8,
                                            repeat: Infinity,
                                            ease: "linear",
                                            // Offset rotation based on electron index so they spread out
                                            from: angle,
                                            to: angle + 360
                                        },
                                        scale: { duration: 0.3 }
                                    }}
                                    className="absolute inset-0 origin-center pointer-events-none"
                                >
                                    {/* The visual electron particle */}
                                    <div 
                                        className="absolute bg-emerald-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                                        style={{ 
                                            width: 24, height: 24, 
                                            top: '0%', left: '50%', 
                                            marginTop: -12, marginLeft: -12,
                                            transform: `translateY(-${radius}px)`
                                        }}
                                    >
                                        <span className="text-[10px] font-bold text-emerald-950">{i + 1}</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* CONTROL PANEL HUD */}
            <div className="flex-none bg-slate-800 border-t border-slate-700 p-5 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-20 pb-safe">
                <div className="text-center font-semibold text-slate-300 mb-4 whitespace-pre-wrap">{prompt}</div>
                
                {/* Screen */}
                <div className="bg-slate-950 border-2 border-slate-700 rounded-2xl p-4 flex justify-between items-center mb-5 shadow-inner">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Elements (n)</span>
                        <motion.span 
                            key={`n-${n}`}
                            initial={{ scale: 1.5, color: '#f8fafc' }}
                            animate={{ scale: 1, color: '#94a3b8' }}
                            className="font-mono text-3xl font-bold"
                        >
                            {n}
                        </motion.span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Subsets (2ⁿ)</span>
                        <motion.span 
                            key={`power-${currentPower}`}
                            initial={{ scale: 1.3, color: '#ffffff' }}
                            animate={{ scale: 1, color: '#4ade80' }}
                            className="font-mono text-4xl font-black drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                        >
                            {currentPower}
                        </motion.span>
                    </div>
                </div>

                {/* Adjuster Buttons */}
                <div className="flex gap-3 mb-4">
                    <button 
                        onClick={() => modify(-1)}
                        disabled={isResolved || n <= 0}
                        className="flex-1 py-4 bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-black text-2xl flex items-center justify-center transition-all shadow-[0_4px_0_#334155] active:translate-y-[4px] active:shadow-none"
                    >
                        <Minus size={24} strokeWidth={3} />
                    </button>
                    <button 
                        onClick={() => modify(1)}
                        disabled={isResolved || n >= 8}
                        className="flex-1 py-4 bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-white rounded-xl font-black text-2xl flex items-center justify-center transition-all shadow-[0_4px_0_#334155] active:translate-y-[4px] active:shadow-none"
                    >
                        <Plus size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Ignite Action */}
                <motion.button
                    onClick={check}
                    disabled={isResolved}
                    animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 text-[15px] tracking-wide uppercase transition-all ${
                        isResolved ? 'bg-emerald-500 text-white shadow-none translate-y-[4px]' :
                        isError ? 'bg-rose-500 text-white shadow-[0_4px_0_#9f1239]' :
                        'bg-violet-600 text-white shadow-[0_4px_0_#4c1d95] active:translate-y-[4px] active:shadow-none'
                    }`}
                >
                    {isResolved ? (
                        <>
                            <CheckCircle2 size={20} strokeWidth={3} />
                            SYSTEM STABLE
                        </>
                    ) : isError ? (
                        <>
                            <AlertTriangle size={20} strokeWidth={3} />
                            POWER MISMATCH
                        </>
                    ) : (
                        <>
                            <Zap size={20} className="fill-current" strokeWidth={2} />
                            IGNITE GENERATOR
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
