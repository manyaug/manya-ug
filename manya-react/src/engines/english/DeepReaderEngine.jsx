import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { awardCoins, updateBalanceThunk } from '../../store/userSlice';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { CoinBurst } from '../../components/ui/CoinBurst';
import { BookOpen, Trophy, ArrowRight, BarChart3, Table as TableIcon, FileText, Quote, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

/**
 * MANYA ENGLISH: DEEP READER ENGINE (React v1.0)
 * --------------------------------------------
 * - Transactional: Connects to relational Economy Ledger.
 */

const DeepReaderEngine = ({ data, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isResolved, setIsResolved] = useState(false);
    const [score, setScore] = useState(0);
    const [isDark, setIsDark] = useState(false);
    const [showFinish, setShowFinish] = useState(false);
    const [showCoinBurst, setShowCoinBurst] = useState(false);
    const dispatch = useDispatch();

    const questions = useMemo(() => {
        const payload = data?.data || data;
        return payload?.questions || payload?.queries || payload?.items || [];
    }, [data]);

    const media = useMemo(() => {
        const payload = data?.data || data;
        return payload?.media || payload?.content || payload?.passage || { type: 'PASSAGE', content: 'No content provided.' };
    }, [data]);
    const currentQ = questions[currentStep];

    // Detect Dark Mode
    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark') || getComputedStyle(document.body).backgroundColor === 'rgb(11, 14, 20)');
        checkDark();
        const obs = new MutationObserver(checkDark);
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    const handleOptionSelect = (opt) => {
        if (isResolved) return;
        setSelectedOption(opt);
    };

    const handleCheckAnswer = () => {
        if (!selectedOption || isResolved) return;
        const isCorrect = selectedOption === currentQ.answer;
        setIsResolved(true);
        
        if (isCorrect) {
            setScore(s => s + 1);
            audioService.success?.();
            setShowCoinBurst(true);
            
            // 💰 [Economy] Transactional Reward (Phase 1.1)
            dispatch(updateBalanceThunk({ 
                currency: 'coins', 
                amount: 3, 
                type: 'EARNED_DEEP_READER',
                contextId: currentQ.id 
            }));
        } else {
            audioService.error?.();
        }
    };

    const nextStep = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(s => s + 1);
            setSelectedOption(null);
            setIsResolved(false);
        } else {
            setShowFinish(true);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-page)] text-[var(--text-main)] overflow-hidden select-none font-sans relative">
            {/* AMBIENT GLOWS (Theme Aware Opacity) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,_var(--manya-purple)_0%,_transparent_70%)] opacity-[0.08] dark:opacity-30 pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-1/2 bg-[radial-gradient(circle_at_50%_110%,_var(--bg-secondary)_0%,_transparent_70%)] opacity-40 pointer-events-none" />

            {/* 1. Media Pane (Compact Passage View) */}
            <div className="flex-[0.45] relative z-20 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-8 pt-10 scrollbar-premium" id="media-pane-scroll">
                    <div className="max-w-[480px] mx-auto pb-12">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                                    {media.type === 'PASSAGE' && <FileText size={16} />}
                                    {media.type === 'POEM' && <Quote size={16} />}
                                    {media.type === 'TABLE' && <TableIcon size={16} />}
                                    {media.type === 'GRAPH' && <BarChart3 size={16} />}
                                </div>
                                <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-[var(--text-sub)]">{media.type}</span>
                            </div>
                            <div className="h-px flex-1 mx-4 bg-[var(--border-subtle)]" />
                        </div>

                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            {media.type === 'PASSAGE' && (
                                <div 
                                    className="passage-content text-sm sm:text-[15px] leading-relaxed font-medium text-[var(--text-main)] opacity-90"
                                    dangerouslySetInnerHTML={{ __html: media.content }}
                                />
                            )}
                            {media.type === 'POEM' && (
                                <div 
                                    className="text-center italic whitespace-pre-line leading-loose text-sm sm:text-base text-indigo-600 dark:text-indigo-200/80 font-serif border-x border-[var(--border-subtle)] py-4"
                                    dangerouslySetInnerHTML={{ __html: media.content }}
                                />
                            )}
                            {media.type === 'TABLE' && (
                                <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] backdrop-blur-sm">
                                    <table className="w-full text-[10px] text-left">
                                        <thead className="bg-[var(--border-subtle)]">
                                            <tr>
                                                {media.headers?.map((h, i) => <th key={i} className="px-4 py-3 font-bold uppercase tracking-widest text-[var(--text-sub)] border-b border-[var(--border-subtle)]">{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-subtle)]">
                                            {media.rows?.map((row, i) => (
                                                <tr key={i} className="hover:bg-[var(--accent-bg)] transition-colors">
                                                    {row.map((cell, j) => <td key={j} className="px-4 py-3 text-[var(--text-main)] font-medium">{cell}</td>)}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* Scroll hint fade */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[var(--bg-page)] to-transparent pointer-events-none z-10 opacity-60" />
            </div>

            {/* 2. Question Pane (Sleek Glassmorphic Bottom) */}
            <div className="flex-[0.55] flex flex-col relative z-30 bg-[var(--bg-secondary)]/80 backdrop-blur-3xl border-t border-[var(--border-subtle)] rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.5)] min-h-0">
                <div className="h-1.5 w-12 bg-[var(--border-subtle)] rounded-full mx-auto mt-4 mb-2" />
                
                <div className="flex-1 overflow-y-auto px-8 py-4 scrollbar-hide">
                    <div className="max-w-[480px] mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[9px] font-bold tracking-[0.4em] uppercase text-[var(--text-sub)]">
                                Step <span className="text-[var(--text-main)]">{currentStep + 1}</span> of {questions.length}
                            </span>
                            <div className="flex gap-1.5">
                                {questions.map((_, i) => (
                                    <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'w-6 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : (i < currentStep ? 'w-2 bg-emerald-500/50' : 'w-2 bg-[var(--border-subtle)]')}`} />
                                ))}
                            </div>
                        </div>

                        <motion.h2 
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            className="text-lg sm:text-xl font-bold leading-tight mb-8 tracking-tight text-[var(--text-main)]"
                        >
                            {currentQ?.text}
                        </motion.h2>

                        <div className="grid gap-3 mb-24">
                            {currentQ?.options?.map((opt, i) => {
                                const isCorrect = isResolved && opt === currentQ.answer;
                                const isWrong = selectedOption === opt && opt !== currentQ.answer;
                                
                                return (
                                    <button
                                        key={i}
                                        id={isResolved && selectedOption === opt ? 'celebration-coin-source' : undefined}
                                        onClick={() => handleOptionSelect(opt)}
                                        disabled={isResolved}
                                        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                                            isResolved 
                                            ? (opt === currentQ.answer ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)]' : (selectedOption === opt ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400' : 'bg-[var(--bg-page)] border-[var(--border-subtle)] opacity-40'))
                                            : (selectedOption === opt ? 'bg-[var(--manya-purple)]/10 border-[var(--manya-purple)] text-[var(--manya-purple)] ring-2 ring-[var(--manya-purple)]/20' : 'bg-[var(--bg-page)] border-[var(--border-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-secondary)] hover:border-[var(--manya-purple)]/30')
                                        }`}
                                    >
                                        <span className="text-[13px] font-medium">{opt}</span>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                            isResolved 
                                            ? (opt === currentQ.answer ? 'bg-emerald-500 border-emerald-500' : (selectedOption === opt ? 'bg-rose-500 border-rose-500' : 'border-[var(--border-subtle)]'))
                                            : (selectedOption === opt ? 'bg-[var(--manya-purple)] border-[var(--manya-purple)] shadow-[0_0_10px_rgba(124,58,237,0.4)]' : 'border-[var(--border-subtle)] group-hover:border-indigo-400/50')
                                        }`}>
                                            {isResolved && opt === currentQ.answer && <CheckCircle2 size={12} className="text-white" />}
                                            {isResolved && selectedOption === opt && opt !== currentQ.answer && <XCircle size={12} className="text-white" />}
                                            {!isResolved && selectedOption === opt && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Floating Action Area */}
                <AnimatePresence>
                    {selectedOption && (
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="absolute bottom-6 inset-x-8 z-50 flex justify-center"
                        >
                            {!isResolved ? (
                                <button 
                                    onClick={handleCheckAnswer}
                                    className="manya-btn-elite primary w-full max-w-[480px]"
                                >
                                    <span>Check Answer</span>
                                    <ArrowRight size={18} strokeWidth={3} />
                                </button>
                            ) : (
                                <button 
                                    onClick={nextStep}
                                    className="manya-btn-elite success w-full max-w-[480px]"
                                >
                                    <span>{currentStep < questions.length - 1 ? 'Next Question' : 'Finish Reading'}</span>
                                    <ArrowRight size={18} strokeWidth={3} />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Finish Overlay */}
            <AnimatePresence>
                {showFinish && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-page)]/90 backdrop-blur-xl"
                    >
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="p-10 text-center max-w-sm">
                            <div className="text-6xl mb-8 animate-bounce">🏆</div>
                            <h2 className="text-4xl font-bold mb-2 tracking-tighter text-[var(--text-main)]">Excellent Work!</h2>
                            <p className="text-[var(--text-sub)] font-bold mb-10 text-sm tracking-tight">
                                You've mastered this passage with deep insight.
                            </p>
                            <button 
                                onClick={onComplete}
                                className="manya-btn-elite primary w-full"
                            >
                                <span>Submit Results</span>
                                <ArrowRight size={20} strokeWidth={4} />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CoinBurst trigger={showCoinBurst} onFinish={() => setShowCoinBurst(false)} />

            <style>{`
                .manya-btn-elite {
                    position: relative;
                    height: 60px;
                    border-radius: 18px;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    font-size: 13px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    overflow: hidden;
                }
                .manya-btn-elite.primary { background: var(--manya-purple); }
                .manya-btn-elite.success { background: #10B981; }
                .manya-btn-elite:active { transform: scale(0.96); opacity: 0.9; }
                
                .passage-content h2 { font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; color: var(--manya-purple); letter-spacing: -0.02em; }
                .passage-content p { margin-bottom: 1rem; line-height: 1.7; }
                .passage-content b, .passage-content strong { font-weight: 900; color: var(--text-main); }
                
                .scrollbar-premium::-webkit-scrollbar { width: 4px; }
                .scrollbar-premium::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-premium::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 10px; }
                .scrollbar-premium::-webkit-scrollbar-thumb:hover { background: var(--manya-purple); }
            `}</style>
        </div>
    );
};

DeepReaderEngine.hideGlobalFooter = true;
export default DeepReaderEngine;
