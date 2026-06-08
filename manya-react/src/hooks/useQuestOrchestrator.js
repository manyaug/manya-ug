import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { addToast } from '../store/toastSlice';
import { loadQuestSteps } from '../utils/questLoader';
import { getEngine } from '../config/engineRegistry';
import { dynamicModeService } from '../domain/gamification/dynamicModeService';
import { QuestSession } from '../application/QuestSession';
import { audioService } from '../infrastructure/audio/audioService.js';
import { challengeService } from '../domain/gamification/challengeService.js';
import { updateBalanceThunk, dropChest, incrementQuestCount, checkAchievements, syncUserData, updateSessionAfterAnswer } from '../store/userSlice';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { syncService } from '../infrastructure/sync/syncService.js';
import { conceptMasteryService } from '../domain/mastery/conceptMasteryService.js';
import { parseQuestionId } from '../utils/questionParser';
import { feedbackService } from '../application/feedbackService';
import { generateAdaptiveQuest } from '../services/adaptiveEngine';
import { getEngineType, isSimSafe, hydrateStepData } from '../engines/shared-engines/UniversalLogic';

const SUBJECT_COLOR = {
    math: 'var(--subject-math)',
    science: 'var(--subject-science)',
    sst: 'var(--subject-sst)',
    english: 'var(--subject-english)'
};

export function useQuestOrchestrator() {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(s => s.user.data);

    const [phase, setPhase] = useState('loading');
    const [steps, setSteps] = useState([]);
    const [stepIdx, setStepIdx] = useState(0);
    const [frustration, setFrustration] = useState(0);
    const [btnState, setBtnState] = useState({ enabled: true, label: 'CONTINUE', action: null });
    const [meta, setMeta] = useState({ title: 'Quest', subject: 'math' });
    const [activeEngine, setActiveEngine] = useState(null);
    const [renderTrigger, setRenderTrigger] = useState(0);
    const [sessionRewards, setSessionRewards] = useState({ coins: 0, gems: 0 });

    const [subProgress, setSubProgress] = useState({ current: 0, total: 0 });
    const [virtualTotal, setVirtualTotal] = useState(0);

    const hasFinishedRewards = useRef(false);

    const performanceRef = useRef({
        startTime: Date.now(),
        speedrunEngaged: false,
        speedrunPerfect: true,
        reverseEngaged: false,
        reversePerfect: true,
        totalGems: 0,
        totalCoins: 0,
        finalMastery: 0,
        finalCoins: 0,
        finalStars: 0,
        hintCount: 0
    });

    const sessionRef = useRef(null);
    const initRef = useRef(false);

    const biomeColor = location.state?.biomeColor || SUBJECT_COLOR[meta.subject] || '#7c3aed';

    // ── INITIAL BOOT ──────────────────────────────────────────────────────────
    useEffect(() => {
        const state = location.state;
        if (!state) { navigate('/library'); return; }
        if (initRef.current) return; // Prevent double init

        async function init() {
            initRef.current = true;
            dynamicModeService.reset();
            try {
                let resolvedSteps, resolvedMeta;
                if (state.steps && Array.isArray(state.steps)) {
                    resolvedSteps = state.steps;
                    resolvedMeta = { title: state.title || 'Quest', subject: state.subject || 'math' };
                } else {
                    const { steps: s, meta: m } = await loadQuestSteps(state.subject, state.unitId, state.questFolder, state.file);
                    resolvedSteps = s;
                    resolvedMeta = { title: state.label || m.topic || 'Quest', subject: state.subject || 'math' };
                }

                if (resolvedSteps.length === 0) throw new Error('No steps in quest');

                setSteps(resolvedSteps);
                setMeta(resolvedMeta);

                sessionRef.current = new QuestSession(resolvedSteps, resolvedMeta);
                setStepIdx(sessionRef.current.stepIndex);
                setPhase('running');
            } catch (err) {
                console.error('[QuestOrchestrator] init failed:', err);
                dispatch(addToast({ message: 'Could not load quest content.', type: 'error' }));
                navigate('/library');
            }
        }
        init();

        return () => { window.__manyaIsTyping = false; };
    }, [location.key, navigate, dispatch]); // Use location.key for stability

    // ── ENGINE MOUNT HOOK ─────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'running' || steps.length === 0) return;
        const currentStep = steps[stepIdx];
        if (!currentStep) return;

        audioService.whoosh();

        // Resolve engine type using the universal resolver — handles both camelCase (engineType)
        // and snake_case (engine_type) fields, plus qid keywords and subject heuristics.
        // This prevents the 'UNKNOWN' crash when a raw vault MCQ object (from the adaptive engine)
        // only has engine_type not engineType, or has no engine field at all.
        const rawEngineType = currentStep.engineType
            || currentStep.engine_type
            || currentStep.data?.engineType
            || currentStep.data?.engine_type;

        const engineType = rawEngineType
            ? String(rawEngineType).toUpperCase().trim()
            : getEngineType(currentStep, meta.subject);

        let engineMeta;
        try {
            engineMeta = getEngine(engineType);
        } catch (e) {
            console.error(e);
            dispatch(addToast({ message: `Engine ${engineType} not registered!`, type: 'error' }));
            advanceStep();
            return;
        }

        const isImmersive = engineMeta.isImmersive;
        const isWait = engineMeta.isWait;
        const isLast = stepIdx === steps.length - 1;
        const isFetcher = engineType.includes('FETCHER');

        const startsEnabled = isWait && !isImmersive;
        const initialLabel = (isLast && !isFetcher) ? 'FINISH' : (isImmersive ? 'SUBMIT ANSWER' : 'CONTINUE');

        setBtnState({ enabled: startsEnabled, label: initialLabel, action: null });

        const footer = document.getElementById('qr-footer-mount');
        if (footer) {
            footer.style.display = (isImmersive && meta.subject !== 'english') ? 'none' : '';
        }

        let mode = dynamicModeService.getNextMode(
            location.state?.forceMode,
            location.state?.nodeType,
            { isRecap: currentStep.isRecap, isSimulation: currentStep.isSimulation, engineType: currentStep.engineType }
        );

        const rawData = currentStep.data || currentStep;
        const cleanPayload = hydrateStepData(rawData);
        const baseData = { ...rawData, ...cleanPayload };
        let engineData = { ...baseData, currentMode: mode, unitId: location.state?.unitId, questFolder: location.state?.questFolder };
        
        // v9.1: GAMIFICATION PROTECTION
        // Ensure study steps NEVER trigger speedrun/reverse timers
        const isStudyStep = engineData?.isStudyStep || engineData?.noGamification || engineType === 'NOTE_EXPLORER';
        if (isStudyStep && mode !== 'normal') {
            console.log(`🛡️ [Orchestrator] Suppressing ${mode} for Study Step. Forcing normal.`);
            mode = 'normal';
            engineData.currentMode = 'normal';
            dynamicModeService.stopSpeedrun();
        }

        if (mode === 'reverse' && (engineType === 'MCQ' || engineType === 'MCQ_STANDALONE')) {
            const reversed = dynamicModeService.generateReverseQuestion(baseData, steps.map(s => s.data || s));
            if (reversed) {
                engineData = { ...reversed, currentMode: 'reverse' };
            } else {
                mode = 'normal';
                engineData.currentMode = 'normal';
            }
        }

        if (mode === 'speedrun') {
            dynamicModeService.startSpeedrun(18, () => {
                window.dispatchEvent(new CustomEvent('manya-engine-timeout'));
            });
        } else {
            dynamicModeService.stopSpeedrun();
        }

        setSubProgress({ current: 0, total: 0 });

        console.log(`[QuestOrchestrator] Mounting Engine: ${engineType} | Mode: ${mode}`);
        window.__currentSubject = meta.subject;
        setActiveEngine({ ...engineMeta, engineType, data: engineData, currentMode: mode });
    }, [phase, stepIdx, steps[stepIdx], meta.subject, dispatch]); // Simplified dependencies

    // ── CORE ORCHESTRATION ─────────────────────────────────────────────────────
    const finishQuest = useCallback(async () => {
        if (phase === 'finished' || hasFinishedRewards.current) return;
        setPhase('finished');
        hasFinishedRewards.current = true;

        window.__currentSubject = meta.subject;
        const result = await sessionRef.current.finalize(performanceRef.current, user, location.state);

        performanceRef.current.finalMastery = result.masteryScore;
        performanceRef.current.finalCoins = result.earnedCoins;
        performanceRef.current.finalStars = result.stars;

        dispatch(updateBalanceThunk({
            currency: 'coins',
            amount: result.earnedCoins,
            type: 'quest_reward',
            contextId: location.state?.questKey
        }));

        result.earnedRewards.forEach(drop => {
            dispatch(dropChest({ chestType: drop.chestType, id: drop.id, reason: drop.reason, subject: drop.subject || meta.subject || 'overall' }));
        });

        dispatch(incrementQuestCount());
        challengeService.tick('QUEST_COUNT', 1);

        const msg = result.earnedRewards.length > 0
            ? `🏆 Quest complete! Earned ${result.earnedCoins} Coins and ${result.earnedRewards.length} Reward Chests!`
            : `🏁 Quest complete! +${result.earnedCoins} Coins earned`;
        dispatch(addToast({ message: msg, type: 'success' }));

        dispatch(checkAchievements());
        dispatch(syncUserData());
        audioService.finish();

        // 🏆 LEAGUE: Award weekly XP for completing a quest (fire-and-forget)
        syncService.incrementWeeklyXp(20).catch(() => {});
    }, [phase, user, location.state, dispatch]);

    const advanceStep = useCallback(() => {
        if (window.__manyaIsTyping) {
            window.__manyaIsTyping = false;
            window.dispatchEvent(new CustomEvent('stop-typing'));
            setBtnState(s => ({ ...s, enabled: true }));
            return;
        }
        if (!sessionRef.current) return;
        sessionRef.current.advance();
        if (sessionRef.current.isFinished) {
            finishQuest();
        } else {
            setStepIdx(sessionRef.current.stepIndex);
        }
    }, [finishQuest]);

    const reAdaptFutureSteps = useCallback(async () => {
        if (!sessionRef.current) return;
        
        const rawQuestions = sessionRef.current.rawQuestions;
        if (!rawQuestions || rawQuestions.length === 0) {
            console.log("[Orchestrator] Dynamic re-adaptation bypassed: No raw question bank stored in session.");
            return;
        }

        const remainingCount = steps.length - (stepIdx + 1);
        if (remainingCount <= 0) {
            console.log("[Orchestrator] Dynamic re-adaptation bypassed: No future steps remaining in quest.");
            return;
        }

        const nextStep = steps[stepIdx + 1];
        if (nextStep?.isRescue || nextStep?.id?.includes('rescue')) {
            console.log("🛡️ [Orchestrator] Bypassing re-adaptation: Next step is a pedagogical rescue step.");
            return;
        }

        try {
            console.log(`🧠 [LiveAdapt] Initiating real-time re-adaptation for remaining ${remainingCount} steps...`);

            // Fetch both cloud and local telemetries, merging them to ensure instantaneous updates
            const cloudHistory = await syncService.fetchRecentTelemetry(meta.subject, 20) || [];
            const localHistory = await ManyaDB.getAnswerHistory(meta.subject) || [];
            
            const historyMap = new Map();
            cloudHistory.forEach(h => {
                const qId = h.question_id || h.questionId || h.qid;
                if (qId) historyMap.set(qId + '_' + (h.answered_at || h.answeredAt), h);
            });
            localHistory.forEach(h => {
                const qId = h.question_id || h.questionId || h.qid;
                if (qId) historyMap.set(qId + '_' + (h.answered_at || h.answeredAt), h);
            });
            
            const history = [...historyMap.values()].sort((a, b) => {
                const timeA = new Date(a.answered_at || a.answeredAt || 0).getTime();
                const timeB = new Date(b.answered_at || b.answeredAt || 0).getTime();
                return timeA - timeB;
            });

            // Extract updated session psychological markers
            const currentFrustration = frustration;
            const updatedSession = {
                consecutiveWrong: sessionRef.current._wrongStreak || 0,
                confidence: 100,
                frustrationLevel: currentFrustration
            };

            const nodeType = location.state?.nodeType || 'PRACTICE';
            const questKey = location.state?.questKey || `${meta.subject}_quest`;
            const simResources = [
                ...(sessionRef.current.simPool || []),
                ...(sessionRef.current.notePool || []),
                ...(sessionRef.current.recapPool || [])
            ];

            // Re-run generateAdaptiveQuest on the raw question bank for remainingCount steps
            const adaptiveResult = await generateAdaptiveQuest(
                rawQuestions,
                nodeType,
                meta.subject,
                questKey,
                updatedSession,
                history,
                simResources
            );

            const newSelectedQuestions = adaptiveResult.questions;
            if (!newSelectedQuestions || newSelectedQuestions.length === 0) {
                console.warn("[Orchestrator] Dynamic re-adaptation returned empty selected questions.");
                return;
            }

            // Map the newly selected questions to their precise engine types
            const sliceStart = stepIdx + 1;
            const slicedQuestions = newSelectedQuestions.slice(sliceStart);
            const finalSliced = slicedQuestions.length >= remainingCount
                ? slicedQuestions.slice(0, remainingCount)
                : newSelectedQuestions.slice(-remainingCount);

            const newExplodedSteps = finalSliced.map(q => {
                const rawEngineType = getEngineType(q, meta.subject);
                const isRealSim = isSimSafe(q, meta.subject);
                const engineType = isRealSim ? rawEngineType : 'MCQ_STANDALONE';
                return {
                    engineType,
                    data: q,
                    isSimulation: isRealSim,
                    subject: meta.subject
                };
            });

            console.log(`🧠 [LiveAdapt] Successfully re-adapted ${newExplodedSteps.length} future steps!`);

            // Replace the future remaining steps in the steps array and session
            const updatedSteps = [...steps];
            updatedSteps.splice(stepIdx + 1, remainingCount, ...newExplodedSteps);
            
            setSteps(updatedSteps);
            sessionRef.current.steps = updatedSteps;
            setVirtualTotal(updatedSteps.length);

        } catch (err) {
            console.error("❌ [Orchestrator] Error during dynamic step re-adaptation:", err);
        }
    }, [steps, stepIdx, meta.subject, frustration, location.state]);

    const handleEngineResult = useCallback(async (result) => {
        if (!sessionRef.current) return;

        if (result?.type?.includes('partial') || result?.type?.includes('pulse')) {
            const current = result.subScore ?? result.score;
            const total = result.subTotal ?? result.total;
            if (current !== undefined && total !== undefined) {
                setSubProgress({ current, total });
                if (total > 1) {
                    setVirtualTotal(Math.max(steps.length, (steps.length - 1) + total));
                }
            }
            sessionRef.current.peekResult(result);
            setRenderTrigger(prev => prev + 1);
            return;
        }

        const outcome = await sessionRef.current.processResult(result);

        if (outcome.shouldInjectRecap) {
            const newSteps = await sessionRef.current.injectRecap(outcome.conceptId, meta.subject);
            setSteps(newSteps);
            dispatch(addToast({ message: "Need a quick review? Let's take a look!", type: "info" }));
        }

        if (outcome.frustration !== undefined) setFrustration(outcome.frustration);
        if (outcome.buttonEnabled || result.isCorrect) setBtnState(s => ({ ...s, enabled: true }));

        const activeMode = dynamicModeService.currentMode;
        if (activeMode === 'speedrun') {
            performanceRef.current.speedrunEngaged = true;
            if (!result.isCorrect) performanceRef.current.speedrunPerfect = false;
        }
        if (activeMode === 'reverse') {
            performanceRef.current.reverseEngaged = true;
            if (!result.isCorrect) performanceRef.current.reversePerfect = false;
        }

        dynamicModeService.stopSpeedrun();

        // 🎯 [Universal Feedback] Centralized Motivation Utility
        if (result.isCorrect) {
            feedbackService.triggerCorrect(meta.subject, result);
        } else {
            feedbackService.triggerWrong(meta.subject);
        }

        window.dispatchEvent(new CustomEvent(result.isCorrect ? 'manya-correct' : 'manya-wrong', {
            detail: { subject: meta.subject, isCorrect: result.isCorrect, conceptId: outcome.conceptId }
        }));

        // 📊 [Manya Logic v8.5] Record granular telemetry for the adaptive engine
        const { baseId } = parseQuestionId(outcome.conceptId || result.id || 'unknown');
        
        // 1. Update Concept Mastery (Spaced Repetition + Ladder State)
        conceptMasteryService.updateAfterAnswer(meta.subject, baseId, result.isCorrect);
        
        // 2. Record locally for session history
        ManyaDB.recordAnswer(meta.subject, {
            questionId: outcome.conceptId || result.id || 'unknown',
            conceptId: baseId,
            isCorrect: result.isCorrect,
            selectedAnswer: result.selectedAnswer,
            correctAnswer: result.correctAnswer,
            timeSpentMs: result.timeSpentMs || 5000,
            hintUsed: result.hintUsed || false,
            answerChanged: result.answerChanged || false,
            frustrationLevel: frustration
        });

        // 3. Sync to Cloud
        syncService.pushAnswer(meta.subject, {
            questionId: outcome.conceptId || result.id || 'unknown',
            isCorrect: result.isCorrect,
            selectedAnswer: result.selectedAnswer,
            correctAnswer: result.correctAnswer,
            timeSpentMs: result.timeSpentMs || 5000,
            hintUsed: result.hintUsed || false,
            answerChanged: result.answerChanged || false,
            frustrationLevel: frustration
        });

        // 4. Update UI state (HUD, etc.)
        dispatch(updateSessionAfterAnswer({
            subject: meta.subject,
            isCorrect: result.isCorrect,
            hintUsed: result.hintUsed || false,
            answerChanged: result.answerChanged || false,
            timeSpentMs: result.timeSpentMs || 5000,
            questionId: outcome.conceptId || result.id || 'unknown'
        }));

        // 🏆 CHALLENGE ENGINE: Record progress in gamification system
        challengeService.tick('QUESTIONS_ANSWERED', 1);
        if (result.isCorrect) {
            challengeService.tick('CORRECT_ANSWERS', 1);
            if (meta.subject) {
                challengeService.tick(`${meta.subject.toUpperCase()}_CORRECT`, 1);
            }
            if (!result.hintUsed && !result.answerChanged) {
                challengeService.tick('PERFECT_ANSWERS', 1);
            }
            // 🏆 LEAGUE: +2 weekly XP per correct answer (fire-and-forget)
            syncService.incrementWeeklyXp(2).catch(() => {});
        }

        if (!result?.type?.includes('partial') && !result?.type?.includes('pulse')) {
            const currentMastery = sessionRef.current?.lastMasteryScore || 0;
            dynamicModeService.update(result.isCorrect, currentMastery, steps.length, stepIdx);

            // 🧠 Trigger Real-time Pedagogical & Psychological Re-adaptation!
            setTimeout(() => {
                reAdaptFutureSteps();
            }, 100);
        }

        if (result.gemsEarned !== undefined || result.coinsEarned !== undefined) {
            performanceRef.current.totalCoins = result.coinsEarned ?? performanceRef.current.totalCoins;
            performanceRef.current.totalGems = result.gemsEarned ?? performanceRef.current.totalGems;
            setSessionRewards({ coins: performanceRef.current.totalCoins, gems: performanceRef.current.totalGems });
        }

        setRenderTrigger(prev => prev + 1);
    }, [dispatch, meta.subject, steps.length, stepIdx, reAdaptFutureSteps]);

    const replaceCurrentStepWith = useCallback((newSteps) => {
        if (!sessionRef.current || !newSteps || newSteps.length === 0) return;
        const updatedSteps = [...steps];
        updatedSteps.splice(stepIdx, 1, ...newSteps);
        setSteps(updatedSteps);
        sessionRef.current.steps = updatedSteps;
        setVirtualTotal(updatedSteps.length);
    }, [steps, stepIdx]);

    const addSessionRewards = useCallback((coins = 0, gems = 0) => {
        performanceRef.current.totalCoins = (performanceRef.current.totalCoins || 0) + coins;
        performanceRef.current.totalGems = (performanceRef.current.totalGems || 0) + gems;
        setSessionRewards({
            coins: performanceRef.current.totalCoins,
            gems: performanceRef.current.totalGems
        });
    }, []);

    return {
        phase, steps, stepIdx, frustration, btnState, meta, activeEngine,
        sessionRewards, subProgress, virtualTotal, biomeColor,
        session: sessionRef.current,
        performance: performanceRef.current,
        advanceStep, handleEngineResult, replaceCurrentStepWith,
        addSessionRewards,
        setBtnState, setPhase
    };
}
