import React, { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, BookOpen, Zap, Target } from 'lucide-react';
import '../../styles/mcq-engine.css';

/**
 * MCQ STANDALONE ENGINE — v3.0 (World-Class Edition)
 * ────────────────────────────────────────────────────
 * ✅ Correct: Instant celebration, no solution shown.
 * ❌ Wrong:   Highlight wrong + correct, then show
 *            step-by-step solution popup (no scroll).
 */

// ── Parse solution safely ──────────────────────────────────────────
const parseSolution = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        const parsed = JSON.parse(raw);
        return parsed;
    } catch {
        // Plain text fallback
        return { explanation: raw };
    }
};

// ── Solution Popup Component ─────────────────────────────────────
function SolutionPopup({ solution, correctText, onContinue }) {
    const steps = [];

    if (solution) {
        if (solution.logic)        steps.push({ icon: <Lightbulb size={16} />, label: 'Logic',       text: solution.logic });
        if (solution.calculation)  steps.push({ icon: <Zap size={16} />,       label: 'Working',     text: solution.calculation });
        if (solution.answer)       steps.push({ icon: <Target size={16} />,    label: 'Answer',      text: solution.answer });
        if (solution.explanation)  steps.push({ icon: <BookOpen size={16} />,  label: 'Explanation', text: solution.explanation });

        // Handle arbitrary step arrays: [{step, explanation}]
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

    // If nothing parsed, just show the correct answer
    if (steps.length === 0) {
        steps.push({ icon: <Target size={16} />, label: 'Answer', text: correctText });
    }

    return (
        <>
            {/* Backdrop */}
            <div className="mcq-popup-backdrop" />

            {/* Panel */}
            <div className="mcq-solution-popup">
                {/* Header */}
                <div className="mcq-popup-header">
                    <div className="mcq-popup-icon-wrap wrong">
                        <XCircle size={22} />
                    </div>
                    <div>
                        <div className="mcq-popup-title">Not quite!</div>
                        <div className="mcq-popup-subtitle">Here's how to solve it</div>
                    </div>
                </div>

                {/* Correct answer chip */}
                <div className="mcq-correct-chip">
                    <CheckCircle2 size={14} />
                    <span>Correct answer: <strong>{correctText}</strong></span>
                </div>

                {/* Steps */}
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

                {/* Continue button */}
                <button className="mcq-popup-continue btn-toy-green" onClick={onContinue}>
                    <div className="btn-toy-gloss" />
                    <span>Continue <ChevronRight size={18} strokeWidth={3} /></span>
                </button>
            </div>
        </>
    );
}

// ── Success Flash ─────────────────────────────────────────────────
function SuccessFlash({ pointsLabel, onContinue }) {
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

// ── Main Engine ───────────────────────────────────────────────────
const MCQStandaloneEngine = ({ data, onComplete, onResult, subject }) => {
    const [selected, setSelected]         = useState(null);
    const [phase, setPhase]               = useState('idle'); // idle | checking | correct | wrong | show-solution

    // Build options list
    const options = (() => {
        // Support both array and object formats
        if (Array.isArray(data.options)) {
            return data.options.map((text, i) => ({
                id: text,
                letter: String.fromCharCode(65 + i),
                text
            }));
        }
        return Object.entries(data.options || {})
            .filter(([, v]) => v && v !== 'null' && v !== '')
            .map(([key, val]) => ({
                id: key,
                letter: key.split('_')[1] || key[0],
                text: val
            }));
    })();

    // Identify correct option text for display
    const correctId   = data.correct || data.answer;
    const correctText = correctOpt?.text || correctId || '';
    const solution    = parseSolution(data.explanation);

    // Dynamic Theme Tokens
    const getTheme = (subj) => {
        switch (subj?.toLowerCase()) {
            case 'math':    return { bg: '#8b5cf6', border: '#7c3aed' };
            case 'science': return { bg: '#2dd4bf', border: '#0d9488' };
            case 'sst':     return { bg: '#f59e0b', border: '#b45309' };
            case 'english': return { bg: '#f472b6', border: '#db2777' };
            default:        return { bg: '#f59e0b', border: '#b45309' }; // Amber
        }
    };
    const theme = getTheme(subject || data.subject);

    const handlePick = useCallback((opt) => {
        if (phase !== 'idle') return;
        setSelected(opt.id);
        setPhase('checking');

        const isCorrect = opt.id === correctId || opt.text === correctId;

        if (isCorrect) {
            window.ManyaAudio?.success?.();
            setPhase('correct');
            onResult?.({ isCorrect: true, score: data.points || 1, total: data.points || 1, type: 'mcq' });
        } else {
            window.ManyaAudio?.error?.();
            // Brief wrong flash, then open solution panel
            setTimeout(() => setPhase('wrong'), 100);
            setTimeout(() => setPhase('show-solution'), 950);
            onResult?.({ isCorrect: false, score: 0, total: data.points || 1, type: 'mcq' });
        }
    }, [phase, correctId, data.points, onResult]);

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
                    const isCorrect = opt.id === correctId || opt.text === correctId;

                    let state = '';
                    if (phase === 'checking' && isThis) state = 'selected';
                    if ((phase === 'wrong' || phase === 'show-solution') && isThis)  state = 'wrong';
                    if ((phase === 'wrong' || phase === 'show-solution') && isCorrect) state = 'reveal-correct';
                    if (phase === 'correct' && isThis) state = 'correct';

                    return (
                        <button
                            key={opt.id}
                            className={`mcq-option-btn ${state}`}
                            onClick={() => handlePick(opt)}
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
                    onContinue={onComplete}
                />
            )}

            {phase === 'show-solution' && (
                <SolutionPopup
                    solution={solution}
                    correctText={correctText}
                    onContinue={onComplete}
                />
            )}
        </div>
    );
};

export default MCQStandaloneEngine;
