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
import { fetchSstQuestions } from '../../services/sstMockDB';
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
    SUPPORTED_SIM_ENGINES, getEngineType, isOptionCorrect, 
    resolveCorrectText, findRephrased 
} from './SSTLogic';
import SimulatorBridge from './SimulatorBridge';
import SSTRenderer from './SSTRenderer';
import CelebrationView from '../../views/CelebrationView.jsx';
import '../../styles/mcq-engine.css';

/**
 * MANYA SST FETCHER ENGINE v4.0 (Atomic)
 * -------------------------------------------------------------
 * - DECOUPLED: Separates adaptive quest logic, simulation routing, and MCQ visuals.
 */
export default function SSTFetcherEngine({ data, onComplete, onResult }) {
    const dispatch = useDispatch();
    const store = useStore();
    const user = useSelector(state => state.user.data);
    const session = useSelector(state => state.user.session);
    
    // State
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

    const topicId = data?.topic || 'default';
    const nodeType = data?.nodeType || 'PRACTICE';
    const subject = data?.subject || 'sst';
    const questKey = data?.questKey || `sst/${topicId}`;
    const [gameMode, setGameMode] = useState('none');
    const [hintUsedCount, setHintUsedCount] = useState(0);

    // --- 🪄 INITIALIZATION ---
    useEffect(() => {
        const loadQuestions = async () => {
            setIsLoading(true);
            dispatch(resetSession());
            preloadCurriculum();

            try {
                const simCandidates = [];
                // --- 📦 RESOURCE COMPATIBILITY LAYER (v4.6) ---
                // If the Runner passed a generic 'resources' array, split it into sim and recap
                let activeSims = data?.simResources || [];
                let activeRecaps = data?.recapResources || [];

                if (activeSims.length === 0 && activeRecaps.length === 0 && data?.resources) {
                    data.resources.forEach(res => {
                        const file = res.file || '';
                        // Identify Sim vs Recap based on filename or title
                        if (file.includes('globe') || file.includes('map') || file.includes('simulation') || file.includes('stage')) {
                            activeSims.push(res);
                        } else if (file.includes('recap') || file.includes('summary') || file.includes('reader')) {
                            activeRecaps.push(res);
                        } else {
                            // Default to sim if unknown but from resources
                            activeSims.push(res);
                        }
                    });
                }

                // --- 🌍 LOAD INTERACTIVE RESOURCES (v4.7 - No Type Filter) ---
                console.log(`🌍 [SSTEngine] Loading ${activeSims.length} sims, ${activeRecaps.length} recaps. unitId=${data.unitId}, topic=${topicId}`);

                for (const simRes of activeSims) {
                    try {
                        const fileName = simRes.file.endsWith('.json') ? simRes.file : `${simRes.file}.json`;
                        // v4.7: Removed targetType filter — SST JSONs aren't tagged as SIMULATION in the vault
                        const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                        console.log(`✅ [SSTEngine] Loaded sim "${simRes.file}" → ${steps.length} steps`);
                        steps.forEach((s, idx) => {
                            const eType = getEngineType(s);
                            s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                            s.id = s.id || `sim_${simRes.file.replace('.json', '')}_${idx}`;
                            s.subject = 'sst'; // 🏺 Force SST categorization
                            if (s.data) s.data.subject = 'sst';
                        });
                        simCandidates.push(...steps);
                    } catch (e) { console.warn(`[SSTEngine] Sim Error for "${simRes.file}": ${e.message}`); }
                }

                const recapCandidates = [];
                for (const recapRes of activeRecaps) {
                    try {
                        const fileName = recapRes.file.endsWith('.json') ? recapRes.file : `${recapRes.file}.json`;
                        const { steps } = await loadQuestSteps(subject, data.unitId || 'default', topicId, fileName);
                        console.log(`✅ [SSTEngine] Loaded recap "${recapRes.file}" → ${steps.length} steps`);
                        steps.forEach((s, idx) => {
                            const eType = getEngineType(s);
                            s.isSimulation = SUPPORTED_SIM_ENGINES.includes(eType);
                            s.isRecap = true;
                            s.id = s.id || `recap_${recapRes.file.replace('.json', '')}_${idx}`;
                            s.subject = 'sst'; // 🏺 Force SST categorization
                            if (s.data) s.data.subject = 'sst';
                        });
                        recapCandidates.push(...steps);
                    } catch (e) { console.warn(`[SSTEngine] Recap Error for "${recapRes.file}": ${e.message}`); }
                }
                setRecapSteps(recapCandidates);
                console.log(`🌍 [SSTEngine] Total: ${simCandidates.length} sim steps, ${recapCandidates.length} recap steps`);

                let allQuestions = [];
                try {
                    const raw = await fetchSstQuestions(topicId);
                    allQuestions = raw.map(q => ({ ...q, id: String(q.id || q.qid) }));
                } catch (dbErr) { console.warn(`[SSTEngine] DB fetch failed: ${dbErr.message}`); }
                allBankRef.current = allQuestions;

                if (allQuestions.length === 0 && simCandidates.length === 0) {
                    setIsLoading(false); return;
                }

                const userHistory = await ManyaDB.getAnswerHistory(subject);
                let finalQuestions;
                let questResult = null;

                if (allQuestions.length > 0) {
                    questResult = await generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, userHistory, simCandidates);
                    finalQuestions = questResult.questions;
                } else {
                    finalQuestions = [...simCandidates].sort(() => 0.5 - Math.random());
                }
                
                setQuestions(finalQuestions);
                
                if (questResult?.metadata?.gameMode) {
                    const gm = questResult.metadata.gameMode.toLowerCase();
                    setGameMode(['quickfire','timed','marathon'].includes(gm) ? gm : 'none');
                }
                setTimeout(() => setIsLoading(false), 300);
            } catch (err) { setRenderError(err); setIsLoading(false); }
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
        const isCorrect = isOptionCorrect(selectedOption, q.answer, q.options);
        const timeSpentMs = Date.now() - questionStartTime.current;

        if (isCorrect) {
            setScore(s => s + 1);
            audioService.success?.();
            if (q.isRephrased) resolveRephrased(subject, q.originalId);
            consecutiveWrongRef.current = 0;
        } else {
            audioService.error?.();
            trackWrongAnswer(subject, q.id);
            const rephrased = findRephrased(q, allBankRef.current, questions);
            if (rephrased) setQuestions(prev => [...prev, rephrased]);

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

        const log = { questionId: q.id, isCorrect, selectedAnswer: selectedOption, correctAnswer: q.answer, timeSpentMs, hintUsed, answerChanged, changeCount, pool: q.isPLE ? 'yes' : 'no', concept_id: baseId, variant: q.id?.includes('-V') ? 'V' + q.id.split('-V')[1] : 'V0', engine_type: 'MCQ', frustrationLevel: frustration?.score || 0 };
        ManyaDB.recordAnswer(subject, log);
        syncService.pushAnswer(subject, log);

        // ── Emotion Tracking ─────────────────────────────────────────────────
        trackAndPushEmotion({ isCorrect, hintUsed, answerChanged, changeCount, timeSpentMs, frustrationLevel: frustration?.score || 0 });

        const streakMultiplier = (user.current_streak >= 7) ? 2.0 : (user.current_streak >= 5) ? 1.5 : (user.current_streak >= 3) ? 1.2 : 1.0;
        const modeMultiplier = getModeCoinMultiplier(gameMode);
        const totalGems = isCorrect ? Math.floor((hintUsed ? 1 : 4) * streakMultiplier) : 0;
        const coinReward = isCorrect ? Math.floor((hintUsed ? 3 : 8) * streakMultiplier * modeMultiplier) : 0;

        if (isCorrect) {
            dispatch(awardGems({ subject, amount: 0, xp: hintUsed ? 5 : 10 }));
            if (coinReward > 0) dispatch(awardCoins(coinReward));
            setGemsEarned(g => g + totalGems); setShowGemToast(true);
            setTimeout(() => setShowGemToast(false), 1500);
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
            setJustFinished({ subject, questKey, nodeType, mastery, unlocked: result.unlocked, nextNode: result.nextNode });
            
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

            // ── Achievement Check (New Unified Engine) ──────────────────────────
            dispatch(checkAchievements());

            setCompletionResult({ mastery, score, total: questions.length, stars, bonusCoins, chestType });
            setShowCompletion(true);
        }
    };

    const handleFinish = () => {
        const mastery = completionResult?.mastery || 0;
        onResult?.({ isCorrect: mastery >= 60, score: completionResult?.score || score, total: completionResult?.total || questions.length, mastery, gemsEarned, type: 'adaptive_sst' });
        onComplete?.();
    };

    if (showCompletion && completionResult) {
        return (
            <CelebrationView subject="Social Studies" nodeType={nodeType} mastery={completionResult.mastery} score={completionResult.score} total={completionResult.total} gemsEarned={gemsEarned} onCollect={handleFinish} />
        );
    }

    const q = questions[currentIdx];
    const eType = q ? getEngineType(q) : 'MCQ';
    const isSim = SUPPORTED_SIM_ENGINES.includes(eType);

    return (
        <SSTRenderer 
            isLoading={isLoading} loadingConfig={getLoadingConfig('sst')} randomFact={getRandomFact('sst')}
            renderError={renderError} questions={questions} currentIdx={currentIdx}
            selectedOption={selectedOption} isAnswered={isAnswered} showExplanation={showExplanation}
            gemsEarned={gemsEarned} showGemToast={showGemToast} hintUsed={hintUsed} setHintUsed={setHintUsed}
            handleSelect={handleSelect} handleSubmit={handleSubmit} nextQuestion={nextQuestion} handleFinish={handleFinish}
            nodeType={nodeType} isOptionCorrect={isOptionCorrect} 
            correctText={q ? resolveCorrectText(q.answer, q.options) : ''}
            frustration={calculateFrustration(session)}
            isLast={currentIdx === questions.length - 1}
            SimulatorBridgeNode={isSim ? (
                <SimulatorBridge 
                    key={q.id || currentIdx} step={q} subject={subject}
                    onComplete={(results) => {
                        const usp = results?.usp;
                        const isSuccess = usp ? usp.isPassing : (results ? (results.score >= (results.total * 0.6) || results.isCorrect) : true);
                        const timeSpent = usp ? usp.timeSpentMs : (results?.duration || 30000);
                        dispatch(updateSessionAfterAnswer({ isCorrect: isSuccess, hintUsed: false, answerChanged: false, timeSpentMs: timeSpent }));
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: isSuccess, selectedAnswer: 'COMPLETED', correctAnswer: 'COMPLETED', timeSpentMs: timeSpent, pool: 'simulation', engine_type: q.type || 'SIMULATION' });
                        if (isSuccess) { setScore(p => p + 1); setGemsEarned(p => p + 5); }
                        nextQuestion();
                    }}
                    onAttempt={(attempt) => {
                        if (Date.now() - lastSimAttemptRef.current.time < 500) return;
                        lastSimAttemptRef.current = { time: Date.now(), label: attempt.label };
                        ManyaDB.recordAnswer(subject, { questionId: q.id, isCorrect: attempt.isCorrect, selectedAnswer: attempt.label || 'SIM_ATTEMPT', correctAnswer: 'STEP_COMPLETE', timeSpentMs: attempt.duration || 0, pool: 'simulation_step', engine_type: q.type || 'SIMULATION' });
                    }}
                />
            ) : null}
        />
    );
}
