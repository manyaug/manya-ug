import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, MousePointerClick } from 'lucide-react';

/**
 * VENN SPOTLIGHT RENDERER
 * Handles the visual presentation, SVG masks for shading, and HUD interaction.
 */
const VennSpotlightRenderer = ({
    question,
    litRegions,
    errorAnim,
    isResolved,
    currentStep,
    totalLevels,
    containerRef,
    handleTap,
    handleCheck
}) => {
    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden relative selection:bg-transparent">
            {/* 1. INTERACTIVE STAGE */}
            <div 
                ref={containerRef}
                onPointerDown={handleTap}
                className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_var(--bg-secondary)_0%,_var(--bg-primary)_100%)] overflow-hidden touch-none"
            >
                <motion.svg className="absolute inset-0 w-full h-full" animate={isResolved ? { scale: [1, 1.02, 1] } : {}} transition={{ duration: 0.3 }}>
                    <defs>
                        <clipPath id="clip-a"><circle cx="31.8%" cy="50%" r="28%" /></clipPath>
                        <clipPath id="clip-b"><circle cx="68.2%" cy="50%" r="28%" /></clipPath>
                        
                        <mask id="mask-outside">
                            <rect width="100%" height="100%" fill="white" />
                            <circle cx="31.8%" cy="50%" r="28%" fill="black" />
                            <circle cx="68.2%" cy="50%" r="28%" fill="black" />
                        </mask>
                        
                        <mask id="mask-left">
                            <circle cx="31.8%" cy="50%" r="28%" fill="white" />
                            <circle cx="68.2%" cy="50%" r="28%" fill="black" />
                        </mask>
                        
                        <mask id="mask-right">
                            <circle cx="68.2%" cy="50%" r="28%" fill="white" />
                            <circle cx="31.8%" cy="50%" r="28%" fill="black" />
                        </mask>
                    </defs>

                    {/* Frame */}
                    <rect x="5%" y="5%" width="90%" height="90%" rx="16" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="2" />
                    <text x="8%" y="12%" fill="#64748b" fontSize="24" fontFamily="sans-serif" fontWeight="bold">ξ</text>

                    {/* Shaded Regions */}
                    <g fill="#fef08a">
                        <AnimatePresence>
                            {litRegions.has('outside') && (
                                <motion.rect initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} x="5%" y="5%" width="90%" height="90%" rx="16" mask="url(#mask-outside)" />
                            )}
                            {litRegions.has('left') && (
                                <motion.rect initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} width="100%" height="100%" mask="url(#mask-left)" />
                            )}
                            {litRegions.has('right') && (
                                <motion.rect initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} width="100%" height="100%" mask="url(#mask-right)" />
                            )}
                            {litRegions.has('center') && (
                                <motion.circle initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} cx="31.8%" cy="50%" r="28%" clipPath="url(#clip-b)" />
                            )}
                        </AnimatePresence>
                    </g>

                    {/* Outlines */}
                    <circle cx="31.8%" cy="50%" r="28%" fill="none" stroke="#9333ea" strokeWidth="3" />
                    <text x="18%" y="28%" fill="#9333ea" fontSize="24" fontWeight="bold">A</text>
                    <circle cx="68.2%" cy="50%" r="28%" fill="none" stroke="#db2777" strokeWidth="3" />
                    <text x="80%" y="28%" fill="#db2777" fontSize="24" fontWeight="bold">B</text>
                </motion.svg>
            </div>

            {/* 2. HUD AREA */}
            <div className="flex-none bg-[var(--bg-card)] border-t border-[var(--border-color)] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] rounded-t-[40px] z-20 flex flex-col p-5 gap-4">
                <motion.div animate={errorAnim ? { x: [-10, 10, -10, 10, 0] } : {}} className="bg-[#d946ef]/10 border border-[#d946ef]/20 rounded-2xl p-4 text-center relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#d946ef]" />
                    <div className="font-mono font-black text-[#d946ef] tracking-wide mb-1 text-2xl uppercase">{question?.notation}</div>
                    <div className="text-[var(--text-sub)] font-semibold text-sm">{question?.description}</div>
                </motion.div>

                <div className="text-center font-bold text-sm text-rose-500 min-h-[20px]">
                    {errorAnim ? (question?.hint || "Incorrect shading!") : (!isResolved && litRegions.size === 0 && <span className="text-[var(--text-muted)]">Tap regions to shade them</span>)}
                </div>

                <motion.button
                    onClick={handleCheck}
                    className={`w-full py-4.5 rounded-[2rem] font-black flex items-center justify-center gap-2 uppercase tracking-widest text-xs transition-all border-b-[6px] active:translate-y-[2px] active:border-b-[4px] ${
                        isResolved 
                        ? 'bg-[#58cc02] border-[#46a302] text-white pointer-events-none translate-y-[2px]' 
                        : 'bg-[#58cc02] border-[#46a302] text-white hover:bg-[#46a302] shadow-[0_10px_20px_rgba(88,204,2,0.25)]'
                    }`}
                >
                    {isResolved ? (
                        currentStep < totalLevels - 1 ? <><ArrowRight size={18} /> NEXT QUESTION</> : <><CheckCircle2 size={18} /> QUEST COMPLETE!</>
                    ) : (
                        <><MousePointerClick size={18} strokeWidth={3} /> CHECK SHADING</>
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default VennSpotlightRenderer;
