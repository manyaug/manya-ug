import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, CheckCircle2, AlertCircle, ArrowRight, Trophy, Sparkles } from 'lucide-react';

const SentenceBlocks = ({ onComplete }) => {
    const [phase, setPhase] = useState('build'); // 'build' | 'success' | 'finish'
    const [slots, setSlots] = useState([
        { id: 's1', expected: 'The brave knight', current: null },
        { id: 's2', expected: 'conquered', current: null },
        { id: 's3', expected: 'the dragon', current: null },
    ]);
    const [bank, setBank] = useState([
        { id: 'b1', text: 'conquered', color: 'bg-amber-400' },
        { id: 'b2', text: 'The brave knight', color: 'bg-sky-400' },
        { id: 'b3', text: 'the dragon', color: 'bg-rose-400' },
        { id: 'b4', text: 'sleeping', color: 'bg-emerald-400' },
        { id: 'b5', text: 'quickly', color: 'bg-violet-400' },
    ].sort(() => Math.random() - 0.5));

    const handleDrop = (word, slotId) => {
        setSlots(prev => prev.map(s => 
            s.id === slotId ? { ...s, current: word } : s
        ));
        setBank(prev => prev.filter(w => w.id !== word.id));
        const oldWord = slots.find(s => s.id === slotId)?.current;
        if (oldWord) setBank(prev => [...prev, oldWord]);
    };

    const handleRemove = (slotId) => {
        const word = slots.find(s => s.id === slotId)?.current;
        if (!word) return;
        setSlots(prev => prev.map(s => 
            s.id === slotId ? { ...s, current: null } : s
        ));
        setBank(prev => [...prev, word]);
    };

    const checkStability = () => {
        const isStable = slots.every(s => s.current?.text === s.expected);
        if (isStable) {
            setPhase('success');
            setTimeout(() => setPhase('finish'), 1500);
        } else {
            setPhase('error');
            setTimeout(() => setPhase('build'), 1000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FFFBEB] font-sans overflow-hidden">
            {/* PLAY AREA */}
            <div className="flex-1 relative flex flex-col p-6 sm:p-10 bg-sky-50 overflow-hidden min-h-[450px]">
                {/* Soft Clouds Background Effect */}
                <div className="absolute top-10 left-10 w-32 h-10 bg-white rounded-full blur-2xl opacity-50" />
                <div className="absolute top-40 right-20 w-48 h-12 bg-white rounded-full blur-3xl opacity-40" />

                {/* Header */}
                <div className="relative z-20 flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-400 rounded-2xl shadow-[0_5px_0_#d97706] flex items-center justify-center">
                            <Box className="text-white" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">Sentence Blocks</h2>
                            <p className="text-xs font-bold text-sky-600 uppercase tracking-widest mt-1">Build a Story!</p>
                        </div>
                    </div>
                </div>

                {/* Building Zone */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-12">
                    <div className="flex flex-wrap justify-center gap-6 w-full">
                        {slots.map((slot, i) => (
                            <div key={slot.id} className="relative group w-[140px] sm:w-[180px]">
                                <motion.div 
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleRemove(slot.id)}
                                    className={`h-24 sm:h-32 rounded-[32px] border-4 border-dashed flex items-center justify-center cursor-pointer transition-all shadow-inner ${
                                        slot.current 
                                        ? `${slot.current.color} border-white/50 shadow-[0_8px_0_rgba(0,0,0,0.1)]` 
                                        : 'border-sky-200 bg-white hover:border-sky-400'
                                    }`}
                                >
                                    <AnimatePresence mode="wait">
                                        {slot.current ? (
                                            <motion.div 
                                                initial={{ y: 5, opacity: 0, scale: 0.8 }}
                                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                                className="text-sm sm:text-lg font-black text-center px-4 text-white leading-tight drop-shadow-sm"
                                            >
                                                {slot.current.text}
                                            </motion.div>
                                        ) : (
                                            <span className="text-xs font-black text-sky-200 uppercase tracking-widest">Block {i + 1}</span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                                
                                {/* Bottom Shadow for 3D look */}
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-2 bg-sky-900/10 rounded-full blur-sm" />
                            </div>
                        ))}
                    </div>

                    <AnimatePresence>
                        {phase === 'error' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3 text-rose-600 bg-rose-50 px-6 py-3 rounded-full border-2 border-rose-200 shadow-lg"
                            >
                                <AlertCircle size={20} />
                                <span className="text-sm font-black uppercase">Try another way!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Friendly Hint Card */}
                <div className="mt-auto relative z-20">
                    <div className="bg-white/80 backdrop-blur-sm p-5 rounded-[32px] border-2 border-sky-100 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center shrink-0">
                            <Sparkles className="text-sky-500" size={20} />
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 font-bold leading-snug">
                            Drag the colorful blocks into the empty spaces to build a <span className="text-sky-500">Perfect Sentence</span>!
                        </p>
                    </div>
                </div>
            </div>

            {/* BLOCK BANK */}
            <div className="p-8 bg-white border-t-4 border-sky-100 flex flex-col gap-8">
                <div className="flex flex-wrap justify-center gap-3">
                    {bank.map(word => (
                        <motion.button
                            key={word.id}
                            whileHover={{ y: -5, scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                const emptySlot = slots.find(s => !s.current);
                                if (emptySlot) handleDrop(word, emptySlot.id);
                            }}
                            className={`px-6 py-4 ${word.color} rounded-[24px] text-white text-sm sm:text-base font-black shadow-[0_6px_0_rgba(0,0,0,0.15)] hover:shadow-[0_4px_0_rgba(0,0,0,0.15)] active:shadow-none transition-all flex items-center justify-center min-w-[120px]`}
                        >
                            {word.text}
                        </motion.button>
                    ))}
                </div>

                <div className="flex justify-center">
                    <button 
                        disabled={slots.some(s => !s.current) || phase !== 'build'}
                        onClick={checkStability}
                        className={`w-full sm:w-auto px-16 py-5 rounded-[32px] font-black uppercase tracking-[0.2em] text-sm transition-all shadow-xl ${
                            slots.every(s => s.current) 
                            ? 'bg-emerald-500 text-white shadow-emerald-200 hover:-translate-y-1 active:translate-y-0' 
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                    >
                        Check My Work!
                    </button>
                </div>
            </div>

            {/* VICTORY OVERLAY */}
            <AnimatePresence>
                {phase === 'finish' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="bg-white p-12 rounded-[56px] shadow-3xl text-center max-w-sm w-full border-8 border-amber-400 relative overflow-hidden"
                        >
                            {/* Confetti-like bits */}
                            <div className="absolute top-0 right-10 w-4 h-4 bg-rose-400 rounded-full animate-bounce" />
                            <div className="absolute bottom-10 left-4 w-3 h-3 bg-sky-400 rounded-full animate-pulse" />

                            <div className="w-24 h-24 bg-amber-400 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-[0_10px_0_#d97706] rotate-12">
                                <Trophy size={56} className="text-white fill-white" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-2 leading-none">Super Job!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10">You're an Expert Builder</p>
                            
                            <button 
                                onClick={onComplete}
                                className="w-full py-6 bg-sky-500 text-white rounded-[32px] font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-xl hover:bg-sky-600 shadow-sky-200"
                            >
                                NEXT QUEST <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SentenceBlocks;
