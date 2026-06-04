import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, X, Zap, Trophy, Compass, Lightbulb, Sparkles, AlertCircle, ArrowRight, RotateCcw,
    BookOpen, MessageSquare, Mail, Megaphone, Music, FileText
} from 'lucide-react';
import QuestHUD from '../../components/QuestHUD';
import { triggerRewardFlight } from '../../utils/fxUtils';
import { audioService } from '../../infrastructure/audio/audioService';

/**
 * ENGLISH RENDERER v4.0 (Universal)
 * --------------------------------------------------
 * - STICKY FOOTER: Submit button stays at bottom.
 * - UPGRADED HUD: Progress & Mastery aware.
 * - SCROLLABLE HEART: Question + Options scroll if too long.
 */
// ── Passage Classifier and Formatting ───────────────────────────
const classifyPassage = (text) => {
    if (!text) return { type: 'story', label: 'Read Story', icon: 'BookOpen' };
    const lower = text.toLowerCase();
    
    // 1. Dialogue / Conversation
    const dialogueMatches = text.match(/^[A-Z][a-zA-Z\s]{1,15}:\s/m);
    if (dialogueMatches || lower.includes('conductor:') || lower.includes('aunt:') || lower.includes('musa:')) {
        return { type: 'dialogue', label: 'Read Dialogue', icon: 'MessageSquare' };
    }
    
    // 2. Letter
    if (lower.includes('dear ') || lower.includes('p.o. box') || lower.includes('yours sincerely') || lower.includes('yours,') || lower.includes('write back')) {
        return { type: 'letter', label: 'Read Letter', icon: 'Mail' };
    }
    
    // 3. Circular / Announcement / Notice
    if (lower.includes('circular') || lower.includes('notice') || lower.includes('holiday camp') || lower.includes('venue:') || lower.includes('date:')) {
        return { type: 'announcement', label: 'Read Notice', icon: 'Megaphone' };
    }
    
    // 4. Poem
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const shortLines = lines.filter(l => l.length < 50);
    if (lines.length >= 4 && shortLines.length / lines.length > 0.8) {
        return { type: 'poem', label: 'Read Poem', icon: 'Music' };
    }
    
    // 5. Default Narrative
    return { type: 'story', label: 'Read Story', icon: 'BookOpen' };
};

const PassageIcon = ({ type, size = 16, className = "" }) => {
    switch (type) {
        case 'dialogue': return <MessageSquare size={size} className={className} />;
        case 'poem': return <Music size={size} className={className} />;
        case 'letter': return <Mail size={size} className={className} />;
        case 'announcement': return <Megaphone size={size} className={className} />;
        default: return <BookOpen size={size} className={className} />;
    }
};

const renderFormattedPassage = (text, type) => {
    if (!text) return null;
    
    if (type === 'dialogue') {
        const lines = text.split('\n').filter(Boolean);
        return (
            <div className="flex flex-col gap-3 my-2">
                {lines.map((line, i) => {
                    const match = line.match(/^([^:]+):(.*)$/);
                    if (match) {
                        const speaker = match[1].trim();
                        const message = match[2].trim();
                        return (
                            <div key={i} className="flex flex-col bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-1">{speaker}</span>
                                <p className="text-slate-200 text-sm font-medium leading-relaxed">{message}</p>
                            </div>
                        );
                    }
                    return <p key={i} className="text-slate-300 italic text-sm">{line}</p>;
                })}
            </div>
        );
    }
    
    if (type === 'poem') {
        const lines = text.split('\n');
        return (
            <div className="flex flex-col items-center text-center my-6 gap-2 font-serif italic text-base text-indigo-200 leading-relaxed">
                {lines.map((line, i) => (
                    <p key={i} className="min-h-[1.5rem]">{line.trim()}</p>
                ))}
            </div>
        );
    }
    
    if (type === 'letter') {
        const lines = text.split('\n');
        return (
            <div className="bg-[#1a1523]/60 border border-purple-500/10 rounded-3xl p-6 font-medium text-slate-300 gap-3 flex flex-col shadow-inner">
                {lines.map((line, i) => {
                    const isAddress = line.includes('Box') || line.includes('Lira') || line.includes('December') || line.includes('January');
                    const isSalutation = line.trim().startsWith('Dear');
                    const isSignature = line.trim().startsWith('Yours') || line.trim().startsWith('Love,') || line.trim().startsWith('From,');
                    
                    let alignClass = "";
                    if (isAddress) alignClass = "text-right text-indigo-400 text-xs font-semibold";
                    else if (isSalutation) alignClass = "font-black text-indigo-300 text-sm mt-3";
                    else if (isSignature) alignClass = "font-semibold text-indigo-400 mt-4";
                    
                    return <p key={i} className={`${alignClass} leading-relaxed`}>{line.trim()}</p>;
                })}
            </div>
        );
    }
    
    if (type === 'announcement') {
        const lines = text.split('\n').filter(Boolean);
        return (
            <div className="bg-[#121124]/70 border border-indigo-500/20 rounded-3xl p-6 flex flex-col gap-3">
                {lines.map((line, i) => {
                    const isHeader = line.toUpperCase().includes('CIRCULAR') || line.toUpperCase().includes('NOTICE') || line.toUpperCase().includes('CAMP') || line.toUpperCase().includes('TIME:');
                    if (isHeader) {
                        return <h5 key={i} className="text-center font-black text-indigo-400 text-xs tracking-wider border-b border-indigo-500/10 pb-2.5 mb-2 uppercase">{line.trim()}</h5>;
                    }
                    return <p key={i} className="text-slate-300 leading-relaxed text-sm">{line.trim()}</p>;
                })}
            </div>
        );
    }
    
    return (
        <div className="flex flex-col gap-4 text-slate-300 leading-relaxed text-sm indent-4">
            {text.split('\n').map((para, i) => (
                <p key={i}>{para.trim()}</p>
            ))}
        </div>
    );
};

const EnglishRenderer = ({
    isLoading, loadingConfig, randomFact, currentQ, currentIdx,
    totalQuestions, nodeType, selectedOption, isAnswered, hintUsed,
    setHintUsed, setSelectedOption, handleSubmit, correctText,
    userWasCorrect, frustration, questMeta, showExplanation,
    gemsEarned, showGemToast, onContinue, session, BridgeNode, currentMode
}) => {
    console.log("RENDER CURRENT Q:", currentQ);
    const [timeLeft, setTimeLeft] = React.useState(null);
    const [maxTime, setMaxTime] = React.useState(18);
    const [isPassageOpen, setIsPassageOpen] = React.useState(false);
    const passageMeta = currentQ?.passage ? classifyPassage(currentQ.passage) : null;
    console.log("PASSAGE META:", passageMeta);
    const correctBtnRef = useRef(null);
    const score = session?.correctCount || 0;
    const masteryScore = session?.mastery || 0;

    useEffect(() => {
        const onStart = (e) => { setMaxTime(e.detail?.duration || 18); setTimeLeft(e.detail?.duration || 18); };
        const onStop = () => setTimeLeft(null);
        window.addEventListener('manya-fx-speedrun-start', onStart);
        window.addEventListener('manya-fx-speedrun-stop', onStop);
        window.addEventListener('manya-engine-timeout', onStop);
        return () => {
            window.removeEventListener('manya-fx-speedrun-start', onStart);
            window.removeEventListener('manya-fx-speedrun-stop', onStop);
            window.removeEventListener('manya-engine-timeout', onStop);
        };
    }, []);

    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && !isAnswered) {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, isAnswered]);

    useEffect(() => {
        if (isAnswered && userWasCorrect) {
            if (correctBtnRef.current) {
                setTimeout(() => triggerRewardFlight(correctBtnRef.current, 'coin', 5), 300);
            }
        }
    }, [isAnswered, userWasCorrect]);

    if (isLoading) {
        const cfg = loadingConfig || {};
        return (
            <div className="quest-loading-overlay" style={{ '--loader-color': cfg.color, '--loader-dark': cfg.colorDark, '--loader-bg': cfg.bgLight }}>
                <div className="loader-blob loader-blob-1" style={{ background: cfg.color }} />
                <div className="loader-blob loader-blob-2" style={{ background: cfg.color }} />
                <div className="loader-content-card">
                    <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                        <img 
                            src={cfg.mascot || 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.6/images/manya_icon.webp'} 
                            alt="Manya" 
                            className="loader-mascot-img" 
                            onError={(e) => { e.target.src = 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.6/images/manya_icon.webp'; }}
                        />
                    </div>
                    <h3 className="loader-title">{cfg.title}</h3>
                    <div className="loader-bounce-dots">
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '0ms' }} />
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '200ms' }} />
                        <span className="loader-dot" style={{ background: cfg.color, animationDelay: '400ms' }} />
                    </div>
                    <div className="loader-fact-card" style={{ borderColor: `${cfg.color}30` }}>
                        <span className="loader-fact-label" style={{ color: cfg.color }}>Did you know?</span>
                        <p className="loader-fact-text">{randomFact}</p>
                    </div>
                    <p className="loader-status-text">{cfg.sub}</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative" style={{ maxHeight: '100%' }}>

            <div className="flex-1 overflow-y-auto no-scrollbar relative">
                {BridgeNode ? (
                    <div className="!w-full !h-full flex flex-col overflow-hidden">{BridgeNode}</div>
                ) : (
                    <div className="px-4 pt-4 pb-6">
                        {currentQ?.isRephrased && (
                            <div className="text-[10px] uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 font-black mb-4 text-center">🔄 Concept Replay: Different Wording</div>
                        )}
                        
                        <div className="bg-[var(--bg-card)] rounded-[2.5rem] border-[4px] border-indigo-500/40 neon-glow-violet px-7 py-8 mb-6 shadow-2xl relative">
                            <div className="toy-card-gloss" />
                            <div className="flex items-center justify-between mb-5 relative z-10">
                                <div className="flex items-center gap-2">
                                    {timeLeft !== null && (
                                        <div className="flex items-center gap-2 bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse shadow-lg shadow-rose-500/30">
                                            <Zap size={12} fill="currentColor" /><span>{timeLeft}s</span>
                                        </div>
                                    )}
                                    {currentMode === 'reverse' && (
                                        <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-indigo-500/30">
                                            <RotateCcw size={12} /><span>REVERSE MODE</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {currentQ?.passage && passageMeta && (
                                        <button 
                                            onClick={() => setIsPassageOpen(true)}
                                            className={`p-2.5 rounded-2xl transition-all relative z-20 ${isPassageOpen ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                            title={passageMeta.label}
                                        >
                                            <PassageIcon type={passageMeta.type} size={20} />
                                        </button>
                                    )}
                                    {!isAnswered && currentQ?.hint && (
                                        <div className="relative">
                                            <button onClick={() => {
                                                if (!hintUsed) {
                                                    const qId = currentQ.id || currentQ.qid || currentQ.questionId || currentQ.question;
                                                    window.dispatchEvent(new CustomEvent('manya-hint-taken', { detail: { questionId: qId } }));
                                                }
                                                setHintUsed(!hintUsed);
                                            }} className={`p-2.5 rounded-2xl transition-all relative z-20 ${hintUsed ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}><Lightbulb size={20} /></button>
                                            <AnimatePresence>
                                                {hintUsed && (
                                                    <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }} className="mcq-hint-bubble" style={{ right: '-5px', top: '55px', width: '240px', background: '#ffffff', border: '3px solid #f59e0b', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', opacity: 1 }}>
                                                        <div className="toy-card-gloss" /><div className="mcq-hint-header"><Sparkles size={14} className="text-amber-500" /><span className="mcq-hint-badge" style={{ color: '#f59e0b' }}>Tutor Hint</span></div>
                                                        <p className="mcq-hint-text" style={{ color: '#1e293b' }}>"{currentQ.hint}"</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-[var(--text-main)] font-bold text-xl leading-snug relative z-10">{currentQ?.question || currentQ?.question_text}</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            {currentQ?.options?.map((opt, i) => {
                                const isSelected = opt === selectedOption;
                                let cls = "mcq-fe-btn transition-all duration-300";
                                if (isAnswered) {
                                    if (opt === correctText) cls += " mcq-fe-correct";
                                    else if (isSelected) cls += " mcq-fe-wrong";
                                    else cls += " mcq-fe-faded";
                                } else if (isSelected) cls += " mcq-fe-selected";
                                return (
                                    <motion.button key={i} disabled={isAnswered} onClick={() => setSelectedOption(opt)} className={cls} ref={opt === correctText ? correctBtnRef : null} whileTap={!isAnswered ? { scale: 0.98, translateY: 2 } : {}}>
                                        <div className="toy-card-gloss" />
                                        <span className={`mcq-fe-letter ${isSelected && !isAnswered ? 'bg-indigo-500 text-white' : ''}`}>{String.fromCharCode(65 + i)}</span>
                                        <span className="mcq-fe-text">{opt}</span>
                                        {isAnswered && opt === correctText && <Check size={18} className="mcq-fe-icon correct-icon" strokeWidth={4} />}
                                        {isAnswered && isSelected && opt !== correctText && <X size={18} className="mcq-fe-icon wrong-icon" strokeWidth={4} />}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {!BridgeNode && (
                <div className="flex-none p-4 pb-8 w-full bg-[#0c111d]/80 backdrop-blur-lg border-t border-white/5 relative z-50">
                    {!isAnswered ? (
                        <button onClick={handleSubmit} disabled={!selectedOption} className={`w-full h-14 rounded-2xl font-black text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 relative overflow-hidden ${selectedOption ? 'bg-[#58cc02] hover:bg-[#46a302] text-white border-b-[4px] border-[#46a302] active:translate-y-1' : 'bg-[#e5e5e5] text-[#a0a0a0] border-b-[4px] border-[#d4d4d4]'}`}>
                            <span className="relative z-10 flex items-center gap-2">SUBMIT ANSWER <Zap size={14} fill="currentColor" /></span>
                        </button>
                    ) : (
                        <div className={`w-full h-16 rounded-[2rem] flex items-center justify-center gap-3 font-black text-[10px] tracking-widest uppercase border-2 transition-all duration-500 ${userWasCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                            {userWasCorrect ? <>Answer Confirmed <Check size={18} /></> : <>Analyzing Solution... <AlertCircle size={18} /></>}
                        </div>
                    )}
                </div>
            )}

            <AnimatePresence>
                {showGemToast && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-20 right-4 bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-black z-20 flex items-center gap-1 pointer-events-none shadow-lg">
                        <Trophy size={12} /> +{gemsEarned} gems
                    </motion.div>
                )}
            </AnimatePresence>

            {showExplanation && !userWasCorrect && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-md bg-[#151921] rounded-[3rem] p-8 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                        <div className="toy-card-gloss" />
                        <div className="flex items-center gap-5 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500"><X size={28} strokeWidth={3} /></div>
                            <div><h3 className="text-2xl font-black text-white tracking-tight">Not quite!</h3><p className="text-xs font-bold text-slate-400">Let's see what happened...</p></div>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 mb-6"><Check size={20} className="text-emerald-500" strokeWidth={3} /><div className="text-sm font-bold text-emerald-400">Correct Answer: <span className="text-white ml-1">{correctText}</span></div></div>
                        <div className="max-h-[30vh] overflow-y-auto pr-2 mb-8 scrollbar-hide"><p className="text-slate-300 font-bold leading-relaxed text-base italic">"{currentQ?.explanation || 'Look closely at the grammar rule applied here. Practice makes perfect!'}"</p></div>
                        <button onClick={onContinue} className="w-full h-16 bg-amber-500 text-white rounded-[2rem] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 shadow-[0_8px_0_#b45309] active:translate-y-1 active:shadow-none transition-all">Keep Exploring <ArrowRight size={20} /></button>
                    </div>
                </div>,
                document.body
            )}
            <AnimatePresence>
                {isPassageOpen && currentQ?.passage && passageMeta && (
                    <div className="fixed inset-0 z-[11000] flex items-end justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-300 p-0 sm:p-4">
                        <div className="absolute inset-0 cursor-pointer" onClick={() => setIsPassageOpen(false)} />
                        
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="relative w-full max-w-md bg-[#0e111a] rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-white/10 p-6 pb-8 shadow-[0_-15px_50px_rgba(0,0,0,0.8)] max-h-[85vh] sm:max-h-[80vh] flex flex-col z-10"
                        >
                            <div className="toy-card-gloss" />
                            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setIsPassageOpen(false)} />
                            
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <PassageIcon type={passageMeta.type} size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-white leading-tight">{passageMeta.label}</h4>
                                        <p className="text-[9px] text-indigo-400/80 font-black uppercase tracking-widest">Reading comprehension</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsPassageOpen(false)}
                                    className="w-9 h-9 rounded-full bg-white/5 text-slate-400 hover:bg-white/10 active:scale-90 flex items-center justify-center transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-1 text-slate-200 scrollbar-thin no-scrollbar">
                                {renderFormattedPassage(currentQ.passage, passageMeta.type)}
                            </div>
                            
                            <button 
                                onClick={() => setIsPassageOpen(false)}
                                className="mt-6 w-full h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black text-xs tracking-widest uppercase transition-all border-b-[4px] border-indigo-700 active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
                            >
                                <span>Back to Question</span>
                                <ArrowRight size={14} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        </div>
    );
};

export default EnglishRenderer;
