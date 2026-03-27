import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ArrowRight, Lightbulb, BookOpen, Zap, Trophy } from 'lucide-react';
import { fetchEnglishQuestions } from '../../services/englishMockDB';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import {
    getSession, updateSessionAfterAnswer, recordAnswer,
    awardGems, resetSession, saveQuestCompletion
} from '../../services/userStateService';
import { calculateFrustration, calculateHesitation } from '../../services/psychTracker';

/**
 * MANYA ENGLISH FETCHER ENGINE v2.0 (Adaptive)
 * -----------------------------------------------
 * Powered by the Adaptive Engine with frustration tracking,
 * gem rewards, and dynamic quest length.
 */
export default function EnglishFetcherEngine({ data, onComplete, onResult }) {
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [hintUsed, setHintUsed] = useState(false);
    const [answerChanged, setAnswerChanged] = useState(false);
    const [changeCount, setChangeCount] = useState(0);
    const [questMeta, setQuestMeta] = useState(null);
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);

    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'english';
    const questKey = data?.questKey || `english/${topicId}`;

    useEffect(() => {
        const loadQuestions = async () => {
            resetSession();
            const allQuestions = await fetchEnglishQuestions(topicId);
            if (allQuestions.length > 0) {
                const quest = generateAdaptiveQuest(allQuestions, nodeType, subject, questKey);
                setQuestions(quest.questions);
                setQuestMeta(quest);

                console.log(`📖 [English Adaptive] ${nodeType} quest generated:`, {
                    length: quest.questLength,
                    gameMode: quest.gameMode,
                });
            } else {
                console.warn(`⚠️ No English questions loaded for ${topicId}`);
            }
        };

        loadQuestions();
    }, [topicId, nodeType]);

    const handleAnswer = (option) => {
        if (isAnswered) return;

        if (firstSelection.current && firstSelection.current !== option) {
            setAnswerChanged(true);
            setChangeCount(c => c + 1);
        }
        if (!firstSelection.current) firstSelection.current = option;

        setSelectedOption(option);
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = option === q.answer;
        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            window.ManyaAudio?.success?.();
        } else {
            window.ManyaAudio?.error?.();
        }

        updateSessionAfterAnswer(isCorrect, hintUsed, answerChanged, timeSpentMs);
        recordAnswer(subject, {
            questionId: q.id,
            isCorrect,
            selectedAnswer: option,
            correctAnswer: q.answer,
            timeSpentMs,
            hintUsed,
            answerChanged,
            pool: 'exam',
        });

        const gems = awardGems(subject, isCorrect, hintUsed);
        if (gems.subjectGems > 0) {
            setGemsEarned(g => g + gems.subjectGems);
            setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
        }

        setTimeout(() => setShowExplanation(true), 500);
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setShowExplanation(false);
            setHintUsed(false);
            setAnswerChanged(false);
            setChangeCount(0);
            firstSelection.current = null;
            questionStartTime.current = Date.now();
        } else {
            const finalScore = score;
            const mastery = Math.round((finalScore / questions.length) * 100);
            saveQuestCompletion(questKey, mastery);
            onResult?.({
                isCorrect: mastery >= 60,
                score: finalScore,
                total: questions.length,
                mastery,
                gemsEarned,
                type: 'adaptive_english',
            });
            onComplete?.();
        }
    };

    const showHint = () => {
        if (!hintUsed) {
            setHintUsed(true);
            setShowExplanation(true);
        }
    };

    if (questions.length === 0) return null;

    const q = questions[currentIdx];
    const session = getSession();
    const frustration = calculateFrustration(session);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-xl bg-[var(--bg-main)] rounded-[2.5rem] shadow-2xl border border-white/10 p-8 relative overflow-hidden">

                {/* Gem Toast */}
                {showGemToast && (
                    <div className="absolute top-4 right-4 bg-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-black animate-bounce z-20 flex items-center gap-1">
                        <Trophy size={12} /> +{gemsEarned} gems
                    </div>
                )}

                {/* Frustration encouragement */}
                {frustration.level === 'high' && (
                    <div className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-1.5 font-bold mb-3 text-center">
                        💪 Take your time — you're doing great!
                    </div>
                )}

                {/* Progress Mini-Dots */}
                <div className="flex gap-2 justify-center mb-10">
                    {questions.map((_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentIdx ? 'bg-[var(--biome-color)] w-8' : (i < currentIdx ? 'bg-[var(--biome-color)] opacity-40' : 'bg-slate-200')}`} />
                    ))}
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                        <BookOpen size={14} />
                    </div>
                    <div className="text-[var(--biome-color)] font-black text-xs tracking-widest uppercase opacity-60">
                        {nodeType === 'WARMUP' ? '🌅 Warm-up' : nodeType === 'MASTERY' ? '⚡ Mastery' : `Question ${currentIdx + 1} of ${questions.length}`}
                    </div>
                    {questMeta?.gameMode === 'quickfire' && (
                        <div className="ml-auto flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                            <Zap size={10} /> QUICKFIRE
                        </div>
                    )}
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

                {/* Hint Button */}
                {!isAnswered && !hintUsed && q.explanation && (
                    <button onClick={showHint} className="mt-4 text-xs text-indigo-400 font-bold flex items-center gap-1 mx-auto opacity-60 hover:opacity-100 transition-opacity">
                        <Lightbulb size={12} /> Use Hint (−gems)
                    </button>
                )}

                {showExplanation && (
                    <div className="mt-10 p-6 bg-[var(--biome-color)]/5 border border-[var(--biome-color)]/20 rounded-3xl animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[var(--biome-color)] shrink-0">
                                <Lightbulb size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-[var(--biome-color)] text-xs tracking-widest uppercase mb-1">
                                    {hintUsed && !isAnswered ? 'Hint' : 'Coach Tip'}
                                </h4>
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
