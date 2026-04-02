import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, BellRing, XCircle } from 'lucide-react';

const TOPPINGS = [
    { id: 0, icon: "🍅", label: "Tomato" },
    { id: 1, icon: "🫒", label: "Olive" },
    { id: 2, icon: "🍄", label: "Mushroom" },
    { id: 3, icon: "🥓", label: "Bacon" },
    { id: 4, icon: "🌶️", label: "Pepper" },
    { id: 5, icon: "🍍", label: "Pineapple" }
];

export default function PizzaGameEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [selected, setSelected] = useState(new Set());
    const [isResolved, setIsResolved] = useState(false);
    const [isError, setIsError] = useState(false);
    const [mistakes, setMistakes] = useState(0);

    const startTimeRef = React.useRef(Date.now());

    const question = data?.questions?.[currentLevel];
    const totalLevels = data?.questions?.length || 1;
    const targetVal = question?.targetVal || 3;

    // Derived logic
    const n = selected.size;
    const result = Math.pow(2, n) - 1;

    // Stop propagation of typing events
    useEffect(() => {
        if (window.QuestRunner) window.QuestRunner.disableButton?.();
    }, []);

    // Reset time per level
    useEffect(() => {
        startTimeRef.current = Date.now();
    }, [currentLevel]);

    // Generate fixed random positions for toppings when level or selection changes
    const toppingPositions = useMemo(() => {
        const positions = [];
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.sqrt(Math.random()) * 40; // 0-40% radius
            positions.push({
                x: 50 + Math.cos(angle) * dist,
                y: 50 + Math.sin(angle) * dist,
                rot: (Math.random() - 0.5) * 60
            });
        }
        return positions;
    }, [currentLevel]); // regenerate per level

    const toggle = (id) => {
        if (isResolved) return;
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
        
        if (window.navigator?.vibrate) window.navigator.vibrate(10);
        window.ManyaAudio?.tap?.();
    };

    const serve = () => {
        if (isResolved) return;

        const isCorrect = result === targetVal;
        const duration = Date.now() - startTimeRef.current;

        // ── RECORD GRANULAR ATTEMPT ──
        if (onAttempt) {
            onAttempt({
                isCorrect,
                label: `Pizza Order ${currentLevel + 1}`,
                selectedAnswer: `Total: ${result}`,
                correctAnswer: `Target: ${targetVal}`,
                duration,
                mistakes: isCorrect ? 0 : 1
            });
        }

        if (isCorrect) {
            setIsResolved(true);
            window.ManyaAudio?.success?.();
            if (window.navigator?.vibrate) window.navigator.vibrate([30, 50, 30]);

            setTimeout(() => {
                if (currentLevel < totalLevels - 1) {
                    setCurrentLevel(currentLevel + 1);
                    setSelected(new Set());
                    setIsResolved(false);
                } else {
                    // Final Completion
                    if (onResult) {
                        onResult({
                            isCorrect: true,
                            score: totalLevels,
                            total: totalLevels,
                            mistakes: mistakes,
                            type: 'game'
                        });
                    }
                    if (onComplete) onComplete({
                        isCorrect: true,
                        score: totalLevels,
                        total: totalLevels,
                        mistakes: mistakes,
                        type: 'game'
                    });
                }
            }, 1800);
        } else {
            setIsError(true);
            setMistakes(prev => prev + 1);
            window.ManyaAudio?.error?.();
            if (window.navigator?.vibrate) window.navigator.vibrate([50, 100, 50]);
            
            setTimeout(() => setIsError(false), 1000);
        }
    };

    const activeToppings = Array.from(selected);

    return (
        <div className="flex flex-col h-full w-full bg-orange-50 overflow-hidden relative selection:bg-transparent">
            {/* CANVAS: Visual Pizza */}
            <div className="flex-1 relative flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#ffedd5_100%)]">
                {/* Level Indicator */}
                <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-orange-200">
                    <span className="font-black text-orange-900 text-xs tracking-wider">
                        ORDER {currentLevel + 1} / {totalLevels}
                    </span>
                </div>

                <motion.div 
                    className="relative rounded-full shadow-2xl border-[12px] border-amber-600 bg-amber-500 overflow-hidden"
                    style={{ width: 'min(85vw, 420px)', aspectRatio: '1/1' }}
                    animate={isResolved ? { scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 0.5 }}
                >
                    {/* Cheese Base */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#fffbeb_0%,_#fcd34d_100%)]" />
                    
                    {/* Toppings rendering */}
                    <AnimatePresence>
                        {activeToppings.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                <span className="font-bold italic text-amber-700/40 text-lg">Plain Cheese Pizza</span>
                            </motion.div>
                        ) : (
                            toppingPositions.map((pos, i) => {
                                const tId = activeToppings[i % activeToppings.length];
                                const topping = TOPPINGS.find(t => t.id === tId);
                                if (!topping) return null;

                                return (
                                    <motion.div
                                        key={`topping-${i}-${tId}`}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1, rotate: pos.rot }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        className="absolute text-2xl"
                                        style={{
                                            top: `${pos.y}%`,
                                            left: `${pos.x}%`,
                                            transform: `translate(-50%, -50%) rotate(${pos.rot}deg)`
                                        }}
                                    >
                                        {topping.icon}
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* HUD */}
            <div className="flex-none bg-white p-5 pb-safe border-t-4 border-orange-200 shadow-[0_-10px_40px_rgba(249,115,22,0.1)] rounded-t-[32px] z-20">
                {/* Ticket */}
                <div className="bg-yellow-50 border-2 border-dashed border-amber-500 p-4 rounded-xl mb-4 flex justify-between items-center shadow-sm">
                    <div>
                        <div className="text-[10px] font-bold text-amber-700 tracking-widest uppercase mb-1">Order Formula</div>
                        <div className="font-mono font-black text-xl text-amber-900">
                            2<sup>{n}</sup> - 1 = {result}
                        </div>
                    </div>
                    <div className="bg-orange-500 text-white px-3 py-2 rounded-lg shadow-md border-b-2 border-orange-700">
                        <div className="text-[9px] font-bold tracking-wider opacity-80">GOAL</div>
                        <div className="font-black text-xl">{targetVal}</div>
                    </div>
                </div>

                {/* Toppings Bench */}
                <div className="grid grid-cols-6 gap-2 mb-4">
                    {TOPPINGS.map(t => {
                        const isActive = selected.has(t.id);
                        return (
                            <button
                                key={t.id}
                                onClick={() => toggle(t.id)}
                                disabled={isResolved}
                                className={`aspect-square rounded-full flex items-center justify-center text-2xl transition-all ${
                                    isActive 
                                    ? 'bg-orange-100 border-2 border-orange-500 shadow-[0_4px_0_#f97316] -translate-y-1 scale-110 z-10' 
                                    : 'bg-white border-2 border-gray-200 shadow-[0_4px_0_#e5e7eb] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none'
                                }`}
                            >
                                {t.icon}
                            </button>
                        );
                    })}
                </div>

                {/* Action */}
                <motion.button
                    onClick={serve}
                    disabled={isResolved}
                    animate={isError ? { x: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 text-[15px] tracking-wide uppercase transition-all ${
                        isResolved && currentLevel === totalLevels - 1
                        ? 'bg-emerald-500 text-white shadow-none translate-y-[4px]'
                        : isResolved 
                        ? 'bg-blue-600 text-white shadow-none translate-y-[4px]'
                        : isError 
                        ? 'bg-rose-500 text-white shadow-[0_4px_0_#9f1239]' 
                        : 'bg-green-600 text-white shadow-[0_4px_0_#166534] active:translate-y-[4px] active:shadow-none'
                    }`}
                >
                    {isResolved ? (
                        currentLevel === totalLevels - 1 ? (
                            <>
                                <ChefHat size={20} strokeWidth={3} />
                                MASTER CHEF!
                            </>
                        ) : (
                            <>
                                <ChefHat size={20} strokeWidth={3} />
                                NEXT ORDER →
                            </>
                        )
                    ) : isError ? (
                        <>
                            <XCircle size={20} strokeWidth={3} />
                            WRONG! TRY AGAIN
                        </>
                    ) : (
                        <>
                            <BellRing size={20} strokeWidth={3} />
                            SERVE PIZZA
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    );
}
