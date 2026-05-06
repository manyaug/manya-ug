import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { 
    updateProfile, awardGems, resetSession, 
    updateSessionAfterAnswer, awardCoins, dropChest, checkAchievements, syncUserData
} from '../../store/userSlice';
// ── Gamification Domain (Headless) ───────────────────────────────────────────
import { trackAndPushEmotion } from '../../domain/gamification/emotionTracker.js';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from '../../domain/gamification/chestService.js';
import { getModeCoinMultiplier } from '../../domain/gamification/gameModeEngine.js';
import { rewardManager } from '../../domain/gamification/rewardManager.js';
import { dynamicModeService } from '../../domain/gamification/dynamicModeService';
import { conceptMasteryService } from '../../domain/mastery/conceptMasteryService.js';

// Services & Utils
import { fetchMathQuestions } from '../../services/mathMockDB';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../infrastructure/db/manyaDB.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';
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
    const [coinsEarnedState, setCoinsEarnedState] = useState(0);

    
    // Rescue Recap state
    const [recapSteps, setRecapSteps] = useState([]);
    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef = useRef(0);

    const lastSimAttemptRef = useRef({ time: 0, label: '' });
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);
    const scoreRef = useRef(0);

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
                    } catch (e) { console.warn(`[Math] Failed to load ${file}`, e); return []; }
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
                setRecapSteps(simCandidates.filter(s => s.isRecap));

                // Fetch Bank & Generate Quest
                const rawBank = await fetchMathQuestions(topicId);
                const allQuestions = rawBank
                    .filter(q => q.question && q.question.trim().length > 0)
                    .map(q => ({ ...q, id: String(q.id || q.qid) }));
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

    // --- ⚡ SPEEDRUN TIMEOUT HANDLER ---
    useEffect(() => {
        const handleTimeout = () => {
            if (!isAnswered) {
                audioService.error?.();
                setIsAnswered(true);
                onResult?.({ isCorrect: false, score: scoreRef.current, total: questions.length, type: 'timeout' });
                setTimeout(() => nextQuestion(), 1500);
            }
        };
        window.addEventListener('manya-engine-timeout', handleTimeout);
        return () => window.removeEventListener('manya-engine-timeout', handleTimeout);
    }, [isAnswered, questions.length, currentIdx]);

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
            scoreRef.current += 1;
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

        // 🧠 Update granular concept mastery
        conceptMasteryService.updateAfterAnswer(subject, baseId, isCorrect);

        // [Manya v4 Patch] Immediately notify QuestRunner parent to update live HUD
        const awards = isCorrect ? rewardManager.awardStepRewards({
            subject, hintUsed, streak: user.current_streak, gameMode, isSimulation: q.isSimulation || false
        }) : { gems: 0, coins: 0 };

        const nextCoins = coinsEarnedState + awards.coins;
        const nextGems = gemsEarned + awards.gems;

        onResult?.({
            isCorrect: log.isCorrect,
            score: isCorrect ? score + 1 : score,
            total: questions.length,
            coinsEarned: nextCoins,
            gemsEarned: nextGems,
            type: 'answer'
        });

        // ── Emotion Tracking ─────────────────────────────────────────────────
        trackAndPushEmotion({ isCorrect, hintUsed, answerChanged, changeCount, timeSpentMs, frustrationLevel: frustration?.score || 0 });

        // 🧠 Update dynamic mode metrics BEFORE nextQuestion re-rolls
        dynamicModeService.update(isCorrect, currentMastery, questions.length, currentIdx);

        // ── Unified Reward Logic ────────────────────────────────────────────
        if (isCorrect) {
            setScore(s => s + 1);
            scoreRef.current += 1;
            audioService.success?.();
            consecutiveWrongRef.current = 0;

            setCoinsEarnedState(nextCoins);
            setGemsEarned(nextGems);
            
            setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
            
            setHintUsedCount(c => c + (hintUsed ? 1 : 0));
            setTimeout(() => nextQuestion(), 800);
        } else {
            setTimeout(() => setShowExplanation(true), 500);
        }
    };

    // ── Partial Progress Orchestrator (Simulation Logic) ─────────────────────
    const [simPartialScore, setSimPartialScore] = useState(0);
    const handleSimResult = useCallback((res) => {
        if (!res) return;
        
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
        return Math.min(100, Math.round(((score + simPartialScore) / questions.length) * 100));
    }, [score, simPartialScore, questions.length]);

    const nextQuestion = () => {
        setSimPartialScore(0);
        if (currentIdx < questions.length - 1) {
            const nextIdx = currentIdx + 1;
            
            // 🧠 DYNAMIC MODE RE-ROLL
            const nextQ = questions[nextIdx];
            const mode = dynamicModeService.getNextMode(null, nodeType, {
                isRecap: nextQ?.isRecap,
                isSimulation: nextQ?.isSimulation,
                engineType: nextQ ? getEngineType(nextQ) : 'MCQ'
            });
            setGameMode(mode);

            if (mode === 'speedrun') {
                dynamicModeService.startSpeedrun(18, () => {
                    window.dispatchEvent(new CustomEvent('manya-engine-timeout'));
                });
            } else {
                dynamicModeService.stopSpeedrun();
            }

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

            setCurrentIdx(nextIdx); setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setHintUsed(false); setAnswerChanged(false); setChangeCount(0); firstSelection.current = null; questionStartTime.current = Date.now();
        } else if (!isFinished) {
            setIsFinished(true);
            const finalScore = scoreRef.current;
            const mastery = Math.round((finalScore / questions.length) * 100);
            saveNodeCompletion(subject, questKey, nodeType, mastery);
            dispatch(checkAchievements());
            dispatch(syncUserData());
            
            // Story progression
            if (nodeType === 'MASTERY' && mastery >= 60) {
                const mapIndex = data?.questIndex ?? 0;
                if (mapIndex >= (user[`prog_${subject}`] || 0)) dispatch(updateProfile({ [`prog_${subject}`]: mapIndex + 1 }));
            }

            // Let QuestRunner handle the final celebration & rewards
            onComplete?.();
        }
    };

    const handleFinish = () => {
        onResult?.({ isCorrect: currentMastery >= 60, score: score + simPartialScore, total: questions.length, mastery: currentMastery, gemsEarned, type: 'adaptive_math' });
        onComplete?.();
    };
    const currentQ = questions[currentIdx];
    if (!currentQ && !isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-[var(--text-sub)]">
                <RefreshCw className="animate-spin mr-2" /> Finalizing Quest...
            </div>
        );
    }
    const eType = currentQ ? getEngineType(currentQ) : 'MCQ';
    
    // 🧠 v8.9 FIX: An MCQ from the database may have engine_type="SET_THEORY" 
    // (because it belongs to the Set Theory topic), but it should NOT be rendered 
    // as an interactive simulation. A real simulation has structural data like 
    // sets/zones/questions/interaction — an MCQ just has options/answer.
    const hasSimStructure = !!(
        currentQ?.data?.questions ||      // Simulation manifest with steps
        currentQ?.data?.sets ||           // Venn diagram sets definition  
        currentQ?.data?.zones ||          // Venn diagram region data
        currentQ?.data?.interaction ||    // Interactive element type
        currentQ?.sets ||                 // Root-level sets
        currentQ?.zones ||               // Root-level zones
        currentQ?.questions              // Root-level questions array
    );
    const isMCQ = !!(currentQ?.options && currentQ?.answer);
    const isSim = SUPPORTED_SIM_ENGINES.includes(eType) && hasSimStructure && !isMCQ;

    return (
        <MathRenderer 
            isLoading={isLoading} loadingConfig={getLoadingConfig('math')} randomFact={getRandomFact('math')}
            renderError={renderError} questions={questions} currentIdx={currentIdx}
            selectedOption={selectedOption} isAnswered={isAnswered} showExplanation={showExplanation}
            gemsEarned={gemsEarned} showGemToast={showGemToast} hintUsed={hintUsed} setHintUsed={setHintUsed}
            handleSelect={handleSelect} handleSubmit={handleSubmit} nextQuestion={nextQuestion} handleFinish={handleFinish}
            nodeType={nodeType} correctText={currentQ ? resolveCorrectText(currentQ.answer, currentQ.options) : ''}
            frustration={calculateFrustration(session)}
            userWasCorrect={isAnswered && validateMathAnswer(selectedOption, currentQ?.answer, currentQ?.options)}
            isLast={currentIdx === questions.length - 1}
            onSkip={nextQuestion}
            currentMode={gameMode}
            session={{
                ...session,
                mastery: currentMastery,
                correctCount: score + simPartialScore
            }}
            onFinish={handleFinish}
            SimulatorBridgeNode={isSim ? (
                <SimulatorBridge 
                    key={currentQ.id || currentIdx} 
                    step={currentQ}
                    onResult={handleSimResult}
                    onComplete={(results) => {
                        setSimPartialScore(0); // Reset partial on completion
                        const usp = results?.usp;
                        const isSuccess = usp ? !!usp.isPassing : !!(results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                        const timeSpent = usp ? (usp.duration || 30000) : (results?.duration || 30000);
                        
                        // 🧠 [Phase 3] Close the loop for Math Simulations
                        const baseId = (currentQ.id || '').replace(/-V\d+$/, '');
                        const log = {
                            questionId: currentQ.id,
                            isCorrect: isSuccess,
                            timeSpentMs: timeSpent,
                            // High-Fidelity Telemetry
                            idleTimeMs: results?.metrics?.idleTimeMs || 0,
                            tabSwitched: results?.metrics?.tabSwitched || false,
                            hesitationCount: results?.metrics?.hesitationCount || 0,
                            frustrationClicks: results?.metrics?.frustrationClicks || 0,
                            engine_type: 'SIMULATION',
                            pool: 'yes',
                            concept_id: baseId,
                            pointsEarned: isSuccess ? 25 : 5,
                            frustrationLevel: results?.metrics?.frustrationLevel || 0
                        };

                        ManyaDB.recordAnswer(subject, log);
                        syncService.pushAnswer(subject, log);
                        conceptMasteryService.updateAfterAnswer(subject, baseId, isSuccess);

                        dispatch(updateSessionAfterAnswer({ subject, isCorrect: isSuccess, hintUsed: false, answerChanged: false, timeSpentMs: timeSpent }));
                        
                        if (isSuccess) { 
                            setScore(p => p + 1); 
                            scoreRef.current += 1;
                            const nextGems = gemsEarned + 5;
                            const nextCoins = coinsEarnedState + 15;
                            setGemsEarned(nextGems);
                            setCoinsEarnedState(nextCoins);

                            onResult?.({
                                isCorrect: true,
                                score: scoreRef.current,
                                total: questions.length,
                                coinsEarned: nextCoins,
                                gemsEarned: nextGems,
                                type: 'answer'
                            });
                        }
                        nextQuestion();
                    }}
                    onAttempt={(attempt) => {
                        if (Date.now() - lastSimAttemptRef.current.time < 500) return;
                        lastSimAttemptRef.current = { time: Date.now(), label: attempt.label };
                        ManyaDB.recordAnswer(subject, { questionId: currentQ.id, isCorrect: attempt.isCorrect, selectedAnswer: attempt.label || 'SIM_ATTEMPT', engine_type: 'SIM_STEP' });
                    }}
                />
            ) : null}
        />
    );
}
