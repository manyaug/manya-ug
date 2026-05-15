import { useEffect, Suspense, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getGem } from '../config/assetUrls.js';
import { getLoadingConfig, getRandomFact } from '../config/loadingData';
import { QuestBusProvider } from '../ui/context/QuestBus';
import QuestHUD from './QuestHUD'; 
import React from 'react';
import CelebrationView from '../views/CelebrationView.jsx';
import { useCoinAnimation } from '../domain/gamification/useCoinAnimation';
import PremiumFXOverlay from './PremiumFXOverlay';
import { useQuestOrchestrator } from '../hooks/useQuestOrchestrator';
import { audioService } from '../infrastructure/audio/audioService';
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

export default function QuestRunner() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector(s => s.user.data);

    const {
        phase, steps, stepIdx, frustration, btnState, meta, activeEngine,
        sessionRewards, subProgress, virtualTotal, biomeColor,
        session, performance,
        advanceStep, handleEngineResult, replaceCurrentStepWith,
        setBtnState
    } = useQuestOrchestrator();

    const [challengeReward, setChallengeReward] = useState(null);
    const [fact, setFact] = useState('');
    const claimBtnRef = useRef(null);
    const { triggerFlyingCoin } = useCoinAnimation(user?.coins || 0);

    // Pick a random fact when we enter a loading state
    useEffect(() => {
        if (phase === 'loading' || activeEngine?.engineType?.includes('FETCHER')) {
            setFact(getRandomFact(meta.subject));
        }
    }, [phase, activeEngine?.engineType, meta.subject]);

    useEffect(() => {
        window.triggerRewardFlight = (sourceRefOrEl, type = 'coin', amount = 10) => {
            const targetEl = document.getElementById('hud-coin-pill');
            const sourceEl = sourceRefOrEl?.current || sourceRefOrEl;
            if (!targetEl || !sourceEl) return;

            const count = 15;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    triggerFlyingCoin({ current: sourceEl }, { current: targetEl }, i === 0 ? amount : 0, type);
                }, i * 45);
            }
            
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('manya-reward-arrived', { detail: { type } }));
                audioService.collect?.();
            }, 500 + (count * 45));
        };
        return () => { delete window.triggerRewardFlight; };
    }, [triggerFlyingCoin]);

    useEffect(() => {
        const handleAutoContinue = () => { setTimeout(() => advanceStep(), 2500); };
        const handleChallengeComplete = (e) => {
            if (e.detail?.challenge) {
                setChallengeReward(e.detail);
                audioService.playSFX('victory');
            }
        };
        window.addEventListener('manya-fx-correct', handleAutoContinue);
        window.addEventListener('manya-challenge-completed', handleChallengeComplete);
        return () => {
            window.removeEventListener('manya-fx-correct', handleAutoContinue);
            window.removeEventListener('manya-challenge-completed', handleChallengeComplete);
        };
    }, [advanceStep]);

    const subFrac = (subProgress.total > 1) ? (subProgress.current / subProgress.total) : 0;
    
    // v9.7: Testable Only Progress. Exclude Notes from the count.
    const testableSteps = steps.filter(s => s.engineType !== 'NOTE_EXPLORER' && s.engineType !== 'READER_STUDY');
    const totalTestable = testableSteps.length || 1;
    const currentTestableIdx = steps.slice(0, stepIdx).filter(s => s.engineType !== 'NOTE_EXPLORER' && s.engineType !== 'READER_STUDY').length;
    const isCurrentStepNote = steps[stepIdx]?.engineType === 'NOTE_EXPLORER' || steps[stepIdx]?.engineType === 'READER_STUDY';
    
    const progressPct = Math.min(100, Math.round(((currentTestableIdx + (!isCurrentStepNote ? subFrac : 0)) / totalTestable) * 100));

    const busState = useMemo(() => ({
        advanceStep,
        replaceCurrentStepWith,
        enableButton: (label, action) => setBtnState(s => ({ ...s, enabled: true, label: label || s.label, action: action || null })),
        disableButton: () => setBtnState(s => ({ ...s, enabled: false, action: null })),
        setIsTyping: (val) => {
            window.__manyaIsTyping = val; 
            setBtnState(s => ({ ...s, enabled: !val }));
        },
        onEngineResult: handleEngineResult,
        setPools: (pools) => session?.setPools(pools)
    }), [advanceStep, replaceCurrentStepWith, handleEngineResult, session, setBtnState]);

    return (
        <QuestBusProvider state={busState}>
            <PremiumFXOverlay />
            
            {/* 🏆 Mid-Quest Challenge Celebration Modal */}
            {challengeReward && (
                <div className="fixed inset-0 z-[60000] flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm bg-indigo-950 rounded-3xl border-4 border-indigo-500 shadow-2xl p-6 flex flex-col items-center animate-in zoom-in-95 duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/50 to-indigo-800/20 opacity-50 pointer-events-none" />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-30 pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-30 pointer-events-none" />

                        <div className="relative z-10 w-24 h-24 mb-4 flex items-center justify-center bg-indigo-900/80 rounded-full border-4 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                            <img src={getGem(challengeReward.challenge.subject)} alt="Gem" className="w-14 h-14 animate-pulse" />
                        </div>
                        
                        <h2 className="relative z-10 text-2xl font-black text-white text-center tracking-tight mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            CHALLENGE COMPLETE!
                        </h2>
                        <p className="relative z-10 text-indigo-200 font-medium text-center mb-6">
                            {challengeReward.challenge.title}
                        </p>
                        
                        <div className="relative z-10 w-full bg-indigo-900/50 rounded-2xl border border-indigo-700 p-4 flex items-center justify-center gap-3 mb-6">
                            <span className="text-xl text-white font-bold tracking-widest">+ {challengeReward.reward}</span>
                            <img src={getGem(challengeReward.challenge.subject)} alt="Gem" className="w-6 h-6" />
                        </div>

                        <button 
                            ref={claimBtnRef}
                            className="relative z-10 w-full bg-gradient-to-b from-purple-400 to-purple-600 hover:from-purple-300 hover:to-purple-500 text-white font-black text-lg py-4 rounded-2xl shadow-[0_4px_0_rgba(88,28,135,1)] active:translate-y-1 active:shadow-none transition-all"
                            onClick={() => {
                                if (window.triggerRewardFlight && claimBtnRef.current) {
                                    window.triggerRewardFlight(claimBtnRef, 'gem', challengeReward.reward);
                                }
                                setTimeout(() => setChallengeReward(null), 1000);
                            }}
                        >
                            CLAIM REWARD
                        </button>
                    </div>
                </div>
            )}

            <div className="quest-runner-shell flex flex-col h-screen overflow-hidden" style={{ '--biome-color': biomeColor }}>
                {phase === 'running' && (
                    <QuestHUD 
                        subject={meta.subject} current={progressPct} total={100} 
                        correctCount={session?.correctCount || 0}
                        streakCount={session?.currentStreak || 0}
                        masteryScore={session?.lastMasteryScore || 0}
                        frustrationScore={frustration}
                        sessionCoins={sessionRewards.coins}
                        sessionGems={sessionRewards.gems}
                        onClose={() => navigate(-1)} 
                        nodeType={location.state?.nodeType || 'WARMUP'}
                        internalIndex={subProgress.total > 0 ? subProgress.current : (isCurrentStepNote ? currentTestableIdx : currentTestableIdx + 1)}
                        internalTotal={subProgress.total > 0 ? subProgress.total : totalTestable}
                        immersive={!!activeEngine?.engineType?.includes('FETCHER') || subProgress.total > 0}
                    />
                )}
                <main className="qr-content-area scroll-smooth flex-1 min-h-0 !p-0 !m-0 !w-full relative">
                    <QuestErrorBoundary key={stepIdx + phase} onSkip={advanceStep}>
                        {/* 1. BACKGROUND LAYER: Fetchers mount here hidden to do their work */}
                        {phase === 'running' && activeEngine?.engineType?.includes('FETCHER') && (
                            <div className="hidden pointer-events-none" aria-hidden="true">
                                <activeEngine.component 
                                    data={activeEngine.data} 
                                    onComplete={advanceStep} 
                                    onResult={handleEngineResult} 
                                />
                            </div>
                        )}

                        {/* 2. FOREGROUND LAYER: Mutually exclusive UI Phases */}
                        {(() => {
                            // Phase A: Loading Overlay (Show if loading OR if a fetcher is working)
                            if (phase === 'loading' || activeEngine?.engineType?.includes('FETCHER')) {
                                const cfg = getLoadingConfig(meta.subject);
                                return (
                                    <div className="quest-loading-overlay flex-1 relative animate-in fade-in duration-300" style={{ '--loader-color': cfg.color, '--loader-bg': cfg.bgLight }}>
                                        <div className="loader-content-card">
                                            <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                                                <img src={cfg.mascot} alt="mascot" className="loader-mascot-img" />
                                            </div>
                                            <h3 className="loader-title">{cfg.title}</h3>
                                            {fact && (
                                                <div className="loader-fact-box animate-in slide-in-from-bottom-4 duration-700 delay-300">
                                                    <p className="loader-fact-text">{fact}</p>
                                                </div>
                                            )}
                                            <div className="loader-bounce-dots">
                                                <span className="loader-dot" style={{ background: cfg.color, animationDelay: '0ms' }} />
                                                <span className="loader-dot" style={{ background: cfg.color, animationDelay: '200ms' }} />
                                                <span className="loader-dot" style={{ background: cfg.color, animationDelay: '400ms' }} />
                                            </div>
                                            <p className="loader-sub-text">{cfg.sub}</p>
                                        </div>
                                    </div>
                                );
                            }

                            // Phase B: Active Engine (Only show for real content)
                            if (phase === 'running' && activeEngine) {
                                return (
                                    <div className="w-full !max-w-none flex-1 min-h-0 flex flex-col animate-in fade-in duration-500 overflow-hidden bg-[var(--bg-main)] !p-0 !m-0">
                                        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading Engine...</div>}>
                                            <div className="engine-container !w-full !max-w-none !h-full !p-0 !m-0" key={`${stepIdx}_${activeEngine.currentMode}`}>
                                                <activeEngine.component 
                                                    data={activeEngine.data} 
                                                    step={steps[stepIdx]}
                                                    nodeType={location.state?.nodeType} 
                                                    onComplete={advanceStep} 
                                                    onResult={handleEngineResult} 
                                                />
                                            </div>
                                        </Suspense>
                                    </div>
                                );
                            }

                            // Phase C: Celebration/Finished View
                            if (phase === 'finished') {
                                return (
                                    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] animate-in fade-in duration-700">
                                        <CelebrationView 
                                            subject={meta.subject}
                                            nodeType={location.state?.nodeType || 'WARMUP'}
                                            mastery={performance.finalMastery || 0}
                                            score={session?.correctCount || 0}
                                            total={steps.length}
                                            stars={performance.finalStars || 0}
                                            coinsEarned={performance.finalCoins || 0}
                                            gemsEarned={performance.finalGems || 0}
                                            onCollect={() => navigate(-1)}
                                        />
                                    </div>
                                );
                            }

                            return null;
                        })()}
                    </QuestErrorBoundary>
                </main>
                {phase === 'running' && !activeEngine?.hideGlobalFooter && !activeEngine?.isImmersive && meta.subject?.toLowerCase() !== 'english' && (
                    <footer id="qr-footer-mount" className="qr-classic-footer">
                        <div className="flex justify-center max-w-[500px] mx-auto w-full">
                            {btnState.label && (
                                <button 
                                    className="manya-btn-pro w-full" 
                                    style={{ backgroundColor: btnState.enabled ? biomeColor : 'var(--border-subtle)' }} 
                                    disabled={!btnState.enabled} 
                                    onClick={btnState.action || advanceStep}
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
