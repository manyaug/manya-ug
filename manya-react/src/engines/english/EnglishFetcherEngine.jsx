import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '../../infrastructure/audio/audioService.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { 
    updateSessionAfterAnswer, awardGems, resetSession, awardCoins, dropChest, addXP, checkAchievements, syncUserData
} from '../../store/userSlice';
// ── Gamification Domain (Headless) ───────────────────────────────────────────
import { trackAndPushEmotion } from '../../domain/gamification/emotionTracker.js';
import { shouldDropBronzeChest, rollChestRewards, masteryToStars, getStarBonusCoins, getQuestCompletionChest } from '../../domain/gamification/chestService.js';
import { getModeCoinMultiplier } from '../../domain/gamification/gameModeEngine.js';
import { achievementService } from '../../services/achievementService';
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

/**
 * ENGLISH FETCHER ENGINE v6.0 (Atomic Controller)
 * --------------------------------------------------
 * - DECOUPLED: Separates adaptive logic, UI, and bridge.
 * - Optimized for production readiness with seamless transitions.
 */
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
    const [hintUsed, setHintUsed] = useState(false);
    // ── Per-question interaction tracking (parity with Science/Math/SST) ──────
    const [answerChanged, setAnswerChanged] = useState(false);
    const [changeCount, setChangeCount]     = useState(0);

    const [recapSteps, setRecapSteps] = useState([]);
    const consecutiveWrongRef = useRef(0);
    const recapUsedIndexRef   = useRef(0);

    const questionStartTime = useRef(Date.now());
    const firstSelection    = useRef(null);   // tracks the very first click per question
    const fetchIterationRef = useRef(null);

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = 'english';
    const questKey = data?.questKey || `english/${topicId}`;
    const [gameMode, setGameMode] = useState('none');
    const [hintUsedCount, setHintUsedCount] = useState(0);

    useEffect(() => {
        const loadQuestions = async () => {
            if (fetchIterationRef.current === topicId) return;
            fetchIterationRef.current = topicId;
            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();
            
            try {
                // 1. Load Interactive Simulations
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

                // 2. Load Recap Resources
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

                // 3. Generate Adaptive Quest (passing simCandidates)
                const quest = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);
                let finalQuestions = quest.questions;
                if (quest.metadata?.gameMode) {
                    const gm = quest.metadata.gameMode.toLowerCase();
                    setGameMode(['quickfire','timed','marathon'].includes(gm) ? gm : 'none');
                }

                // Flatten Stories if Explore node (Modular Fallback Pattern)
                if (nodeType === 'EXPLORE' && finalQuestions.length > 0) {
                    const storyAnchor = finalQuestions[0];
                    const unitId = data?.unitId || 'default';
                    const targetQid = storyAnchor.qid || storyAnchor.id;
                    
                    const loaded = await loadQuestSteps(subject, unitId, topicId, targetQid);
                    
                    if (loaded?.steps?.length > 0) {
                        finalQuestions = loaded.steps.map(s => ({ 
                            ...s, 
                            item_type: 'QUEST_STORY', 
                            isSimulation: true 
                        }));
                    } else {
                        console.debug(`[EnglishEngine] No optional story found for ${targetQid}. Defaulting to adaptive MCQs.`);
                    }
                }

                setQuestions(finalQuestions);
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) {
                setIsLoading(false);
            }
        };
        loadQuestions();
    }, [topicId, nodeType]);

    /**
     * handleSelect — mirrors Science/Math/SST pattern.
     * Detects when the student changes their mind mid-question.
     */
    const handleSelect = (option) => {
        if (isAnswered) return;
        // First selection ever on this question
        if (!firstSelection.current) firstSelection.current = option;
        // Student changed their answer
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

        if (isCorrect) {
            setScore(s => s + 1);
            audioService.success?.();
            consecutiveWrongRef.current = 0;
            
            const amount = q.isSimulation ? 8 : 4;
            const modeMultiplier = getModeCoinMultiplier(gameMode);
            const coinReward = Math.floor((q.isSimulation ? 12 : 8) * modeMultiplier);

            dispatch(awardGems({ subject, amount, xp: q.isSimulation ? 20 : 10 }));
            if (coinReward > 0) dispatch(awardCoins(coinReward));

            // ── Emotion Tracking ───────────────────────────────────────
            trackAndPushEmotion({ isCorrect: true, hintUsed, answerChanged: false, changeCount: 0, timeSpentMs, frustrationLevel: 0 });

            // ── Bronze Chest random drop ────────────────────────────────
            if (shouldDropBronzeChest()) dispatch(dropChest({ chestType: 'bronze', rewards: rollChestRewards('bronze') }));

            setGemsEarned(g => g + amount);
            setShowGemToast(true);
            setHintUsedCount(c => c + (hintUsed ? 1 : 0));
            setTimeout(() => { setShowGemToast(false); nextQuestion(); }, 1500);
        } else {
            audioService.error?.();
            trackWrongAnswer(subject, q.qid || q.id);
            consecutiveWrongRef.current += 1;
            // Emotion on wrong
            trackAndPushEmotion({ isCorrect: false, hintUsed, answerChanged: false, changeCount: 0, timeSpentMs, frustrationLevel: 0 });

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
            setTimeout(() => setShowExplanation(true), 600);
        }
        // ── Persist answer (parity with Science/Math/SST) ────────────────────
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

        // ── Session state update (full payload) ───────────────────────────────
        dispatch(updateSessionAfterAnswer({ subject, isCorrect, hintUsed, answerChanged, timeSpentMs }));
        dispatch(checkAchievements());
        dispatch(syncUserData(store.getState().user.data));

        // ── Emotion Tracking (real values now) ────────────────────────────────
        trackAndPushEmotion({ isCorrect, hintUsed, answerChanged, changeCount, timeSpentMs, frustrationLevel });
    };

    const nextQuestion = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
            // Reset ALL per-question state — parity with other fetchers
            setSelectedOption(null);
            setIsAnswered(false);
            setShowExplanation(false);
            setHintUsed(false);
            setAnswerChanged(false);
            setChangeCount(0);
            firstSelection.current = null;
            questionStartTime.current = Date.now();
        } else {
            const mastery = calculateEnglishMastery(score, questions.length);
            const result = saveNodeCompletion(subject, questKey, nodeType, mastery);
            setJustFinished({ subject, questKey, nodeType, mastery, unlocked: result.unlocked });

            // ── Star + Chest + Coin completion rewards ────────────────────────
            const stars = masteryToStars(mastery);
            const bonusCoins = getStarBonusCoins(stars);
            if (bonusCoins > 0) dispatch(awardCoins(bonusCoins));
            const chestType = getQuestCompletionChest(stars);
            if (chestType) dispatch(dropChest({ chestType, rewards: rollChestRewards(chestType) }));
            if (result.xpReward) dispatch(addXP(result.xpReward));

            // ── Achievement Check (New Unified Engine) ──────────────────────────
            dispatch(checkAchievements());
            dispatch(syncUserData(store.getState().user.data));

            setCompletionResult({ mastery, score, total: questions.length, stars, bonusCoins, chestType });
            setShowCompletion(true);
            if (mastery >= 60) audioService.victory?.();
        }
    };

    if (isLoading) {
        const cfg = getLoadingConfig('english');
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6" />
                <p className="text-indigo-600 font-black uppercase tracking-[0.2em]">{cfg.title}</p>
                <div className="mt-4 p-4 bg-white rounded-2xl border border-indigo-100 max-w-xs text-center text-xs text-slate-500 font-bold">{getRandomFact('english')}</div>
            </div>
        );
    }

    if (showCompletion) {
        return (
            <CelebrationView 
                subject="English" nodeType={nodeType} mastery={completionResult.mastery} 
                score={completionResult.score} total={completionResult.total} 
                gemsEarned={gemsEarned} onCollect={() => onComplete?.()} 
            />
        );
    }

    const q = questions[currentIdx];
    if (!q) return null;

    if (q.isSimulation || q.item_type === 'QUEST_STORY') {
        return <EnglishBridge step={q} onComplete={nextQuestion} nodeType={nodeType} />;
    }

    return (
        <EnglishRenderer 
            currentQ={q} currentIdx={currentIdx} totalQuestions={questions.length}
            nodeType={nodeType} selectedOption={selectedOption} isAnswered={isAnswered}
            hintUsed={hintUsed} setHintUsed={setHintUsed}
            // Pass handleSelect (not raw setSelectedOption) so change tracking works
            setSelectedOption={handleSelect} handleSubmit={handleSubmit}
            correctText={resolveCorrectText(q.answer, q.options)} 
            userWasCorrect={verifyEnglishAnswer(selectedOption, q.answer, q.options)}
            frustration={calculateFrustration(session)} questMeta={null}
            gemsEarned={gemsEarned} showGemToast={showGemToast}
            onContinue={nextQuestion}
        />
    );
}
