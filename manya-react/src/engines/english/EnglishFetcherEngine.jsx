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
import { conceptMasteryService } from '../../domain/mastery/conceptMasteryService.js';
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
            requestAnimationFrame(() => {
                setSimPartialScore(fractional);
            });
        }
    }, [questions.length]);

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
                        console.log(`🌐 [English] Fetching resource: ${fileName}`);
                        const { steps } = await loadQuestSteps(subject, data.unitId || 'holidays', topicId, fileName);
                        console.log(`✅ [English] Loaded ${steps?.length || 0} steps from ${fileName}`);
                        return (steps || []).map((s, idx) => {
                            const eType = getEngineType(s);
                            console.log(`🔎 [EnglishFetcher] Step ${idx} Raw Analysis:`, { 
                                file: s.file || s.referencePath || s.id, 
                                eType, 
                                hasData: !!s.data, 
                                dataKeys: s.data ? Object.keys(s.data) : [] 
                            });
                            return { ...s, isSimulation: SUPPORTED_SIM_ENGINES.includes(eType), id: s.id || `remote_${file.replace('.json','')}_${Math.random()}` };
                        });
                    } catch (e) { console.error(`❌ [English] Failed to load ${file}`, e); return []; }
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

                // 🌐 [JIT HYDRATION]: Hydrate any DB simulation pointers selected by the Adaptive Engine
                finalQuestions = await Promise.all(finalQuestions.map(async (q) => {
                    const eType = getEngineType(q);
                    const isSim = SUPPORTED_SIM_ENGINES.includes(eType);
                    
                    // If it's a simulation but has no data, it's a DB pointer. Fetch its JSON.
                    if (isSim && (!q.data || Object.keys(q.data).length === 0)) {
                        let targetFile = q.file || q.qid || q.id;
                        if (targetFile) {
                            // Convert DB ID "PQ-SIM-ENG-06-007" to GitHub file "pq-06-007.json"
                            let cleanName = targetFile.toLowerCase();
                            if (cleanName.includes('sim-eng-')) {
                                cleanName = cleanName.replace('sim-eng-', '');
                            }
                            const fileName = cleanName.endsWith('.json') ? cleanName : `${cleanName}.json`;
                            console.log(`🌐 [English JIT] Hydrating dynamic DB simulation: ${fileName}`);
                            try {
                                const { steps } = await loadQuestSteps(subject, data.unitId || 'holidays', topicId, fileName);
                                if (steps && steps.length > 0) {
                                    console.log(`✅ [English JIT] Hydrated ${fileName} successfully!`);
                                    return { ...q, ...steps[0], id: q.id || q.qid, isSimulation: true };
                                }
                            } catch (e) {
                                console.warn(`❌ [English JIT] Failed to hydrate DB sim ${fileName}`, e);
                            }
                        }
                    }
                    return q;
                }));

                if (data?.forceMode === 'reverse') {
                    finalQuestions = finalQuestions.map(q => {
                        if (q.engineType?.includes('FETCHER') || q.question_type === 'MCQ' || !q.question_type) {
                            return dynamicModeService.generateReverseQuestion(q, allQuestions) || q;
                        }
                        return q;
                    });
                }
                setQuestions(finalQuestions);
                console.log(`🎯 [EnglishFetcher] Final Quest Sequence:`, finalQuestions.map(q => ({ 
                    id: q.id || q.qid, 
                    engine: getEngineType(q), 
                    dataType: q.data ? 'Object' : 'None',
                    hasQueries: q.data?.queries ? 'Yes' : 'No'
                })));

                if (quest.metadata?.gameMode) {
                    const gm = quest.metadata.gameMode.toLowerCase();
                    setGameMode(['quickfire','timed','marathon'].includes(gm) ? gm : 'none');
                }
                setTimeout(() => setIsLoading(false), 800);
            } catch (err) { console.error("❌ [English] Fetcher Error:", err); setIsLoading(false); }
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
        
        // [Manya v4 Patch] Immediately notify QuestRunner parent to update live HUD
        const awards = isCorrect ? rewardManager.awardStepRewards({
            subject, hintUsed, streak: user.current_streak, gameMode, isSimulation: q.isSimulation || false
        }) : { gems: 0, coins: 0 };

        const nextCoins = coinsEarnedState + awards.coins;
        const nextGems = gemsEarned + awards.gems;

        onResult?.({
            isCorrect,
            score: isCorrect ? score + 1 : score,
            total: questions.length,
            coinsEarned: nextCoins,
            gemsEarned: nextGems,
            type: 'answer'
        });

        if (isCorrect) {
            setScore(s => s + 1);
            scoreRef.current += 1;
            audioService.success?.();
            consecutiveWrongRef.current = 0;

            setCoinsEarnedState(nextCoins);
            setGemsEarned(nextGems);
            
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

        // 🧠 Update granular concept mastery
        conceptMasteryService.updateAfterAnswer(subject, baseId, isCorrect);

        // ── Emotion Tracking (New Premium Feature 🧠) ───────────────────────
        trackAndPushEmotion({
            isCorrect, hintUsed, answerChanged, changeCount,
            timeSpentMs, frustrationLevel, timeToFirstClickMs
        });

        // 🧠 Update dynamic mode metrics BEFORE nextQuestion re-rolls
        dynamicModeService.update(isCorrect, currentMastery, questions.length, currentIdx);

    };

    const [isFinished, setIsFinished] = useState(false);

    const nextQuestion = (results = null) => {
        setSimPartialScore(0);
        if (results) {
            const isSuccess = results.usp ? !!results.usp.isPassing : !!(results.isCorrect ?? (results.score >= (results.total * 0.6) || true));
            
            // 🧠 [Phase 3] Close the loop for Simulations!
            // Every simulation completion now counts as an "Answer" for the AI Brain.
            const q = questions[currentIdx];
            const baseId = (q.id || q.qid || '').replace(/-V\d+$/, '');
            
            const log = {
                questionId: q.id || q.qid,
                isCorrect: isSuccess,
                timeSpentMs: results.timeSpentMs || (Date.now() - questionStartTime.current),
                // Behavioral Metrics from the Simulation
                idleTimeMs: results.metrics?.idleTimeMs || 0,
                tabSwitched: results.metrics?.tabSwitched || false,
                hesitationCount: results.metrics?.hesitationCount || 0,
                frustrationClicks: results.metrics?.frustrationClicks || 0,
                engine_type: 'SIMULATION',
                pool: 'yes',
                concept_id: baseId,
                pointsEarned: isSuccess ? 25 : 5,
                frustrationLevel: results.metrics?.frustrationLevel || 0
            };

            ManyaDB.recordAnswer(subject, log);
            syncService.pushAnswer(subject, log);
            conceptMasteryService.updateAfterAnswer(subject, baseId, isSuccess);

            if (isSuccess) {
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
        }
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
