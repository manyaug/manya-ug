import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';

/**
 * MCQ STANDALONE ENGINE (React v1.0)
 * ---------------------------------
 * A premium, reactive version of the legacy MCQ engine.
 */
const MCQStandaloneEngine = ({ data, onComplete, onResult }) => {
    const [selected, setSelected] = useState(null);
    const [status, setSelectedStatus] = useState(null); // 'correct' | 'wrong' | null
    const [showFeedback, setShowFeedback] = useState(false);
    const [isResolved, setIsResolved] = useState(false);

    // Filter valid options (A_Option1, B_Option2, etc.)
    const options = Object.entries(data.options || {})
        .filter(([key, val]) => val && val !== "null" && val !== "")
        .map(([key, val]) => ({
            id: key,
            letter: key.split('_')[1] || key[0],
            text: val
        }));

    const handleLevelCheck = (choiceId) => {
        if (isResolved) return;
        
        setSelected(choiceId);
        const isCorrect = choiceId === data.correct;

        if (isCorrect) {
            setSelectedStatus('correct');
            setShowFeedback(true);
            setIsResolved(true);
            
            // Audio feedback
            window.ManyaAudio?.success();

            // Notify parent
            if (onResult) {
                onResult({
                    isCorrect: true,
                    score: data.points || 1,
                    total: data.points || 1,
                    type: 'mcq'
                });
            }

            // Small delay before allowing "Continue" if needed, 
            // but for MCQ we can usually just enable the parent button.
            // QuestRunner handles the "Immersive" check to show its own footer.
        } else {
            setSelectedStatus('wrong');
            setShowFeedback(true);
            window.ManyaAudio?.error();
            
            // Reset "wrong" state after a pulse
            setTimeout(() => {
                setSelectedStatus(null);
            }, 1000);
        }
    };

    return (
        <div className="mcq-pro-layout animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Question Card */}
            <div className="mcq-q-bubble shadow-xl shadow-slate-200/50">
                <h2 className="font-black text-slate-800 leading-tight">
                    {data.text}
                </h2>
            </div>

            {/* Hint Box (if available and wrong answer selected) */}
            {data.hint && (
                <div className={`mcq-hint-card transition-all duration-500 overflow-hidden flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-3xl mb-6 w-full max-w-[450px] ${status === 'wrong' || (!isResolved && selected) ? 'opacity-100 translate-y-0' : 'opacity-60 grayscale'}`}>
                    <Lightbulb size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[13px] font-extrabold text-amber-900/80 leading-relaxed">
                        {data.hint}
                    </div>
                </div>
            )}

            {/* Options Grid */}
            <div className="mcq-options-grid">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        className={`mcq-btn-elite transition-all duration-200 ${
                            selected === opt.id 
                                ? (opt.id === data.correct ? 'correct' : (selected === opt.id && status === 'wrong' ? 'wrong' : ''))
                                : ''
                        } ${isResolved && opt.id !== data.correct ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                        onClick={() => handleLevelCheck(opt.id)}
                        disabled={isResolved}
                    >
                        <div className="elite-letter">
                            {opt.letter}
                        </div>
                        <div className="elite-text">
                            {opt.text}
                        </div>
                    </button>
                ))}
            </div>

            {/* Dynamic Feedback Box */}
            {showFeedback && (
                <div className={`msg-box animate-in zoom-in duration-300 ${isResolved ? 'success' : 'error'}`}>
                    <div className="flex items-center justify-center gap-2">
                        {isResolved ? (
                            <>
                                <CheckCircle2 size={18} />
                                <span>EXCELLENT! +{data.points} PTS</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={18} />
                                <span>THINK AGAIN...</span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Result Feedback Animation / Overlay */}
            {isResolved && (
                <div className="mt-8 animate-in fade-in zoom-in duration-500 text-center">
                    <button 
                        className="manya-btn-pro w-full shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 mb-2"
                        onClick={onComplete}
                    >
                        CONTINUE →
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60">
                        Step Complete
                    </p>
                </div>
            )}
        </div>
    );
};

export default MCQStandaloneEngine;
