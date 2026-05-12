import React from 'react';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, BookOpen, Zap, Target, Sparkles, AlertCircle } from 'lucide-react';

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
            <div className="mcq-q-card">
                <div className="toy-card-gloss" />
                
                {/* 💡 Floating Hint Toggle */}
                {data.hint && !isLocked && (
                    <div className="mcq-hint-container">
                        <button 
                            className={`mcq-hint-toggle-v2 ${hintUsed ? 'active' : ''}`}
                            onClick={() => setHintUsed(!hintUsed)}
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
                    <div className="h-24" /> // Hide banner, let global FX handle it
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
        </div>
    );
}
