import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { 
    updateProfile, awardGems, addXP, resetSession, 
    updateSessionAfterAnswer, awardCoins, dropChest, checkAchievements, syncUserData
} from '../../store/userSlice';
// ── Gamification Domain (Headless) ───────────────────────────────────────────
import { trackAndPushEmotion } from '../../domain/gamification/emotionTracker.js';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from '../../domain/gamification/chestService.js';
import { getModeCoinMultiplier } from '../../domain/gamification/gameModeEngine.js';

// Services & Utils
import { fetchMathQuestions } from '../../services/mathMockDB';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../infrastructure/db/manyaDB.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';
import { achievementService } from '../../services/achievementService';
import { preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';
import { saveNodeCompletion, trackWrongAnswer, resolveRephrased, setJustFinished } from '../../domain/progress/questProgressService.js';

// Atomic Resources
import { 
    SUPPORTED_SIM_ENGINES, getEngineType, validateMathAnswer, 
    resolveCorrectText, findRephrasedVariant 
} from './MathLogic';
import SimulatorBridge from './SimulatorBridge';
import MathRenderer from './MathRenderer';
import CelebrationView from '../../views/CelebrationView.jsx';
import '../../styles/mcq-engine.css';

/**
 * MANYA MATH FETCHER ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates adaptive math orchestration from solution rendering.
 */
export default function MathFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const store = useStore();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);
    
    // State
    const [renderError, setRenderError] = useState(null);
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
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);
    const [isFinished, setIsFinished] = useState(false);
    
    // Rescue Recap state
    const [recapSteps, setRecapSteps] = useState([]);
    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef = useRef(0);

    const lastSimAttemptRef = useRef({ time: 0, label: '' });
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);
    const fetchIterationRef = useRef(0);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'math';
    const questKey = data?.questKey || `math/${topicId}`;
    const [gameMode, setGameMode] = useState('none');
    const [hintUsedCount, setHintUsedCount] = useState(0);

    // --- 🪄 INITIALIZATION ---
    useEffect(() => {
        const loadQuestions = async () => {
            if (fetchIterationRef.current === topicId) return;
            fetchIterationRef.current = topicId;

            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();

            try {
                // Load Interactive Simulations
                const simCandidates = [];
                if (data?.simResources) {
                    for (const simRes of data.simResources) {
                        try {
                            const fileName = simRes.file.endsWith('.json') ? simRes.file : `${simRes.file}.json`;
                            const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            steps.forEach((s, idx) => {
                                const eType = getEngineType(s);
                                s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                                s.id = s.id || `sim_${simRes.file.replace('.json', '')}_${idx}`;
                            });
                            simCandidates.push(...steps);
                        } catch (e) { console.warn(`[MathEngine] Sim Load Error:`, e); }
                    }
                }

                // Load Recap Resources
                const recapCandidates = [];
                if (data?.recapResources) {
                    for (const recapRes of data.recapResources) {
                        try {
                            const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                            const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            steps.forEach((s, idx) => {
                                const eType = getEngineType(s);
                                s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                                s.isRecap = true;
                                s.id = s.id || `recap_${recapRes.file.replace('.json', '')}_${idx}`;
                            });
                            recapCandidates.push(...steps);
                        } catch (e) { console.warn(`[MathEngine] Recap Load Error:`, e); }
                    }
                    setRecapSteps(recapCandidates);
                }

                // Fetch Bank & Generate Quest
                const rawBank = await fetchMathQuestions(topicId);
                const allQuestions = rawBank.map(q => ({ ...q, id: String(q.id || q.qid) }));
                allBankRef.current = allQuestions;

                if (allQuestions.length === 0 && simCandidates.length === 0) {
                    console.warn(`[MathEngine] No data for topic: ${topicId}`);
                    setQuestions([]); setIsLoading(false); return;
                }

                const userHistory = await ManyaDB.getAnswerHistory(subject);
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);
                setQuestions(quest.questions);
                if (quest.metadata?.gameMode) {
                    const gm = quest.metadata.gameMode.toLowerCase();
                    setGameMode(['quickfire','timed','marathon'].includes(gm) ? gm : 'none');
                }
                setTimeout(() => setIsLoading(false), 300);
            } catch (err) { 
                console.error("Math Load Failed:", err);
                setRenderError(err); 
                setIsLoading(false); 
            }
        };
        loadQuestions();
    }, [topicId, nodeType, questKey]);

    // --- 🧠 HANDLERS ---
    const handleSelect = (option) => {
        if (isAnswered) return;
        setHintUsed(false);
        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true); setChangeCount(c => c + 1);
        }
        if (!firstSelection.current) firstSelection.current = option;
        setSelectedOption(option);
        audioService.pop?.();
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = validateMathAnswer(selectedOption, q.answer, q.options);
        const correctText = resolveCorrectText(q.answer, q.options);
        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            audioService.success?.();
            if (q.isRephrased) resolveRephrased(subject, q.originalId);
            consecutiveWrongRef.current = 0;
        } else {
            audioService.error?.();
            trackWrongAnswer(subject, q.id);
            const rephrased = findRephrasedVariant(q, allBankRef.current, questions);
            if (rephrased) setQuestions(prev => [...prev, rephrased]);

            // Rescue Recap Trigger
            consecutiveWrongRef.current += 1;
            if (consecutiveWrongRef.current >= 3 && recapSteps.length > 0 && nodeType !== 'WARMUP') {
                const recapIdx = recapUsedIndexRef.current % recapSteps.length;
                const recapToInject = { ...recapSteps[recapIdx] };
                recapUsedIndexRef.current += 1; consecutiveWrongRef.current = 0;
                setQuestions(prev => {
                    const copy = [...prev]; copy.splice(currentIdx + 1, 0, recapToInject); return copy;
                });
            }
        }

        dispatch(updateSessionAfterAnswer({ subject, isCorrect, hintUsed, answerChanged, timeSpentMs }));
        dispatch(checkAchievements());
        dispatch(syncUserData(store.getState().user.data));
        const frustration = calculateFrustration(session);
        const baseId = q.id?.replace(/-V\d+$/, '') || q.id;

        const log = { 
            questionId: q.id, isCorrect, selectedAnswer: selectedOption, correctAnswer: correctText, 
            timeSpentMs, hintUsed, answerChanged, changeCount, pool: q.isPLE ? 'yes' : 'no', 
            concept_id: baseId, engine_type: 'MCQ', frustrationLevel: frustration?.score || 0 
        };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        // ── Emotion Tracking ─────────────────────────────────────────────────
        trackAndPushEmotion({ isCorrect, hintUsed, answerChanged, changeCount, timeSpentMs, frustrationLevel: frustration?.score || 0 });

        // ── Coin + Gem calculation ────────────────────────────────────────────
        const streakMultiplier = (user.current_streak >= 7) ? 2.0 : (user.current_streak >= 5) ? 1.5 : (user.current_streak >= 3) ? 1.2 : 1.0;
        const modeMultiplier = getModeCoinMultiplier(gameMode);
        const totalGems = isCorrect ? Math.floor((hintUsed ? 1 : 4) * streakMultiplier) : 0;
        const coinReward = isCorrect ? Math.floor((hintUsed ? 3 : 8) * streakMultiplier * modeMultiplier) : 0;

        if (isCorrect) {
            dispatch(awardGems({ subject, amount: totalGems, xp: hintUsed ? 5 : 10 }));
            if (coinReward > 0) dispatch(awardCoins(coinReward));
            setGemsEarned(g => g + totalGems); setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
            // ── Bronze Chest random drop ──────────────────────────────────────
            if (shouldDropBronzeChest()) dispatch(dropChest({ chestType: 'bronze', rewards: rollChestRewards('bronze') }));
            setHintUsedCount(c => c + (hintUsed ? 1 : 0));
            setTimeout(() => nextQuestion(), 800);
        } else {
            setTimeout(() => setShowExplanation(true), 500);
        }
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1); setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setHintUsed(false); setAnswerChanged(false); setChangeCount(0); firstSelection.current = null; questionStartTime.current = Date.now();
        } else if (!isFinished) {
            setIsFinished(true);
            const mastery = Math.round((score / questions.length) * 100);
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            dispatch(checkAchievements());
            dispatch(syncUserData(store.getState().user.data));
            setJustFinished({ subject, questKey, nodeType, mastery, unlocked: result.unlocked });
            
            // Story progression
            if (nodeType === 'MASTERY' && mastery >= 60) {
                const mapIndex = data?.questIndex ?? 0;
                if (mapIndex >= (user[`prog_${subject}`] || 0)) dispatch(updateProfile({ [`prog_${subject}`]: mapIndex + 1 }));
            }
            if (result.xpReward) dispatch(addXP(result.xpReward));

            // ── Star + Chest + Coin completion rewards ────────────────────────
            const stars = masteryToStars(mastery);
            const bonusCoins = getStarBonusCoins(stars);
            if (bonusCoins > 0) dispatch(awardCoins(bonusCoins));
            const chestType = getQuestCompletionChest(stars);
            if (chestType) dispatch(dropChest({ chestType, rewards: rollChestRewards(chestType) }));

            // ── Achievement Check (Unified Redux System) ──────────────────────
            dispatch(checkAchievements());
            dispatch(syncUserData(store.getState().user.data));

            setCompletionResult({ mastery, score, total: questions.length, stars, bonusCoins, chestType });
            setShowCompletion(true);
        }
    };

    const handleFinish = () => {
        const mastery = completionResult?.mastery || 0;
        onResult?.({ isCorrect: mastery >= 60, score: completionResult?.score || score, total: completionResult?.total || questions.length, mastery, gemsEarned, type: 'adaptive_math' });
        onComplete?.();
    };

    if (showCompletion && completionResult) {
        return (
            <CelebrationView subject="Math" nodeType={nodeType} mastery={completionResult.mastery} score={completionResult.score} total={completionResult.total} gemsEarned={gemsEarned} onCollect={handleFinish} />
        );
    }

    const q = questions[currentIdx];
    const eType = q ? getEngineType(q) : 'MCQ';
    const isSim = SUPPORTED_SIM_ENGINES.includes(eType);

    return (
        <MathRenderer 
            isLoading={isLoading} loadingConfig={getLoadingConfig('math')} randomFact={getRandomFact('math')}
            renderError={renderError} questions={questions} currentIdx={currentIdx}
            selectedOption={selectedOption} isAnswered={isAnswered} showExplanation={showExplanation}
            gemsEarned={gemsEarned} showGemToast={showGemToast} hintUsed={hintUsed} setHintUsed={setHintUsed}
            handleSelect={handleSelect} handleSubmit={handleSubmit} nextQuestion={nextQuestion} handleFinish={handleFinish}
            nodeType={nodeType} correctText={q ? resolveCorrectText(q.answer, q.options) : ''}
            frustration={calculateFrustration(session)}
            userWasCorrect={isAnswered && validateMathAnswer(selectedOption, q.answer, q.options)}
            isLast={currentIdx === questions.length - 1}
            onSkip={nextQuestion}
            session={session}
            SimulatorBridgeNode={isSim ? (
                <SimulatorBridge 
                    key={q.id || currentIdx} step={q}
                    onComplete={(results) => {
                        const usp = results?.usp;
                        const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                        const timeSpent = usp ? usp.timeSpentMs : (results?.duration || 30000);
                        dispatch(updateSessionAfterAnswer({ isCorrect: isSuccess, hintUsed: false, answerChanged: false, timeSpentMs: timeSpent }));
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: isSuccess, selectedAnswer: 'COMPLETED', engine_type: 'SIMULATION' });
                        if (isSuccess) { setScore(p => p + 1); setGemsEarned(p => p + 5); }
                        nextQuestion();
                    }}
                    onAttempt={(attempt) => {
                        if (Date.now() - lastSimAttemptRef.current.time < 500) return;
                        lastSimAttemptRef.current = { time: Date.now(), label: attempt.label };
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: attempt.isCorrect, selectedAnswer: attempt.label || 'SIM_ATTEMPT', engine_type: 'SIM_STEP' });
                    }}
                />
            ) : null}
        />
    );
}
