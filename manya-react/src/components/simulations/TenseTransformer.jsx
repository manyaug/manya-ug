import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowRight, Trophy, Zap, AlertTriangle, CloudSun, Leaf, Tent } from 'lucide-react';

const QUERIES = [
    { 
        base: "She eats an apple", 
        targetTense: "The Past", 
        options: ["ate", "eaten", "eats"], 
        correct: "ate", 
        fullCorrect: "She ate an apple" 
    },
    { 
        base: "They built a house", 
        targetTense: "The Future", 
        options: ["will build", "building", "builds"], 
        correct: "will build", 
        fullCorrect: "They will build a house" 
    },
    { 
        base: "We are laughing", 
        targetTense: "Right Now (Continuous)", 
        options: ["were laughing", "laughed", "will laugh"], 
        correct: "were laughing", 
        fullCorrect: "We were laughing" 
    }
];

const TenseTreehouse = ({ onComplete }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [phase, setPhase] = useState('active'); // 'active' | 'success' | 'finish'
    const [error, setError] = useState(false);

    const handleSelect = (opt) => {
        if (phase !== 'active') return;
        setSelectedOption(opt);
        if (opt === QUERIES[currentIdx].correct) {
            setError(false);
            if (currentIdx < QUERIES.length - 1) {
                setPhase('success');
                setTimeout(() => {
                    setCurrentIdx(prev => prev + 1);
                    setSelectedOption(null);
                    setPhase('active');
                }, 1500);
            } else {
                setPhase('finish');
            }
        } else {
            setError(true);
            setTimeout(() => setError(false), 1000);
        }
    };

    const q = QUERIES[currentIdx];

    return (
        <div className="flex flex-col h-full bg-[#f0f9ff] font-sans overflow-hidden">
            {/* TREEHOUSE VIEWPORT */}
            <div className="flex-1 relative flex flex-col p-6 sm:p-10 bg-[#7c2d12]/10 overflow-hidden min-h-[450px]">
                {/* Leafy Background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-400/10 rounded-full blur-[120px] pointer-events-none" />

                {/* HUD */}
                <div className="relative z-20 flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-3xl shadow-[0_6px_0_#059669] flex items-center justify-center rotate-3">
                            <Tent className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-emerald-900 tracking-tight leading-none italic">Tense Treehouse</h2>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-1">Climb Through Time!</p>
                        </div>
                    </div>
                </div>

                {/* The Magic Tree Area */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10">
                    <div className="flex flex-col items-center gap-6">
                        <motion.div 
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center gap-3 px-6 py-4 bg-white rounded-[32px] shadow-xl border-4 border-emerald-100"
                        >
                            <CloudSun size={24} className="text-amber-500" />
                            <span className="text-sm sm:text-lg font-black text-emerald-800 uppercase tracking-widest leading-none">Season: {q.targetTense}</span>
                        </motion.div>
                        
                        <div className="p-8 sm:p-12 bg-[#7c2d12] rounded-[48px] shadow-2xl relative border-t-8 border-orange-950/40">
                             <h3 className="text-2xl sm:text-4xl font-black text-white px-2 leading-tight tracking-tight text-center drop-shadow-md">
                                {phase === 'success' ? q.fullCorrect : q.base}
                             </h3>
                             {/* Decorative Leaves */}
                             <Leaf className="absolute -top-4 -right-4 text-emerald-400 rotate-45" size={40} fill="currentColor" />
                             <Leaf className="absolute -bottom-4 -left-4 text-orange-400 -rotate-12" size={32} fill="currentColor" />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 max-w-2xl px-4">
                        {q.options.map((opt, i) => (
                            <motion.button
                                key={i}
                                whileHover={{ y: -5, scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(opt)}
                                className={`px-10 py-6 rounded-[32px] font-black text-lg transition-all shadow-[0_8px_0_rgba(0,0,0,0.15)] active:shadow-none hover:translate-y-[-2px] ${
                                    selectedOption === opt && opt === q.correct ? 'bg-emerald-500 text-white' :
                                    selectedOption === opt && opt !== q.correct ? 'bg-rose-500 text-white' :
                                    'bg-white text-emerald-900 border-4 border-emerald-50'
                                }`}
                            >
                                {opt}
                            </motion.button>
                        ))}
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3 text-rose-600 bg-rose-50 px-8 py-4 rounded-full border-2 border-rose-200 shadow-xl"
                            >
                                <AlertTriangle size={20} />
                                <span className="text-sm font-black uppercase">Oops! Wrong Tense!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* TREE ROOTS / HUD */}
            <div className="p-10 bg-[#451a03] border-t-8 border-orange-950 flex flex-col sm:flex-row items-center gap-10">
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center text-orange-200/50">
                        <span className="text-[10px] font-black uppercase tracking-widest">Growth Progress</span>
                        <span className="text-[10px] font-black italic">CLIMBING {currentIdx + 1}/3</span>
                    </div>
                    <div className="h-4 w-full bg-black/40 rounded-full p-1 border-2 border-orange-950 overflow-hidden">
                        <motion.div 
                            animate={{ width: `${((currentIdx + 1) / 3) * 100}%` }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        />
                    </div>
                </div>

                <div className="bg-[#5c2304] p-6 rounded-[40px] border-2 border-orange-900/50 max-w-xs flex items-center gap-5">
                    <Box size={24} className="text-orange-400 shrink-0" />
                    <p className="text-xs text-orange-200 font-bold leading-relaxed">
                        Climb higher by matching the verb to the <span className="text-orange-400">Current Season</span>.
                    </p>
                </div>
            </div>

            {/* FINISH OVERLAY */}
            <AnimatePresence>
                {phase === 'finish' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-3xl bg-[#022c22]/40 p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, y: 100 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-white p-16 rounded-[72px] shadow-3xl text-center max-w-sm w-full border-[12px] border-emerald-400"
                        >
                            <div className="w-28 h-28 bg-emerald-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-[0_12px_0_#065f46] rotate-12 relative overflow-hidden">
                                <Trophy size={64} className="text-white fill-white relative z-10" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-3 italic">TIME TRAVELER!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-12">The Season is Saved</p>
                            
                            <button 
                                onClick={onComplete}
                                className="w-full py-6 bg-emerald-500 text-white rounded-[40px] font-black text-sm tracking-[0.3em] uppercase flex items-center justify-center gap-4 shadow-[0_10px_0_#059669] hover:bg-emerald-600 transition-all active:translate-y-2 active:shadow-none"
                            >
                                MISSION COMPLETE <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Box = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
);

export default TenseTreehouse;
