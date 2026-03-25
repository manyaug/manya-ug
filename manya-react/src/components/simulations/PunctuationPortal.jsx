import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Trophy, Zap, Info, PenTool, Palette } from 'lucide-react';

const QUERIES = [
    { 
        parts: ["He arrived at the station", " but the train had already left", "."], 
        slots: [{ index: 1, expected: ',', hint: "Use a comma before 'but'!" }]
    },
    { 
        parts: ["Wait", " I'm coming with you", "!"], 
        slots: [{ index: 1, expected: ',', hint: "Use a comma after 'Wait'!" }]
    },
    { 
        parts: ["The ingredients are simple", " flour", " water", " and salt", "."], 
        slots: [
            { index: 1, expected: ':', hint: "Use a colon to start the list!" },
            { index: 2, expected: ',', hint: "Comma between the items!" }
        ]
    }
];

const PunctuationStickers = ({ onComplete }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [slots, setSlots] = useState(QUERIES[0].slots.map(s => ({ ...s, current: null })));
    const [phase, setPhase] = useState('active'); // 'active' | 'success' | 'finish'
    const marks = [',', '.', '!', '?', ';', ':', '-', '"'];

    const handleDrop = (mark, slotIndex) => {
        setSlots(prev => prev.map(s => s.index === slotIndex ? { ...s, current: mark } : s));
    };

    const checkSolution = () => {
        const isCorrect = slots.every(s => s.current === s.expected);
        if (isCorrect) {
            if (currentIdx < QUERIES.length - 1) {
                setPhase('success');
                setTimeout(() => {
                    const nextIdx = currentIdx + 1;
                    setCurrentIdx(nextIdx);
                    setSlots(QUERIES[nextIdx].slots.map(s => ({ ...s, current: null })));
                    setPhase('active');
                }, 1500);
            } else {
                setPhase('finish');
            }
        }
    };

    const q = QUERIES[currentIdx];

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] font-sans overflow-hidden">
            {/* STICKER VIEWPORT */}
            <div className="flex-1 relative flex flex-col p-6 sm:p-10 bg-white overflow-hidden min-h-[450px]">
                {/* Hand-drawn Doodles Background */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                    style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 Q 30 15, 50 10 T 90 10' fill='none' stroke='black' stroke-width='2'/%3E%3Ccircle cx='80' cy='80' r='5' fill='black'/%3E%3C/svg%3E")`,
                    }} 
                />

                {/* HUD */}
                <div className="relative z-20 flex justify-between items-start mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center rotate-3 shadow-md">
                            <Palette className="text-pink-500" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none italic">Punctuation Stickers</h2>
                            <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mt-1">Sticker Time!</p>
                        </div>
                    </div>
                </div>

                {/* Sentence with Sticker Slots */}
                <div className="relative z-10 flex-1 flex flex-wrap items-center justify-center gap-y-12 px-8 text-center bg-slate-50/50 rounded-[48px] border-4 border-dashed border-slate-100 m-4">
                    <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-10 leading-relaxed max-w-2xl">
                        {q.parts.map((text, i) => {
                            const slot = slots.find(s => s.index === i);
                            return (
                                <React.Fragment key={i}>
                                    <span className="text-xl sm:text-3xl font-black text-slate-700 tracking-tight">{text}</span>
                                    {slot && (
                                        <div 
                                            className={`group relative w-12 h-12 sm:w-16 sm:h-16 rounded-[24px] border-4 border-dashed flex items-center justify-center transition-all ${
                                                slot.current 
                                                ? 'border-pink-300 bg-pink-50 rotate-6 scale-110 shadow-lg' 
                                                : 'border-slate-200 bg-white hover:border-pink-200'
                                            }`}
                                        >
                                            <AnimatePresence mode="wait">
                                                {slot.current ? (
                                                    <motion.span 
                                                        initial={{ scale: 0, rotate: -20 }}
                                                        animate={{ scale: 1, rotate: 6 }}
                                                        className="text-3xl sm:text-4xl font-black text-pink-500 font-serif"
                                                    >
                                                        {slot.current}
                                                    </motion.span>
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <AnimatePresence>
                    {phase === 'success' && (
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 bg-emerald-500 text-white px-8 py-4 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-4"
                        >
                            <Trophy size={18} />
                            Beautiful Sticker!
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* STICKER DRAWER */}
            <div className="p-10 bg-white border-t-8 border-slate-50">
                <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
                    <div className="flex flex-wrap justify-center gap-4">
                        {marks.map(mark => (
                            <motion.button
                                key={mark}
                                whileHover={{ scale: 1.15, rotate: 5, y: -5 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    const nextSlot = slots.find(s => !s.current);
                                    if (nextSlot) handleDrop(mark, nextSlot.index);
                                }}
                                className="w-14 h-14 flex items-center justify-center bg-white border-4 border-pink-50 rounded-[28px] text-2xl font-black text-pink-400 shadow-xl hover:border-pink-400 hover:text-pink-500 transition-all font-serif"
                            >
                                {mark}
                            </motion.button>
                        ))}
                    </div>

                    <div className="flex items-center gap-6 w-full max-w-xl">
                         <div className="bg-pink-50/50 p-6 rounded-[40px] border-2 border-pink-100 flex items-center gap-4 flex-1">
                            <PenTool size={24} className="text-pink-400 shrink-0" />
                            <p className="text-xs sm:text-sm text-pink-600 font-bold leading-relaxed">
                                Pick a punctuation sticker and place it in the right spot!
                            </p>
                        </div>
                        
                        <button 
                            disabled={slots.some(s => !s.current) || phase !== 'active' }
                            onClick={checkSolution}
                            className={`px-12 py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-sm transition-all shadow-xl ${
                                slots.every(s => s.current) 
                                ? 'bg-pink-500 text-white shadow-pink-100 hover:-translate-y-1' 
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                        >
                            Final Placement!
                        </button>
                    </div>
                </div>
            </div>

            {/* FINISH OVERLAY */}
            <AnimatePresence>
                {phase === 'finish' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-3xl p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, rotate: -5 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="bg-white p-16 rounded-[72px] shadow-3xl text-center max-w-sm w-full border-[12px] border-pink-400"
                        >
                            <div className="w-28 h-28 bg-pink-500 rounded-[48px] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-12 relative">
                                <Zap size={56} className="text-white fill-white" />
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center border-4 border-white">
                                    <Trophy size={24} className="text-white" />
                                </div>
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-3">Master Artist!</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-12">The Book is Perfect</p>
                            
                            <button 
                                onClick={onComplete}
                                className="w-full py-6 bg-pink-500 text-white rounded-[32px] font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-4 shadow-xl hover:bg-pink-600 active:scale-95 transition-all shadow-pink-100"
                            >
                                CONTINUE <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PunctuationStickers;
