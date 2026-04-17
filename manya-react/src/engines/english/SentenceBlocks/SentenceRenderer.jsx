import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, AlertCircle } from 'lucide-react';

/**
 * SENTENCE BLOCKS RENDERER
 * Stateless visual component for the grammar architecture zone.
 */

const SentenceRenderer = ({ 
    slots, 
    bank, 
    phase, 
    isDark, 
    data, 
    handleRemove, 
    handleDrop 
}) => {
    return (
        <div className={`flex flex-col h-full font-jakarta overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-[#FFFBEB] text-slate-800'}`}>
            <div className={`flex-1 relative flex flex-col p-4 sm:p-10 overflow-hidden min-h-[400px] sm:min-h-[450px] ${isDark ? 'bg-white/5 shadow-inner' : 'bg-sky-50'}`}>
                {/* Visual Flair */}
                <div className="absolute top-10 left-10 w-32 h-10 bg-white dark:bg-indigo-500/10 rounded-full blur-2xl opacity-50" />
                
                {/* Header */}
                <div className="relative z-20 flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-400 rounded-2xl shadow-[0_4px_0_#d97706] flex items-center justify-center">
                            <Box className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight leading-none uppercase">Sentence Blocks</h2>
                            <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.3em] mt-2">Architecture Engine</p>
                        </div>
                    </div>
                </div>

                {/* Building Zone */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8">
                    <div className="flex flex-wrap justify-center gap-4 w-full max-w-4xl">
                        {slots.map((slot, i) => (
                            <div key={slot.id} className="relative group w-[120px] sm:w-[180px]">
                                <motion.div 
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleRemove(slot.id)}
                                    className={`h-22 sm:h-32 rounded-[28px] border-4 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                                        slot.current 
                                        ? `${slot.current.color} border-white/50 shadow-[0_8px_0_rgba(0,0,0,0.1)]` 
                                        : (isDark ? 'border-white/10 bg-white/5 hover:border-indigo-500/40' : 'border-sky-200 bg-white hover:border-sky-400')
                                    }`}
                                >
                                    <AnimatePresence mode="wait">
                                        {slot.current ? (
                                            <motion.div 
                                                initial={{ y: 5, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }}
                                                className="text-sm font-black text-center px-4 text-white leading-tight uppercase"
                                            >
                                                {slot.current.text}
                                            </motion.div>
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-sky-200'}`}>Slot {i + 1}</span>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-2 bg-black/10 rounded-full blur-sm" />
                            </div>
                        ))}
                    </div>

                    <AnimatePresence>
                        {phase === 'error' && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-3 text-rose-600 bg-rose-50 px-6 py-3 rounded-full border-2 border-rose-200 shadow-lg"
                            >
                                <AlertCircle size={20} />
                                <span className="text-xs font-black uppercase">Structure Unstable!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Hint Card */}
                <div className="mt-auto relative z-20">
                    <div className={`backdrop-blur-sm p-5 rounded-[32px] border-2 flex items-center gap-4 shadow-sm ${isDark ? 'bg-white/5 border-white/5 text-slate-400' : 'bg-white/80 border-sky-100 text-slate-600'}`}>
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <Box size={20} className="text-amber-500" />
                        </div>
                        <p className="text-[11px] font-bold leading-snug">
                            {data?.hint || "Stack the colorful blocks in the correct order to reveal the story!"}
                        </p>
                    </div>
                </div>
            </div>

            {/* BLOCK BANK */}
            <div className={`p-4 sm:p-8 border-t-4 transition-all ${isDark ? 'bg-[#151921] border-white/5' : 'bg-white border-sky-100'}`}>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {bank.map(word => (
                        <motion.button
                            key={word.id}
                            whileHover={{ y: -5, scale: 1.05 }} whileTap={{ scale: 0.9 }}
                            onClick={() => handleDrop(word)}
                            className={`px-4 py-3 ${word.color} rounded-[20px] text-white text-[10px] sm:text-xs font-black shadow-[0_4px_0_rgba(0,0,0,0.15)] flex items-center justify-center min-w-[100px] uppercase tracking-wider`}
                        >
                            {word.text}
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SentenceRenderer;
