import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, AlertCircle, Trophy, Sparkles, CheckCircle2, ArrowRight, Flower2, Droplets, Sun } from 'lucide-react';

/**
 * MANYA ENGLISH: GARDEN GUARD ENGINE (v2.0 Standalone)
 * --------------------------------------------------
 * Promoted from Sandbox. Now fully data-driven.
 */
const GardenGuardEngine = ({ data, onComplete, onScoreUpdate }) => {
    const [health, setHealth] = useState(100);
    const [score, setScore] = useState(0);
    const [marching, setMarching] = useState([]);
    const [phase, setPhase] = useState('active'); // 'active' | 'defeated' | 'victory'
    const [message, setMessage] = useState(null);
    const [isDark, setIsDark] = useState(false);
    const [totalHealed, setTotalHealed] = useState(0);
    const [totalMissed, setTotalMissed] = useState(0);
    const spawnRef = useRef(null);

    const initialData = useMemo(() => {
        const d = data?.data || data || {};
        return {
            queries: d.queries || [
                { text: "The team play well today", error: "play", correct: "plays" },
                { text: "She don't like apples", error: "don't", correct: "doesn't" }
            ],
            winScore: d.winScore || 300,
            spawnRate: d.spawnRate || 5000
        };
    }, [data]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    // 1. Spawning Logic
    useEffect(() => {
        if (phase !== 'active') return;
        
        const spawn = () => {
            const query = initialData.queries[Math.floor(Math.random() * initialData.queries.length)];
            const id = Math.random().toString(36).substr(2, 9);
            const sentenceObj = {
                id,
                ...query,
                words: query.text.split(' '),
                startTime: Date.now(),
                duration: 10000 + Math.random() * 4000, 
                isHealed: false
            };
            setMarching(prev => [...prev, sentenceObj]);
        };

        spawnRef.current = setInterval(spawn, initialData.spawnRate);
        return () => clearInterval(spawnRef.current);
    }, [phase, initialData]);

    // 2. Movement & Health Decay
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setMarching(prev => {
                const updated = prev.filter(s => {
                    const elapsed = now - s.startTime;
                    if (elapsed >= s.duration) {
                        if (!s.isHealed) {
                            setHealth(h => Math.max(0, h - 25));
                            setTotalMissed(m => m + 1);
                            window.ManyaAudio?.error?.();
                        }
                        return false;
                    }
                    return true;
                });
                return updated;
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    // 3. Victory/Defeat Logic
    useEffect(() => {
        if (health <= 0) {
            setPhase('defeated');
            clearInterval(spawnRef.current);
        }
        if (score >= initialData.winScore) {
            setPhase('victory');
            clearInterval(spawnRef.current);
        }
    }, [health, score, initialData.winScore]);

    const handleWordClick = (sentenceId, word, index) => {
        if (phase !== 'active') return;
        setMarching(prev => prev.map(s => {
            if (s.id === sentenceId && word === s.error && !s.isHealed) {
                setScore(sc => {
                    const next = sc + 100;
                    onScoreUpdate?.(next);
                    return next;
                });
                setTotalHealed(h => h + 1);
                window.ManyaAudio?.success?.();
                setMessage({ text: `🌿 BLOOMING!` });
                setTimeout(() => setMessage(null), 1500);
                return { ...s, isHealed: true, words: s.words.map(w => w === s.error ? s.correct : w) };
            }
            return s;
        }));
    };

    return (
        <div className={`flex flex-col h-full font-jakarta overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-[#ECFDF5] text-slate-800'}`}>
            {/* GARDEN VIEWPORT */}
            <div className={`flex-1 relative flex flex-col p-6 sm:p-10 overflow-hidden min-h-[400px] ${isDark ? 'bg-white/5' : 'bg-sky-100/30'}`}>
                {/* Visual Flair */}
                <div className="absolute top-10 right-10 text-amber-300/40 animate-[spin_10s_linear_infinite]">
                    <Sun size={64} fill="currentColor" strokeWidth={1} />
                </div>
                
                {/* HUD */}
                <div className="relative z-30 flex justify-between items-start mb-10 pointer-events-none">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-emerald-500 rounded-3xl shadow-lg flex items-center justify-center">
                            <Flower2 className={isDark ? 'text-white' : 'text-emerald-500'} size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight leading-none mb-1 uppercase">Garden Guard</h2>
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Protection Engine</p>
                        </div>
                    </div>

                    <div className={`flex px-6 py-4 rounded-[32px] gap-6 shadow-xl border-2 transition-all ${isDark ? 'bg-[#151921] border-white/5' : 'bg-white/90 border-white'}`}>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Energy</p>
                            <p className={`text-xl font-black tabular-nums transition-colors ${health > 30 ? 'text-emerald-500' : 'text-rose-500'}`}>{health}%</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Bloom Score</p>
                            <p className="text-xl font-black text-amber-500 tabular-nums">{score}</p>
                        </div>
                    </div>
                </div>

                {/* Vertical Health Meter */}
                <div className="absolute right-0 top-0 h-full w-2 flex flex-col items-center justify-center z-20 overflow-hidden opacity-40">
                    <motion.div 
                        animate={{ height: `${health}%`, backgroundColor: health > 30 ? '#10B981' : '#F43F5E' }}
                        className="w-full absolute bottom-0"
                    />
                </div>

                {/* Marching Sentences Zone */}
                <div className="relative flex-1 z-10 pr-6">
                    <AnimatePresence>
                        {marching.map((s, idx) => (
                            <motion.div
                                key={s.id}
                                initial={{ x: -200, opacity: 0 }}
                                animate={{ x: '100%', opacity: 1 }}
                                transition={{ duration: s.duration / 1000, ease: 'linear' }}
                                className="absolute flex gap-2 left-0"
                                style={{ top: `${15 + (idx % 4) * 20}%` }}
                            >
                                <div className={`flex items-center gap-3 px-6 py-4 rounded-[40px] border-4 transition-all shadow-xl ${
                                    s.isHealed 
                                    ? (isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700') 
                                    : (isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-white border-white text-slate-700')
                                }`}>
                                    <Droplets size={20} className={s.isHealed ? 'text-emerald-400' : 'text-sky-300'} />
                                    <div className="flex gap-2">
                                        {s.words.map((word, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleWordClick(s.id, word, i)}
                                                className={`text-sm sm:text-lg font-black transition-all hover:scale-110 active:scale-95 ${
                                                    s.isHealed && word === s.correct ? 'text-emerald-400' : ''
                                                }`}
                                            >
                                                {word}
                                            </button>
                                        ))}
                                    </div>
                                    {s.isHealed && <Sparkles size={16} className="ml-2 text-amber-400 animate-bounce" />}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            {/* GARDEN TOOLS AREA */}
            <div className={`p-8 border-t-4 transition-all ${isDark ? 'bg-[#151921] border-white/5' : 'bg-white border-emerald-100'}`}>
                <div className={`flex items-start gap-4 p-6 rounded-[32px] border-2 max-w-lg mx-auto ${isDark ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'}`}>
                    <div className="w-12 h-12 bg-white dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Flower2 size={24} className="text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Mission</h4>
                        <p className={`text-xs font-bold leading-relaxed mt-1 ${isDark ? 'text-slate-400' : 'text-emerald-800'}`}>
                            Identify the "wilting" word (the grammatical error) and <span className="text-emerald-500 underline decoration-2">tap it</span> to heal the garden.
                        </p>
                    </div>
                </div>
            </div>

            {/* OVERLAYS */}
            <AnimatePresence>
                {phase !== 'active' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, rotate: 5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="bg-white dark:bg-[#151921] p-12 rounded-[64px] shadow-3xl text-center max-w-sm w-full border-8 border-emerald-400"
                        >
                            <div className="w-28 h-28 bg-emerald-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-[0_12px_0_#059669] rotate-12">
                                {phase === 'victory' ? <Trophy size={56} className="text-white fill-white" /> : <AlertCircle size={56} className="text-white" />}
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-3">
                                {phase === 'victory' ? 'Bountiful!' : 'Withered'}
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-10">
                                {phase === 'victory' ? 'The garden is now thriving' : 'The soil needs more attention'}
                            </p>
                            
                            <button 
                                onClick={() => {
                                    if (onComplete) onComplete({
                                        isCorrect: phase === 'victory',
                                        accuracy: totalHealed / (totalHealed + totalMissed || 1),
                                        score: score,
                                        total: initialData.winScore,
                                        healed: totalHealed,
                                        missed: totalMissed,
                                        type: 'simulation',
                                        engineType: 'GARDEN_GUARD'
                                    });
                                }}
                                className="w-full py-6 bg-emerald-500 text-white rounded-[32px] font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-xl shadow-emerald-500/20 hover:bg-emerald-600"
                            >
                                Submit Results <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Feedback Toast */}
            <AnimatePresence>
                {message && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-emerald-500 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl"
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

GardenGuardEngine.hideGlobalFooter = true;
export default GardenGuardEngine;
