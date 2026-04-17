import React from 'react';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, BookOpen, Zap, Target } from 'lucide-react';

// ── Solution Popup Component ─────────────────────────────────────
export function SolutionPopup({ solution, correctText, onContinue }) {
    const steps = [];

    if (solution) {
        if (solution.logic)        steps.push({ icon: <Lightbulb size={16} />, label: 'Logic',       text: solution.logic });
        if (solution.calculation)  steps.push({ icon: <Zap size={16} />,       label: 'Working',     text: solution.calculation });
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

    if (steps.length === 0) {
        steps.push({ icon: <Target size={16} />, label: 'Answer', text: correctText });
    }

    return (
        <>
            <div className="mcq-popup-backdrop" />
            <div className="mcq-solution-popup">
                <div className="mcq-popup-header">
                    <div className="mcq-popup-icon-wrap wrong">
                        <XCircle size={22} />
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

                <button className="mcq-popup-continue btn-toy-green" onClick={onContinue}>
                    <div className="btn-toy-gloss" />
                    <span>Continue <ChevronRight size={18} strokeWidth={3} /></span>
                </button>
            </div>
        </>
    );
}

// ── Success Flash ─────────────────────────────────────────────────
export function SuccessFlash({ pointsLabel, onContinue }) {
    return (
        <div className="mcq-success-flash">
            <div className="mcq-success-inner">
                <div className="mcq-success-burst">🎯</div>
                <div className="mcq-success-label">CORRECT!</div>
                {pointsLabel && <div className="mcq-success-pts">{pointsLabel}</div>}
            </div>
            <button className="mcq-popup-continue btn-toy-green" onClick={onContinue}>
                <div className="btn-toy-gloss" />
                <span>Continue <ChevronRight size={18} strokeWidth={3} /></span>
            </button>
        </div>
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
    onContinue 
}) {
    const isLocked = phase !== 'idle';

    return (
        <div className="mcq-world-root" style={{ '--sub-theme-bg': theme.bg, '--sub-theme-border': theme.border }}>
            {/* ── Question bubble ── */}
            <div className="mcq-q-card">
                <div className="toy-card-gloss" />
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

            {/* ── Overlays ── */}
            {phase === 'correct' && (
                <SuccessFlash
                    pointsLabel={data.points ? `+${data.points} pts` : null}
                    onContinue={onContinue}
                />
            )}

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
