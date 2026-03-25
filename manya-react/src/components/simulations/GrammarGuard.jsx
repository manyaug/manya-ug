import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, AlertCircle, Trophy, Sparkles, CheckCircle2, ArrowRight, Flower2, Droplets, Sun } from 'lucide-react';

const INITIAL_QUERIES = [
    { text: "The team play well today", error: "play", correct: "plays" },
    { text: "She don't like apples", error: "don't", correct: "doesn't" },
    { text: "My friend speak French", error: "speak", correct: "speaks" },
    { text: "They was happy", error: "was", correct: "were" },
];

const GardenGuard = ({ onComplete, onScoreUpdate }) => {
    const [health, setHealth] = useState(100);
    const [score, setScore] = useState(0);
    const [marching, setMarching] = useState([]);
    const [phase, setPhase] = useState('active'); // 'active' | 'defeated' | 'victory'
    const [message, setMessage] = useState(null);
    const spawnRef = useRef(null);

    // 1. Spawning Logic
    useEffect(() => {
        if (phase !== 'active') return;
        
        const spawn = () => {
            const query = INITIAL_QUERIES[Math.floor(Math.random() * INITIAL_QUERIES.length)];
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

        spawnRef.current = setInterval(spawn, 5000);
        return () => clearInterval(spawnRef.current);
    }, [phase]);

    // 2. Movement
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setMarching(prev => {
                const updated = prev.filter(s => {
                    const elapsed = now - s.startTime;
                    if (elapsed >= s.duration) {
                        if (!s.isHealed) {
                            setHealth(h => Math.max(0, h - 25));
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

    // 3. Victory/Defeat
    useEffect(() => {
        if (health <= 0) {
            setPhase('defeated');
            clearInterval(spawnRef.current);
        }
        if (score >= 400) {
            setPhase('victory');
            clearInterval(spawnRef.current);
        }
    }, [health, score]);

    const handleWordClick = (sentenceId, word, index) => {
        if (phase !== 'active') return;
        setMarching(prev => prev.map(s => {
            if (s.id === sentenceId && word === s.error && !s.isHealed) {
                setScore(sc => {
                    const next = sc + 100;
                    onScoreUpdate?.(next);
                    return next;
                });
                window.ManyaAudio?.success?.();
                setMessage({ text: `HEALTHY BLOOM!` });
                setTimeout(() => setMessage(null), 1500);
                return { ...s, isHealed: true, words: s.words.map(w => w === s.error ? s.correct : w) };
            }
            return s;
        }));
    };

    return (
        <div className="flex flex-col h-full bg-[#ECFDF5] font-sans overflow-hidden">
            {/* GARDEN VIEWPORT */}
            <div className="flex-1 relative flex flex-col p-6 sm:p-10 bg-sky-100/50 overflow-hidden min-h-[400px]">
                {/* Sun & Decorative Grass */}
                <div className="absolute top-10 right-10 text-amber-300 animate-[spin_10s_linear_infinite]">
                    <Sun size={64} fill="currentColor" strokeWidth={1} />
                </div>
                <div className="absolute bottom-0 w-full h-1/4 bg-[#10B981] opacity-20 blur-3xl pointer-events-none" />

                {/* HUD */}
                <div className="relative z-30 flex justify-between items-start mb-10 pointer-events-none">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-3xl shadow-lg flex items-center justify-center">
                            <Flower2 className="text-emerald-500" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Garden Guard</h2>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Help the flowers bloom!</p>
                        </div>
                    </div>

                    <div className="flex bg-white/90 backdrop-blur-md px-6 py-4 rounded-[32px] gap-6 shadow-xl border-2 border-white">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Energy</p>
                            <p className={`text-xl font-black tabular-nums ${health > 30 ? 'text-emerald-500' : 'text-rose-500'}`}>{health}%</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Stars</p>
                            <p className="text-xl font-black text-amber-500 tabular-nums">{score}</p>
                        </div>
                    </div>
                </div>

                {/* The "Safety Gate" (Now a watering can/flowerbed indicator) */}
                <div className="absolute right-0 top-0 h-full w-4 flex flex-col items-center justify-center z-20 overflow-hidden">
                    <motion.div 
                        animate={{ height: `${health}%`, backgroundColor: health > 30 ? '#10B981' : '#F43F5E' }}
                        className="w-full absolute bottom-0 shadow-2xl"
                    />
                </div>

                {/* Marching Flowers Zone */}
                <div className="relative flex-1 z-10 pr-6">
                    <AnimatePresence>
                        {marching.map((s, idx) => (
                            <motion.div
                                key={s.id}
                                initial={{ x: -100, opacity: 0 }}
                                animate={{ x: '100%', opacity: 1 }}
                                transition={{ duration: s.duration / 1000, ease: 'linear' }}
                                className="absolute flex gap-2 left-0"
                                style={{ top: `${15 + (idx % 4) * 20}%` }}
                            >
                                <div className={`flex items-center gap-3 px-6 py-4 rounded-[40px] border-4 transition-all shadow-xl ${
                                    s.isHealed 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-white border-white text-slate-700'
                                }`}>
                                    <Droplets size={20} className={s.isHealed ? 'text-emerald-500' : 'text-sky-300'} />
                                    <div className="flex gap-2">
                                        {s.words.map((word, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleWordClick(s.id, word, i)}
                                                className={`text-sm sm:text-lg font-black transition-all hover:scale-110 active:scale-95 ${
                                                    s.isHealed && word === s.correct ? 'text-emerald-600' : ''
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
            <div className="p-8 bg-white border-t-4 border-emerald-100 flex flex-col items-center gap-6">
                <div className="flex items-start gap-4 bg-emerald-50 p-6 rounded-[32px] border-2 border-emerald-100 max-w-lg w-full">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                        <Flower2 size={24} className="text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Gardener's Mission</h4>
                        <p className="text-xs text-emerald-600 font-bold leading-relaxed mt-1">
                            Some words are wilting! <span className="text-emerald-700 underline underline-offset-4 decoration-2">Tap the wrong word</span> to water it and help the sentence grow strong.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-sm">
                         <Heart size={20} className="text-rose-500 fill-rose-500" />
                         <span className="text-sm font-black text-slate-700">{Math.ceil(health/25)} Hearts</span>
                     </div>
                     <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-sm">
                         <Sun size={20} className="text-amber-500" />
                         <span className="text-sm font-black text-slate-700">{score}/400 Stars</span>
                     </div>
                </div>
            </div>

            {/* OVERLAYS */}
            <AnimatePresence>
                {phase !== 'active' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, rotate: 5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="bg-white p-12 rounded-[64px] shadow-3xl text-center max-w-sm w-full border-8 border-emerald-400"
                        >
                            <div className="w-28 h-28 bg-emerald-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-[0_12px_0_#059669] rotate-12">
                                {phase === 'victory' ? <Trophy size={56} className="text-white fill-white" /> : <AlertCircle size={56} className="text-white" />}
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-3">
                                {phase === 'victory' ? 'Great Growing!' : 'Needs More Water'}
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10">
                                {phase === 'victory' ? 'The Garden is Beautiful!' : 'Let\'s try tending the garden again.'}
                            </p>
                            
                            <button 
                                onClick={onComplete}
                                className="w-full py-6 bg-emerald-500 text-white rounded-[32px] font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-xl shadow-emerald-100 hover:bg-emerald-600"
                            >
                                CONTINUE <ArrowRight size={20} strokeWidth={4} />
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
                        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-emerald-500 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl"
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GardenGuard;
