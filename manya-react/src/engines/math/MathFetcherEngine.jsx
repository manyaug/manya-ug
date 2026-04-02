import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ArrowRight, Lightbulb, Globe, Compass, Zap, Timer, Trophy, RotateCcw, Search, Puzzle, AlertCircle } from 'lucide-react';
import { fetchMathQuestions } from '../../services/mathMockDB';
import { syncService } from '../../services/syncService';
import { useDispatch, useSelector } from 'react-redux';
import { 
    updateProfile, 
    awardGems, 
    addXP,
    resetSession, 
    updateSessionAfterAnswer 
} from '../../store/userSlice';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../utils/manyaDB';
import { calculateFrustration, calculateHesitation } from '../../services/psychTracker';
import { conceptMasteryService } from '../../services/conceptMasteryService';
import { achievementService } from '../../services/achievementService';
import { parseQuestionId } from '../../utils/questionParser';
import AchievementUnlocked from '../../components/AchievementUnlocked';
import {
    saveNodeCompletion, trackWrongAnswer, resolveRephrased,
    setJustFinished, UNLOCK_THRESHOLDS, NODE_ORDER
} from '../../services/questProgressService';

import { preloadCurriculum } from '../../services/curriculumService';
import UniversalGlobeEngine from '../shared-engines/UniversalGlobeEngine';
import ImageHotspotsEngine from '../shared-engines/ImageHotspotsEngine';
import GalleryStudyEngine from '../shared-engines/GalleryStudyEngine';
import { loadQuestSteps } from '../../utils/questLoader';
import { calculateUSP } from '../../utils/scoringUtility';

// Specialized Math Engines
import SetTheoryEngine from './SetTheoryEngine';
import SetStudyEngine from './SetStudyEngine';
import VennProbEngine from './VennProbEngine';
import SubsetGameEngine from './SubsetGameEngine';
import PizzaGameEngine from './PizzaGameEngine';
import BinaryGameEngine from './BinaryGameEngine';
import VennSpotlightEngine from './VennSpotlightEngine';
import SetClassifierEngine from './SetClassifierEngine';

/**
 * SIMULATOR BRIDGE
 * Connects the MCQ-based Fetcher to specialized Simulation Engines.
 */
const SimulatorBridge = ({ step, onComplete, onAttempt }) => {
    // ─── DATA FLATTENING (v3.7) ───
    const simData = step?.data?.questions ? step.data : (step?.data || step);
    const resultRef = useRef(null);
    const finishedRef = useRef(false);

    if (!simData) return (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-rose-500 font-bold">
            <AlertCircle size={40} className="mb-4" />
            Simulation Load Failure
            <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg">Skip Simulation</button>
        </div>
    );

    const engineType = simData.engineType || simData.type || 'IMAGE_HOTSPOTS';

    const handleSimComplete = (results) => {
        // results may come from common engines; resultRef.current may come from specialized engines
        const finalResults = results || resultRef.current;

        if (finishedRef.current) return;
        finishedRef.current = true;
        
        console.log(`🎮 [SimulatorBridge] Simulation Complete. Raw Results:`, finalResults);
        
        // APPLY UNIFIED SCORING PROTOCOL (USP)
        const usp = calculateUSP({
            accuracy: finalResults?.accuracy ?? (finalResults?.score && finalResults?.total ? (finalResults.score / finalResults.total) : 1.0),
            mistakes: finalResults?.mistakes || 0,
            timeSpentMs: finalResults?.duration || finalResults?.timeSpentMs || 30000,
            engineType: engineType
        }, 'math');

        console.log(`📊 [SimulatorBridge] USP Mastery Score: ${usp.masteryScore}%`, usp);

        onComplete({
            success: true, 
            score: usp.masteryScore,
            usp: usp,
            simResults: finalResults
        });
    };

    const handleSimResult = (res) => {
        if (finishedRef.current) return; // Ignore updates after completion
        console.log(`📊 [SimulatorBridge] Engine sent result:`, res);
        resultRef.current = res;
    };

    const sharedProps = {
        data: simData,
        onComplete: handleSimComplete,
        onResult: handleSimResult,
        onAttempt // Forward attempt tracking to sub-engines
    };

    switch (engineType) {
        case 'GLOBE_TIME_ENGINE':
        case 'GLOBE_ENGINE':
        case 'UNIVERSAL_GLOBE':
            return <UniversalGlobeEngine {...sharedProps} />;
        
        case 'IMAGE_HOTSPOTS':
            return <ImageHotspotsEngine {...sharedProps} />;
        
        case 'GALLERY_STUDY':
            return <GalleryStudyEngine {...sharedProps} />;

        case 'SET_THEORY':
            return <SetTheoryEngine {...sharedProps} />;
        
        case 'MATH_STUDY':
            return <SetStudyEngine {...sharedProps} />;
        
        case 'VENN_PROB_ENGINE':
            return <VennProbEngine {...sharedProps} />;
        
        case 'SUBSET_GAME':
            return <SubsetGameEngine {...sharedProps} />;
        
        case 'PIZZA_GAME':
            return <PizzaGameEngine {...sharedProps} />;
        
        case 'BINARY_GAME':
            return <BinaryGameEngine {...sharedProps} />;
        
        case 'VENN_SPOTLIGHT':
            return <VennSpotlightEngine {...sharedProps} />;
        
        case 'SET_CLASSIFIER':
            return <SetClassifierEngine {...sharedProps} />;

        default:
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-500">
                    <Puzzle size={40} className="mb-4 opacity-20" />
                    <p className="font-bold">Unsupported Engine: {engineType}</p>
                    <button onClick={onComplete} className="mt-4 text-xs bg-slate-100 px-4 py-2 rounded-lg text-slate-900 font-black">CONTINUE QUEST</button>
                </div>
            );
    }
};

/**
 * MANYA MATH FETCHER ENGINE v3.5 (Adaptive + Variant Retry + Mastery Save)
 * ========================================================================
 * - Wrong answer → queues rephrased variant for retry within same quest
 * - On completion: saves mastery via questProgressService
 * - Shows completion screen with unlock status or retry prompt
 */
/**
 * SOLUTION DISPLAYER
 * Specialized component to parse and render step-by-step Math solutions.
 */
const SolutionDisplayer = ({ explanation }) => {
    if (!explanation) return <p className="text-white/60 text-[13px] italic">Detailed concept explanation coming soon.</p>;

    let parsed = null;
    try {
        if (explanation.trim().startsWith('{')) {
            parsed = JSON.parse(explanation);
        }
    } catch (e) {
        parsed = null;
    }

    if (parsed && (parsed.logic || parsed.calculation || parsed.answer)) {
        return (
            <div className="flex flex-col gap-4">
                {parsed.logic && (
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                            <Lightbulb size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400/60 mb-1">Logic</p>
                            <p className="text-white text-[14px] font-bold leading-relaxed">{parsed.logic}</p>
                        </div>
                    </div>
                )}
                {parsed.calculation && (
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                            <Zap size={14} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/60 mb-1">Steps</p>
                            <div className="text-white/90 text-[14px] font-medium leading-relaxed whitespace-pre-line bg-white/5 p-4 rounded-xl border border-white/5">
                                {parsed.calculation}
                            </div>
                        </div>
                    </div>
                )}
                {parsed.answer && (
                    <div className="flex gap-3 items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                            <Check size={14} strokeWidth={4} />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Final Answer:</p>
                            <p className="text-white font-black text-[16px]">{parsed.answer}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <p className="text-white font-bold text-[14px] leading-relaxed">{explanation}</p>;
};

export default function MathFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);
    
    const [renderError, setRenderError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [history, setHistory] = useState([]);
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
    const [isFinished, setIsFinished] = useState(false);
    const [earnedAchievements, setEarnedAchievements] = useState([]);
    
    // Efficiency: Prevent duplicate simulation logs
    const lastSimAttemptRef = useRef({ time: 0, label: '' });

    // Guard: Prevent double-fetching during initialization (v3.8)
    const fetchIterationRef = useRef(0);
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'math';
    const questKey = data?.questKey || `math/${topicId}`;

    useEffect(() => {
        const loadQuestions = async () => {
            // Guard: ensure we only load once per topic change
            if (fetchIterationRef.current === topicId) return;
            fetchIterationRef.current = topicId;

            setIsLoading(true);
            dispatch(resetSession());
            
            // Prime curriculum cache early so map exit is instant
            preloadCurriculum();

            try {
                // 1. Fetch ALL questions from the bank
                console.log(`\ud83c\udf0d [MathEngine] Loading quest for topic="${topicId}", nodeType="${nodeType}"`);
                const rawQuestions = await fetchMathQuestions(topicId);
                const allQuestions = rawQuestions.map(q => ({ ...q, id: String(q.id || q.qid) }));
                allBankRef.current = allQuestions;

                console.log(`\ud83d\udcca [MathEngine] Bank size: ${allQuestions.length} questions for "${topicId}"`);

                // Guard: if the bank is empty, show the "No Questions Found" UI instead of a hard crash
                if (allQuestions.length === 0) {
                    console.warn(`⚠️ [MathEngine] No questions found for "${topicId}". Showing empty state.`);
                    setQuestions([]);
                    setIsLoading(false);
                    return;
                }

                // 2. Fetch history from ManyaDB
                const userHistory = await ManyaDB.getAnswerHistory(subject);
                
                // ─── LATEST SESSION SYNC (v3.6) ───
                // Merge IndexedDB history with current Redux session answers 
                // to prevent repeats if a user restarts a node.
                const sessionAnswers = session?.answers || [];
                const mergedHistory = [...userHistory, ...sessionAnswers];
                setHistory(mergedHistory);

                // 3. Load all Interactive Simulations
                const simCandidates = [];
                if (data?.simResources && data.simResources.length > 0) {
                    console.log(`🎮 [MathEngine] Loading ${data.simResources.length} simulations...`);
                    for (const simRes of data.simResources) {
                        try {
                            const fileName = simRes.file.endsWith('.json') ? simRes.file : `${simRes.file}.json`;
                            const { steps: simSteps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            simSteps.forEach((s, idx) => { 
                                s.isSimulation = true; 
                                // FORCE DETERMINISTIC ID (v3.7)
                                s.id = s.id || `sim_${simRes.file.replace('.json', '')}_${idx}`;
                                s.file = simRes.file; 
                            });
                            simCandidates.push(...simSteps);
                        } catch (e) {
                            console.warn("Failed to load sim:", simRes.file);
                        }
                    }
                }

                // 4. Run them through the adaptive engine (now supports interleaving!)
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, mergedHistory, simCandidates);
                const finalQuestions = quest.questions;
                
                setQuestions(finalQuestions);
                setQuestMeta(quest);

                console.log(`\ud83c\udfaf [Math Adaptive v4.1] ${nodeType} quest generated:`, {
                    bankSize: allQuestions.length,
                    simCount: simCandidates.length,
                    finalLength: finalQuestions.length,
                    gameMode: quest.metadata.gameMode,
                });
                
                // Small delay to ensure smooth transition
                setTimeout(() => setIsLoading(false), 300);
            } catch (err) {
                console.error("\ud83d\udd25 [Math] Initialization Failed:", err);
                setRenderError(err);
                setIsLoading(false);
            }
        };
        loadQuestions();
    }, [topicId, nodeType, questKey]);



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

    const handleSelect = (option) => {
        if (isAnswered) return;

        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true);
            setChangeCount(c => c + 1);
        }
        if (!firstSelection.current) firstSelection.current = option;

        setSelectedOption(option);
        window.ManyaAudio?.pop?.();
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = selectedOption === q.answer;
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

        dispatch(updateSessionAfterAnswer({ isCorrect, hintUsed, answerChanged, timeSpentMs }));

        const frustration = calculateFrustration(session);
        const { baseId, variant } = q.id?.includes('-V') 
            ? { baseId: q.id.split('-V')[0], variant: 'V' + q.id.split('-V')[1] }
            : { baseId: q.id, variant: 'V0' };

        const answerLog = {
            questionId: q.id,
            isCorrect,
            selectedAnswer: selectedOption,
            correctAnswer: q.answer,
            timeSpentMs,
            hintUsed,
            answerChanged,
            changeCount,
            pool: q.isPLE ? 'yes' : 'no',
            concept_id: baseId,
            variant: variant,
            engine_type: 'MCQ',
            frustrationLevel: frustration?.score || 0
        };
        ManyaDB.recordAnswer(subject, answerLog);
        setHistory(prev => [...prev, answerLog]);
        syncService.pushAnswer(subject, answerLog);

        // ─── CONCEPT MASTERY TRACKING (Spaced Repetition) ───
        conceptMasteryService.updateAfterAnswer(subject, baseId, isCorrect)
            .catch(e => console.warn('[ConceptMastery] Update failed:', e));

        // Gem Calculation (Logic copied from awardGems for precision)
        const streakMultiplier = (user.current_streak >= 7) ? 2.0 : (user.current_streak >= 5) ? 1.5 : (user.current_streak >= 3) ? 1.2 : 1.0;
        const baseAmount = hintUsed ? 1 : 3;
        const bonus = (!hintUsed && isCorrect) ? 1 : 0;
        const totalGems = isCorrect ? Math.floor((baseAmount + bonus) * streakMultiplier) : 0;
        const totalXP = hintUsed ? 5 : 10;

        if (isCorrect) {
            dispatch(awardGems({ subject, amount: totalGems, xp: totalXP }));
            setGemsEarned(g => g + totalGems);
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
        } else if (isFinished !== undefined && !isFinished) {
            // ── QUEST COMPLETE ──
            if (setIsFinished) setIsFinished(true); // LOCK IT
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

            // ─── GLOBAL SPIRAL PROGRESS SYNC ───
            // If this was the MASTERY node and they passed (>= 60%),
            // check if we need to unlock the next quest on the SST World map.
            if (nodeType === 'MASTERY' && mastery >= 60) {
                const mapIndex = data?.questIndex ?? 0;
                const progKey = `prog_${subject}`;
                const currentProg = user[progKey] || 0;
                if (mapIndex >= currentProg) {
                    dispatch(updateProfile({ [progKey]: mapIndex + 1 }));
                }
            }

            setCompletionResult({ mastery, ...result, score: finalScore, total: questions.length });
            setShowCompletion(true);

            // ─── XP REWARD ───
            if (result.xpReward) {
                dispatch(addXP(result.xpReward));
            }

            // ─── ACHIEVEMENT CHECK ───
            const achieveCtx = {
                questsCompleted: (user[`prog_${subject}`] || 0) + 1,
                mastery,
                streak: user.current_streak || 0,
                questCompletedNoHints: session.hintCount === 0,
                avgTime: questions.length > 0 ? (questions.reduce((sum, q) => sum + (q._timeSpent || 10000), 0)) / questions.length : 15000,
                accuracy: questions.length > 0 ? finalScore / questions.length : 0,
                totalCorrect: (user[`prog_${subject}`] || 0) * 6 + finalScore,
                nodeType,
                attempts: result.attempts || 1,
                v3Mastered: 0,
                gemsEarned: user[`${subject}Gems`] || 0,
            };
            const newBadges = achievementService.checkAchievements(subject, achieveCtx);
            if (newBadges.length > 0) {
                setEarnedAchievements(newBadges);
            }

            console.log(`🏆 [Math] ${nodeType} complete:`, { mastery, ...result });
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
            type: 'adaptive_math',
        });
        onComplete?.();
    };

    const showHint = () => {
        if (!hintUsed) {
            setHintUsed(true);
        }
    };

    // ── LOADING ──
    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const RenderError = ({ error, onRetry }) => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-500/10">
                <X size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Engine Glitch</h3>
            <p className="text-sm text-slate-500 font-bold mb-8 max-w-xs mx-auto">
                Something went wrong on your device. Let's try to reload.
            </p>
            <div className="w-full max-w-md bg-slate-900 text-rose-400 p-6 rounded-2xl text-left font-mono text-[10px] overflow-auto max-h-60 mb-8 border border-white/10">
                <strong>Error:</strong> {error.message}
                <br /><br />
                <strong>Stack:</strong>
                <pre className="opacity-70 mt-2">{error.stack}</pre>
            </div>
            <button 
                onClick={onRetry}
                className="px-8 h-14 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
            >
                RELOAD ENGINE <RotateCcw size={18} />
            </button>
        </div>
    );

    // ── RENDER DEBUG OVERLAY ──
    const renderDebug = () => {
        if (!data?.debug) return null;
        const q = questions[currentIdx];
        const factors = q?._score?.factors || [];
        return (
            <div className="fixed bottom-24 left-4 right-4 bg-black/80 text-white p-3 rounded-lg text-[10px] font-mono z-[100] backdrop-blur-sm border border-white/20 pointer-events-none">
                <div className="flex justify-between border-b border-white/20 pb-1 mb-1">
                    <span className="text-amber-400">ADM-DEBUG v3.2</span>
                    <span className="opacity-50 uppercase">{nodeType}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    <span className="bg-blue-500/30 px-1 rounded">SRC: {q?.source || 'unknown'}</span>
                    <span className="bg-purple-500/30 px-1 rounded">DIF: {q?.difficulty || 'E'}</span>
                    {q?.isPLE && <span className="bg-emerald-500/30 px-1 rounded">PLE: YES</span>}
                    {factors.map(f => <span key={f} className="bg-white/10 px-1 rounded border border-white/10">{f}</span>)}
                </div>
            </div>
        );
    };

    if (renderError) return <RenderError error={renderError} onRetry={() => window.location.reload()} />;

    if (questions.length === 0) return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <Search size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">No Questions Found</h3>
            <p className="text-sm text-slate-500 font-bold max-w-xs mx-auto mb-6">
                We couldn't find any questions for <span className="text-amber-600">"{topicId}"</span>. Please check your Supabase data or subtopic filters.
            </p>
            <button 
                onClick={handleFinish}
                className="px-6 h-12 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2"
            >
                BACK TO MAP <ArrowRight size={18} />
            </button>
        </div>
    );

    // ── COMPLETION SCREEN ──
    if (showCompletion && completionResult) {
        const { mastery, unlocked, nextNode, needsRetry, threshold, attempts } = completionResult;
        const isPassing = mastery >= 60;
        const isPerfect = mastery === 100;

        return (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in duration-700 bg-[var(--bg-main)] bg-opacity-50">
                {/* Achievement Celebration Overlay */}
                {earnedAchievements.length > 0 && (
                    <AchievementUnlocked 
                        achievements={earnedAchievements} 
                        onDismiss={() => setEarnedAchievements([])} 
                    />
                )}
                <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-[var(--border-color)] p-8 text-center relative overflow-hidden">
                    
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-50 to-transparent opacity-50" />
                    {isPerfect && (
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="absolute animate-bounce" style={{
                                    top: `${Math.random() * 80}%`,
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${i * 0.2}s`,
                                    fontSize: '24px'
                                }}>
                                    {['🎈', '🎉', '✨', '🎊'][i % 4]}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Trophy/Status Icon */}
                    <div className="relative mb-6 pt-4">
                        <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto mb-4 rotate-3 shadow-inner group-hover:rotate-0 transition-transform duration-500">
                             <div className="text-6xl animate-pulse">
                                {mastery >= 90 ? '🏆' : mastery >= 75 ? '🥈' : mastery >= 60 ? '🥉' : '💪'}
                             </div>
                        </div>
                        <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mb-2">
                             {mastery >= 90 ? 'Outstanding!' : mastery >= 75 ? 'Great Job!' : mastery >= 60 ? 'Well Done!' : 'Keep Going!'}
                        </h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-main)] rounded-full text-[10px] font-black text-[var(--text-sub)] uppercase tracking-widest">
                             <Compass size={10} /> {nodeType} COMPLETE
                        </div>
                    </div>

                    {/* Mastery Ring Card */}
                    <div className="bg-[var(--bg-main)] rounded-[2.5rem] p-6 mb-6 border border-[var(--border-color)]">
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <svg className="w-full h-full -rotate-90">
                                <circle 
                                    cx="64" cy="64" r="58"
                                    fill="none" stroke="#e2e8f0" strokeWidth="12"
                                />
                                <circle 
                                    cx="64" cy="64" r="58"
                                    fill="none" 
                                    stroke={isPassing ? '#10b981' : '#f43f5e'} 
                                    strokeWidth="12"
                                    strokeDasharray="364.4"
                                    strokeDashoffset={364.4 - (364.4 * mastery) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-[var(--text-main)] leading-none">{mastery}%</span>
                                <span className="text-[9px] font-black text-[var(--text-sub)] tracking-widest uppercase mt-1">Mastery</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-around border-t border-[var(--border-color)] pt-4 mt-2">
                            <div className="text-center">
                                <div className="text-lg font-black text-[var(--text-main)]">{completionResult.score}/{completionResult.total}</div>
                                <div className="text-[10px] font-bold text-[var(--text-sub)] uppercase tracking-wider">Correct</div>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <div className="text-center">
                                <div className="text-lg font-black text-amber-500 flex items-center gap-1">
                                    <Trophy size={16} fill="currentColor" /> +{gemsEarned}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gems</div>
                            </div>
                        </div>
                    </div>

                    {/* Unlock Feedback */}
                    {unlocked && nextNode ? (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-4 mb-8 animate-in slide-in-from-bottom-2 duration-500 delay-300">
                             <div className="flex items-center justify-center gap-3">
                                 <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                     <Zap size={16} fill="currentColor" />
                                 </div>
                                 <div className="text-left">
                                     <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">New Milestone</div>
                                     <div className="text-sm font-bold text-emerald-900 leading-none">{nextNode} Unlocked!</div>
                                 </div>
                             </div>
                        </div>
                    ) : needsRetry && (
                        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-4 mb-8">
                             <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Progress Guard</div>
                             <div className="text-sm font-bold text-rose-900">Need {threshold}% to unlock next node</div>
                        </div>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex flex-col gap-3">
                         <button
                            onClick={handleFinish}
                            className="w-full h-14 bg-[var(--text-main)] text-[var(--bg-main)] rounded-3xl font-black text-[13px] tracking-widest uppercase flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                        >
                            {needsRetry ? 'EXIT QUEST' : 'COLLECT REWARDS'} <ArrowRight size={18} />
                        </button>
                        
                        {needsRetry && (
                             <button
                                onClick={() => {
                                    setShowCompletion(false); setCompletionResult(null); setCurrentIdx(0); setScore(0); setGemsEarned(0); setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setIsLoading(true); resetSession();
                                    (async () => {
                                        const rawQ = await fetchMathQuestions(topicId);
                                        const allQ = rawQ.map(q => ({ ...q, id: String(q.id || q.qid) }));
                                        allBankRef.current = allQ;
                                        const userHistory = await ManyaDB.getAnswerHistory(subject);
                                        const quest = await generateAdaptiveQuest(allQ, nodeType, subject, questKey, session, userHistory);
                                        setQuestions(quest.questions);
                                        setQuestMeta(quest);
                                        setIsLoading(false);
                                    })();

                                }}
                                className="w-full h-14 bg-[var(--bg-card)] text-[var(--text-sub)] border-2 border-[var(--border-color)] rounded-3xl font-black text-[11px] tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-[var(--bg-main)] transition-all"
                            >
                                <RotateCcw size={16} /> REPLAY NODE
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ── QUESTION UI ──
    try {
        const q = questions[currentIdx];
        if (!q) return null;
        
        // Use session from Redux state (already imported above)
        const frustration = calculateFrustration(session);

        // ── SIMULATION / PUZZLE / RECAP VIEW ──
        if (q.isSimulation || q.type === 'STUDY_RECAP' || q.type === 'INTERACTIVE_PUZZLE') {
            return (
                <div className="flex-1 flex flex-col animate-in fade-in duration-500 overflow-hidden relative">
                     <SimulatorBridge 
                        step={q} 
                        onComplete={(results) => {
                            // If engine provides USP, use its logic
                            const usp = results?.usp;
                            const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                            const timeSpentMs = usp ? usp.timeSpentMs : (results?.duration || 30000);

                            console.log(`🏁 [MathEngine] Simulation complete:`, results);

                            // ─── PERSIST SIMULATION RESULT ───
                            dispatch(updateSessionAfterAnswer({
                                isCorrect: isSuccess,
                                hintUsed: false,
                                answerChanged: false,
                                timeSpentMs
                            }));

                            const finalLog = {
                                questionId: q.id,
                                isCorrect: isSuccess,
                                selectedAnswer: 'COMPLETED',
                                correctAnswer: 'COMPLETED',
                                timeSpentMs,
                                hintUsed: false,
                                answerChanged: false,
                                pool: 'simulation',
                                answeredAt: new Date().toISOString(),
                                mistakes: usp ? usp.mistakes : (results?.mistakes || 0),
                                engine_type: q.engineType || q.type || 'SIMULATION',
                                usp_data: usp // Store full USP breakdown
                            };
                            ManyaDB.recordAnswer(subject, finalLog);
                            syncService.pushAnswer(subject, finalLog);

                            if (isSuccess) {
                                // Add bonus gems for high accuracy
                                const accuracyBonus = usp ? Math.floor(usp.accuracy / 20) : 0;
                                setScore(prev => prev + 1);
                                setGemsEarned(prev => prev + 5 + accuracyBonus); 
                            }
                            nextQuestion();
                        }} 
                        onAttempt={(attempt) => {
                            // ─── EFFICIENCY: PREVENT DUPLICATES ───
                            const now = Date.now();
                            if (now - lastSimAttemptRef.current.time < 500 && lastSimAttemptRef.current.label === attempt.label) {
                                return;
                            }
                            lastSimAttemptRef.current = { time: now, label: attempt.label };

                            // ─── GRANULAR SIMULATION TRACKING ───
                            const frustration = calculateFrustration(session);
                            const engineType = q.engineType || q.type || 'IMAGE_HOTSPOTS';
                            const attemptLog = {
                                questionId: q.id,
                                isCorrect: attempt.isCorrect,
                                selectedAnswer: attempt.selectedAnswer || attempt.label || 'SIM_ATTEMPT',
                                correctAnswer: attempt.correctAnswer || 'STEP_COMPLETE',
                                timeSpentMs: attempt.duration || 0,
                                pool: 'simulation_step',
                                engine_type: engineType,
                                frustrationLevel: frustration?.score || 0,
                                mistakes: attempt.mistakes || 0
                            };
                            
                            console.log(`📡 [MathEngine] Recording granular attempt:`, attemptLog);
                            ManyaDB.recordAnswer(subject, attemptLog);
                            syncService.pushAnswer(subject, attemptLog);
                        }}
                    />
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-0 sm:p-6 animate-in fade-in duration-500">
                <div className="w-full max-w-xl h-full sm:h-auto bg-[var(--bg-card)] rounded-none sm:rounded-[2.5rem] shadow-2xl border-x-0 sm:border border-[var(--border-color)] p-6 sm:p-8 relative overflow-hidden flex flex-col">

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
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 shrink-0 ${i === currentIdx ? 'bg-amber-500 w-6' : (i < currentIdx ? 'bg-amber-500 opacity-40' : 'bg-[var(--border-color)]')}`} />
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

                    <h2 className="text-xl font-bold text-[var(--text-main)] mb-8 leading-snug relative z-10">
                        {q.question}
                    </h2>

                    <div className="grid gap-3 w-full relative z-10">
                        {q.options?.map((opt, i) => {
                            const isCorrect = opt === q.answer;
                            const isSelected = opt === selectedOption;
                            // ── DYNAMIC STYLING ──
                            let boxStyle = {
                                background: 'var(--bg-main)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-main)',
                                transform: 'scale(1)',
                                boxShadow: 'none'
                            };

                            if (isAnswered) {
                                if (isCorrect) {
                                    boxStyle = { background: '#ecfdf5', borderColor: '#10b981', color: '#064e3b', boxShadow: '0 4px 12px rgba(16,185,129,0.1)' };
                                } else if (isSelected) {
                                    boxStyle = { background: '#fef2f2', borderColor: '#ef4444', color: '#7f1d1d', boxShadow: '0 4px 12px rgba(239,68,68,0.1)' };
                                } else {
                                    boxStyle = { background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-muted)', opacity: 0.5, filter: 'grayscale(0.5)' };
                                }
                            } else if (isSelected) {
                                // ── VIBRANT SELECTED STATE ──
                                boxStyle = { 
                                    background: '#fffbeb', 
                                    border: '3px solid #f59e0b', 
                                    color: '#92400e', 
                                    transform: 'scale(1.02)', 
                                    boxShadow: '0 8px 20px rgba(245,158,11,0.2)',
                                    zIndex: 10
                                };
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(opt)}
                                    disabled={isAnswered}
                                    style={boxStyle}
                                    className={`group relative w-full h-14 rounded-2xl border-2 transition-all duration-300 flex items-center px-5 text-[15px] font-bold animate-in slide-in-from-bottom-${2 + i} fade-in duration-500`}
                                >
                                    <span className="flex-1 text-left">{opt}</span>
                                    {isAnswered && isCorrect && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0"><Check size={14} strokeWidth={4} /></div>}
                                    {isAnswered && isSelected && !isCorrect && <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0"><X size={14} strokeWidth={4} /></div>}
                                    {!isAnswered && isSelected && <div className="w-5 h-5 rounded-full border-4 border-amber-500 flex items-center justify-center shrink-0"><div className="w-2 h-2 rounded-full bg-amber-500" /></div>}
                                </button>
                            );
                        })}
                    </div>

                    {!isAnswered && !hintUsed && q.explanation && (
                        <button onClick={showHint} className="mt-4 text-xs text-amber-500 font-bold flex items-center gap-1 mx-auto opacity-60 hover:opacity-100 transition-opacity">
                            <Lightbulb size={12} /> Use Hint (−gems)
                        </button>
                    )}

                    {/* HINT DISPLAY (Only if requested and not yet answered) */}
                    {hintUsed && !isAnswered && (
                        <div className="mt-6 relative overflow-hidden bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 shadow-sm animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-start gap-3 relative z-10">
                                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <Lightbulb size={16} fill="currentColor" />
                                </div>
                                <div>
                                    <h4 className="font-black text-amber-500 text-[10px] tracking-widest uppercase mb-1">Quick Hint</h4>
                                    <p className="text-[var(--text-main)] font-bold text-[13px] leading-relaxed">{q.hint || 'No hint available for this concept.'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPLANATION / DETAILED SOLUTION (Only after answering) */}
                    {isAnswered && (
                        <div className="mt-8 relative overflow-hidden bg-slate-900 border-2 border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in duration-500">
                            <div className="absolute -right-8 -bottom-8 text-white/5 -rotate-12">
                                <Search size={160} />
                            </div>
                            
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
                                    <Check size={20} strokeWidth={4} />
                                </div>
                                <div className="pt-0.5">
                                    <h4 className="font-black text-blue-400 text-[10px] tracking-widest uppercase mb-1.5">Detailed Solution</h4>
                                    <SolutionDisplayer explanation={q.explanation} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ACTION BUTTON: SUBMIT OR NEXT */}
                    <div className="mt-8">
                        {!isAnswered ? (
                            <button
                                onClick={handleSubmit}
                                disabled={selectedOption === null}
                                className={`w-full h-14 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-xl flex items-center justify-center gap-2 ${
                                    selectedOption !== null 
                                    ? 'bg-amber-500 text-white shadow-amber-500/20 active:scale-95' 
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                SUBMIT ANSWER <Zap size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={nextQuestion}
                                className="w-full h-14 bg-[var(--text-main)] text-[var(--bg-main)] rounded-xl font-black text-xs tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-black/10"
                            >
                                {currentIdx === questions.length - 1 ? 'FINISH QUEST' : 'NEXT STEP'}
                                <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (err) {
        console.error("🔥 Render Crash in MathFetcherEngine:", err);
        setRenderError(err);
        return null;
    }
}
