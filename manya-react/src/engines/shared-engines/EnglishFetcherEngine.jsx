import React, { useState, useEffect } from 'react';
import { Check, X, ArrowRight, Lightbulb } from 'lucide-react';
import { fetchEnglishQuestions } from '../../services/englishMockDB';

/**
 * MANYA ENGLISH FETCHER ENGINE
 * ----------------------------
 * A premium React component that fetches MCQs and orchestrates the practice flow.
 * Placeholders for the real DB fetcher.
 */
export default function EnglishFetcherEngine({ data, onComplete, onResult }) {
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);

    const topicId = data?.topic || 'default';

    useEffect(() => {
        const qData = fetchEnglishQuestions(topicId);
        setQuestions(qData);
    }, [topicId]);

    const handleAnswer = (option) => {
        if (isAnswered) return;
        setSelectedOption(option);
        setIsAnswered(true);
        if (option === questions[currentIdx].answer) {
            setScore(s => s + 1);
            window.ManyaAudio?.success?.();
        } else {
            window.ManyaAudio?.error?.();
        }
        setTimeout(() => setShowExplanation(true), 500);
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setShowExplanation(false);
        } else {
            // End of practice
            const finalScore = score + (selectedOption === questions[currentIdx].answer ? 1 : 0);
            onResult?.({
                isCorrect: finalScore === questions.length,
                score: finalScore,
                total: questions.length,
                type: 'practice'
            });
            onComplete?.();
        }
    };

    if (questions.length === 0) return null;

    const q = questions[currentIdx];

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-xl bg-[var(--bg-main)] rounded-[2.5rem] shadow-2xl border border-white/10 p-8 relative overflow-hidden">
                
                {/* Progress Mini-Dots */}
                <div className="flex gap-2 justify-center mb-10">
                    {questions.map((_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentIdx ? 'bg-[var(--biome-color)] w-8' : (i < currentIdx ? 'bg-[var(--biome-color)] opacity-40' : 'bg-slate-200')}`} />
                    ))}
                </div>

                <div className="mb-4 text-[var(--biome-color)] font-black text-xs tracking-widest uppercase opacity-60">
                    Question {currentIdx + 1} of {questions.length}
                </div>
                
                <h2 className="text-2xl font-bold text-[var(--text-main)] mb-10 leading-snug">
                    {q.question}
                </h2>

                <div className="grid gap-4 w-full">
                    {q.options.map((opt, i) => {
                        const isCorrect = opt === q.answer;
                        const isSelected = opt === selectedOption;
                        let stateStyles = "bg-slate-50 border-slate-200 hover:border-[var(--biome-color)] hover:shadow-lg";
                        
                        if (isAnswered) {
                            if (isCorrect) stateStyles = "bg-emerald-500/10 border-emerald-500 text-emerald-700 shadow-xl shadow-emerald-500/5";
                            else if (isSelected) stateStyles = "bg-rose-500/10 border-rose-500 text-rose-700 opacity-60";
                            else stateStyles = "opacity-40 grayscale-[0.5]";
                        }

                        return (
                            <button
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                disabled={isAnswered}
                                className={`group relative w-full h-16 rounded-2xl border-2 transition-all flex items-center px-6 text-lg font-bold ${stateStyles}`}
                            >
                                <span className="flex-1 text-left">{opt}</span>
                                {isAnswered && isCorrect && <Check size={24} className="text-emerald-500" />}
                                {isAnswered && isSelected && !isCorrect && <X size={24} className="text-rose-500" />}
                            </button>
                        );
                    })}
                </div>

                {showExplanation && (
                    <div className="mt-10 p-6 bg-[var(--biome-color)]/5 border border-[var(--biome-color)]/20 rounded-3xl animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[var(--biome-color)] shrink-0">
                                <Lightbulb size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-[var(--biome-color)] text-xs tracking-widest uppercase mb-1">Coach Tip</h4>
                                <p className="text-[var(--text-sub)] font-bold text-sm leading-relaxed">{q.explanation}</p>
                            </div>
                        </div>
                    </div>
                )}

                {isAnswered && (
                    <button 
                        onClick={nextQuestion}
                        className="mt-10 w-full h-16 bg-[var(--text-main)] text-[var(--bg-main)] rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-black/5"
                    >
                        {currentIdx === questions.length - 1 ? 'FINISH' : 'NEXT QUESTION'}
                        <ArrowRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}
