import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout, Trophy, ArrowRight, MousePointer2, Sparkles, FileText, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

/**
 * MANYA ENGLISH: FUNCTIONAL COMPOSER ENGINE (React v1.0)
 * -----------------------------------------------------
 * - Advanced spatial positioning for functional writing mastery.
 * - Click-to-place interaction for precise layout construction.
 * - Premium "Studio Desk" aesthetic with paper surface.
 * - Multi-task support with validation & mastery feedback.
 */

const FunctionalComposerEngine = ({ data, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [placedItems, setPlacedItems] = useState({}); // { slotId: itemId }
    const [selectedItem, setSelectedItem] = useState(null);
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg: '...' }
    const [isResolved, setIsResolved] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);

    const questions = useMemo(() => data?.questions || [], [data]);
    const currentQ = questions[currentStep];

    const availableItems = useMemo(() => {
        if (!currentQ) return [];
        return currentQ.items.map(item => ({
            ...item,
            isPlaced: Object.values(placedItems).includes(item.id)
        }));
    }, [currentQ, placedItems]);

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleSlotClick = (slotId) => {
        if (isResolved || !selectedItem) return;

        setPlacedItems(prev => ({
            ...prev,
            [slotId]: selectedItem.id
        }));
        setSelectedItem(null);
        setFeedback(null);
    };

    const handleItemSelect = (item) => {
        if (isResolved || item.isPlaced) return;
        setSelectedItem(item);
    };

    const validate = () => {
        let allCorrect = true;
        currentQ.slots.forEach(slot => {
            if (placedItems[slot.id] !== slot.correctId) {
                allCorrect = false;
            }
        });

        if (allCorrect) {
            setIsResolved(true);
            setFeedback({ type: 'success', msg: 'Composition Complete! ✍️' });
            window.ManyaAudio?.success?.();
        } else {
            setFeedback({ type: 'error', msg: 'Some components are misplaced.' });
            window.ManyaAudio?.error?.();
        }
    };

    const nextStep = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
            setPlacedItems({});
            setSelectedItem(null);
            setIsResolved(false);
            setFeedback(null);
        } else {
            setShowFinish(true);
        }
    };

    return (
        <div className={`flex flex-col h-full overflow-hidden font-jakarta transition-colors duration-500 ${isDark ? 'bg-[#0B0E14] text-white' : 'bg-slate-100 text-slate-900'}`}>
            
            {/* Header HUD */}
            <div className="flex-none p-6 text-center pb-2">
                <div className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase items-center gap-2 mb-2 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white text-indigo-600 border border-slate-200 shadow-sm'}`}>
                    <Layout size={12} /> Functional Composer
                </div>
                <h2 className="text-xl font-black tracking-tight">{currentQ?.title}</h2>
                <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">{currentQ?.instruction}</p>
            </div>

            {/* Workspace (The "Desk") */}
            <div className="flex-1 relative overflow-y-auto p-4 flex flex-col items-center">
                <div 
                    className={`relative w-full max-w-lg min-h-[500px] p-8 rounded-sm shadow-2xl transition-all duration-500 overflow-hidden ${isDark ? 'bg-white/5 border border-white/5' : 'bg-white border border-slate-200'}`}
                    style={{ 
                        backgroundImage: isDark ? 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)' : 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)',
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
                    {feedback && (
                        <div className={`text-center flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 ${feedback.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            <span className="text-xs font-black uppercase tracking-widest">{feedback.msg}</span>
                        </div>
                    )}

                    {!isResolved ? (
                        <button 
                            onClick={validate}
                            className="w-full h-16 bg-indigo-600 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                            Validate Composition <Sparkles size={18} fill="currentColor" />
                        </button>
                    ) : (
                        <button 
                            onClick={nextStep}
                            className="w-full h-16 bg-emerald-500 text-white rounded-[24px] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                            {currentStep < questions.length - 1 ? 'Next Exercise' : 'Finalize Quest'} <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Finish Overlay */}
            {showFinish && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl bg-white/10">
                    <div className="bg-white dark:bg-[#151921] p-10 rounded-[45px] shadow-3xl border border-white/10 scale-in-center">
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-[35px] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-12">
                            <FileText size={48} />
                        </div>
                        <h2 className="text-4xl font-black mb-2 tracking-tight">Composer!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold mb-10 text-lg">
                            Functional Writing Mastered
                        </p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={onComplete}
                                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Finish Quest <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scale-in-center { animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
                .animate-shake { animation: shake 0.4s; }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
};

FunctionalComposerEngine.hideGlobalFooter = true;
export default FunctionalComposerEngine;
