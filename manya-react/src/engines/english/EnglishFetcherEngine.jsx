import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { 
    updateSessionAfterAnswer, awardGems, resetSession, awardCoins, dropChest, checkAchievements, syncUserData
} from '../../store/userSlice';
// ── Gamification Domain (Headless) ───────────────────────────────────────────
import { trackAndPushEmotion } from '../../domain/gamification/emotionTracker.js';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from '../../domain/gamification/chestService.js';
import { getModeCoinMultiplier } from '../../domain/gamification/gameModeEngine.js';
import { dynamicModeService } from '../../domain/gamification/dynamicModeService';
import { rewardManager } from '../../domain/gamification/rewardManager.js';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { 
    fetchEnglishQuestions 
} from '../../services/englishMockDB';
import { generateAdaptiveQuest } from '../../services/adaptiveEngine';
import { ManyaDB } from '../../infrastructure/db/manyaDB.js';
import { loadQuestSteps } from '../../utils/questLoader';
import { preloadCurriculum } from '../../services/curriculumService';
import { saveNodeCompletion, trackWrongAnswer, setJustFinished } from '../../domain/progress/questProgressService.js';
import { calculateFrustration } from '../../domain/psych/psychTracker.js';
import { getLoadingConfig, getRandomFact } from '../../config/loadingData';
import '../../styles/mcq-engine.css';

import EnglishRenderer from './EnglishRenderer';
import EnglishBridge from './EnglishBridge';
import CelebrationView from '../../views/CelebrationView.jsx';
import { 
    verifyEnglishAnswer, resolveCorrectText, calculateEnglishMastery, 
    checkRescueInjection, SUPPORTED_SIM_ENGINES, getEngineType 
} from './EnglishLogic';

export default function EnglishFetcherEngine({ data, onComplete, onResult, nodeType }) {
    const dispatch = useDispatch();
    const store    = useStore();
    const session  = useSelector(state => state.user.session);
    const user     = useSelector(state => state.user.data);

    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);
    const [gemsEarned, setGemsEarned] = useState(0);
    const [showGemToast, setShowGemToast] = useState(false);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionResult, setCompletionResult] = useState(null);
    const [coinsEarnedState, setCoinsEarnedState] = useState(0);
    const [hintUsed, setHintUsed] = useState(false);
    const [answerChanged, setAnswerChanged] = useState(false);
    const [changeCount, setChangeCount]     = useState(0);
    const [recapSteps, setRecapSteps] = useState([]);
    const [gameMode, setGameMode] = useState('none');
    const [hintUsedCount, setHintUsedCount] = useState(0);

    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef   = useRef(0);
    const questionStartTime = useRef(Date.now());
    const firstSelection    = useRef(null);
    const fetchIterationRef = useRef(null);
    const allBankRef        = useRef([]);
    const scoreRef          = useRef(0);
    const [simPartialScore, setSimPartialScore] = useState(0);

    const handleSimResult = useCallback((res) => {
        if (!res) return;
        if (res.total > 0 && res.score !== undefined) {
            const fractional = res.score / res.total;
            setSimPartialScore(fractional);
        }
    }, [questions.length, onResult]);

    const currentMastery = useMemo(() => {
        if (!questions.length) return 0;
        return Math.min(100, Math.round(((scoreRef.current + simPartialScore) / questions.length) * 100));
    }, [score, simPartialScore, questions.length]);

    const topicId = data?.topic || 'default';
    const subject = 'english';
    const questKey = data?.questKey || `english/${topicId}`;

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

                // 🌐 FETCH REMOTE RESOURCES (v5.1 - Unified GitHub CDN Loader)
                const fetchResource = async (res) => {
                    const file = typeof res === 'string' ? res : res?.file;
                    if (!file) return [];
                    const fileName = file.endsWith('.json') ? file : `${file}.json`;
                    try {
                        const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                        return (steps || []).map(s => {
                            const eType = getEngineType(s);
                            return { ...s, isSimulation: SUPPORTED_SIM_ENGINES.includes(eType), id: s.id || `remote_${file.replace('.json','')}_${Math.random()}` };
                        });
                    } catch (e) { console.warn(`[English] Failed to load ${file}`, e); return []; }
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

                const allQuestions = await fetchEnglishQuestions(topicId);
                const userHistory = await ManyaDB.getAnswerHistory(subject);
                allBankRef.current = allQuestions;
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
                if (quest.metadata?.gameMode) {
                    const gm = quest.metadata.gameMode.toLowerCase();
                    setGameMode(['quickfire','timed','marathon'].includes(gm) ? gm : 'none');
                }
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) { console.error(err); setIsLoading(false); }
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
        if (!firstSelection.current) firstSelection.current = option;
        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true);
            setChangeCount(c => c + 1);
        }
        setSelectedOption(option);
        audioService.playSFX('tap');
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);

        const q = questions[currentIdx];
        const isCorrect = verifyEnglishAnswer(selectedOption, q.answer, q.options);
        const timeSpentMs = Date.now() - questionStartTime.current;
        const frustration = calculateFrustration(session);
        const frustrationLevel = frustration?.score || 0;
        const baseId = (q.id || q.qid || '').replace(/-V\d+$/, '');

        // ── Unified Reward Logic ────────────────────────────────────────────
        dispatch(updateSessionAfterAnswer({ subject, isCorrect, hintUsed, answerChanged, timeSpentMs }));
        
        if (isCorrect) {
            setScore(s => s + 1);
            scoreRef.current += 1;
            audioService.success?.();
            consecutiveWrongRef.current = 0;

            const awards = rewardManager.awardStepRewards({
                subject, hintUsed, streak: user.current_streak, gameMode, isSimulation: q.isSimulation || false
            }, dispatch);

            setCoinsEarnedState(prev => prev + awards.coins);
            setGemsEarned(g => g + awards.gems);
            
            // --- ⚡ LIVE SYNC (Manya v4.5) ---
            dispatch(checkAchievements());
            dispatch(syncUserData());
            
            setShowGemToast(true);
            setTimeout(() => { setShowGemToast(false); nextQuestion(); }, 1500);
        } else {
            audioService.error?.();
            trackWrongAnswer(subject, q.qid || q.id);
            consecutiveWrongRef.current += 1;
            if (checkRescueInjection(consecutiveWrongRef.current, recapSteps, nodeType)) {
                const recapIdx = recapUsedIndexRef.current % recapSteps.length;
                setQuestions(prev => {
                    const copy = [...prev];
                    copy.splice(currentIdx + 1, 0, { ...recapSteps[recapIdx] });
                    return copy;
                });
                recapUsedIndexRef.current += 1;
                consecutiveWrongRef.current = 0;
            }
            setTimeout(() => setShowExplanation(true), 1500);
        }

        const timeToFirstClickMs = firstSelection.current ? (Date.now() - questionStartTime.current) : 0;
        const pointsEarned = isCorrect ? (10 + (timeSpentMs < 5000 ? 5 : 0)) : 0;

        const log = {
            questionId: q.id || q.qid, isCorrect,
            selectedAnswer: selectedOption,
            correctAnswer: resolveCorrectText(q.answer, q.options),
            timeSpentMs, hintUsed, answerChanged, changeCount,
            timeToFirstClickMs, pointsEarned,
            pool: q.isPLE ? 'yes' : 'no',
            concept_id: baseId,
            engine_type: q.isSimulation ? 'SIMULATION' : 'MCQ',
            frustrationLevel,
        };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        // ── Emotion Tracking (New Premium Feature 🧠) ───────────────────────
        trackAndPushEmotion({
            isCorrect, hintUsed, answerChanged, changeCount,
            timeSpentMs, frustrationLevel, timeToFirstClickMs
        });

        // Notify parent live
        onResult?.({
            isCorrect,
            score: scoreRef.current,
            total: questions.length,
            type: 'answer'
        });

        // 🧠 Update dynamic mode metrics BEFORE nextQuestion re-rolls
        dynamicModeService.update(isCorrect, currentMastery, questions.length, currentIdx);

    };

    const [isFinished, setIsFinished] = useState(false);

    const nextQuestion = (results = null) => {
        setSimPartialScore(0);
        if (results) {
            const isSuccess = results.usp ? results.usp.isPassing : (results.score >= (results.total * 0.6) || results.isCorrect);
            if (isSuccess) {
                scoreRef.current += 1;
                setGemsEarned(p => p + 5);
            }
        }
        if (currentIdx < questions.length - 1) {
            const nextIdx = currentIdx + 1;
            
            // 🧠 DYNAMIC MODE RE-ROLL
            const mode = dynamicModeService.getNextMode(null, nodeType);
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
                        const bank = allBankRef.current.length > 0 ? allBankRef.current : copy;
                        const reversed = dynamicModeService.generateReverseQuestion(nextQ, bank);
                        if (reversed) {
                            reversed.isReversed = true;
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
            const finalScore = scoreRef.current;
            const mastery = Math.round((finalScore / questions.length) * 100);
            saveNodeCompletion(subject, questKey, nodeType, mastery);
            dispatch(syncUserData());
            
            // Let QuestRunner handle the final celebration & rewards
            onComplete?.();
        }
    };

    const handleFinish = () => {
        onResult?.({ isCorrect: currentMastery >= 60, score: scoreRef.current, total: questions.length, mastery: currentMastery, gemsEarned, type: 'adaptive_english' });
        onComplete?.();
    };

    const currentQ = questions[currentIdx];
    const isSim = currentQ ? currentQ.isSimulation : false;

    return (
        <EnglishRenderer 
            isLoading={isLoading} 
            loadingConfig={getLoadingConfig('english')} 
            randomFact={getRandomFact('english')}
            currentQ={currentQ}
            currentIdx={currentIdx}
            totalQuestions={questions.length}
            selectedOption={selectedOption}
            isAnswered={isAnswered}
            hintUsed={hintUsed}
            setHintUsed={setHintUsed}
            setSelectedOption={setSelectedOption}
            showExplanation={showExplanation}
            gemsEarned={gemsEarned}
            showGemToast={showGemToast}
            handleSelect={handleSelect}
            handleSubmit={handleSubmit}
            onContinue={nextQuestion}
            onFinish={handleFinish}
            nodeType={nodeType}
            currentMode={gameMode}
            correctText={resolveCorrectText(currentQ?.answer, currentQ?.options)}
            userWasCorrect={isAnswered && verifyEnglishAnswer(selectedOption, currentQ?.answer, currentQ?.options)}
            session={{
                ...session,
                mastery: currentMastery,
                correctCount: scoreRef.current + simPartialScore
            }} 
            BridgeNode={isSim ? <EnglishBridge key={currentQ.id} step={currentQ} nodeType={nodeType} onComplete={nextQuestion} onResult={handleSimResult} /> : null}
        />
    );
}
