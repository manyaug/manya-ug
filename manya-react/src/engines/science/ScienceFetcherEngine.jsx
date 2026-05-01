import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import {
    updateProfile, awardGems, resetSession,
    updateSessionAfterAnswer, checkAchievements, syncUserData,
    awardCoins, dropChest
} from '../../store/userSlice';

// Services & Utils
import { fetchScienceQuestions } from '../../services/scienceMockDB';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../infrastructure/db/manyaDB.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';
import { preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';
import { saveNodeCompletion, trackWrongAnswer, resolveRephrased, setJustFinished } from '../../domain/progress/questProgressService.js';
// ── Gamification Domain (Headless) ───────────────────────────────────────────
import { trackAndPushEmotion } from '../../domain/gamification/emotionTracker.js';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from '../../domain/gamification/chestService.js';
import { getModeCoinMultiplier } from '../../domain/gamification/gameModeEngine.js';
import { dynamicModeService } from '../../domain/gamification/dynamicModeService';
import { rewardManager } from '../../domain/gamification/rewardManager.js';

// Atomic Resources
import {
    SUPPORTED_SIM_ENGINES, getEngineType, validateScienceAnswer,
    resolveCorrectText, findRephrasedVariant
} from './ScienceLogic';
import SimulatorBridge from './SimulatorBridge';
import ScienceRenderer from './ScienceRenderer';
import CelebrationView from '../../views/CelebrationView.jsx';
import '../../styles/mcq-engine.css';

/**
 * MANYA SCIENCE FETCHER ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates adaptive quest logic, simulation routing, and premium visuals.
 */
export default function ScienceFetcherEngine({ data, onComplete, onResult, nodeType }) {
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
    const [coinsEarnedState, setCoinsEarnedState] = useState(0);


    // Rescue Recap state
    const [recapSteps, setRecapSteps] = useState([]);
    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef = useRef(0);

    const lastSimAttemptRef = useRef({ time: 0, label: '' });
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);
    const scoreRef = useRef(0); // Synchronous tracker for final mastery


    const topicId = data?.topic || 'default';
    const subject = data?.subject || 'science';
    const questKey = data?.questKey || `science/${topicId}`;
    // Game mode set by adaptiveEngine metadata after load
    const [gameMode, setGameMode] = useState('none');
    const [hintUsedCount, setHintUsedCount] = useState(0);

    // --- 🪄 INITIALIZATION ---
    useEffect(() => {
        const loadQuestions = async () => {
            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();

            try {
                // Load Interactive Simulations
                const simCandidates = [];
                const activeSims = data?.simResources || [];
                const activeRecaps = data?.recapResources || [];

                // 🌐 FETCH REMOTE RESOURCES (v5.1 - Unified GitHub CDN Loader)
                const fetchResource = async (res) => {
                    const file = typeof res === 'string' ? res : res?.file;
                    if (!file) return [];
                    const fileName = file.endsWith('.json') ? file : `${file}.json`;
                    try {
                        const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                        return steps.map(s => {
                            const eType = getEngineType(s);
                            return { ...s, isSimulation: SUPPORTED_SIM_ENGINES.includes(eType), id: s.id || `remote_${file.replace('.json','')}_${Math.random()}` };
                        });
                    } catch (e) { console.warn(`[Science] Failed to load ${file}`, e); return []; }
                };

                for (const res of activeSims) {
                    const steps = await fetchResource(res);
                    simCandidates.push(...steps);
                }
                for (const res of activeRecaps) {
                    const steps = await fetchResource(res);
                    steps.forEach(s => { s.isRecap = true; });
                    simCandidates.push(...steps);
                }

                // Fetch Bank & Generate Quest
                const rawBank = await fetchScienceQuestions(topicId);
                const allQuestions = rawBank.map(q => ({ ...q, id: String(q.id || q.qid) }));
                allBankRef.current = allQuestions;

                if (allQuestions.length === 0 && simCandidates.length === 0) {
                    throw new Error(`Quest data missing for topic: ${topicId}`);
                }

                const userHistory = await ManyaDB.getAnswerHistory(subject);
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);

                let finalQuestions = quest.questions;
                if (data?.forceMode === 'reverse') {
                    finalQuestions = finalQuestions.map(q => {
                        if (q.engineType?.includes('FETCHER') || q.question_type === 'MCQ' || !q.question_type) {
                            return dynamicModeService.generateReverseQuestion(q, allQuestions) || q;
                        }
                        return q;
                    });
                }
                setQuestions(finalQuestions);
                // Capture game mode from adaptive metadata
                if (quest.metadata?.gameMode) {
                    const gm = quest.metadata.gameMode.toLowerCase();
                    setGameMode(['quickfire', 'timed', 'marathon'].includes(gm) ? gm : 'none');
                }
                // Standard delay for visual smoothness
                setTimeout(() => setIsLoading(false), 300);
            } catch (err) {
                console.error("Science Load Failed:", err);
                setRenderError(err);
                setIsLoading(false);
            }
        };
        loadQuestions();
    }, [topicId, nodeType, questKey]);

    // --- ⚡ SPEEDRUN TIMEOUT HANDLER ---
    useEffect(() => {
        const handleTimeout = () => {
            if (!isAnswered) {
                audioService.error?.();
                setIsAnswered(true);
                onResult?.({ isCorrect: false, score, total: questions.length, type: 'timeout' });
                setTimeout(() => nextQuestion(), 1500);
            }
        };
        window.addEventListener('manya-engine-timeout', handleTimeout);
        return () => window.removeEventListener('manya-engine-timeout', handleTimeout);
    }, [isAnswered, score, questions.length, currentIdx]);

    // --- 🧠 HANDLERS ---
    const handleSelect = (option) => {
        if (isAnswered) return;
        setHintUsed(false);
        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true); setChangeCount(c => c + 1);
        }
        if (!firstSelection.current) firstSelection.current = option;
        setSelectedOption(option);
        audioService.playSFX('tap');
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = validateScienceAnswer(selectedOption, q.answer, q.options);
        const correctText = resolveCorrectText(q.answer, q.options);
        const timeSpentMs = Date.now() - questionStartTime.current;

        // --- Behavioral Analysis 🛡️ ---
        const frustration = calculateFrustration(session);
        const baseId = q.id?.replace(/-V\d+$/, '') || q.id;

        // Calculate Confidence: (Fast response + Zero changes = 100, Slow + Changes = <40)
        const timeToFirstClick = firstSelection.current ? (Date.now() - questionStartTime.current) : timeSpentMs;
        let confidenceRating = 100;
        if (changeCount > 0) confidenceRating -= (changeCount * 20);
        if (timeToFirstClick > 10000) confidenceRating -= 30;
        confidenceRating = Math.max(10, confidenceRating);

        const log = {
            questionId: q.id,
            isCorrect,
            selectedAnswer: selectedOption,
            correctAnswer: correctText,
            timeSpentMs,
            hintUsed,
            answerChanged,
            changeCount,
            hesitationCount: changeCount,
            confidenceRating,
            timeToFirstClick,
            pointsEarned: isCorrect ? 10 : 0,
            pool: q.isPLE ? 'yes' : 'no',
            concept_id: baseId,
            engine_type: 'MCQ',
            frustrationLevel: frustration?.score || 0
        };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        // [Manya v4 Patch] Immediately notify QuestRunner parent to update live HUD
        onResult?.({
            isCorrect: log.isCorrect,
            score: isCorrect ? score + 1 : score, // predict next state
            total: questions.length,
            type: 'answer'
        });

        // ── Emotion Tracking (non-blocking) ─────────────────────────────────
        trackAndPushEmotion({
            isCorrect, hintUsed, answerChanged, changeCount,
            timeSpentMs, frustrationLevel: frustration?.score || 0,
        });

        // 🧠 Update dynamic mode metrics BEFORE nextQuestion re-rolls
        dynamicModeService.update(isCorrect, currentMastery, questions.length, currentIdx);

        // ── Unified Reward Logic ────────────────────────────────────────────
        if (isCorrect) {
            setScore(s => s + 1);
            scoreRef.current += 1;
            audioService.success?.();
            consecutiveWrongRef.current = 0;
            if (q.isRephrased) resolveRephrased(subject, q.originalId);

            const awards = rewardManager.awardStepRewards({
                subject, hintUsed, streak: user.current_streak, gameMode, isSimulation: false
            }, dispatch);

            setCoinsEarnedState(prev => prev + awards.coins);
            setGemsEarned(g => g + awards.gems);

            setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);

            setHintUsedCount(c => c + (hintUsed ? 1 : 0));

            // --- ⚡ LIVE SYNC (Manya v4.5) ---
            dispatch(checkAchievements());
            dispatch(syncUserData());

            setTimeout(() => nextQuestion(), 800);
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
            setTimeout(() => setShowExplanation(true), 500);
        }
    };

    // ── Partial Progress Orchestrator (Simulation Logic) ─────────────────────
    const [simPartialScore, setSimPartialScore] = useState(0);
    const handleSimResult = useCallback((res) => {
        if (!res) return;

        // If simulation reports steps (e.g. 3/10 pins), calculate fractional score
        if (res.total > 0 && res.score !== undefined) {
            const fractional = res.score / res.total;
            setSimPartialScore(fractional);

            // Notify parent HUD live
            onResult?.({
                isCorrect: res.isCorrect,
                score: score + fractional, // predict partial state
                total: questions.length,
                type: 'partial_sim'
            });
        }
    }, [score, questions.length, onResult]);

    const currentMastery = useMemo(() => {
        if (!questions.length) return 0;
        const m = Math.min(100, Math.round(((score + simPartialScore) / questions.length) * 100));
        return m;
    }, [score, simPartialScore, questions.length]);

    const nextQuestion = () => {
        setSimPartialScore(0);
        if (currentIdx < questions.length - 1) {
            const nextIdx = currentIdx + 1;
            
            // 🧠 DYNAMIC MODE RE-ROLL (Manya v5)
            const mode = dynamicModeService.getNextMode(null, nodeType);
            console.log(`[ScienceFetcher] Question ${nextIdx + 1} Mode: ${mode.toUpperCase()}`);

            // 1. Handle Speedrun
            if (mode === 'speedrun') {
                dynamicModeService.startSpeedrun(18, () => {
                    console.warn('[ScienceFetcher] Speedrun TIMEOUT!');
                    window.dispatchEvent(new CustomEvent('manya-engine-timeout'));
                });
            } else {
                dynamicModeService.stopSpeedrun();
            }

            // 2. Handle Reverse Transformation
            if (mode === 'reverse') {
                window.dispatchEvent(new CustomEvent('manya-fx-reverse-start'));
                setQuestions(prev => {
                    const copy = [...prev];
                    const nextQ = copy[nextIdx];
                    if (nextQ && !nextQ.isReversed) {
                        const reversed = dynamicModeService.generateReverseQuestion(nextQ, allBankRef.current);
                        if (reversed) {
                            reversed.isReversed = true;
                            copy[nextIdx] = reversed;
                        }
                    }
                    return copy;
                });
            }
            setGameMode(mode);

            // 3. Handle Earthquake (Mastery-based)
            if (currentMastery >= 85) {
                window.dispatchEvent(new CustomEvent('manya-fx-earthquake'));
            }

            setCurrentIdx(nextIdx); 
            setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); 
            setHintUsed(false); setAnswerChanged(false); setChangeCount(0); 
            firstSelection.current = null; questionStartTime.current = Date.now();
        } else if (!isFinished) {
            setIsFinished(true);
            const finalScore = scoreRef.current;
            const mastery = Math.round((finalScore / questions.length) * 100);
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            dispatch(checkAchievements());
            saveNodeCompletion(subject, questKey, nodeType, currentMastery);
            dispatch(checkAchievements());
            dispatch(syncUserData());
            handleFinish();
        }
    };

    const handleFinish = () => {
        onResult?.({ isCorrect: currentMastery >= 60, score: score + simPartialScore, total: questions.length, mastery: currentMastery, gemsEarned, type: 'adaptive_science' });
        onComplete?.();
    };

    const q = questions[currentIdx];
    if (!q && !isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-[var(--text-sub)]">
                <RefreshCw className="animate-spin mr-2" /> Finalizing Quest...
            </div>
        );
    }

    const eType = q ? getEngineType(q) : 'MCQ';
    const isSim = SUPPORTED_SIM_ENGINES.includes(eType);

    return (
        <ScienceRenderer
            isLoading={isLoading} loadingConfig={getLoadingConfig('science')} randomFact={getRandomFact('science')}
            renderError={renderError} questions={questions} currentIdx={currentIdx}
            selectedOption={selectedOption} isAnswered={isAnswered} showExplanation={showExplanation}
            gemsEarned={gemsEarned} showGemToast={showGemToast} hintUsed={hintUsed} setHintUsed={setHintUsed}
            handleSelect={handleSelect} handleSubmit={handleSubmit} nextQuestion={nextQuestion} handleFinish={handleFinish}
            nodeType={nodeType} correctText={q ? resolveCorrectText(q.answer, q.options) : ''}
            currentMode={gameMode}
            frustration={calculateFrustration(session)}
            userWasCorrect={isAnswered && validateScienceAnswer(selectedOption, q?.answer, q?.options)}
            session={{
                ...session,
                mastery: currentMastery,
                correctCount: score + simPartialScore
            }}
            SimulatorBridgeNode={isSim ? (
                <SimulatorBridge
                    key={q.id || currentIdx} step={q}
                    onResult={handleSimResult}
                    onComplete={(results) => {
                        setSimPartialScore(0); // Reset partial on completion
                        const usp = results?.usp;
                        const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                        const timeSpent = usp ? usp.timeSpentMs : (results?.duration || 30000);
                        dispatch(updateSessionAfterAnswer({ isCorrect: isSuccess, hintUsed: false, answerChanged: false, timeSpentMs: timeSpent }));
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: isSuccess, selectedAnswer: 'COMPLETED', engine_type: 'SIMULATION' });
                        if (isSuccess) {
                            setScore(p => p + 1);
                            scoreRef.current += 1;
                            setGemsEarned(p => p + 5);
                        }
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
