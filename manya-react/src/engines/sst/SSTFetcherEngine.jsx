import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import {
    updateProfile, awardGems, resetSession,
    updateSessionAfterAnswer, awardCoins, dropChest, checkAchievements, syncUserData
} from '../../store/userSlice';
import { trackAndPushEmotion } from '../../domain/gamification/emotionTracker.js';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from '../../domain/gamification/chestService.js';
import { getModeCoinMultiplier } from '../../domain/gamification/gameModeEngine.js';
import { dynamicModeService } from '../../domain/gamification/dynamicModeService';
import { rewardManager } from '../../domain/gamification/rewardManager.js';
import { fetchSstQuestions } from '../../services/sstMockDB';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../infrastructure/db/manyaDB.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';
import { preloadCurriculum } from '../../services/curriculumService';
import { loadQuestSteps } from '../../utils/questLoader';
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';
import { saveNodeCompletion, trackWrongAnswer, resolveRephrased, setJustFinished } from '../../domain/progress/questProgressService.js';
import {
    SUPPORTED_SIM_ENGINES, getEngineType, isOptionCorrect,
    resolveCorrectText, findRephrased
} from './SSTLogic';
import SimulatorBridge from './SimulatorBridge';
import SSTRenderer from './SSTRenderer';
import CelebrationView from '../../views/CelebrationView.jsx';
import '../../styles/mcq-engine.css';

export default function SSTFetcherEngine({ data, onComplete, onResult, nodeType }) {
    const dispatch = useDispatch();
    const store = useStore();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);

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
    const [hintUsedCount, setHintUsedCount] = useState(0);

    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef = useRef(0);
    const allBankRef = useRef([]);
    const questionStartTime = useRef(Date.now());
    const firstSelection = useRef(null);
    const scoreRef = useRef(0);
    const fetchIterationRef = useRef(0);
    const [simPartialScore, setSimPartialScore] = useState(0);

    const handleSimResult = useCallback((res) => {
        if (!res) return;
        if (res.total > 0 && res.score !== undefined) {
            const fractional = res.score / res.total;
            setSimPartialScore(fractional);

            // Notify parent HUD live
            onResult?.({
                isCorrect: res.isCorrect,
                score: scoreRef.current + fractional,
                total: questions.length,
                type: 'partial_sim'
            });
        }
    }, [questions.length, onResult]);

    const currentMastery = useMemo(() => {
        if (!questions.length) return 0;
        return Math.min(100, Math.round(((scoreRef.current + simPartialScore) / questions.length) * 100));
    }, [score, simPartialScore, questions.length]);

    const topicId = data?.topic || 'default';
    const subject = 'sst';
    const questKey = data?.questKey || `sst/${topicId}`;
    const [gameMode, setGameMode] = useState(data?.currentMode || 'none');

    useEffect(() => {
        if (data?.currentMode) setGameMode(data.currentMode);
    }, [data?.currentMode]);

    useEffect(() => {
        const loadQuestions = async () => {
            if (fetchIterationRef.current === topicId) return;
            fetchIterationRef.current = topicId;
            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();
            try {
                const simCandidates = [];
                const activeSims = data?.simResources || [];
                const activeRecaps = data?.recapResources || [];

                // 🌐 FETCH REMOTE RESOURCES (v5.1 - Parallelized)
                const fetchResource = async (res) => {
                    const file = typeof res === 'string' ? res : res?.file;
                    if (!file || typeof file !== 'string') return [];
                    const fileName = file.endsWith('.json') ? file : `${file}.json`;
                    
                    // Fallback: If unitId is missing, try to infer it from topicId or questKey context
                    let resolvedUnitId = data.unitId;
                    let resolvedFolder = data.questFolder || topicId;

                    if (!resolvedUnitId && questKey) {
                        const parts = questKey.split('/');
                        if (parts.length >= 3) {
                            resolvedUnitId = parts[1];
                            resolvedFolder = parts[2];
                        }
                    }

                    resolvedUnitId = resolvedUnitId || 'default';

                    try {
                        const { steps } = await loadQuestSteps(subject, resolvedUnitId, resolvedFolder, fileName);
                        return (steps || []).map(s => {
                            const eType = getEngineType(s);
                            return { 
                                ...s, 
                                isSimulation: SUPPORTED_SIM_ENGINES.includes(eType), 
                                id: s.id || `remote_${file.replace('.json','')}_${Math.random()}` 
                            };
                        });
                    } catch (e) { return []; }
                };

                // Fetch everything in parallel
                const [simResults, recapResults, allQuestions] = await Promise.all([
                    Promise.all(activeSims.map(res => fetchResource(res))),
                    Promise.all(activeRecaps.map(res => fetchResource(res))),
                    fetchSstQuestions(topicId)
                ]);

                simResults.forEach(steps => simCandidates.push(...steps));
                recapResults.forEach(steps => {
                    steps.forEach(s => { s.isRecap = true; });
                    simCandidates.push(...steps);
                });

                const userHistory = await ManyaDB.getAnswerHistory(subject);
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);
                allBankRef.current = allQuestions;
                
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
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) { setRenderError(err); setIsLoading(false); }
        };
        loadQuestions();
    }, [topicId]);

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

    const handleSelect = (option) => {
        if (isAnswered) return;
        setHintUsed(false);
        if (!firstSelection.current) firstSelection.current = option;
        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true); setChangeCount(c => c + 1);
        }
        setSelectedOption(option);
        audioService.playSFX('tap');
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);
        const q = questions[currentIdx];
        const isCorrect = isOptionCorrect(selectedOption, q.answer, q.options);
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
            correctAnswer: q.answer,
            timeSpentMs,
            hintUsed,
            answerChanged,
            changeCount,
            hesitationCount: changeCount,
            confidenceRating,
            timeToFirstClick,
            pointsEarned: isCorrect ? 10 : 0,
            frustrationLevel: frustration?.score || 0
        };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        onResult?.({ isCorrect, score: scoreRef.current, total: questions.length, type: 'answer' });
        trackAndPushEmotion({ isCorrect, hintUsed, answerChanged, changeCount, timeSpentMs, frustrationLevel: frustration?.score || 0 });

        // 🧠 Update dynamic mode metrics BEFORE nextQuestion re-rolls
        dynamicModeService.update(isCorrect, currentMastery, questions.length, currentIdx);

        // ── Unified Reward Logic ────────────────────────────────────────────
        if (isCorrect) {
            setScore(s => s + 1);
            scoreRef.current += 1;
            audioService.success?.();
            consecutiveWrongRef.current = 0;

            const awards = rewardManager.awardStepRewards({
                subject, hintUsed, streak: user.current_streak, gameMode, isSimulation: false
            }, dispatch);

            setCoinsEarnedState(prev => prev + awards.coins);
            setGemsEarned(g => g + awards.gems);

            setShowGemToast(true);

            // --- ⚡ LIVE SYNC (Manya v4.5) ---
            dispatch(checkAchievements());
            dispatch(syncUserData());

            setTimeout(() => { setShowGemToast(false); nextQuestion(); }, 1500);
        } else {
            audioService.error?.();
            setHintUsedCount(c => c + (hintUsed ? 1 : 0));
            setTimeout(() => { setShowExplanation(true); }, 600);
        }
    };

    const nextQuestion = () => {
        setSimPartialScore(0);
        if (currentIdx < questions.length - 1) {
            const nextIdx = currentIdx + 1;
            
            // 🧠 DYNAMIC MODE RE-ROLL
            const mode = dynamicModeService.getNextMode(null, nodeType);
            setGameMode(mode);

            // 1. Handle Speedrun
            if (mode === 'speedrun') {
                dynamicModeService.startSpeedrun(18, () => {
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
                    if (nextQ && !nextQ.isReverse) {
                        const bank = allBankRef.current.length > 0 ? allBankRef.current : copy;
                        const reversed = dynamicModeService.generateReverseQuestion(nextQ, bank);
                        if (reversed) {
                            reversed.isReverse = true;
                            copy[nextIdx] = reversed;
                        }
                    }
                    return copy;
                });
            }

            setCurrentIdx(nextIdx); 
            setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setHintUsed(false); setAnswerChanged(false); setChangeCount(0); firstSelection.current = null; questionStartTime.current = Date.now();
        } else if (!isFinished) {
            setIsFinished(true);
            saveNodeCompletion(subject, questKey, nodeType, currentMastery);
            // Let QuestRunner handle the final celebration & rewards
            onComplete?.();
        }
    };

    const handleFinish = () => {
        onResult?.({ isCorrect: currentMastery >= 60, score: scoreRef.current, total: questions.length, mastery: currentMastery, gemsEarned, type: 'adaptive_sst' });
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
    const isSim = SUPPORTED_SIM_ENGINES.includes(eType);

    return (
        <SSTRenderer
            isLoading={isLoading} loadingConfig={getLoadingConfig('sst')} randomFact={getRandomFact('sst')}
            questions={questions} currentIdx={currentIdx} selectedOption={selectedOption} isAnswered={isAnswered}
            showExplanation={showExplanation} gemsEarned={gemsEarned} showGemToast={showGemToast}
            handleSelect={handleSelect} handleSubmit={handleSubmit} nextQuestion={nextQuestion}
            handleFinish={handleFinish} nodeType={nodeType} currentMode={gameMode}
            isOptionCorrect={isOptionCorrect}
            correctText={resolveCorrectText(currentQ?.answer, currentQ?.options)}
            session={{
                ...session,
                mastery: currentMastery,
                correctCount: scoreRef.current + simPartialScore
            }}
            SimulatorBridgeNode={isSim ? (
                <SimulatorBridge
                    key={currentQ.id || currentIdx} step={currentQ}
                    onResult={handleSimResult}
                    onComplete={(results) => {
                        setSimPartialScore(0);
                        const usp = results?.usp;
                        const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                        const timeSpent = usp ? (usp.duration || 30000) : (results?.duration || 30000);
                        dispatch(updateSessionAfterAnswer({ isCorrect: isSuccess, hintUsed: false, answerChanged: false, timeSpentMs: timeSpent }));
                        ManyaDB.recordAnswer(subject, { questionId: currentQ.id, isCorrect: isSuccess, selectedAnswer: 'COMPLETED', engine_type: 'SIMULATION' });
                        if (isSuccess) {
                            setScore(p => p + 1);
                            scoreRef.current += 1;
                            setGemsEarned(p => p + 5);
                        }
                        nextQuestion();
                    }}
                />
            ) : null}
        />
    );
}
