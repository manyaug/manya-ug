import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { addToast } from '../store/toastSlice';
import { loadQuestSteps } from '../utils/questLoader';
import { getEngine } from '../config/engineRegistry';
import { dynamicModeService } from '../domain/gamification/dynamicModeService';
import { QuestSession } from '../application/QuestSession';
import { audioService } from '../infrastructure/audio/audioService.js';
import { updateBalanceThunk, dropChest, incrementQuestCount, checkAchievements, syncUserData } from '../store/userSlice';

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
    const user     = useSelector(s => s.user.data);

    const [phase,    setPhase]    = useState('loading');
    const [steps,    setSteps]    = useState([]);
    const [stepIdx,  setStepIdx]  = useState(0);
    const [frustration, setFrustration] = useState(0); 
    const [btnState, setBtnState] = useState({ enabled: true, label: 'CONTINUE', action: null });
    const [meta,     setMeta]     = useState({ title: 'Quest', subject: 'math' });
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
                    resolvedMeta  = { title: state.title || 'Quest', subject: state.subject || 'math' };
                } else {
                    const { steps: s, meta: m } = await loadQuestSteps(state.subject, state.unitId, state.questFolder, state.file);
                    resolvedSteps = s;
                    resolvedMeta  = { title: state.label || m.topic || 'Quest', subject: state.subject || 'math' };
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

        const engineType = currentStep.engineType || 'UNKNOWN';
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
        const isWait      = engineMeta.isWait;
        const isLast      = stepIdx === steps.length - 1;
        const isFetcher   = engineType.includes('FETCHER');

        const startsEnabled = isWait && !isImmersive;
        const initialLabel  = (isLast && !isFetcher) ? 'FINISH' : (isImmersive ? 'SUBMIT ANSWER' : 'CONTINUE');

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

        const baseData = currentStep.data || currentStep;
        let engineData = { ...baseData, currentMode: mode, unitId: location.state?.unitId, questFolder: location.state?.questFolder };

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
        setActiveEngine({ ...engineMeta, engineType, data: engineData, currentMode: mode });
    }, [phase, stepIdx, steps[stepIdx], meta.subject, dispatch]); // Simplified dependencies

    // ── CORE ORCHESTRATION ─────────────────────────────────────────────────────
    const finishQuest = useCallback(async () => {
        if (phase === 'finished' || hasFinishedRewards.current) return;
        setPhase('finished');
        hasFinishedRewards.current = true;
        
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
            dispatch(dropChest({ chestType: drop.chestType, id: drop.id, reason: drop.reason }));
        });

        dispatch(incrementQuestCount());
        
        const msg = result.earnedRewards.length > 0 
            ? `🏆 Quest complete! Earned ${result.earnedCoins} Coins and ${result.earnedRewards.length} Reward Chests!`
            : `🏁 Quest complete! +${result.earnedCoins} Coins earned`;
        dispatch(addToast({ message: msg, type: 'success' }));

        dispatch(checkAchievements());
        dispatch(syncUserData());
        audioService.finish();
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

        window.dispatchEvent(new CustomEvent(result.isCorrect ? 'manya-correct' : 'manya-wrong', { 
            detail: { subject: meta.subject, isCorrect: result.isCorrect, conceptId: outcome.conceptId } 
        }));

        if (!result?.type?.includes('partial') && !result?.type?.includes('pulse')) {
            const currentMastery = sessionRef.current?.lastMasteryScore || 0;
            dynamicModeService.update(result.isCorrect, currentMastery, steps.length, stepIdx);
        }

        if (result.gemsEarned !== undefined || result.coinsEarned !== undefined) {
            performanceRef.current.totalCoins = result.coinsEarned ?? performanceRef.current.totalCoins;
            performanceRef.current.totalGems = result.gemsEarned ?? performanceRef.current.totalGems;
            setSessionRewards({ coins: performanceRef.current.totalCoins, gems: performanceRef.current.totalGems });
        }

        setRenderTrigger(prev => prev + 1);
    }, [dispatch, meta.subject, steps.length, stepIdx]);

    const replaceCurrentStepWith = useCallback((newSteps) => {
        if (!sessionRef.current || !newSteps || newSteps.length === 0) return;
        const updatedSteps = [...steps];
        updatedSteps.splice(stepIdx, 1, ...newSteps);
        setSteps(updatedSteps);
        sessionRef.current.steps = updatedSteps; 
        setVirtualTotal(updatedSteps.length);
    }, [steps, stepIdx]);

    return {
        phase, steps, stepIdx, frustration, btnState, meta, activeEngine,
        sessionRewards, subProgress, virtualTotal, biomeColor,
        session: sessionRef.current,
        performance: performanceRef.current,
        advanceStep, handleEngineResult, replaceCurrentStepWith,
        setBtnState, setPhase
    };
}
