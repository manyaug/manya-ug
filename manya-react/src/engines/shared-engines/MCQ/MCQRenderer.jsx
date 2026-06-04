import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, XCircle, Lightbulb, ChevronRight, BookOpen, Zap, Target, Sparkles, AlertCircle,
    MessageSquare, Mail, Megaphone, Music, X, ArrowRight
} from 'lucide-react';

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

// ── Solution Popup Component ─────────────────────────────────────
export function SolutionPopup({ solution, correctText, onContinue }) {
    const steps = [];

    if (solution) {
        if (Array.isArray(solution)) {
            solution.forEach((s, i) => {
                steps.push({
                    icon: <span style={{ fontWeight: 900, fontSize: 13 }}>{i + 1}</span>,
                    label: s.label || s.step || `Step ${i + 1}`,
                    text: s.text || s.explanation
                });
            });
        } else {
            if (solution.logic)        steps.push({ icon: <Lightbulb size={16} />, label: 'Logic',       text: solution.logic });
            if (solution.reasoning)    steps.push({ icon: <Lightbulb size={16} />, label: 'Reasoning',   text: solution.reasoning });
            if (solution.calculation)  steps.push({ icon: <Zap size={16} />,       label: 'Working',     text: solution.calculation });
            if (solution.fact)         steps.push({ icon: <BookOpen size={16} />,  label: 'Fact',        text: solution.fact });
            if (solution.note)         steps.push({ icon: <BookOpen size={16} />,  label: 'Note',        text: solution.note });
            if (solution.answer)       steps.push({ icon: <Target size={16} />,    label: 'Answer',      text: solution.answer });
            if (solution.explanation)  steps.push({ icon: <BookOpen size={16} />,  label: 'Explanation', text: solution.explanation });

            if (Array.isArray(solution.steps)) {
                solution.steps.forEach((s, i) => {
                    steps.push({
                        icon: <span style={{ fontWeight: 900, fontSize: 13 }}>{i + 1}</span>,
                        label: s.step || `Step ${i + 1}`,
                        text: s.explanation || s.text || s.step
                    });
                });
            }
        }
    }

    if (steps.length === 0) {
        steps.push({ icon: <Target size={16} />, label: 'Answer', text: correctText });
    }

    return (
        <>
            <div className="mcq-popup-backdrop" />
            <div className="mcq-solution-popup">
                <div className="mcq-popup-header">
                    <div className="mcq-popup-icon-wrap wrong">
                        <AlertCircle size={22} />
                    </div>
                    <div>
                        <div className="mcq-popup-title">Not quite!</div>
                        <div className="mcq-popup-subtitle">Here's how to solve it</div>
                    </div>
                </div>

                <div className="mcq-correct-chip">
                    <CheckCircle2 size={14} />
                    <span>Correct answer: <strong>{correctText}</strong></span>
                </div>

                <div className="mcq-solution-steps">
                    {steps.map((s, i) => (
                        <div key={i} className="mcq-step-row" style={{ '--step-delay': `${i * 0.08}s` }}>
                            <div className="mcq-step-icon">{s.icon}</div>
                            <div className="mcq-step-body">
                                <div className="mcq-step-label">{s.label}</div>
                                <div className="mcq-step-text">{s.text}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="mcq-popup-continue" onClick={onContinue}>
                    <div className="btn-toy-gloss" />
                    Continue <ChevronRight size={20} strokeWidth={3} />
                </button>
            </div>
        </>
    );
}

// ── Main Renderer ───────────────────────────────────────────────────
export default function MCQRenderer({ 
    data, 
    options, 
    theme, 
    phase, 
    selected, 
    correctId, 
    correctText, 
    solution,
    onPick, 
    onContinue,
    onSubmit,
    hintUsed,
    setHintUsed
}) {
    const isLocked = phase !== 'idle';
    const canSubmit = selected !== null && phase === 'idle';
    const [isPassageOpen, setIsPassageOpen] = React.useState(false);
    const passageMeta = data?.passage ? classifyPassage(data.passage) : null;
    
    // Trigger coin flight when correct phase starts
    React.useEffect(() => {
        if (phase === 'correct') {
            const btn = document.querySelector('.mcq-option-btn.correct');
            if (btn && window.triggerRewardFlight) {
                setTimeout(() => window.triggerRewardFlight(btn, 'coin', 6), 200);
            }
        }
    }, [phase]);

    return (
        <div className="mcq-world-root" style={{ '--sub-theme-bg': theme.bg, '--sub-theme-border': theme.border }}>
            {/* ── Question bubble ── */}
            <div className="mcq-q-card" style={{ position: 'relative' }}>
                <div className="toy-card-gloss" />
                
                {/* 📖 Floating Passage Toggle */}
                {data.passage && passageMeta && (
                    <div className="mcq-passage-container animate-in fade-in duration-200" style={{ position: 'absolute', left: '-10px', top: '-20px', zIndex: 100 }}>
                        <button 
                            className={`mcq-hint-toggle-v2 ${isPassageOpen ? 'active' : ''}`}
                            onClick={() => setIsPassageOpen(!isPassageOpen)}
                            style={{ 
                                background: isPassageOpen ? '#3b82f6' : '#4f46e5',
                                color: 'white',
                                boxShadow: isPassageOpen ? '0 6px 20px rgba(59, 130, 246, 0.5)' : '0 4px 10px rgba(79, 70, 229, 0.4)',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                            title={passageMeta.label}
                        >
                            <PassageIcon type={passageMeta.type} size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                )}

                {/* 💡 Floating Hint Toggle */}
                {data.hint && !isLocked && (
                    <div className="mcq-hint-container">
                        <button 
                            className={`mcq-hint-toggle-v2 ${hintUsed ? 'active' : ''}`}
                            onClick={() => {
                                if (!hintUsed) {
                                    const qId = data.id || data.qid || data.questionId || data.question || data.text;
                                    window.dispatchEvent(new CustomEvent('manya-hint-taken', { detail: { questionId: qId } }));
                                }
                                setHintUsed(!hintUsed);
                            }}
                        >
                            <Lightbulb size={20} strokeWidth={2.5} />
                        </button>
                        
                        {hintUsed && (
                            <div className="mcq-hint-bubble-v2 animate-in zoom-in-95 duration-200">
                                <div className="toy-card-gloss" />
                                <div className="mcq-hint-header">
                                    <Sparkles size={14} className="text-amber-400" />
                                    <span className="mcq-hint-badge">Research Hint</span>
                                </div>
                                <p className="mcq-hint-text">{data.hint}</p>
                            </div>
                        )}
                    </div>
                )}

                {data.image_url && (
                    <div className="mcq-q-image">
                        <img src={data.image_url} alt="Question visual" />
                    </div>
                )}
                <p className="mcq-q-text" dangerouslySetInnerHTML={{ __html: data.text || data.question }} />
            </div>

            {/* ── Options ── */}
            <div className="mcq-options">
                {options.map((opt) => {
                    const isThis    = selected === opt.id;
                    const isCorrect = opt.id === correctId;

                    let state = '';
                    if (phase === 'checking' && isThis) state = 'selected';
                    if ((phase === 'wrong' || phase === 'show-solution') && isThis)  state = 'wrong';
                    if ((phase === 'wrong' || phase === 'show-solution') && isCorrect) state = 'reveal-correct';
                    if (phase === 'correct' && isThis) state = 'correct';
                    if (phase === 'idle' && isThis) state = 'selected';

                    return (
                        <button
                            key={opt.id}
                            className={`mcq-option-btn ${state}`}
                            onClick={() => onPick(opt)}
                            disabled={isLocked}
                        >
                            <div className="toy-card-gloss" />
                            <span className="mcq-opt-letter">{opt.letter}</span>
                            <span className="mcq-opt-text">{opt.text}</span>
                            {state === 'correct'        && <CheckCircle2 size={20} className="mcq-opt-icon" />}
                            {state === 'wrong'          && <XCircle      size={20} className="mcq-opt-icon" />}
                            {state === 'reveal-correct' && <CheckCircle2 size={20} className="mcq-opt-icon reveal" />}
                        </button>
                    );
                })}
            </div>

            {/* ── Dynamic Action Footer ── */}
            <div className="mcq-action-footer">
                {phase === 'idle' ? (
                    <button 
                        className={`manya-btn-pro w-full ${!canSubmit ? 'disabled' : ''}`}
                        onClick={onSubmit}
                        disabled={!canSubmit}
                        style={{ 
                            backgroundColor: canSubmit ? '#58cc02' : '#e5e5e5',
                            boxShadow: canSubmit ? '0 6px 0 #46a302' : '0 6px 0 #d4d4d4',
                            color: canSubmit ? 'white' : '#a0a0a0'
                        }}
                    >
                        SUBMIT ANSWER <Zap size={16} fill="currentColor" />
                    </button>
                ) : phase === 'correct' ? (
                    <div className="h-14" /> // Hide correct banner, auto-continue handles it!
                ) : phase === 'wrong' || phase === 'show-solution' ? (
                    <div className="mcq-feedback-banner wrong animate-in slide-in-from-bottom-4" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                        <div className="flex items-center gap-3">
                            <div className="mcq-feedback-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}><AlertCircle size={24} /></div>
                            <div>
                                <div className="mcq-feedback-title" style={{ color: '#d97706' }}>LET'S INVESTIGATE...</div>
                                <div className="mcq-feedback-sub" style={{ color: '#b45309' }}>Let's check the research data together.</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-14" /> // placeholder
                )}
            </div>

            {/* ── Detailed Solution Overlay ── */}
            {phase === 'show-solution' && (
                <SolutionPopup
                    solution={solution}
                    correctText={correctText}
                    onContinue={onContinue}
                />
            )}

            {/* ── Passage Sliding Bottom Sheet ── */}
            <AnimatePresence>
                {isPassageOpen && data?.passage && passageMeta && (
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
                                {renderFormattedPassage(data.passage, passageMeta.type)}
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
        </div>
    );
}
