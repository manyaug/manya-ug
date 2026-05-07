import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { audioService } from '../infrastructure/audio/audioService.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';
import { addToast } from '../store/toastSlice';
import { updateProfile, awardGems, awardCoins, incrementQuestCount, dropChest, checkAchievements, syncUserData, updateBalanceThunk } from '../store/userSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { loadQuestSteps } from '../utils/questLoader';
import { getGem } from '../config/assetUrls';
import { getLoadingConfig, getRandomFact } from '../config/loadingData';
import { ENGINE_REGISTRY, getEngine } from '../config/engineRegistry';
import { saveNodeCompletion, setJustFinished } from '../domain/progress/questProgressService.js';
import { QuestSession } from '../application/QuestSession';
import { dynamicModeService } from '../domain/gamification/dynamicModeService';
import { QuestBusProvider } from '../ui/context/QuestBus';
import QuestHUD from './QuestHUD'; 
import { rewardService } from '../infrastructure/services/rewardService.js';
import { evaluateRewards } from '../domain/gamification/chestService.js';
import { getNodeMastery, NODE_ORDER } from '../domain/progress/questProgressService.js';
import PremiumFXOverlay from './PremiumFXOverlay';
import React from 'react';
import CelebrationView from '../views/CelebrationView.jsx';
import '../styles/engines.css';

class QuestErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-main)] animate-in fade-in duration-700">
                    <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                        <AlertTriangle size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight">Engine Glitch</h2>
                    <p className="max-w-sm text-[var(--text-sub)] text-lg font-bold mb-10 opacity-60">
                        Something went wrong. You can try again or skip to the next one!
                    </p>
                    <div className="flex gap-4 w-full max-w-sm">
                        <button onClick={() => window.location.reload()} className="flex-1 h-16 bg-[var(--text-main)] text-[var(--bg-main)] rounded-3xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3">
                            <RefreshCw size={20} />
                            RETRY
                        </button>
                        <button onClick={this.props.onSkip} className="flex-1 h-16 bg-rose-500 text-white rounded-3xl font-black text-sm tracking-widest uppercase shadow-xl shadow-rose-500/20 flex items-center justify-center">
                            SKIP STEP →
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const SUBJECT_COLOR = { 
    math: 'var(--subject-math)', 
    science: 'var(--subject-science)', 
    sst: 'var(--subject-sst)', 
    english: 'var(--subject-english)' 
};

export default function QuestRunner() {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user     = useSelector(s => s.user.data);

    const [phase,    setPhase]    = useState('loading');
    const [steps,    setSteps]    = useState([]);
    const [stepIdx,  setStepIdx]  = useState(0);
    const [frustration, setFrustration] = useState(0); 
    const [btnState, setBtnState] = useState({ enabled: true, label: 'CONTINUE' });
    const [meta,     setMeta]     = useState({ title: 'Quest', subject: 'math' });
    const [activeEngine, setActiveEngine] = useState(null);
    const [renderTrigger, setRenderTrigger] = useState(0);
    const [sessionRewards, setSessionRewards] = useState({ coins: 0, gems: 0 });
    
    // Performance Tracking
    const performanceRef = useRef({
        startTime: Date.now(),
        speedrunEngaged: false,
        speedrunPerfect: true,
        reverseEngaged: false,
        reversePerfect: true,
        totalGems: 0,
        totalCoins: 0
    });
    
    // Application Service Orchestrator
    const sessionRef = useRef(null);

    const biomeColor = location.state?.biomeColor || SUBJECT_COLOR[meta.subject] || '#7c3aed';
    const gemFile    = location.state?.gemFile    || `${meta.subject}_gem.svg`;

    // ── INITIAL BOOT ──────────────────────────────────────────────────────────
    useEffect(() => {
        const state = location.state;
        if (!state) { navigate('/library'); return; }

        async function init() {
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
                
                // Initialize Application Service!
                sessionRef.current = new QuestSession(resolvedSteps, resolvedMeta);
                setStepIdx(sessionRef.current.stepIndex);
                
                setPhase('running');
            } catch (err) {
                console.error('[QuestRunner] init failed:', err);
                dispatch(addToast({ message: 'Could not load quest content.', type: 'error' }));
                navigate('/library');
            }
        }
        init();
        
        return () => {
            window.__manyaIsTyping = false; // safety cleanup
        };
    }, [location.state, navigate, dispatch]);

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

        setBtnState({ enabled: !isWait, label: stepIdx === steps.length - 1 ? 'FINISH' : 'CONTINUE' });

        const footer = document.getElementById('qr-footer-mount');
        if (footer) {
            footer.style.display = (isImmersive && meta.subject !== 'english') ? 'none' : '';
        }

        // ── DYNAMIC MODE INJECTION ──────────────────────────────────────────
        const mode = dynamicModeService.getNextMode(
            location.state?.forceMode, 
            location.state?.nodeType,
            {
                isRecap: currentStep.isRecap,
                isSimulation: currentStep.isSimulation,
                engineType: currentStep.engineType
            }
        );
        const baseData = currentStep.data || currentStep;
        let engineData = { 
            ...baseData, 
            currentMode: mode,
            unitId: location.state?.unitId,
            questFolder: location.state?.questFolder
        };
        
        console.log(`[QuestRunner] Dynamic Mode Selected: ${mode.toUpperCase()} (Step ${stepIdx + 1})`);

        if (mode === 'reverse' && engineType.includes('FETCHER')) {
            engineData.forceMode = 'reverse';
        }

        if (mode === 'speedrun') {
            dynamicModeService.startSpeedrun(18, () => {
                console.warn('[QuestRunner] Speedrun TIMEOUT triggered!');
                window.dispatchEvent(new CustomEvent('manya-engine-timeout'));
            });
        } else {
            dynamicModeService.stopSpeedrun();
        }

        setActiveEngine({ ...engineMeta, data: engineData, currentMode: mode });
    }, [phase, stepIdx, steps, meta.subject, dispatch]); 

    // ── CORE ORCHESTRATION BRIDGE ─────────────────────────────────────────────
    const handleEngineResult = useCallback(async (result) => {
        if (!sessionRef.current) return;
        
        // ── Pulse Guard ──────────────────────────────────────────────────────
        // Ignore partial/fractional progress updates from the new fetcher system.
        // These are meant for the HUD Target Tracker, not the domain logic.
        if (result?.type?.includes('partial') || result?.type?.includes('pulse')) {
            sessionRef.current.peekResult(result);
            setRenderTrigger(prev => prev + 1);
            return;
        }

        // Delegate domain rules entirely to the QuestSession Application service
        const outcome = await sessionRef.current.processResult(result);

        if (outcome.shouldInjectRecap) {
            const newSteps = await sessionRef.current.injectRecap(outcome.conceptId, meta.subject);
            setSteps(newSteps); // Trigger react re-render to update progress bar length
            dispatch(addToast({ message: "Need a quick review? Let's take a look!", type: "info" }));
        }

        if (outcome.frustration !== undefined) {
            setFrustration(outcome.frustration);
        }
        
        if (result.type === 'simulation') {
            dispatch(addToast({ message: "Simulation Complete!", type: "success" }));
        }

        if (outcome.buttonEnabled || result.isCorrect) {
            setBtnState(s => ({ ...s, enabled: true }));
        }

        // Track mode performance before stopping
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

        // Update Dynamic Mode Metrics
        if (!result?.type?.includes('partial') && !result?.type?.includes('pulse')) {
            const currentMastery = sessionRef.current?.lastMasteryScore || 0;
            dynamicModeService.update(
                result.isCorrect, 
                currentMastery, 
                steps.length, 
                stepIdx
            );
        }

        if (result.gemsEarned !== undefined || result.coinsEarned !== undefined) {
            const newCoins = result.coinsEarned !== undefined ? result.coinsEarned : performanceRef.current.totalCoins;
            const newGems = result.gemsEarned !== undefined ? result.gemsEarned : performanceRef.current.totalGems;
            
            performanceRef.current.totalCoins = newCoins;
            performanceRef.current.totalGems = newGems;
            setSessionRewards({ coins: newCoins, gems: newGems });
        }

        setRenderTrigger(prev => prev + 1);
    }, [dispatch, meta.subject, steps.length, stepIdx, activeEngine?.currentMode]);

    const finishQuest = useCallback(() => {
        if (phase === 'finished') return;
        setPhase('finished');
        
        const rawSubject = location.state?.subject || 'overall';
        const subject = rawSubject.toLowerCase();
        const { questKey, nodeType } = location.state || {};
        const safeNodeType = (nodeType || 'WARMUP').toUpperCase();
        
        // 1. Calculate Economy Payouts
        let baseCoins = 0; let scale = 0;
        if (safeNodeType === 'WARMUP') { baseCoins = 20; scale = 5; }
        else if (safeNodeType === 'EXPLORE') { baseCoins = 30; scale = 10; }
        else if (safeNodeType === 'PRACTICE') { baseCoins = 40; scale = 15; }
        else if (safeNodeType === 'REINFORCE') { baseCoins = 50; scale = 20; }
        else if (safeNodeType === 'MASTERY') { baseCoins = 100; scale = 25; }
        
        const completionBonus = baseCoins + ((sessionRef.current?.correctCount || 0) * scale);
        const earnedCoins = completionBonus + (performanceRef.current.totalCoins || 0);
        const hasFetcher = steps.some(s => s.engineType?.includes('FETCHER'));
        let masteryScore = 100;

        let completionResult = null;
        if (questKey && safeNodeType && !hasFetcher) {
            // For EXPLORE (Library) nodes, finishing the unit means 100% mastery.
            if (safeNodeType === 'EXPLORE') {
                masteryScore = 100;
            } else {
                masteryScore = sessionRef.current?.lastMasteryScore || ((sessionRef.current?.correctCount || 1) / (sessionRef.current?.totalSteps || 1)) * 100;
            }
            completionResult = saveNodeCompletion(subject, questKey, safeNodeType, masteryScore);
            setJustFinished({ subject, questKey, nodeType: safeNodeType, mastery: masteryScore, unlocked: completionResult.unlocked, nextNode: completionResult.nextNode });
        }
        
        // 1.5 Economy Payouts: BASE COINS (Effort)
        // We keep coins direct as they represent "time spent"
        dispatch(updateBalanceThunk({
            currency: 'coins',
            amount: earnedCoins,
            type: 'quest_reward',
            contextId: questKey
        }));

        if (hasFetcher) {
            masteryScore = sessionRef.current?.lastMasteryScore || 100;
            // Fetchers save their own completion internally, but we run it here again safely 
            // to extract the unlock state so the QuestPathView animation can play!
            completionResult = saveNodeCompletion(subject, questKey, safeNodeType, masteryScore);
            setJustFinished({ subject, questKey, nodeType: safeNodeType, mastery: masteryScore, unlocked: completionResult.unlocked, nextNode: completionResult.nextNode });
        }

        // 2. LOOT SYSTEM: SMART EVALUATION (Phase 2 🎁)
        const sessionDurationMinutes = (Date.now() - performanceRef.current.startTime) / 60000;
        const isFirstTry = completionResult ? completionResult.isFirstCompletion : true;

        // Store final stats for CelebrationView
        performanceRef.current.finalMastery = masteryScore;
        performanceRef.current.finalCoins = earnedCoins;
        performanceRef.current.finalStars = masteryScore >= 85 ? 3 : masteryScore >= 70 ? 2 : masteryScore >= 60 ? 1 : 0;

        const earnedRewards = evaluateRewards({
            mastery: masteryScore,
            streak: user.current_streak || 0,
            sessionTime: sessionDurationMinutes,
            nodeType: safeNodeType,
            subject: subject || 'overall',
            isFirstQuest: isFirstTry,
            hintCount: sessionRef.current?.hintCount || 0,
            modeAchievements: {
                speedrunPerfect: performanceRef.current.speedrunEngaged && performanceRef.current.speedrunPerfect && (sessionRef.current?.correctCount || 0) > 2,
                reversePerfect: performanceRef.current.reverseEngaged && performanceRef.current.reversePerfect && (sessionRef.current?.correctCount || 0) > 2
            }
        });

        // Grant each earned chest transactionally
        earnedRewards.forEach(drop => {
            rewardService.grantChest(user.id, drop.chestType, drop.reason)
                .then(chest => {
                    dispatch(dropChest({ 
                        chestType: drop.chestType, 
                        id: chest.id,
                        reason: drop.reason 
                    }));
                })
                .catch(e => console.warn('🎁 [QuestRunner] Chest grant failed:', e.message));
        });

        dispatch(incrementQuestCount());

        if (earnedRewards.length > 0) {
            dispatch(addToast({ message: `🏆 Quest complete! Earned ${earnedCoins} Coins and ${earnedRewards.length} Reward Chests!`, type: 'success' }));
        } else {
            dispatch(addToast({ message: `🏁 Quest complete! +${earnedCoins} Coins earned`, type: 'success' }));
        }

        // 🎖️ POST-QUEST HOUSEKEEPING
        dispatch(checkAchievements());
        dispatch(syncUserData());

        // 🏁 Cloud Session Finalization (Schema Alignment 🛡️)
        const sessionData = {
            startedAt: performanceRef.current.startTime,
            questId: questKey,
            frustrationLevel: sessionRef.current?.lastFrustrationScore || 0,
            engagementLevel: Math.round((sessionRef.current?.correctCount / steps.length) * 100) || 0,
            cognitiveLoad: performanceRef.current.reverseEngaged ? 80 : 40, // higher if reverse mode was on
            masteryLevel: masteryScore >= 85 ? 'mastered' : masteryScore >= 60 ? 'learning' : 'struggling',
            results: {
                score: sessionRef.current?.correctCount,
                total: steps.length,
                coins: earnedCoins,
                gems: performanceRef.current.finalGems,
                stars: performanceRef.current.finalStars
            }
        };

        syncService.pushSession(sessionData);

        // 🧪 Respective Table Updates (Per Schema v5 🛡️)
        // syncService.recordCoinEarning is now handled by updateBalanceThunk
        syncService.pushEmotionalMetrics(performanceRef.current.startTime, sessionData);

        // 🔓 UNLOCK PERSISTENCE: Explicitly track newly opened content (Phase 5 🚀)
        if (completionResult?.unlocked && completionResult?.nextNode) {
            syncService.recordContentUnlock(
                `${questKey}/${completionResult.nextNode}`, 
                `Study: ${meta.title || completionResult.nextNode}`, 
                subject
            );
        }

        // 🎮 SIMULATION PERSISTENCE (Phase 4 🔓)
        if (hasFetcher) {
            syncService.recordSimulationUnlock(
                questKey, 
                subject, 
                `Sim: ${meta.title || 'Interactive Lesson'}`
            );
        }

        audioService.finish();
        // Navigation is now deferred until CelebrationView.onCollect
    }, [dispatch, location.state, navigate, steps, user.current_streak]);

    // [MOD] Auto-exit for English Stories (EXPLORE) to skip celebration
    useEffect(() => {
        if (phase === 'finished' && meta.subject === 'english' && location.state?.nodeType === 'EXPLORE') {
            navigate(-1);
        }
    }, [phase, meta.subject, location.state?.nodeType, navigate]);

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
            setStepIdx(sessionRef.current.stepIndex); // Only update index if we have more steps
        }
    }, [finishQuest]);

    // ── RENDER ────────────────────────────────────────────────────────────────
    const progressPct = steps.length > 0 ? Math.round(((stepIdx + 1) / steps.length) * 100) : 0;

    return (
        <QuestBusProvider state={{
            advanceStep,
            enableButton: (label) => setBtnState(s => ({ ...s, enabled: true, label: label || s.label })),
            disableButton: () => setBtnState(s => ({ ...s, enabled: false })),
            setIsTyping: (val) => {
                window.__manyaIsTyping = val; 
                setBtnState(s => ({ ...s, enabled: !val }));
            },
            onEngineResult: handleEngineResult
        }}>
            <PremiumFXOverlay />
            <div className="quest-runner-shell" style={{ '--biome-color': biomeColor }}>
                {/* ── UNIFIED PREMIUM QUEST HUD ── */}
                {phase === 'running' && (
                    <QuestHUD 
                        subject={meta.subject} 
                        current={stepIdx + 1} 
                        total={steps.length} 
                        correctCount={sessionRef.current?.correctCount || 0}
                        streakCount={sessionRef.current?.currentStreak || 0}
                        masteryScore={sessionRef.current?.lastMasteryScore || 0}
                        frustrationScore={frustration}
                        sessionCoins={sessionRewards.coins}
                        sessionGems={sessionRewards.gems}
                        onClose={() => navigate(-1)} 
                        hideTracker={
                            meta.subject === 'english' && (
                                location.state?.nodeType === 'EXPLORE' || 
                                steps[stepIdx]?.engineType === 'ENGLISH_RULE_MASTER' ||
                                steps[stepIdx]?.nodeType === 'EXPLORE'
                            )
                        }
                    />
                )}

                <main className="qr-content-area scroll-smooth flex-1 min-h-0 !p-0 !m-0 !w-full">
                    <QuestErrorBoundary key={stepIdx + phase} onSkip={advanceStep}>
                        {phase === 'loading' && (() => {
                            const cfg = getLoadingConfig(meta.subject);
                            return (
                                <div className="quest-loading-overlay flex-1 relative" style={{ '--loader-color': cfg.color, '--loader-bg': cfg.bgLight }}>
                                    <div className="loader-blob loader-blob-1" style={{ background: cfg.color }} />
                                    <div className="loader-blob loader-blob-2" style={{ background: cfg.color }} />
                                    <div className="loader-content-card">
                                        <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                                            <img src={cfg.mascot} alt="mascot" className="loader-mascot-img" />
                                        </div>
                                        <h3 className="loader-title">{cfg.title}</h3>
                                        <div className="loader-bounce-dots">
                                            <span className="loader-dot" style={{ background: cfg.color, animationDelay: '0ms' }} />
                                            <span className="loader-dot" style={{ background: cfg.color, animationDelay: '200ms' }} />
                                            <span className="loader-dot" style={{ background: cfg.color, animationDelay: '400ms' }} />
                                        </div>
                                        <div className="loader-fact-card" style={{ borderColor: `${cfg.color}30` }}>
                                            <span className="loader-fact-label" style={{ color: cfg.color }}>Did you know?</span>
                                            <p className="loader-fact-text">{getRandomFact(meta.subject)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {phase === 'running' && activeEngine && (
                            <div className="w-full !max-w-none flex-1 min-h-0 flex flex-col animate-in fade-in duration-500 overflow-hidden bg-[var(--bg-main)] !p-0 !m-0">
                                <Suspense fallback={
                                    <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4">
                                        <div className={`w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin`} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse">Loading Engine...</p>
                                    </div>
                                }>
                                    {activeEngine && (
                                        <div className="engine-container !w-full !max-w-none !h-full !p-0 !m-0" key={`${stepIdx}_${activeEngine.currentMode}`}>
                                            <activeEngine.component 
                                                data={activeEngine.data}
                                                nodeType={location.state?.nodeType}
                                                onComplete={advanceStep}
                                                onResult={handleEngineResult}
                                            />
                                        </div>
                                    )}
                                </Suspense>
                            </div>
                        )}
                        {phase === 'finished' && meta.subject === 'english' && location.state?.nodeType === 'EXPLORE' ? null : phase === 'finished' && (
                            <CelebrationView 
                                subject={meta.subject}
                                nodeType={location.state?.nodeType || 'WARMUP'}
                                mastery={performanceRef.current.finalMastery || 0}
                                score={sessionRef.current?.correctCount || 0}
                                total={steps.length}
                                stars={performanceRef.current.finalStars || 0}
                                coinsEarned={performanceRef.current.finalCoins || 0}
                                gemsEarned={performanceRef.current.finalGems || 0}
                                onCollect={() => navigate(-1)}
                            />
                        )}
                    </QuestErrorBoundary>
                </main>

                {phase === 'running' && !activeEngine?.hideGlobalFooter && meta.subject?.toLowerCase() !== 'english' && (!(steps[stepIdx]?.data?.mode === 'quiz' || steps[stepIdx]?.mode === 'quiz' || steps[stepIdx]?.data?.mode === 'puzzle' || steps[stepIdx]?.mode === 'puzzle')) && (
                    <footer id="qr-footer-mount" className={`qr-classic-footer ${activeEngine?.floatingFooter || meta.subject === 'english' ? 'qr-footer-floating' : ''}`}>
                        <div className="flex justify-center max-w-[500px] mx-auto w-full">
                            {btnState.label && (
                                <button
                                    className="manya-btn-pro w-full"
                                    style={{ 
                                        backgroundColor: btnState.enabled ? biomeColor : 'var(--border-subtle)',
                                        boxShadow: btnState.enabled ? `0 6px 0 ${biomeColor}88` : 'none',
                                        opacity: btnState.enabled ? 1 : 0.5
                                    }}
                                    disabled={!btnState.enabled}
                                    onClick={advanceStep}
                                >
                                    {btnState.label}
                                </button>
                            )}
                        </div>
                    </footer>
                )}
            </div>
        </QuestBusProvider>
    );
}
