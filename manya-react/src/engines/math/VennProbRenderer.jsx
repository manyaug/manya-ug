import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, GripHorizontal, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';

/**
 * VENN PROBABILITY RENDERER
 * Handles the visual presentation, SVG Venn diagram, and draggable chips.
 */
const VennProbRenderer = ({
    question,
    phase,
    chips,
    numInput,
    setNumInput,
    denInput,
    setDenInput,
    regionInputs,
    setRegionInputs,
    errorMsg,
    isResolved,
    currentStep,
    totalLevels,
    containerRef,
    handleDragEnd,
    handleCheckSetup,
    handleCheckFill,
    handleCheckProb
}) => {
    
    const counts = { left: 0, right: 0, center: 0, outside: 0, storage: 0 };
    chips.forEach(c => { counts[c.region]++; });

    return (
        <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative selection:bg-transparent">
            {/* 1. CANVAS WRAPPER */}
            <div 
                ref={containerRef}
                className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f1f5f9_100%)] overflow-hidden"
            >
                {/* SVG Venn Background */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
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
                    <rect x="50" y="50" width="900" height="550" rx="30" fill="white" stroke="#e2e8f0" strokeWidth="3" />
                    <text x="80" y="110" fill="#cbd5e1" fontSize="32" fontFamily="sans-serif" fontWeight="bold">ξ</text>
                    
                    <g transform="translate(500, 320)">
                        <circle cx="-130" cy="0" r="220" fill="url(#glowLeft)" stroke={question?.sets?.A?.color || "#9333ea"} strokeWidth="5" />
                        <text x="-320" y="-180" fill={question?.sets?.A?.color || "#9333ea"} fontSize="28" fontWeight="800">
                            {question?.sets?.A?.label || "A"}
                        </text>
                        
                        <circle cx="130" cy="0" r="220" fill="url(#glowRight)" stroke={question?.sets?.B?.color || "#db2777"} strokeWidth="5" />
                        <text x="320" y="-180" fill={question?.sets?.B?.color || "#db2777"} fontSize="28" fontWeight="800">
                            {question?.sets?.B?.label || "B"}
                        </text>
                    </g>
                    <line x1="0" y1="650" x2="1000" y2="650" stroke="#e2e8f0" strokeWidth="4" strokeDasharray="8 8" />
                </svg>

                {/* Diagram Fill HUD (Overlaid on Canvas) */}
                {phase === 'fill' && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="w-full h-full relative">
                            {[
                                { id: 'left', x: 30, y: 40 },
                                { id: 'center', x: 50, y: 40 },
                                { id: 'right', x: 70, y: 40 },
                                { id: 'outside', x: 15, y: 15 }
                            ].map(loc => (
                                <div 
                                    key={loc.id} 
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                    style={{ left: `${loc.id === 'outside' ? 12 : loc.x}%`, top: `${loc.id === 'outside' ? 12 : loc.y}%` }}
                                >
                                    <input 
                                        type="number"
                                        placeholder="?"
                                        value={regionInputs[loc.id] || ''}
                                        onChange={e => setRegionInputs(prev => ({ ...prev, [loc.id]: e.target.value }))}
                                        className="w-14 h-14 bg-white/90 backdrop-blur-sm border-2 border-indigo-200 rounded-2xl text-center font-black text-xl shadow-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Draggable Chips */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-full relative">
                        {['storage', 'left', 'right', 'center', 'outside'].map(regionKey => {
                            const regionChips = chips.filter(c => c.region === regionKey);
                            return regionChips.map((chip, idx) => {
                                let xPercent, yPercent;
                                const jitter = (idx * 5) % 15 - 7.5;
                                
                                if (regionKey === 'storage') {
                                    xPercent = 10 + (idx % 10) * 8; yPercent = 82 + Math.floor(idx / 10) * 8;
                                } else if (regionKey === 'left') {
                                    xPercent = 30 + jitter; yPercent = 40 + jitter;
                                } else if (regionKey === 'right') {
                                    xPercent = 70 + jitter; yPercent = 40 + jitter;
                                } else if (regionKey === 'center') {
                                    xPercent = 50 + jitter; yPercent = 40 + jitter;
                                } else {
                                    xPercent = 15 + jitter; yPercent = 65 + jitter;
                                }

                                return (
                                    <motion.div
                                        key={chip.id} layoutId={`chip-${chip.id}`} drag dragMomentum={false}
                                        onDragEnd={(e, info) => handleDragEnd(e, info, chip.id)}
                                        className="absolute w-8 h-8 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center text-sm cursor-grab active:cursor-grabbing pointer-events-auto"
                                        animate={{
                                            left: `${xPercent}%`, top: `${yPercent}%`,
                                            backgroundColor: regionKey === 'left' ? '#f3e8ff' : regionKey === 'right' ? '#fce7f3' : regionKey === 'center' ? '#fef08a' : '#ffffff'
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

            {/* 2. HUD AREA */}
            <div className="flex-none bg-white p-4 pb-safe border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] rounded-t-[32px] z-20 flex flex-col">
                <AnimatePresence mode="wait">
                    {phase === 'setup' ? (
                        <motion.div
                            key="setup-hud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-3"
                        >
                            <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl text-teal-800 font-semibold text-sm leading-snug">{question?.story}</div>
                            <div className="flex flex-wrap justify-between gap-2 px-1 text-xs font-mono font-bold">
                                <span className={counts.left === question?.setup?.aOnly ? 'text-emerald-600' : 'text-slate-400'}>A: {counts.left}/{question?.setup?.aOnly}</span>
                                <span className={counts.center === question?.setup?.intersection ? 'text-emerald-600' : 'text-slate-400'}>Both: {counts.center}/{question?.setup?.intersection}</span>
                                <span className={counts.right === question?.setup?.bOnly ? 'text-emerald-600' : 'text-slate-400'}>B: {counts.right}/{question?.setup?.bOnly}</span>
                                <span className={counts.outside === question?.setup?.outside ? 'text-emerald-600' : 'text-slate-400'}>Out: {counts.outside}/{question?.setup?.outside}</span>
                            </div>
                             <button onClick={handleCheckSetup} className="w-full py-4 bg-purple-600 text-white rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wide shadow-[0_4px_0_#6b21a8] active:translate-y-[4px] active:shadow-none transition-all">
                                <GripHorizontal size={20} /> CHECK SETUP
                            </button>
                        </motion.div>
                    ) : phase === 'fill' ? (
                        <motion.div
                            key="fill-hud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-3"
                        >
                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-indigo-800 font-semibold text-sm leading-snug">{question?.story || "Fill the diagram counts."}</div>
                            <button onClick={handleCheckFill} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wide shadow-[0_4px_0_#4338ca] active:translate-y-[4px] active:shadow-none transition-all">
                                <CheckCircle2 size={20} /> VERIFY DIAGRAM
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="calc-hud" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-3"
                        >
                            <div className="bg-fuchsia-50 border border-fuchsia-100 p-3 rounded-xl text-fuchsia-800 font-semibold text-sm leading-snug">{question?.question}</div>
                            <div className="flex items-center justify-center gap-4 my-2">
                                <span className="font-bold text-slate-500">Prob(x) =</span>
                                <div className="flex flex-col gap-1 w-20">
                                    <input type="number" value={numInput} onChange={e => setNumInput(e.target.value)} className="w-full text-center font-bold text-xl border-2 border-slate-300 rounded-md focus:border-fuchsia-500 focus:outline-none py-1" placeholder="?" />
                                    <div className="h-1 bg-slate-400 rounded-full w-full" />
                                    <input type="number" value={denInput} onChange={e => setDenInput(e.target.value)} className="w-full text-center font-bold text-xl border-2 border-slate-300 rounded-md focus:border-fuchsia-500 focus:outline-none py-1" placeholder="?" />
                                </div>
                            </div>
                            <button onClick={handleCheckProb} disabled={isResolved} className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wide transition-all ${isResolved ? 'bg-emerald-500 text-white shadow-none translate-y-[4px]' : 'bg-purple-600 text-white shadow-[0_4px_0_#6b21a8] active:translate-y-[4px] active:shadow-none'}`}>
                                {isResolved ? (
                                    <>{currentStep < totalLevels - 1 ? <ChevronRight size={20} className="stroke-[3px]" /> : <CheckCircle2 size={20} className="stroke-[3px]" />} {currentStep < totalLevels - 1 ? "NEXT LEVEL" : "QUEST COMPLETE"}</>
                                ) : (
                                    <><Calculator size={20} strokeWidth={3} /> CHECK PROBABILITY</>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
                {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-rose-500 font-bold text-sm text-center mt-3 flex items-center justify-center gap-1">
                        <XCircle size={16} /> {errorMsg}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default VennProbRenderer;
