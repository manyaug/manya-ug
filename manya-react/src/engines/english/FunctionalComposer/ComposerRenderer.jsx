import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Trophy, ArrowRight, Sparkles, FileText, CheckCircle2, XCircle } from 'lucide-react';

/**
 * FUNCTIONAL COMPOSER RENDERER
 * Stateless UI component for the "Studio Desk" paper surface.
 */

const ComposerRenderer = ({ 
    isDark, 
    currentQ, 
    placedItems, 
    availableItems, 
    selectedItem, 
    feedback, 
    isResolved, 
    showFinish, 
    handleSlotClick, 
    handleItemSelect, 
    validate, 
    nextStep,
    onComplete 
}) => {
    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-100 text-slate-900'}`}>
            {/* Header HUD */}
            <div className="flex-none p-6 text-center pb-2">
                <div className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase items-center gap-2 mb-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/10 shadow-lg' : 'bg-white text-indigo-600 border border-slate-200 shadow-sm'}`}>
                    <Layout size={12} className="animate-pulse" /> Functional Composer
                </div>
                <h2 className="text-xl font-black tracking-tight">{currentQ?.title}</h2>
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1 italic">{currentQ?.instruction}</p>
            </div>

            {/* Workspace (The "Desk") */}
            <div className="flex-1 relative overflow-y-auto p-4 flex flex-col items-center">
                <div 
                    className={`relative w-full max-w-lg min-h-[500px] p-8 rounded-sm shadow-2xl transition-all duration-500 overflow-hidden ${isDark ? 'bg-[#1E2530] border border-white/5' : 'bg-white border border-slate-200'}`}
                    style={{ 
                        backgroundImage: isDark ? 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)' : 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                >
                    {currentQ?.slots.map(slot => {
                        const occupiedId = placedItems[slot.id];
                        const itemText = currentQ.items.find(i => i.id === occupiedId)?.text;
                        const isCorrect = isResolved && occupiedId === slot.correctId;
                        const isWrong = isResolved && occupiedId !== slot.correctId;

                        return (
                            <div 
                                key={slot.id}
                                onClick={() => handleSlotClick(slot.id)}
                                className={`absolute flex items-center justify-center p-3 text-center transition-all cursor-pointer rounded-xl border-4 ${occupiedId ? 'border-solid' : 'border-dashed'} ${isCorrect ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : (isWrong ? 'bg-rose-500/10 border-rose-500 text-rose-600 animate-shake' : (occupiedId ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : (isDark ? 'bg-white/5 border-white/10 text-white/20 hover:border-indigo-500 group' : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-indigo-300 group')))}`}
                                style={{ 
                                    top: slot.y || 'auto',
                                    left: slot.left || (slot.x ? 'auto' : 0),
                                    right: slot.x || 'auto',
                                    width: slot.w || '100%',
                                    minHeight: '52px'
                                }}
                            >
                                <span className={`text-[10px] font-black uppercase transition-opacity ${occupiedId ? 'text-[13px] opacity-100' : 'opacity-100 group-hover:text-indigo-500'}`}>
                                    {itemText || slot.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Item Pool (Persistent Bottom) */}
            <div className={`flex-none p-6 border-t transition-all ${isDark ? 'bg-[#151921] border-white/5' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-wrap gap-2 justify-center mb-6 max-h-32 overflow-y-auto pr-2 scrollbar-hide">
                    {availableItems.map((item, i) => (
                        <button
                            key={i}
                            disabled={item.isPlaced || isResolved}
                            onClick={() => handleItemSelect(item)}
                            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 border-2 ${selectedItem?.id === item.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg -translate-y-1' : (item.isPlaced ? 'opacity-20 cursor-not-allowed scale-90 grayscale' : (isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-indigo-200'))}`}
                        >
                            {item.text}
                        </button>
                    ))}
                </div>

                {/* Footer Feedback & Action */}
                <div className="flex flex-col gap-4">
                    <AnimatePresence mode="wait">
                        {feedback && (
                            <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 5, opacity: 0 }} className={`text-center flex items-center justify-center gap-2 ${feedback.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                <span className="text-xs font-black uppercase tracking-widest">{feedback.msg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isResolved ? (
                        <button 
                            onClick={validate}
                            className="w-full h-18 bg-indigo-600 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                            Validate Composition <Sparkles size={18} fill="currentColor" />
                        </button>
                    ) : (
                        <button 
                            onClick={nextStep}
                            className="w-full h-18 bg-emerald-500 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                            {nextStep.isFinal ? 'Finalize Writing Quest' : 'Save & Next Exercise'} <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Finish Overlay */}
            <AnimatePresence>
                {showFinish && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-2xl bg-black/40">
                        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white dark:bg-[#151921] p-10 rounded-[50px] shadow-3xl border border-white/10 text-center max-w-sm w-full">
                            <div className="w-24 h-24 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                                <FileText size={48} />
                            </div>
                            <h2 className="text-4xl font-black mb-2 tracking-tighter">Draftsman!</h2>
                            <p className="text-slate-500 font-bold mb-10 text-lg">Composition Successfully Archived</p>
                            <button onClick={onComplete} className="w-full h-16 bg-indigo-600 text-white rounded-3xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                                Submit & Continue <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .animate-shake { animation: shake 0.4s; }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
};

export default ComposerRenderer;
