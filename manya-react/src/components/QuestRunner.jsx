import { useEffect, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getLoadingConfig } from '../config/loadingData';
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

    const { triggerFlyingCoin } = useCoinAnimation(user?.coins || 0);

    useEffect(() => {
        window.triggerRewardFlight = (sourceRefOrEl, type = 'coin', amount = 10) => {
            const targetEl = document.getElementById('hud-coin-pill');
            const sourceEl = sourceRefOrEl?.current || sourceRefOrEl;
            if (!targetEl || !sourceEl) return;

            const count = 15;
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    triggerFlyingCoin({ current: sourceEl }, { current: targetEl }, i === 0 ? amount : 0);
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
        window.addEventListener('manya-fx-correct', handleAutoContinue);
        return () => window.removeEventListener('manya-fx-correct', handleAutoContinue);
    }, [advanceStep]);

    const subFrac = (subProgress.total > 1) ? (subProgress.current / subProgress.total) : 0;
    const effectiveTotal = virtualTotal || steps.length;
    const progressPct = effectiveTotal > 0 ? Math.min(100, Math.round(((stepIdx + subFrac) / effectiveTotal) * 100)) : 0;

    return (
        <QuestBusProvider state={{
            advanceStep,
            replaceCurrentStepWith,
            enableButton: (label, action) => setBtnState(s => ({ ...s, enabled: true, label: label || s.label, action: action || null })),
            disableButton: () => setBtnState(s => ({ ...s, enabled: false, action: null })),
            setIsTyping: (val) => {
                window.__manyaIsTyping = val; 
                setBtnState(s => ({ ...s, enabled: !val }));
            },
            onEngineResult: handleEngineResult
        }}>
            <PremiumFXOverlay />
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
                        internalIndex={subProgress.current}
                        internalTotal={subProgress.total}
                        immersive={!!activeEngine?.engineType?.includes('FETCHER') || subProgress.total > 0}
                    />
                )}
                <main className="qr-content-area scroll-smooth flex-1 min-h-0 !p-0 !m-0 !w-full">
                    <QuestErrorBoundary key={stepIdx + phase} onSkip={advanceStep}>
                        {phase === 'loading' && (() => {
                            const cfg = getLoadingConfig(meta.subject);
                            return (
                                <div className="quest-loading-overlay flex-1 relative" style={{ '--loader-color': cfg.color, '--loader-bg': cfg.bgLight }}>
                                    <div className="loader-content-card">
                                        <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}><img src={cfg.mascot} alt="mascot" className="loader-mascot-img" /></div>
                                        <h3 className="loader-title">{cfg.title}</h3>
                                        <div className="loader-bounce-dots">
                                            <span className="loader-dot" style={{ background: cfg.color, animationDelay: '0ms' }} />
                                            <span className="loader-dot" style={{ background: cfg.color, animationDelay: '200ms' }} />
                                            <span className="loader-dot" style={{ background: cfg.color, animationDelay: '400ms' }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                        {phase === 'running' && activeEngine && (() => {
                            console.log(`[QuestRunner] Rendering Engine: ${activeEngine.engineType}`, activeEngine.data);
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
                        })()}
                        {phase === 'finished' && (
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
                        )}
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
