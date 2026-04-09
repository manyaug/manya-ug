import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Star, ArrowRight, RotateCcw } from 'lucide-react';

// ─── TOPPINGS CATALOGUE ───────────────────────────────────────────────────────
const TOPPINGS = [
    { id: 0, icon: "🍅", label: "Tomato",    color: "#ef4444" },
    { id: 1, icon: "🫒", label: "Olive",     color: "#84cc16" },
    { id: 2, icon: "🍄", label: "Mushroom",  color: "#a78bfa" },
    { id: 3, icon: "🥓", label: "Bacon",     color: "#f97316" },
    { id: 4, icon: "🌶️", label: "Pepper",   color: "#10b981" },
    { id: 5, icon: "🍍", label: "Pineapple", color: "#fbbf24" },
];

// ─── CUSTOMER CHARACTERS ──────────────────────────────────────────────────────
const CUSTOMERS = [
    { name: "Aisha",  avatar: "👩🏾‍🦱", vibe: "planning a birthday party" },
    { name: "Tomás",  avatar: "👨🏽‍🍳", vibe: "hosting a pizza tasting" },
    { name: "Fatima", avatar: "👩🏻‍🎓", vibe: "studying set theory over lunch" },
    { name: "Kwame",  avatar: "👦🏿",   vibe: "celebrating a football win" },
    { name: "Lena",   avatar: "👧🏼",   vibe: "trying every combo possible" },
];

// ─── STAR RATING HELPER ───────────────────────────────────────────────────────
const getStars = (mistakes) => {
    if (mistakes === 0) return 3;
    if (mistakes <= 1) return 2;
    return 1;
};

// ─── FORMULA REVEAL STEPS ────────────────────────────────────────────────────
function FormulaReveal({ n, targetVal, onDone }) {
    const [step, setStep] = useState(0);
    const steps = [
        { label: "Toppings chosen",        expr: `n = ${n}` },
        { label: "Total subsets (2ⁿ)",     expr: `2${n} = ${Math.pow(2, n)}` },
        { label: "Non-empty subsets (−∅)",  expr: `${Math.pow(2, n)} − 1 = ${targetVal}` },
        { label: "Customer gets exactly",   expr: `✅  ${targetVal} combos!` },
    ];

    useEffect(() => {
        if (step >= steps.length) { setTimeout(onDone, 600); return; }
        const t = setTimeout(() => setStep(s => s + 1), 700);
        return () => clearTimeout(t);
    }, [step]);

    return (
        <div className="flex flex-col gap-2 py-3">
            {steps.slice(0, step).map((s, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200"
                >
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">{s.label}</span>
                    <span className="font-mono font-black text-emerald-900 text-sm">{s.expr}</span>
                </motion.div>
            ))}
        </div>
    );
}

// ─── MAIN ENGINE ─────────────────────────────────────────────────────────────
export default function PizzaGameEngine({ data, onComplete, onResult, onAttempt }) {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [selected, setSelected] = useState(new Set());
    const [phase, setPhase] = useState('ordering'); // ordering | revealing | celebrating | done
    const [isError, setIsError] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    const [levelMistakes, setLevelMistakes] = useState(0);
    const [customerMood, setCustomerMood] = useState('neutral'); // neutral | happy | sad
    const [showFormula, setShowFormula] = useState(false);

    const startTimeRef = useRef(Date.now());

    const question   = data?.questions?.[currentLevel];
    const totalLevels = data?.questions?.length || 1;
    const targetVal  = question?.targetVal || 3;

    // Pick a stable customer per level
    const customer = useMemo(() =>
        CUSTOMERS[currentLevel % CUSTOMERS.length],
    [currentLevel]);

    // Derived
    const n      = selected.size;
    const result = Math.pow(2, n) - 1;
    const stars  = getStars(levelMistakes);

    useEffect(() => {
        startTimeRef.current = Date.now();
        setLevelMistakes(0);
        setCustomerMood('neutral');
        setPhase('ordering');
        setShowFormula(false);
    }, [currentLevel]);

    useEffect(() => {
        if (window.QuestRunner) window.QuestRunner.disableButton?.();
    }, []);

    const toggle = (id) => {
        if (phase !== 'ordering') return;
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
        window.navigator?.vibrate?.(10);
        window.ManyaAudio?.tap?.();
    };

    const serve = () => {
        if (phase !== 'ordering') return;
        const isCorrect = result === targetVal;
        const duration = Date.now() - startTimeRef.current;

        if (onAttempt) onAttempt({
            isCorrect,
            label: `Pizza Order ${currentLevel + 1}`,
            selectedAnswer: `n=${n}, combos=${result}`,
            correctAnswer: `combos=${targetVal}`,
            duration,
            mistakes: isCorrect ? 0 : 1,
        });

        if (isCorrect) {
            setCustomerMood('happy');
            setPhase('revealing');
            window.ManyaAudio?.success?.();
            window.navigator?.vibrate?.([30, 50, 30]);
        } else {
            setIsError(true);
            setCustomerMood('sad');
            setMistakes(m => m + 1);
            setLevelMistakes(m => m + 1);
            window.ManyaAudio?.error?.();
            window.navigator?.vibrate?.([50, 100, 50]);
            setTimeout(() => { setIsError(false); setCustomerMood('neutral'); }, 1200);
        }
    };

    const handleFormulaComplete = () => {
        setPhase('celebrating');
    };

    const handleNext = () => {
        if (currentLevel < totalLevels - 1) {
            setCurrentLevel(l => l + 1);
            setSelected(new Set());
        } else {
            const finalResult = {
                isCorrect: true,
                score: totalLevels,
                total: totalLevels,
                mistakes,
                type: 'game',
            };
            onResult?.(finalResult);
            onComplete?.(finalResult);
        }
    };

    // Topping positions around the pizza (even spread in sectors)
    const pizzaSections = useMemo(() => {
        const ids = Array.from(selected);
        if (ids.length === 0) return [];
        return ids.map((id, i) => {
            const angle = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
            const dist  = 30; // % from center
            return {
                id,
                x: 50 + Math.cos(angle) * dist,
                y: 50 + Math.sin(angle) * dist,
            };
        });
    }, [selected]);

    // ── MOOD INDICATOR ──
    const moodEmoji = customerMood === 'happy' ? '😄' : customerMood === 'sad' ? '😞' : '🤔';

    // ── CUSTOMER PROMPT ──
    const prompt = `I'm ${customer.vibe}! I need a pizza with toppings that make exactly **${targetVal}** non-empty combinations. Can you figure out how many toppings I need?`;

    return (
        <div className="flex flex-col h-full w-full bg-[#1a0a00] overflow-hidden relative selection:bg-transparent font-sans">

            {/* ── TOP BAR ─────────────────────────────── */}
            <div className="flex-none flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex gap-1">
                    {Array.from({ length: totalLevels }).map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentLevel ? 'w-6 bg-orange-400' : i < currentLevel ? 'w-4 bg-emerald-500' : 'w-4 bg-white/10'}`} />
                    ))}
                </div>
                <div className="text-[10px] font-black text-orange-400/70 uppercase tracking-widest">
                    Manya Pizzeria
                </div>
                <div className="flex gap-0.5">
                    {[1,2,3].map(s => (
                        <Star key={s} size={14}
                            className={s <= getStars(levelMistakes) ? 'text-amber-400 fill-amber-400' : 'text-white/10 fill-white/10'}
                        />
                    ))}
                </div>
            </div>

            {/* ── PIZZA STAGE ─────────────────────────── */}
            <div className="flex-1 relative flex flex-col items-center justify-center px-4"
                 style={{ background: 'radial-gradient(ellipse at center, #2d1200 0%, #1a0a00 100%)' }}>

                {/* Customer card */}
                <motion.div
                    layout
                    className="w-full max-w-sm mb-3"
                    animate={isError ? { x: [-6, 6, -6, 6, 0] } : {}}
                    transition={{ duration: 0.4 }}
                >
                    <div className={`rounded-2xl border px-4 py-3 flex gap-3 items-start transition-all ${
                        customerMood === 'happy' ? 'bg-emerald-900/40 border-emerald-500/40' :
                        customerMood === 'sad'   ? 'bg-rose-900/40 border-rose-500/40' :
                                                   'bg-white/5 border-white/10'
                    }`}>
                        {/* Avatar + mood */}
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                            <span className="text-3xl">{customer.avatar}</span>
                            <motion.span
                                key={customerMood}
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="text-sm"
                            >{moodEmoji}</motion.span>
                        </div>
                        {/* Bubble */}
                        <div>
                            <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">{customer.name}'s Order</div>
                            <p className="text-white/80 text-[12px] leading-relaxed font-medium">
                                I'm <span className="text-orange-300 font-black">{customer.vibe}</span>. I need a pizza
                                with toppings that make exactly{' '}
                                <span className="text-amber-300 font-black text-sm">{targetVal} non-empty combos</span>.
                                How many toppings should I pick?
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Pizza */}
                <motion.div
                    className="relative rounded-full"
                    style={{ width: 'min(52vw, 200px)', aspectRatio: '1/1' }}
                    animate={
                        phase === 'celebrating' ? { scale: [1, 1.08, 1], rotate: [0, 6, -6, 0] } :
                        isError                 ? { scale: [1, 0.95, 1] } : {}
                    }
                    transition={{ duration: 0.5 }}
                >
                    {/* Crust */}
                    <div className="absolute inset-0 rounded-full bg-amber-800 shadow-[0_0_30px_rgba(245,158,11,0.3)]" />
                    {/* Cheese */}
                    <div className="absolute inset-[10%] rounded-full"
                         style={{ background: 'radial-gradient(circle at 35% 30%, #fffbeb 0%, #fcd34d 60%, #f59e0b 100%)' }} />
                    {/* Sauce ring */}
                    <div className="absolute inset-[12%] rounded-full border-[3px] border-red-400/30" />

                    {/* Toppings (sector-spread) */}
                    <AnimatePresence>
                        {pizzaSections.map(({ id, x, y }) => {
                            const t = TOPPINGS.find(t => t.id === id);
                            return (
                                <motion.div
                                    key={`pizza-${id}`}
                                    initial={{ scale: 0, opacity: 0, y: -20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    className="absolute text-xl pointer-events-none"
                                    style={{
                                        top: `${y}%`,
                                        left: `${x}%`,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                >
                                    {t?.icon}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Empty state */}
                    {selected.size === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-amber-700/40 text-[11px] font-bold italic">Plain Cheese</span>
                        </div>
                    )}

                    {/* Success ring */}
                    <AnimatePresence>
                        {phase === 'celebrating' && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.15, opacity: 1 }}
                                exit={{ scale: 1.3, opacity: 0 }}
                                className="absolute inset-0 rounded-full border-4 border-emerald-400 pointer-events-none"
                                style={{ boxShadow: '0 0 30px rgba(52,211,153,0.5)' }}
                            />
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Live counter below pizza */}
                <div className="mt-3 flex items-center gap-3">
                    <div className="text-center">
                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Toppings</div>
                        <div className="text-white font-black text-xl">{n}</div>
                    </div>
                    <div className="text-white/20 font-black">→</div>
                    <div className="text-center">
                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Combos</div>
                        <motion.div
                            key={result}
                            initial={{ scale: 0.7, color: '#fbbf24' }}
                            animate={{ scale: 1, color: result === targetVal ? '#34d399' : '#ffffff' }}
                            className="font-black text-xl"
                        >{n === 0 ? '—' : result}</motion.div>
                    </div>
                    <div className="text-white/20 font-black">vs</div>
                    <div className="text-center">
                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Goal</div>
                        <div className="text-amber-400 font-black text-xl">{targetVal}</div>
                    </div>
                </div>
            </div>

            {/* ── HUD ─────────────────────────────────── */}
            <div className="flex-none bg-[#0f0700] border-t border-white/5 rounded-t-[28px] z-20"
                 style={{ padding: 'clamp(12px, 2vh, 20px)', paddingBottom: 'max(clamp(12px, 2vh, 20px), env(safe-area-inset-bottom))' }}>

                {/* ── FORMULA REVEAL (on correct) ── */}
                <AnimatePresence>
                    {phase === 'revealing' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-1 text-center">
                                🧠 Let's see how that works...
                            </div>
                            <FormulaReveal n={n} targetVal={targetVal} onDone={handleFormulaComplete} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── TOPPINGS BENCH (only in ordering phase) ── */}
                <AnimatePresence>
                    {phase === 'ordering' && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="grid grid-cols-6 gap-2 mb-3"
                        >
                            {TOPPINGS.map(t => {
                                const isActive = selected.has(t.id);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => toggle(t.id)}
                                        className={`flex flex-col items-center gap-0.5 py-2 rounded-2xl border-2 transition-all ${
                                            isActive
                                            ? 'border-orange-500 bg-orange-500/20 scale-110 -translate-y-1 shadow-[0_4px_0_rgba(249,115,22,0.4)]'
                                            : 'border-white/10 bg-white/5 hover:-translate-y-0.5 active:translate-y-0.5'
                                        }`}
                                    >
                                        <span className="text-xl leading-none">{t.icon}</span>
                                        <span className={`text-[8px] font-black uppercase tracking-wide leading-none ${isActive ? 'text-orange-300' : 'text-white/30'}`}>
                                            {t.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── ACTION BUTTON ── */}
                <AnimatePresence mode="wait">
                    {phase === 'ordering' && (
                        <motion.button
                            key="serve"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            onClick={serve}
                            whileTap={{ scale: 0.97 }}
                            className={`w-full font-black flex items-center justify-center gap-2 text-[13px] tracking-widest uppercase rounded-2xl transition-all ${
                                isError
                                ? 'bg-rose-600 text-white shadow-[0_4px_0_#9f1239]'
                                : n === 0
                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                : result === targetVal
                                ? 'bg-emerald-500 text-white shadow-[0_4px_0_#065f46]'
                                : 'bg-orange-500 text-white shadow-[0_4px_0_#9a3412]'
                            }`}
                            style={{ height: 'clamp(44px, 7vh, 54px)' }}
                            disabled={n === 0}
                        >
                            {isError ? (
                                <><RotateCcw size={18} strokeWidth={3} /> Not quite — try again!</>
                            ) : result === targetVal ? (
                                <><ChefHat size={18} strokeWidth={3} /> Serve the Pizza! 🍕</>
                            ) : (
                                <><ChefHat size={18} strokeWidth={3} /> Serve the Pizza!</>
                            )}
                        </motion.button>
                    )}

                    {phase === 'revealing' && (
                        <motion.div
                            key="revealing"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="text-center text-white/40 text-[11px] font-bold uppercase tracking-widest py-2"
                        >
                            Revealing the math...
                        </motion.div>
                    )}

                    {phase === 'celebrating' && (
                        <motion.div key="celebrating" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-3"
                        >
                            {/* Star rating */}
                            <div className="flex gap-2">
                                {[1, 2, 3].map(s => (
                                    <motion.div
                                        key={s}
                                        initial={{ scale: 0, rotate: -20 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: s * 0.12, type: 'spring', stiffness: 400 }}
                                    >
                                        <Star size={28}
                                            className={s <= stars ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'text-white/10 fill-white/10'}
                                        />
                                    </motion.div>
                                ))}
                            </div>
                            <p className="text-white/60 text-[11px] font-bold text-center">
                                {stars === 3 ? `Perfect order on first try, ${customer.name} loves it! 🎉` :
                                 stars === 2 ? `Nice work! ${customer.name} is happy 😊` :
                                              `${customer.name} got their pizza! Keep practising 👍`}
                            </p>
                            <button
                                onClick={handleNext}
                                className="w-full font-black flex items-center justify-center gap-2 text-[13px] tracking-widest uppercase rounded-2xl bg-emerald-500 text-white"
                                style={{ height: 'clamp(44px, 7vh, 54px)', boxShadow: '0 4px 0 #065f46' }}
                            >
                                {currentLevel < totalLevels - 1
                                    ? <><ArrowRight size={18} strokeWidth={3} /> Next Order</>
                                    : <><ChefHat size={18} strokeWidth={3} /> Finish Shift!</>
                                }
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
