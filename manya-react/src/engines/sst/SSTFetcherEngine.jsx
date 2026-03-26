import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ArrowRight, Lightbulb, Globe, Compass, Zap, Timer, Trophy, RotateCcw } from 'lucide-react';
import { fetchSstQuestions } from '../../services/sstMockDB';
import { generateAdaptiveQuest, selectGameMode } from '../../services/adaptiveEngine';
import {
    getSession, updateSessionAfterAnswer, recordAnswer,
    awardGems, resetSession, saveQuestCompletion
} from '../../services/userStateService';
import { calculateFrustration, calculateHesitation } from '../../services/psychTracker';
import {
    saveNodeCompletion, trackWrongAnswer, resolveRephrased,
    setJustFinished, UNLOCK_THRESHOLDS, NODE_ORDER
} from '../../services/questProgressService';

/**
 * MANYA SST FETCHER ENGINE v3.0 (Adaptive + Variant Retry + Mastery Save)
 * ========================================================================
 * - Wrong answer → queues rephrased variant for retry within same quest
 * - On completion: saves mastery via questProgressService
 * - Shows completion screen with unlock status or retry prompt
 */
export default function SSTFetcherEngine({ data, onComplete, onResult }) {
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hintUsed, setHintUsed] = useState(false);
    const [answerChanged, setAnswerChanged] = useState(false);
    const [changeCount, setChangeCount] = useState(0);
    const [questMeta, setQuestMeta] = useState(null);
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);

    // All questions from bank (for variant lookup)
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'sst';
    const questKey = data?.questKey || `sst/${topicId}`;

    useEffect(() => {
        const loadQuestions = async () => {
            setIsLoading(true);
            resetSession();

            // 1. Fetch ALL questions from the bank
            const allQuestions = await fetchSstQuestions(topicId);
            allBankRef.current = allQuestions;

            // 2. Run them through the adaptive engine, passing resources for recap injection
            const quest = generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, data?.resources || []);
            setQuestions(quest.questions);
            setQuestMeta(quest);
            setIsLoading(false);

            console.log(`🎯 [SST Adaptive v3] ${nodeType} quest:`, {
                length: quest.questLength,
                gameMode: quest.gameMode,
            });
        };
        loadQuestions();
    }, [topicId, nodeType]);

    /**
     * Find a rephrased variant of a question in the bank.
     * Looks for questions testing the same concept with different wording.
     * Uses difficulty progression: E → M → H as "variant levels".
     */
    const findRephrased = (wrongQuestion) => {
        const bank = allBankRef.current;
        // Strategy 1: Find a question with the same base ID pattern but different difficulty
        const baseId = wrongQuestion.id?.replace(/-V\d+$/, '') || '';
        const wrongDifficulty = wrongQuestion.difficulty || 'E';

        // Difficulty progression map
        const nextDiff = { 'E': 'E', 'M': 'E', 'H': 'M' }; // If wrong, give an EASIER version
        const targetDiff = nextDiff[wrongDifficulty] || 'E';

        // Find a question from the same subtopic with matching difficulty, not already in queue
        const usedIds = new Set(questions.map(q => q.id));
        const candidate = bank.find(q =>
            q.id !== wrongQuestion.id &&
            !usedIds.has(q.id) &&
            q.subtopic === wrongQuestion.subtopic &&
            q.difficulty === targetDiff
        );

        if (candidate) return { ...candidate, isRephrased: true, originalId: wrongQuestion.id };

        // Strategy 2: Just pick any unused question from same subtopic
        const fallback = bank.find(q =>
            q.id !== wrongQuestion.id &&
            !usedIds.has(q.id) &&
            q.subtopic === wrongQuestion.subtopic
        );

        if (fallback) return { ...fallback, isRephrased: true, originalId: wrongQuestion.id };

        return null; // No rephrase available
    };

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

            // If this was a rephrased question, resolve it
            if (q.isRephrased) {
                resolveRephrased(subject, q.originalId);
            }
        } else {
            window.ManyaAudio?.error?.();

            // Track wrong answer for variant retry
            trackWrongAnswer(subject, q.id);

            // Queue a rephrased version at the end of the quest
            const rephrased = findRephrased(q);
            if (rephrased) {
                setQuestions(prev => [...prev, rephrased]);
                console.log(`🔄 [Variant Retry] Queued rephrased Q after wrong: ${rephrased.id}`);
            }
        }

        const session = updateSessionAfterAnswer(isCorrect, hintUsed, answerChanged, timeSpentMs);

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

        const hesitation = calculateHesitation({ answerChanged, changeCount, timeSpentMs, hintUsed });
        if (hesitation.level === 'high') {
            console.log('😰 High hesitation:', hesitation.events);
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
        } else if (!isFinished) {
            // ── QUEST COMPLETE ──
            setIsFinished(true); // LOCK IT
            const finalScore = score;
            const mastery = Math.round((finalScore / questions.length) * 100);

            // Save to questProgressService (updates node status + unlocks next)
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);

            // Signal for QuestPathView animation
            setJustFinished({
                subject,
                questKey,
                nodeType,
                mastery,
                unlocked: result.unlocked,
                nextNode: result.nextNode
            });

            // Also save to userStateService
            saveQuestCompletion(questKey, mastery);

            setCompletionResult({ mastery, ...result, score: finalScore, total: questions.length });
            setShowCompletion(true);

            console.log(`🏆 [SST] ${nodeType} complete:`, { mastery, ...result });
        }
    };

    const handleFinish = () => {
        const mastery = completionResult?.mastery || 0;
        onResult?.({
            isCorrect: mastery >= 60,
            score: completionResult?.score || score,
            total: completionResult?.total || questions.length,
            mastery,
            gemsEarned,
            type: 'adaptive_sst',
        });
        onComplete?.();
    };

    const showHint = () => {
        if (!hintUsed) {
            setHintUsed(true);
            setShowExplanation(true);
        }
    };

    // ── LOADING ──
    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (questions.length === 0) return (
        <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">
            No questions found for this topic.
        </div>
    );

    // ── COMPLETION SCREEN ──
    if (showCompletion && completionResult) {
        const { mastery, unlocked, nextNode, needsRetry, threshold, attempts } = completionResult;
        const isPassing = mastery >= 60;

        return (
            <div className="flex-1 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 text-center">
                    {/* Emoji header */}
                    <div style={{ fontSize: '64px', marginBottom: '12px' }}>
                        {mastery >= 85 ? '🏆' : mastery >= 70 ? '⭐' : mastery >= 60 ? '👍' : '💪'}
                    </div>

                    <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}>
                        {mastery >= 85 ? 'Outstanding!' : mastery >= 70 ? 'Well Done!' : mastery >= 60 ? 'Good Job!' : 'Keep Trying!'}
                    </h2>

                    <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '20px' }}>
                        {nodeType === 'WARMUP' ? 'Warm-up' : nodeType} Complete
                    </p>

                    {/* Mastery Ring */}
                    <div style={{
                        width: '120px', height: '120px', margin: '0 auto 20px',
                        borderRadius: '50%', position: 'relative',
                        background: `conic-gradient(${isPassing ? '#10b981' : '#ef4444'} ${mastery * 3.6}deg, #e2e8f0 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%',
                            background: 'white', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexDirection: 'column'
                        }}>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: isPassing ? '#10b981' : '#ef4444' }}>
                                {mastery}%
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>MASTERY</span>
                        </div>
                    </div>

                    {/* Score details */}
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: '24px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>
                                {completionResult.score}/{completionResult.total}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>CORRECT</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: 900, color: '#f59e0b' }}>
                                +{gemsEarned}
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>GEMS</div>
                        </div>
                    </div>

                    {/* Unlock status */}
                    {unlocked && nextNode && (
                        <div style={{
                            background: '#f0fdf4', border: '2px solid #86efac',
                            borderRadius: '16px', padding: '12px', marginBottom: '16px'
                        }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>
                                🔓 {nextNode} Unlocked!
                            </span>
                        </div>
                    )}

                    {needsRetry && (
                        <div style={{
                            background: '#fef2f2', border: '2px solid #fca5a5',
                            borderRadius: '16px', padding: '12px', marginBottom: '16px'
                        }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626' }}>
                                Need {threshold}% to unlock {nextNode} — Try again!
                            </span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        {needsRetry && (
                            <button
                                onClick={() => {
                                    // Reset and retry
                                    setShowCompletion(false);
                                    setCompletionResult(null);
                                    setCurrentIdx(0);
                                    setScore(0);
                                    setGemsEarned(0);
                                    setSelectedOption(null);
                                    setIsAnswered(false);
                                    setShowExplanation(false);
                                    setIsLoading(true);
                                    resetSession();
                                    // Reload questions
                                    (async () => {
                                        const allQ = await fetchSstQuestions(topicId);
                                        allBankRef.current = allQ;
                                        const quest = generateAdaptiveQuest(allQ, nodeType, subject, questKey);
                                        setQuestions(quest.questions);
                                        setQuestMeta(quest);
                                        setIsLoading(false);
                                    })();
                                }}
                                style={{
                                    flex: 1, height: '48px', borderRadius: '14px',
                                    background: '#f59e0b', color: 'white', border: 'none',
                                    fontWeight: 900, fontSize: '12px', letterSpacing: '1px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <RotateCcw size={14} /> TRY AGAIN
                            </button>
                        )}
                        <button
                            onClick={handleFinish}
                            style={{
                                flex: 1, height: '48px', borderRadius: '14px',
                                background: '#0f172a', color: 'white', border: 'none',
                                fontWeight: 900, fontSize: '12px', letterSpacing: '1px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: '6px'
                            }}
                        >
                            {needsRetry ? 'EXIT' : 'CONTINUE'} <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── QUESTION UI ──
    const q = questions[currentIdx];
    if (!q) return null;
    
    const session = getSession();
    const frustration = calculateFrustration(session);

    // ── STUDY RECAP VIEW ──
    if (q.type === 'STUDY_RECAP') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border-l-8 border-l-blue-500 p-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                            <Lightbulb size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">Quick Recap</h2>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Time to power up!</p>
                        </div>
                    </div>

                    <p className="text-lg font-bold text-slate-600 mb-8 leading-relaxed">
                        You've been working hard! Let's take a quick moment to review this concept more deeply before we continue.
                    </p>

                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-10 flex items-center gap-4">
                         <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                            <ArrowRight size={20} />
                         </div>
                         <span className="font-bold text-blue-800 text-sm">
                             Loading simulation: <code className="bg-white/50 px-2 py-0.5 rounded">{q.file}</code>
                         </span>
                    </div>

                    <button
                        onClick={nextQuestion}
                        className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-98 transition-all shadow-xl shadow-blue-600/20"
                    >
                        I'M READY TO CONTINUE <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-amber-100 p-8 relative overflow-hidden">

                <div className="absolute -top-10 -right-10 opacity-5 text-amber-900 rotate-12">
                   <Globe size={240} />
                </div>

                {showGemToast && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-black animate-bounce z-20 flex items-center gap-1">
                        <Trophy size={12} /> +{gemsEarned} gems
                    </div>
                )}

                {/* Rephrased question indicator */}
                {q.isRephrased && (
                    <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5 font-bold mb-3 text-center">
                        🔄 Let's try this concept again with different wording
                    </div>
                )}

                {frustration.level === 'high' && (
                    <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 font-bold mb-3 text-center">
                        💪 Take your time — you're doing great!
                    </div>
                )}

                {/* Progress Bar */}
                <div className="flex gap-2 justify-center mb-10 overflow-x-auto no-scrollbar">
                    {questions.map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 shrink-0 ${i === currentIdx ? 'bg-amber-500 w-6' : (i < currentIdx ? 'bg-amber-500 opacity-40' : 'bg-slate-200')}`} />
                    ))}
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                        <Compass size={14} />
                    </div>
                    <div className="text-amber-600 font-black text-[10px] tracking-widest uppercase opacity-80">
                        {nodeType === 'WARMUP' ? '🌅 Warm-up' : nodeType === 'MASTERY' ? '⚡ Mastery' : 'Concept Mastery'} • {currentIdx + 1} / {questions.length}
                    </div>
                    {questMeta?.gameMode === 'quickfire' && (
                        <div className="ml-auto flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                            <Zap size={10} /> QUICKFIRE
                        </div>
                    )}
                </div>

                <h2 className="text-xl font-bold text-slate-800 mb-8 leading-snug relative z-10">
                    {q.question}
                </h2>

                <div className="grid gap-3 w-full relative z-10">
                    {q.options.map((opt, i) => {
                        const isCorrect = opt === q.answer;
                        const isSelected = opt === selectedOption;
                        let stateStyles = "bg-slate-50 border-slate-200 hover:border-amber-400 hover:shadow-md";

                        if (isAnswered) {
                            if (isCorrect) stateStyles = "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm";
                            else if (isSelected) stateStyles = "bg-rose-50 border-rose-500 text-rose-700 opacity-80";
                            else stateStyles = "opacity-40 grayscale-[0.5]";
                        }

                        return (
                            <button
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                disabled={isAnswered}
                                className={`group relative w-full h-14 rounded-xl border-2 transition-all flex items-center px-5 text-sm font-bold ${stateStyles}`}
                            >
                                <span className="flex-1 text-left">{opt}</span>
                                {isAnswered && isCorrect && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Check size={14} /></div>}
                                {isAnswered && isSelected && !isCorrect && <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white"><X size={14} /></div>}
                            </button>
                        );
                    })}
                </div>

                {!isAnswered && !hintUsed && q.explanation && (
                    <button onClick={showHint} className="mt-4 text-xs text-amber-500 font-bold flex items-center gap-1 mx-auto opacity-60 hover:opacity-100 transition-opacity">
                        <Lightbulb size={12} /> Use Hint (−gems)
                    </button>
                )}

                {showExplanation && (
                    <div className="mt-8 p-5 bg-amber-50/50 border border-amber-200/50 rounded-2xl animate-in slide-in-from-bottom duration-500">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-white shrink-0">
                                <Lightbulb size={16} />
                            </div>
                            <div>
                                <h4 className="font-black text-amber-600 text-[10px] tracking-widest uppercase mb-1 flex items-center gap-2">
                                    {hintUsed && !isAnswered ? 'Hint' : 'Explanation'}
                                </h4>
                                <p className="text-slate-600 font-bold text-[13px] leading-relaxed italic">"{q.explanation || 'Think about the location and context.'}"</p>
                            </div>
                        </div>
                    </div>
                )}

                {isAnswered && (
                    <button
                        onClick={nextQuestion}
                        className="mt-8 w-full h-14 bg-slate-900 text-white rounded-xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-black/10"
                    >
                        {currentIdx === questions.length - 1 ? 'FINISH QUEST' : 'NEXT STEP'}
                        <ArrowRight size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
