import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, GripHorizontal, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';

export default function VennProbEngine({ data, onComplete, onResult }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [phase, setPhase] = useState('setup'); // 'setup' | 'calc'
    
    const [chips, setChips] = useState([]);
    const [numInput, setNumInput] = useState('');
    const [denInput, setDenInput] = useState('');
    
    const [errorMsg, setErrorMsg] = useState('');
    const [isResolved, setIsResolved] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    
    const containerRef = useRef(null);
    const question = data?.questions?.[currentStep];
    const totalLevels = data?.questions?.length || 1;

    useEffect(() => {
        if (window.QuestRunner) window.QuestRunner.disableButton?.();
    }, []);

    useEffect(() => {
        if (question && phase === 'setup') {
            const { aOnly, bOnly, intersection, outside } = question.setup;
            const total = aOnly + bOnly + intersection + outside;
            setChips(Array.from({ length: total }, (_, i) => ({
                id: i,
                region: 'storage'
            })));
            setNumInput('');
            setDenInput('');
            setIsResolved(false);
            setErrorMsg('');
        }
    }, [currentStep, question, phase]);

    // Handle dropping a chip
    const handleDragEnd = (event, info, chipId) => {
        if (phase !== 'setup') return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        // Pointer relative to container
        const x = info.point.x - rect.left;
        const y = info.point.y - rect.top;

        // Container geometry
        const width = rect.width;
        const height = rect.height;
        const cx = width / 2;
        const cy = height / 2.5; // Venn diagram sits a bit higher
        
        // Use a generous responsive radius
        const r = Math.min(width * 0.3, height * 0.3);
        const offset = r * 0.6;
        const c1x = cx - offset;
        const c2x = cx + offset;

        const d1 = Math.hypot(x - c1x, y - cy);
        const d2 = Math.hypot(x - c2x, y - cy);

        let newRegion = 'storage';
        // If it was dropped in the bottom 30% area, it goes back to storage
        if (y > height * 0.75) {
            newRegion = 'storage';
        } else {
            if (d1 < r && d2 < r) newRegion = 'center';
            else if (d1 < r) newRegion = 'left';
            else if (d2 < r) newRegion = 'right';
            else newRegion = 'outside';
        }

        setChips(prev => {
            const next = [...prev];
            const chipIndex = next.findIndex(c => c.id === chipId);
            if (chipIndex > -1) {
                // If region changed, play tiny haptic
                if (next[chipIndex].region !== newRegion) {
                    window.ManyaAudio?.tap?.();
                    if (window.navigator?.vibrate) window.navigator.vibrate(10);
                }
                next[chipIndex] = { ...next[chipIndex], region: newRegion };
            }
            return next;
        });
    };

    const handleCheckSetup = () => {
        const counts = { left: 0, right: 0, center: 0, outside: 0, storage: 0 };
        chips.forEach(c => { counts[c.region]++; });

        const setup = question.setup;
        if (
            counts.left === setup.aOnly &&
            counts.right === setup.bOnly &&
            counts.center === setup.intersection &&
            counts.outside === setup.outside
        ) {
            window.ManyaAudio?.success?.();
            setPhase('calc');
            setErrorMsg('');
        } else {
            window.ManyaAudio?.error?.();
            setMistakes(prev => prev + 1);
            setErrorMsg("Diagram doesn't match the story yet.");
            setTimeout(() => setErrorMsg(''), 2000);
        }
    };

    const handleCheckProb = () => {
        const num = parseInt(numInput, 10);
        const den = parseInt(denInput, 10);

        if (num === question.expectedNumerator && den === question.expectedDenominator) {
            window.ManyaAudio?.success?.();
            setIsResolved(true);
            setErrorMsg('');
            if (window.navigator?.vibrate) window.navigator.vibrate([30, 50, 30]);

            setTimeout(() => {
                if (currentStep < totalLevels - 1) {
                    setCurrentStep(prev => prev + 1);
                    setPhase('setup');
                } else {
                    // Final Completion
                    if (onResult) {
                        onResult({
                            isCorrect: true,
                            score: totalLevels,
                            total: totalLevels,
                            mistakes: mistakes,
                            type: 'quiz'
                        });
                    }
                    if (onComplete) onComplete();
                }
            }, 1500);
        } else {
            window.ManyaAudio?.error?.();
            setMistakes(prev => prev + 1);
            setErrorMsg(question.hint || "Incorrect probability.");
            setTimeout(() => setErrorMsg(''), 3000);
            if (window.navigator?.vibrate) window.navigator.vibrate([50, 100, 50]);
        }
    };

    // Calculate grouping sizes
    const counts = { left: 0, right: 0, center: 0, outside: 0, storage: 0 };
    chips.forEach(c => { counts[c.region]++; });

    return (
        <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative selection:bg-transparent">
            {/* CANVAS WRAPPER */}
            <div 
                ref={containerRef}
                className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f1f5f9_100%)] overflow-hidden"
            >
                {/* Visual Venn SVG Background */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="glowLeft" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
                        </linearGradient>
                        <linearGradient id="glowRight" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fbcfe8" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>
                    
                    {/* Frame */}
                    <rect x="5%" y="5%" width="90%" height="70%" rx="16" fill="white" stroke="#cbd5e1" strokeWidth="2" />
                    <text x="8%" y="12%" fill="#64748b" fontSize="24" fontFamily="sans-serif" fontWeight="bold">ξ</text>

                    {/* Circles */}
                    <g transform="translate(50%, 40%)">
                        <circle cx="-20%" cy="0" r="30%" fill="url(#glowLeft)" stroke="#9333ea" strokeWidth="3" />
                        <text x="-45%" y="-25%" fill="#9333ea" fontSize="20" fontWeight="bold">A</text>

                        <circle cx="20%" cy="0" r="30%" fill="url(#glowRight)" stroke="#db2777" strokeWidth="3" />
                        <text x="45%" y="-25%" fill="#db2777" fontSize="20" fontWeight="bold">B</text>
                    </g>

                    <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="4 4" />
                </svg>

                {/* Draggable Chips rendering */}
                {/* For performance and layout simplicity, we just render chips in absolute pos depending on state, 
                    using AnimatePresence to transition their position. 
                    Actually, making them properly draggable with framer-motion requires careful layout management 
                    so they don't overlap totally. */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-full relative">
                        {['storage', 'left', 'right', 'center', 'outside'].map(regionKey => {
                            const regionChips = chips.filter(c => c.region === regionKey);
                            return regionChips.map((chip, idx) => {
                                // Calculate a clustered position based on index in region to avoid perfect overlap
                                let xPercent, yPercent;
                                const offset = (idx * 5) % 15 - 7.5; // jitter
                                
                                if (regionKey === 'storage') {
                                    // grid at bottom
                                    xPercent = 10 + (idx % 10) * 8;
                                    yPercent = 82 + Math.floor(idx / 10) * 8;
                                } else if (regionKey === 'left') {
                                    xPercent = 30 + offset; yPercent = 40 + offset;
                                } else if (regionKey === 'right') {
                                    xPercent = 70 + offset; yPercent = 40 + offset;
                                } else if (regionKey === 'center') {
                                    xPercent = 50 + offset; yPercent = 40 + offset;
                                } else {
                                    // outside
                                    xPercent = 15 + offset; yPercent = 65 + offset;
                                }

                                return (
                                    <motion.div
                                        key={chip.id}
                                        layoutId={`chip-${chip.id}`}
                                        drag
                                        dragMomentum={false}
                                        onDragEnd={(e, info) => handleDragEnd(e, info, chip.id)}
                                        className="absolute w-8 h-8 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-sm cursor-grab active:cursor-grabbing pointer-events-auto"
                                        animate={{
                                            left: `${xPercent}%`,
                                            top: `${yPercent}%`,
                                            backgroundColor: 
                                                regionKey === 'left' ? '#f3e8ff' : 
                                                regionKey === 'right' ? '#fce7f3' :
                                                regionKey === 'center' ? '#fef08a' :
                                                '#ffffff'
                                        }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                                    >
                                        👤
                                    </motion.div>
                                );
                            });
                        })}
                    </div>
                </div>
            </div>

            {/* HUD Area */}
            <div className="flex-none bg-white p-4 pb-safe border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] rounded-t-[32px] z-20 flex flex-col">
                <AnimatePresence mode="wait">
                    {phase === 'setup' ? (
                        <motion.div
                            key="setup-hud"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-3"
                        >
                            <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl text-teal-800 font-semibold text-sm leading-snug">
                                {question?.story}
                            </div>
                            
                            <div className="flex flex-wrap justify-between gap-2 px-1 text-xs font-mono font-bold">
                                <span className={counts.left === question?.setup?.aOnly ? 'text-emerald-600' : 'text-slate-400'}>
                                    A: {counts.left}/{question?.setup?.aOnly}
                                </span>
                                <span className={counts.center === question?.setup?.intersection ? 'text-emerald-600' : 'text-slate-400'}>
                                    Both: {counts.center}/{question?.setup?.intersection}
                                </span>
                                <span className={counts.right === question?.setup?.bOnly ? 'text-emerald-600' : 'text-slate-400'}>
                                    B: {counts.right}/{question?.setup?.bOnly}
                                </span>
                                <span className={counts.outside === question?.setup?.outside ? 'text-emerald-600' : 'text-slate-400'}>
                                    Out: {counts.outside}/{question?.setup?.outside}
                                </span>
                            </div>

                            <button
                                onClick={handleCheckSetup}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wide shadow-[0_4px_0_#6b21a8] active:translate-y-[4px] active:shadow-none transition-all"
                            >
                                <GripHorizontal size={20} />
                                CHECK SETUP
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="calc-hud"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-3"
                        >
                            <div className="bg-fuchsia-50 border border-fuchsia-100 p-3 rounded-xl text-fuchsia-800 font-semibold text-sm leading-snug">
                                {question?.question}
                            </div>

                            <div className="flex items-center justify-center gap-4 my-2">
                                <span className="font-bold text-slate-500">Prob(x) =</span>
                                <div className="flex flex-col gap-1 w-20">
                                    <input 
                                        type="number" 
                                        value={numInput}
                                        onChange={e => setNumInput(e.target.value)}
                                        className="w-full text-center font-bold text-xl border-2 border-slate-300 rounded-md focus:border-fuchsia-500 focus:outline-none py-1"
                                        placeholder="?"
                                    />
                                    <div className="h-1 bg-slate-400 rounded-full w-full" />
                                    <input 
                                        type="number" 
                                        value={denInput}
                                        onChange={e => setDenInput(e.target.value)}
                                        className="w-full text-center font-bold text-xl border-2 border-slate-300 rounded-md focus:border-fuchsia-500 focus:outline-none py-1"
                                        placeholder="?"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCheckProb}
                                disabled={isResolved}
                                className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wide transition-all ${
                                    isResolved ? 'bg-emerald-500 text-white shadow-none translate-y-[4px]' : 'bg-purple-600 text-white shadow-[0_4px_0_#6b21a8] active:translate-y-[4px] active:shadow-none'
                                }`}
                            >
                                {isResolved ? (
                                    <>
                                        {currentStep < totalLevels - 1 ? <ChevronRight size={20} className="stroke-[3px]" /> : <CheckCircle2 size={20} className="stroke-[3px]" />}
                                        {currentStep < totalLevels - 1 ? "NEXT LEVEL" : "QUEST COMPLETE"}
                                    </>
                                ) : (
                                    <>
                                        <Calculator size={20} strokeWidth={3} />
                                        CHECK PROBABILITY
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {errorMsg && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} 
                        className="text-rose-500 font-bold text-sm text-center mt-3 flex items-center justify-center gap-1"
                    >
                        <XCircle size={16} />
                        {errorMsg}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
