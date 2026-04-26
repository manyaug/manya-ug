import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { 
    updateProfile, awardGems, addXP, resetSession, 
    updateSessionAfterAnswer, awardCoins, dropChest, checkAchievements, syncUserData 
} from '../../store/userSlice';
import { trackAndPushEmotion } from '../../domain/gamification/emotionTracker.js';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from '../../domain/gamification/chestService.js';
import { getModeCoinMultiplier } from '../../domain/gamification/gameModeEngine.js';
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

export default function SSTFetcherEngine({ data, onComplete, onResult }) {
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
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = 'sst';
    const questKey = data?.questKey || `sst/${topicId}`;
    const [gameMode, setGameMode] = useState('none');

    useEffect(() => {
        const loadQuestions = async () => {
            if (fetchIterationRef.current === topicId) return;
            fetchIterationRef.current = topicId;
            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();
            try {
                const simCandidates = [];
                let activeSims = data?.simResources || [];
                let activeRecaps = data?.recapResources || [];
                const allQuestions = await fetchSstQuestions(topicId);
                const userHistory = await ManyaDB.getAnswerHistory(subject);
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);
                setQuestions(quest.questions);
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) { setRenderError(err); setIsLoading(false); }
        };
        loadQuestions();
    }, [topicId]);

    const handleSelect = (option) => {
        if (isAnswered) return;
        if (!firstSelection.current) firstSelection.current = option;
        if (selectedOption !== null && selectedOption !== option) {
            setAnswerChanged(true); setChangeCount(c => c + 1);
        }
        setSelectedOption(option);
        audioService.pop?.();
    };

    const handleSubmit = () => {
        if (isAnswered || selectedOption === null) return;
        setIsAnswered(true);
        const q = questions[currentIdx];
        const isCorrect = isOptionCorrect(selectedOption, q.answer, q.options);
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
            const rephrased = findRephrased(q, allBankRef.current, questions);
            if (rephrased) setQuestions(prev => [...prev, rephrased]);
            consecutiveWrongRef.current += 1;
        }

        const frustration = calculateFrustration(session);
        const log = { questionId: q.id, isCorrect, selectedAnswer: selectedOption, correctAnswer: q.answer, timeSpentMs, hintUsed, answerChanged, changeCount, frustrationLevel: frustration?.score || 0 };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        onResult?.({ isCorrect, score: scoreRef.current, total: questions.length, type: 'answer' });
        trackAndPushEmotion({ isCorrect, hintUsed, answerChanged, changeCount, timeSpentMs, frustrationLevel: frustration?.score || 0 });

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
            setTimeout(() => { setShowGemToast(false); nextQuestion(); }, 1500);
        } else {
            setHintUsedCount(c => c + (hintUsed ? 1 : 0));
            setTimeout(() => { setShowExplanation(true); }, 600);
        }
    };

    const nextQuestion = () => {
        setSimPartialScore(0);
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

            dispatch(syncUserData(store.getState().user.data));

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
        onResult?.({ isCorrect: mastery >= 60, score: completionResult?.score || scoreRef.current, total: completionResult?.total || questions.length, mastery, gemsEarned, type: 'adaptive_sst' });
        onComplete?.();
    };

    if (showCompletion && completionResult) {
        return (
            <CelebrationView 
                subject="SST" 
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
    const eType = q ? getEngineType(q) : 'MCQ';
    const isSim = SUPPORTED_SIM_ENGINES.includes(eType);

    return (
        <SSTRenderer 
            isLoading={isLoading} loadingConfig={getLoadingConfig('sst')} randomFact={getRandomFact('sst')}
            questions={questions} currentIdx={currentIdx} selectedOption={selectedOption} isAnswered={isAnswered}
            showExplanation={showExplanation} gemsEarned={gemsEarned} showGemToast={showGemToast}
            handleSelect={handleSelect} handleSubmit={handleSubmit} nextQuestion={nextQuestion}
            onFinish={handleFinish} nodeType={nodeType} 
            session={{
                ...session,
                mastery: currentMastery,
                correctCount: scoreRef.current + simPartialScore
            }}
            SimulatorBridgeNode={isSim ? (
                <SimulatorBridge 
                    key={q.id || currentIdx} step={q}
                    onResult={handleSimResult}
                    onComplete={(results) => {
                        setSimPartialScore(0);
                        const usp = results?.usp;
                        const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                        const timeSpent = usp ? (usp.duration || 30000) : (results?.duration || 30000);
                        dispatch(updateSessionAfterAnswer({ isCorrect: isSuccess, hintUsed: false, answerChanged: false, timeSpentMs: timeSpent }));
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: isSuccess, selectedAnswer: 'COMPLETED', engine_type: 'SIMULATION' });
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
