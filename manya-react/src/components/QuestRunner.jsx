/**
 * MANYA QUEST RUNNER - v2.0
 * ==========================
 * React wrapper around the vanilla JS engine pipeline.
 * 
 * Receives via location.state:
 *   Option A (from Library direct launch):
 *     { subject, unitId, questFolder, file, label }
 *
 *   Option B (from QuestFactory / QuestPath node tap):
 *     { steps: [...], title, subject, gemFile, biomeColor }
 *
 * State machine: idle → loading → running(N) → finished → exit
 *
 * The vanilla engines run inside mountRef.current (a plain <div>).
 * React only handles the shell: header, progress, footer button, finish screen.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { addToast } from '../store/toastSlice';
import { updateProfile } from '../store/userSlice';
import { loadQuestSteps } from '../utils/questLoader';
import { ENGINE_REGISTRY } from '../utils/engineRouter';
import React, { Suspense } from 'react';
import '../styles/engines.css';

// Engines that handle their own "done" — hide the footer CONTINUE button
const IMMERSIVE_ENGINES = new Set([
    'PROCEDURAL_CANVAS', 'SET_THEORY', 'JUNGLE_MAZE', 'HARVEST_GAME',
    'HANGMAN_GAME', 'SET_CLASSIFIER', 'SUBSET_GAME', 'PIZZA_GAME',
    'BINARY_GAME', 'VENN_SPOTLIGHT', 'MEMORY_MATCH', 'GRAMMAR_MAZE',
    'SENTENCE_TRAIN', 'WORDGRID_ENGINE', 'MORPH_GAME', 'GALLERY_STUDY',
    '2D_HOTSPOT', 'READER_STUDY', '3D_SKELETON'
]);

// ── QuestErrorBoundary — Catch-all for engine crashes ───────────────────
class QuestErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[var(--bg-main)] animate-in fade-in duration-700">
                    <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                        <AlertTriangle size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-[var(--text-main)] mb-3 tracking-tight">Engine Glitch</h2>
                    <p className="max-w-sm text-[var(--text-sub)] text-lg font-bold mb-10 opacity-60 leading-relaxed">
                        Something went wrong with this quest step. Don't worry, you can try again or skip to the next one!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex-1 h-16 bg-[var(--text-main)] text-[var(--bg-main)] rounded-3xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 active:scale-95 transition-all"
                        >
                            <RefreshCw size={20} />
                            RETRY
                        </button>
                        <button 
                            onClick={() => this.props.onSkip()}
                            className="flex-1 h-16 bg-rose-500 text-white rounded-3xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
                        >
                            SKIP STEP →
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Engines where the CONTINUE button is disabled until user interacts (chat/typing)
const WAIT_ENGINES = new Set(['CHAT', 'ENGLISH_RULE_MASTER', 'SYNTAX_ARCHITECT']);

// ── Subject → biome color map (fallback) ────────────────────────────────────
const SUBJECT_COLOR = {
    math: '#7c3aed', science: '#16a34a', sst: '#0ea5e9', english: '#db2777'
};

export default function QuestRunner() {
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user     = useSelector(s => s.user.data);

    const mountRef     = useRef(null);
    const engineRef    = useRef(null);   // holds { router, cleanup }

    const [phase,    setPhase]    = useState('loading'); // loading | running | finished
    const [steps,    setSteps]    = useState([]);
    const [stepIdx,  setStepIdx]  = useState(0);
    const [btnState, setBtnState] = useState({ enabled: true, label: 'CONTINUE' });
    const [meta,     setMeta]     = useState({ title: 'Quest', subject: 'math' });
    const [activeEngine, setActiveEngine] = useState(null); // { type: 'react', component: LazyEx }

    // ── Derive biome color ────────────────────────────────────────────────────
    const biomeColor = location.state?.biomeColor || SUBJECT_COLOR[meta.subject] || '#7c3aed';
    const gemFile    = location.state?.gemFile    || `${meta.subject}_gem.svg`;

    // ── Cleanup helper — kills all engine side-effects ────────────────────────
    const cleanupEngine = useCallback(() => {
        if (window.ManyaIntervals) {
            window.ManyaIntervals.forEach(clearInterval);
            window.ManyaIntervals = [];
        }
        document.onmousemove  = null;
        document.ontouchmove  = null;
        document.onmouseup    = null;
        document.ontouchend   = null;
        window.removeEventListener('stop-typing', null);
    }, []);

    // ── Expose next() so vanilla engines can call window.QuestRunner.next() ──
    useEffect(() => {
        window.QuestRunner = { 
            next: () => advanceStep(),
            enableButton: (label) => setBtnState(s => ({ ...s, enabled: true, label: label || s.label })),
            disableButton: () => setBtnState(s => ({ ...s, enabled: false })),
            setIsTyping: (val) => {
                window.__manyaIsTyping = val; 
                setBtnState(s => ({ ...s, enabled: !val }));
            }
        };
        // Legacy support mapping
        window.ManyaQuestRunner = window.QuestRunner;
        
        return () => { 
            delete window.QuestRunner; 
            delete window.ManyaQuestRunner;
        };
    });

    // ── Initial load: resolve steps from location.state ───────────────────────
    useEffect(() => {
        const state = location.state;
        if (!state) { navigate('/library'); return; }

        async function init() {
            try {
                let resolvedSteps, resolvedMeta;

                if (state.steps && Array.isArray(state.steps)) {
                    // Option B: pre-built steps from QuestFactory
                    resolvedSteps = state.steps;
                    resolvedMeta  = { title: state.title || 'Quest', subject: state.subject || 'math' };
                } else {
                    // Option A: direct launch from Library
                    const { steps: s, meta: m } = await loadQuestSteps(
                        state.subject, state.unitId, state.questFolder, state.file
                    );
                    resolvedSteps = s;
                    resolvedMeta  = { title: state.label || m.topic || 'Quest', subject: state.subject || 'math' };
                }

                if (resolvedSteps.length === 0) throw new Error('No steps in quest');

                setSteps(resolvedSteps);
                setMeta(resolvedMeta);
                setStepIdx(0);
                setPhase('running');

            } catch (err) {
                console.error('[QuestRunner] init failed:', err);
                dispatch(addToast({ message: 'Could not load quest content.', type: 'error' }));
                navigate('/library');
            }
        }
        init();
        return cleanupEngine;
    }, []); // run once on mount

    // ── Render a step whenever stepIdx changes and phase === 'running' ────────
    useEffect(() => {
        if (phase !== 'running' || steps.length === 0) return;
        renderStep(steps[stepIdx]);
    }, [phase, stepIdx, steps]);

    // ── RENDER STEP ───────────────────────────────────────────────────────────
    async function renderStep(step) {
        if (!mountRef.current) return;
        cleanupEngine();

        // Trigger transition sound
        window.ManyaAudio?.whoosh();

        const { engineType, data, mode } = step;
        const isImmersive = IMMERSIVE_ENGINES.has(engineType);
        const isWait      = WAIT_ENGINES.has(engineType);

        // Set footer button state
        setBtnState({
            enabled: !isWait,
            label: stepIdx === steps.length - 1 ? 'FINISH' : 'CONTINUE',
        });

        // Hide footer for immersive engines
        // Hide footer for some immersive engines, but show for English ones if they need a "Continue"
        const footer = document.getElementById('qr-footer-mount');
        if (footer) {
            // If it's an English engine but marked immersive, we still might want the button for flow
            const isEnglish = meta.subject === 'english';
            footer.style.display = (isImmersive && !isEnglish) ? 'none' : '';
        }

        // 1. Check if it's a React-native engine
        const engineMeta = ENGINE_REGISTRY[engineType] || { type: 'legacy' };
        
        if (engineMeta.type === 'react') {
            setActiveEngine({
                type: 'react',
                component: engineMeta.component,
                data: data
            });
            return;
        }

        // 2. Load the legacy engine via the router
        setActiveEngine(null); // Clear react engine
        try {
            // Hide the dynamic import from Vite's bundler analysis
            const importFn = new Function('url', 'return import(url)');
            const routerMod = await importFn('/legacy/router.js');
            const { ManyaRouter } = routerMod;

            // The vanilla engines write innerHTML into this container
            const contentBox = mountRef.current;
            if (contentBox) {
                contentBox.innerHTML = '';  // clear previous
                await ManyaRouter.loadInline(engineType, data, contentBox);
            }
        } catch (err) {
            console.error(`[QuestRunner] engine load error (${engineType}):`, err);
            if (mountRef.current) {
                mountRef.current.innerHTML = `
                    <div style="padding:30px;text-align:center;color:#ef4444;font-weight:800">
                        ⚠️ Engine "${engineType}" failed to load.<br>
                        <small style="font-size:12px;opacity:0.7">${err.message}</small><br><br>
                        <button onclick="window.QuestRunner.next()" style="padding:10px 20px;background:#7c3aed;color:white;border:none;border-radius:12px;font-weight:900;cursor:pointer">
                            Skip →
                        </button>
                    </div>`;
            }
        }
    }

    // ── ADVANCE ───────────────────────────────────────────────────────────────
    function advanceStep() {
        // If user is in a typing animation, stop-typing first
        if (btnState.label === 'CONTINUE' && window.__manyaIsTyping) {
            window.dispatchEvent(new CustomEvent('stop-typing'));
            return;
        }

        const nextIdx = stepIdx + 1;
        if (nextIdx < steps.length) {
            setStepIdx(nextIdx);
        } else {
            finishQuest();
        }
    }

    // ── FINISH ────────────────────────────────────────────────────────────────
    function finishQuest() {
        cleanupEngine();
        setPhase('finished');

        // Award gems — 3 gems per quest completion
        const gemsEarned = 3;
        dispatch(updateProfile({ diamonds: (user?.diamonds || 0) + gemsEarned }));
        dispatch(addToast({ message: `🏆 Quest complete! +${gemsEarned} gems earned`, type: 'success' }));
        
        // Trigger completion sound
        window.ManyaAudio?.finish();
    }

    // ── PROGRESS ──────────────────────────────────────────────────────────────
    const progressPct = steps.length > 0
        ? Math.round(((stepIdx + 1) / steps.length) * 100)
        : 0;

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div className="quest-runner-shell" style={{ '--biome-color': biomeColor }}>

            {/* ── HEADER (Slick Glass HUD) ── */}
            <header className="qr-classic-header">
                <button
                    className="qr-back-btn"
                    onClick={() => { cleanupEngine(); navigate(-1); }}
                    aria-label="Exit quest"
                >
                    <X size={18} strokeWidth={3} />
                </button>

                <div className="flex items-center justify-center" style={{ flex: 1 }}>
                    <span className="qr-subject-tag">
                        {meta.subject}
                    </span>
                </div>

                <div className="qr-progress-counter">
                    <img
                        src={`/assets/images/gems/${gemFile}`}
                        className="w-5 h-5 object-contain"
                        alt="gem"
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                    <span>
                        {stepIdx + 1}<span className="opacity-30 mx-0.5">/</span>{steps.length}
                    </span>
                </div>

                {/* Integrated Progress Line */}
                <div className="qr-progress-bar">
                    <div className="fill" style={{ width: `${progressPct}%` }} />
                </div>
            </header>

            {/* ── CONTENT AREA (Quest Engine Mount) ── */}
            <main className="qr-content-area scroll-smooth">
                <QuestErrorBoundary key={stepIdx + phase} onSkip={() => advanceStep()}>
                    {phase === 'loading' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 border-4 border-slate-200 border-t-[var(--biome-color)] rounded-full animate-spin mb-6" />
                            <p className="text-[var(--text-main)] font-black tracking-widest uppercase text-xs opacity-40 animate-pulse font-jakarta">
                                Initializing Quest...
                            </p>
                        </div>
                    )}

                    {phase === 'running' && (
                        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-500">
                            {activeEngine?.type === 'react' ? (
                                <div className="flex-1 w-full bg-[var(--bg-main)]">
                                    <Suspense fallback={
                                        <div className="flex-1 flex items-center justify-center p-20">
                                            <div className="w-8 h-8 border-2 border-[var(--biome-color)] border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    }>
                                        <activeEngine.component 
                                            data={activeEngine.data} 
                                            onComplete={() => advanceStep()} 
                                        />
                                    </Suspense>
                                </div>
                            ) : (
                                <div
                                    ref={mountRef}
                                    className="flex-1 w-full bg-[var(--bg-main)] vanilla-engine-mount"
                                    id="qr-content"
                                />
                            )}
                        </div>
                    )}
                </QuestErrorBoundary>
            </main>
            {phase === 'finished' && (
                <div className="quest-finish-screen animate-in" style={{ background: `linear-gradient(135deg, ${biomeColor}, ${biomeColor}dd)` }}>
                    <div className="finish-card bento-card-premium" style={{ border: `3px solid ${biomeColor}22` }}>
                        <div className="confetti-bubble">🎊</div>
                        <h1 style={{ fontWeight: 900, fontSize: '2rem', color: '#1e293b', marginBottom: '8px' }}>
                            Mastery Achieved!
                        </h1>
                        <p style={{ color: '#64748b', fontWeight: 700, fontSize: '1.1rem', marginBottom: '32px' }}>
                             {meta.title}
                        </p>
                        
                        <div className="finish-stats-grid">
                            <div className="stat-bento">
                                <span className="stat-label">Subject</span>
                                <span className="stat-value" style={{ color: biomeColor }}>{meta.subject.toUpperCase()}</span>
                            </div>
                            <div className="stat-bento">
                                <span className="stat-label">Steps</span>
                                <span className="stat-value">{steps.length} / {steps.length}</span>
                            </div>
                        </div>

                        <div className="reward-reveal">
                            <img src={`/assets/images/gems/${gemFile}`} className="floating-gem" alt="" />
                            <div className="reward-text">
                                <span className="plus">+</span>
                                <span className="amount">3</span>
                                <span className="unit">GEMS</span>
                            </div>
                        </div>

                        <button 
                            className="manya-btn-pro" 
                            onClick={() => navigate(-1)}
                            style={{ background: '#1e293b', boxShadow: '0 6px 0 #00000033', marginTop: '40px' }}
                        >
                            CLAIM REWARD
                        </button>
                    </div>
                </div>
            )}

            {/* ── FOOTER (CONTINUE button) ── */}
            {phase === 'running' && !(steps[stepIdx]?.data?.mode === 'quiz' || steps[stepIdx]?.mode === 'quiz' || steps[stepIdx]?.data?.mode === 'puzzle' || steps[stepIdx]?.mode === 'puzzle') && (
                <footer className={`qr-classic-footer ${activeEngine?.component?.floatingFooter ? 'qr-footer-floating' : ''}`}>
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
    );
}
