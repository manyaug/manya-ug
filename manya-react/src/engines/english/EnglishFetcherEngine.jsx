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

export default function EnglishFetcherEngine({ data, onComplete, onResult }) {
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
    const scoreRef          = useRef(0);
    const [simPartialScore, setSimPartialScore] = useState(0);

    const handleSimResult = useCallback((res) => {
        if (!res) return;
        if (res.total > 0 && res.score !== undefined) {
            const fractional = res.score / res.total;
            setSimPartialScore(fractional);
            
            // Notify parent HUD live
            onResult?.({
                isCorrect: true,
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
    const nodeType = data?.nodeType || 'PRACTICE';
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
                if (data?.simResources?.length > 0) {
                    for (const simRes of data.simResources) {
                        try {
                            const fileName = simRes.file.endsWith('.json') ? simRes.file : `${simRes.file}.json`;
                            const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            steps.forEach(s => {
                                const eType = getEngineType(s);
                                s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                                s.id = s.id || `sim_${simRes.file.replace('.json', '')}`;
                            });
                            simCandidates.push(...steps);
                        } catch (e) { console.warn(`[EnglishEngine] Sim Load Error:`, e); }
                    }
                }

                if (data?.recapResources?.length > 0) {
                    const candidates = [];
                    for (const recapRes of data.recapResources) {
                        try {
                            const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                            const { steps: rSteps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                            rSteps.forEach((s, idx) => { 
                                const eType = getEngineType(s);
                                s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                                s.isRecap = true; 
                                s.id = s.id || `recap_${idx}`; 
                            });
                            candidates.push(...rSteps);
                        } catch (e) { console.warn(`[EnglishEngine] Recap Load Error:`, e); }
                    }
                    setRecapSteps(candidates);
                }

                const allQuestions = await fetchEnglishQuestions(topicId);
                const userHistory = await ManyaDB.getAnswerHistory(subject);
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);
                setQuestions(quest.questions);
                if (quest.metadata?.gameMode) {
                    const gm = quest.metadata.gameMode.toLowerCase();
                    setGameMode(['quickfire','timed','marathon'].includes(gm) ? gm : 'none');
                }
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) { console.error(err); setIsLoading(false); }
        };
        loadQuestions();
    }, [topicId]);

    const handleSelect = (option) => {
        if (isAnswered) return;
        if (!firstSelection.current) firstSelection.current = option;
        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true);
            setChangeCount(c => c + 1);
        }
        setSelectedOption(option);
        audioService.pop?.();
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
            
            setShowGemToast(true);
            setTimeout(() => { setShowGemToast(false); nextQuestion(); }, 2200);
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

        const log = {
            questionId: q.id || q.qid, isCorrect,
            selectedAnswer: selectedOption,
            correctAnswer: resolveCorrectText(q.answer, q.options),
            timeSpentMs, hintUsed, answerChanged, changeCount,
            pool: q.isPLE ? 'yes' : 'no',
            concept_id: baseId,
            engine_type: q.isSimulation ? 'SIMULATION' : 'MCQ',
            frustrationLevel,
        };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        // Notify parent live
        onResult?.({
            isCorrect,
            score: scoreRef.current,
            total: questions.length,
            type: 'answer'
        });

    };

    const [isFinished, setIsFinished] = useState(false);

    const nextQuestion = (results) => {
        setSimPartialScore(0); // Reset partial on step advance

        // If this was a simulation result, evaluate success
        if (results) {
            const isSuccess = results.usp ? results.usp.isPassing : (results.score >= (results.total * 0.6) || results.isCorrect);
            if (isSuccess) {
                scoreRef.current += 1;
                setGemsEarned(p => p + 5);
            }
        }

        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1); setSelectedOption(null); setIsAnswered(false); setShowExplanation(false); setHintUsed(false); setAnswerChanged(false); setChangeCount(0); firstSelection.current = null; questionStartTime.current = Date.now();
        } else if (!isFinished) {
            setIsFinished(true);
            const finalScore = scoreRef.current;
            const mastery = Math.round((finalScore / questions.length) * 100);
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            
            // ── Quest Completion Rewards ─────────────────────────────────────
            const completion = rewardManager.awardQuestRewards({ mastery, nodeType }, dispatch);
            const finalTotalCoins = coinsEarnedState + completion.bonusCoins;

            dispatch(syncUserData());

            setCompletionResult({ 
                mastery, 
                score: finalScore, 
                total: questions.length, 
                stars: completion.stars, 
                bonusCoins: finalTotalCoins, 
                chestType: completion.chestType 
            });
            setShowCompletion(true);
        }
    };

    const handleFinish = () => {
        const mastery = completionResult?.mastery || 0;
        onResult?.({ isCorrect: mastery >= 60, score: completionResult?.score || scoreRef.current, total: completionResult?.total || questions.length, mastery, gemsEarned, type: 'adaptive_english' });
        onComplete?.();
    };

    if (showCompletion && completionResult) {
        return (
            <CelebrationView 
                subject="English" 
                nodeType={nodeType} 
                mastery={completionResult.mastery} 
                score={completionResult.score} 
                total={completionResult.total} 
                stars={completionResult.stars}
                coinsEarned={completionResult.bonusCoins}
                onCollect={handleFinish} 
            />
        );
    }

    const q = questions[currentIdx];
    const isSim = q ? q.isSimulation : false;

    return (
        <EnglishRenderer 
            isLoading={isLoading} 
            loadingConfig={getLoadingConfig('english')} 
            randomFact={getRandomFact('english')}
            currentQ={q}
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
            correctText={resolveCorrectText(q?.answer, q?.options)}
            userWasCorrect={isAnswered && verifyEnglishAnswer(selectedOption, q?.answer, q?.options)}
            session={{
                ...session,
                mastery: currentMastery,
                correctCount: scoreRef.current + simPartialScore
            }} 
            BridgeNode={isSim ? <EnglishBridge key={q.id} step={q} nodeType={nodeType} onComplete={nextQuestion} onResult={handleSimResult} /> : null}
        />
    );
}
