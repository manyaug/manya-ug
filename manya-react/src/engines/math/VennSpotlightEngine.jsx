import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ArrowRight, MousePointerClick } from 'lucide-react';

export default function VennSpotlightEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [litRegions, setLitRegions] = useState(new Set());
    
    const [errorAnim, setErrorAnim] = useState(false);
    const [isResolved, setIsResolved] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    
    const startTimeRef = React.useRef(Date.now());

    const containerRef = useRef(null);
    const question = data?.questions?.[currentStep];
    const totalLevels = data?.questions?.length || 1;

    useEffect(() => {
        if (window.QuestRunner) window.QuestRunner.disableButton?.();
    }, []);

    // Reset when level changes
    useEffect(() => {
        setLitRegions(new Set());
        setIsResolved(false);
        setErrorAnim(false);
        startTimeRef.current = Date.now();
    }, [currentStep]);

    const handleTap = (e) => {
        if (isResolved) return;

        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        
        // Handle both mouse and touch events
        const clientX = e.clientX ?? e.touches?.[0]?.clientX;
        const clientY = e.clientY ?? e.touches?.[0]?.clientY;
        
        if (clientX === undefined) return;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const width = rect.width;
        const height = rect.height;
        const cx = width / 2;
        const cy = height / 2;
        
        const pad = Math.min(15, width * 0.05);
        const availW = width - (pad * 2); 
        const availH = height - (pad * 2);
        
        const r = Math.max(20, Math.min(availW * 0.28, availH * 0.35)); 
        const offset = r * 0.65;
        
        const c1x = cx - offset;
        const c2x = cx + offset;

        const d1 = Math.hypot(x - c1x, y - cy);
        const d2 = Math.hypot(x - c2x, y - cy);

        let region = null;
        if (d1 < r && d2 < r) region = 'center';
        else if (d1 < r) region = 'left';
        else if (d2 < r) region = 'right';
        else if (x > pad && x < width - pad && y > pad && y < height - pad) region = 'outside';

        if (region) {
            setLitRegions(prev => {
                const next = new Set(prev);
                if (next.has(region)) next.delete(region);
                else next.add(region);
                return next;
            });
            window.ManyaAudio?.tap?.();
            if (window.navigator?.vibrate) window.navigator.vibrate(10);
        }
    };

    const handleCheck = () => {
        if (isResolved) {
            if (currentStep < totalLevels - 1) {
                setCurrentStep(prev => prev + 1);
            } else {
                if (onComplete) onComplete({
                    isCorrect: true,
                    score: totalLevels,
                    total: totalLevels,
                    mistakes: mistakes,
                    type: 'quiz'
                });
            }
            return;
        }

        const targetSet = question?.targetRegions || [];
        let isCorrect = litRegions.size === targetSet.length;
        if (isCorrect) {
            targetSet.forEach(r => {
                if (!litRegions.has(r)) isCorrect = false;
            });
        }

        const duration = Date.now() - startTimeRef.current;

        // ── RECORD GRANULAR ATTEMPT ──
        if (onAttempt) {
            onAttempt({
                isCorrect,
                label: `Venn Spotlight [${currentStep + 1}]: ${question?.notation}`,
                duration,
                mistakes: isCorrect ? 0 : 1
            });
        }

        if (isCorrect) {
            setIsResolved(true);
            window.ManyaAudio?.success?.();
            if (window.navigator?.vibrate) window.navigator.vibrate([30, 50, 30]);

            // Final Level completion result
            if (currentStep === totalLevels - 1) {
                if (onResult) {
                    onResult({
                        isCorrect: true,
                        score: totalLevels,
                        total: totalLevels,
                        mistakes: mistakes,
                        type: 'quiz'
                    });
                }
            }

        } else {
            setErrorAnim(true);
            setMistakes(prev => prev + 1);
            window.ManyaAudio?.error?.();
            if (window.navigator?.vibrate) window.navigator.vibrate([50, 100, 50]);
            setTimeout(() => setErrorAnim(false), 800);
        }
    };

    // To cleanly render the shaded regions with SVG, we can use <use> and <clipPath>
    // A circle: cx="35%" cy="50%" r="25%"
    // B circle: cx="65%" cy="50%" r="25%"
    
    // The exact radii matches the hit logic:
    // cx = 50%, offset = r*0.65
    // Actually using exact absolute px units in SVG based on state is hard without resize observer triggering React renders.
    // Instead we use percentage based SVG which matches the JS hit logic.
    // Width = 100%. pad = ~5%. r ~ 28%. offset ~ r*0.65 = 18.2%.
    // C1 cx = 50 - 18.2 = 31.8%. C2 cx = 50 + 18.2 = 68.2%.
    
    return (
        <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden relative selection:bg-transparent">
            {/* CANVAS WRAPPER */}
            <div 
                ref={containerRef}
                onPointerDown={handleTap}
                className="flex-1 relative bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f1f5f9_100%)] overflow-hidden touch-none"
            >
                <motion.svg 
                    className="absolute inset-0 w-full h-full" 
                    animate={isResolved ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.3 }}
                >
                    <defs>
                        <mask id="mask-a">
                            <circle cx="31.8%" cy="50%" r="28%" fill="white" />
                        </mask>
                        <mask id="mask-b">
                            <circle cx="68.2%" cy="50%" r="28%" fill="white" />
                        </mask>
                        
                        <mask id="mask-center">
                            <circle cx="31.8%" cy="50%" r="28%" fill="white" />
                            <circle cx="68.2%" cy="50%" r="28%" fill="black" />
                            {/* Wait, intersection mask: */}
                        </mask>
                        
                        {/* 
                            Instead of complex masks, we can draw the yellow highlight using simple shapes and compound masks:
                            Outside: Full rect, mask out A and B.
                            Left: A, mask out B.
                            Right: B, mask out A.
                            Center: Both A and B (clipPath).
                        */}
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
                    <rect x="5%" y="5%" width="90%" height="90%" rx="16" fill="white" stroke="#cbd5e1" strokeWidth="2" />
                    <text x="8%" y="12%" fill="#64748b" fontSize="24" fontFamily="sans-serif" fontWeight="bold">ξ</text>

                    {/* Shaded Regions (Yellow) */}
                    <g fill="#fef08a">
                        <AnimatePresence>
                            {litRegions.has('outside') && (
                                <motion.rect initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                    x="5%" y="5%" width="90%" height="90%" rx="16" mask="url(#mask-outside)" 
                                />
                            )}
                            {litRegions.has('left') && (
                                <motion.rect initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                    width="100%" height="100%" mask="url(#mask-left)" 
                                />
                            )}
                            {litRegions.has('right') && (
                                <motion.rect initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                    width="100%" height="100%" mask="url(#mask-right)" 
                                />
                            )}
                            {litRegions.has('center') && (
                                <motion.circle initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                                    cx="31.8%" cy="50%" r="28%" clipPath="url(#clip-b)" 
                                />
                            )}
                        </AnimatePresence>
                    </g>

                    {/* Circle Outlines (Drawn above shading) */}
                    <circle cx="31.8%" cy="50%" r="28%" fill="none" stroke="#9333ea" strokeWidth="3" />
                    <text x="18%" y="28%" fill="#9333ea" fontSize="24" fontWeight="bold">A</text>

                    <circle cx="68.2%" cy="50%" r="28%" fill="none" stroke="#db2777" strokeWidth="3" />
                    <text x="80%" y="28%" fill="#db2777" fontSize="24" fontWeight="bold">B</text>

                </motion.svg>
            </div>

            {/* HUD */}
            <div className="flex-none bg-white border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] rounded-t-[32px] z-20 flex flex-col" style={{ padding: 'clamp(12px, 2vh, 20px)', gap: 'clamp(6px, 1.5vh, 16px)' }}>
                
                <motion.div 
                    animate={errorAnim ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="bg-fuchsia-50 border border-fuchsia-200 rounded-2xl p-3 text-center relative overflow-hidden shadow-sm"
                >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-fuchsia-500" />
                    <div className="font-mono font-black text-fuchsia-900 tracking-wide mb-0.5" style={{ fontSize: 'clamp(20px, 3.5vh, 30px)' }}>
                        {question?.notation}
                    </div>
                    <div className="text-slate-600 font-semibold" style={{ fontSize: 'clamp(11px, 1.5vh, 14px)' }}>
                        {question?.description}
                    </div>
                </motion.div>

                <div className="text-center font-bold min-h-[16px] text-rose-500" style={{ fontSize: 'clamp(11px, 1.5vh, 14px)' }}>
                    {errorAnim ? (question?.hint || "Incorrect shading!") : (!isResolved && litRegions.size === 0 && <span className="text-slate-400">Tap regions to shade them</span>)}
                </div>

                <motion.button
                    onClick={handleCheck}
                    className={`w-full rounded-xl font-black flex items-center justify-center gap-2 uppercase tracking-wide transition-all ${
                        isResolved && currentStep === totalLevels - 1
                        ? 'bg-emerald-500 text-white shadow-none translate-y-[4px]'
                        : isResolved 
                        ? 'bg-blue-600 text-white shadow-none translate-y-[4px]'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-[0_4px_0_#6b21a8] active:translate-y-[4px] active:shadow-none'
                    }`}
                    style={{ height: 'clamp(44px, 7vh, 56px)' }}
                >
                    {isResolved ? (
                        currentStep < totalLevels - 1 ? (
                            <>
                                <ArrowRight size={20} strokeWidth={3} />
                                NEXT QUESTION
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={20} className="stroke-[3px]" />
                                QUEST COMPLETE!
                            </>
                        )
                    ) : (
                        <>
                            <MousePointerClick size={20} strokeWidth={3} />
                            CHECK SHADING
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
