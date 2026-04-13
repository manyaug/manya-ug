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
import { ChevronLeft, X, AlertTriangle, RefreshCw, SkipForward, Compass, Zap, Trophy, Sparkles, Search } from 'lucide-react';
import { addToast } from '../store/toastSlice';
import { updateProfile, awardGems } from '../store/userSlice';

import { loadQuestSteps } from '../utils/questLoader';
import { getGem } from '../config/assetUrls';
import { ENGINE_REGISTRY } from '../utils/engineRouter';
import { syncService } from '../services/syncService';
import { masteryService } from '../services/masteryService';
import { calculateFrustration } from '../services/psychTracker';
import { saveNodeCompletion, setJustFinished } from '../services/questProgressService';
import { calculateUSP } from '../utils/scoringUtility';
import React, { Suspense } from 'react';
import '../styles/engines.css';


// Engines that handle their own "done" — hide the footer CONTINUE button
const IMMERSIVE_ENGINES = new Set([
    'PROCEDURAL_CANVAS', 'SET_THEORY', 'JUNGLE_MAZE', 'HARVEST_GAME',
    'HANGMAN_GAME', 'SET_CLASSIFIER', 'SUBSET_GAME', 'PIZZA_GAME',
    'BINARY_GAME', 'VENN_SPOTLIGHT', 'MEMORY_MATCH', 'GRAMMAR_MAZE',
    'SENTENCE_TRAIN', 'WORDGRID_ENGINE', 'MORPH_GAME', 'GALLERY_STUDY',
    '2D_HOTSPOT', 'READER_STUDY', '3D_SKELETON', 'MCQ_STANDALONE',
    'NOTE_EXPLORER',
    // Grammar Simulation Engines
    'SENTENCE_BLOCKS', 'GARDEN_GUARD', 'PUNCTUATION_STICKERS', 'TENSE_TREEHOUSE'
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
    
    // Adaptive Tracking Refs
    const wrongStreakRef = useRef(0);
    const sessionStartTimeRef = useRef(Date.now());

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
        window.__manyaIsTyping = false;
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
            },
            // DB Bridging Callbacks
            onSimulationSubmit: (result) => handleEngineResult(result),
            captureSimulationResult: (isCorrect, score, total) => {
                handleEngineResult({ isCorrect, score, total, type: 'legacy_capture' });
            }
        };
        // Legacy support mapping
        window.ManyaQuestRunner = window.QuestRunner;
        
        return () => { 
            delete window.QuestRunner; 
            delete window.ManyaQuestRunner;
        };
    }, []); // Added dependency array for safety

    /**
     * DYNAMIC METADATA EXTRACTOR
     * Derives conceptId and variant from filename or step data
     */
    const deriveMetadata = useCallback((step) => {
        const identifier = step.file || step.id || 'unknown';
        const { conceptId, variant } = masteryService.parseId(identifier);
        
        let pool = 'no';
        const isQuiz = step.mode === 'quiz' || (step.data?.mode === 'quiz') || step.engineType?.includes('FETCHER');
        const isPuzzle = step.mode === 'puzzle' || (step.data?.mode === 'puzzle');
        
        if (isQuiz || isPuzzle) pool = 'yes';
        if (identifier.includes('recap') || identifier.includes('study')) pool = 'recap';
        
        return { conceptId, variant, pool };
    }, []);

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
        if (!step) return;
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
        const footer = document.getElementById('qr-footer-mount');
        if (footer) {
            const isEnglish = meta.subject === 'english';
            footer.style.display = (isImmersive && !isEnglish) ? 'none' : '';
        }

        // 1. Check if it's a React-native engine FIRST (independent of mountRef)
        const engineMeta = ENGINE_REGISTRY[engineType] || { type: 'legacy' };
        
        if (engineMeta.type === 'react') {
            setActiveEngine({
                ...engineMeta,
                data: data
            });
            return;
        }

        // --- LEGACY ENGINE BRIDGE REMOVED ---
        setActiveEngine(null); 
        console.warn(`[QuestRunner] Attempted to load legacy engine "${engineType}" but the bridge was removed.`);
    }

    // ── RESULT HANDLING (DB BRIDGING) ─────────────────────────────────────────
    const handleEngineResult = useCallback((result) => {
        console.log("[QuestRunner] Received Engine Result:", result);
        
        const currentStep = steps[stepIdx];
        const engineType = currentStep?.engineType || result.type || 'unknown';
        const isSimulation = result.type === 'simulation' || result.type === 'legacy_capture' || IMMERSIVE_ENGINES.has(engineType);

        // 1. APPLY UNIFIED SCORING PROTOCOL (USP) IF SIMULATION
        let usp = null;
        if (isSimulation) {
            usp = calculateUSP({
                accuracy: result.accuracy ?? (result.score && result.total ? (result.score / result.total) : (result.isCorrect ? 1.0 : 0.0)),
                mistakes: result.mistakes || 0,
                timeSpentMs: result.timeSpentMs || (Date.now() - sessionStartTimeRef.current), // Fallback to session start
                engineType: engineType
            }, meta.subject);
            console.log(`📊 [QuestRunner] USP Mastery Score: ${usp.masteryScore}%`, usp);
        }

        // 2. Update Score/XP in Redux
        const isCorrect = usp ? usp.isPassing : result.isCorrect;
        if (isCorrect) {
            const xpAmount = usp ? Math.floor(usp.masteryScore * 0.5) : (result.score ? result.score * 10 : 10);
            dispatch(awardGems({ subject: meta.subject, amount: 0, xp: xpAmount }));
        }

        // 2. Intelligent Adaptive Tracking
        const { conceptId, variant, pool } = deriveMetadata(currentStep);
        
        // Track Frustration
        const frustration = calculateFrustration({
            consecutiveWrong: wrongStreakRef.current + (result.isCorrect ? 0 : 1),
            hintCount: 0, // TODO: Pull from engine state if available
            questionsAnswered: stepIdx + 1
        });

        // Push to Supabase via SyncService
        if (!result.type?.includes('adaptive_')) {
            syncService.pushAnswer(meta.subject, {
                questionId: currentStep.file || currentStep.id || currentStep.topic || 'unknown_step',
                concept_id: conceptId,
                variant: variant,
                isCorrect: isCorrect,
                selectedAnswer: result.selectedAnswer || 'SIM_COMPLETE',
                correctAnswer: result.correctAnswer || 'SIM_COMPLETE',
                timeSpentMs: result.timeSpentMs || (usp ? usp.timeSpentMs : 10000),
                hintUsed: result.hintUsed || false,
                frustrationLevel: frustration.score,
                pool: pool,
                engine_type: engineType,
                usp_data: usp // Store full USP breakdown
            });
        }

        // 3. Streak-based / Mercy Recap Injection
        if (!result.isCorrect) {
            wrongStreakRef.current++;
            const threshold = meta.nodeType === 'PRACTICE' ? 1 : 3;
            if (wrongStreakRef.current >= threshold) {
                console.log(`🚨 [QuestRunner] ${wrongStreakRef.current} Wrong! Injecting Recap...`);
                injectRecapStep(conceptId);
                wrongStreakRef.current = 0;
            }
        } else {
            wrongStreakRef.current = 0;
        }

        // 4. Logic for specific engine types if needed
        if (result.type === 'simulation') {
            dispatch(addToast({ message: "Simulation Complete!", type: "success" }));
        }

        // 3. Auto-enable button or advance if appropriate
        if (result.isCorrect) {
            setBtnState(s => ({ ...s, enabled: true }));
        }
    }, [dispatch, meta.subject, steps, stepIdx, deriveMetadata]);

    /**
     * INJECT RECAP STEP
     * Finds a study/recap resource for the current concept and inserts it into the queue
     */
    function injectRecapStep(conceptId) {
        // Try to find a study card or recap json in the pre-loaded steps or common locations
        // For now, we'll try to find any step that HAS 'study' or 'recap' in its name
        // In a real scenario, we'd search the curriculumService
        const recapStep = {
            id: `injected-recap-${Date.now()}`,
            engineType: 'GALLERY_STUDY', // Default recap engine
            file: `study_${conceptId}.json`,
            mode: 'study',
            data: { isRecap: true, conceptId }
        };

        dispatch(addToast({ 
            message: "Need a quick review? Let's take a look!", 
            type: "info" 
        }));

        setSteps(prev => {
            const newSteps = [...prev];
            newSteps.splice(stepIdx + 1, 0, recapStep);
            return newSteps;
        });
    }

    // ── ADVANCE ───────────────────────────────────────────────────────────────
    function advanceStep() {
        // If user is in a typing animation, stop-typing FIRST to show the full text
        if (window.__manyaIsTyping) {
            console.log("[QuestRunner] Skipping typing animation...");
            window.__manyaIsTyping = false;
            window.dispatchEvent(new CustomEvent('stop-typing'));
            setBtnState(s => ({ ...s, enabled: true }));
            return;
        }

        const nextIdx = stepIdx + 1;
        console.log(`[QuestRunner] Attempting to advance from ${stepIdx} to ${nextIdx} (Total: ${steps.length})`);
        
        if (nextIdx < steps.length) {
            setStepIdx(nextIdx);
        } else if (phase !== 'finished') {
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
        
        // NEW LOGIC TO UNLOCK NEXT NODE FOR PURE-SIMULATION PATHS (like EXPLORE)
        const { subject, questKey, nodeType } = location.state || {};
        const hasFetcher = steps.some(s => s.engineType?.includes('FETCHER'));
        
        // If there was no fetcher to record the mastery natively, we record a perfect score (100%) automatically
        if (questKey && nodeType && !hasFetcher) {
            const result = saveNodeCompletion(subject, questKey, nodeType, 100);
            
            setJustFinished({
                subject,
                questKey,
                nodeType,
                mastery: 100,
                unlocked: result.unlocked,
                nextNode: result.nextNode
            });
        }

        // Trigger completion sound
        window.ManyaAudio?.finish();

        // Exit seamlessly
        setTimeout(() => navigate(-1), 300);
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
                        src={getGem(gemFile)}
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
            <main className="qr-content-area scroll-smooth min-h-0">
                <QuestErrorBoundary key={stepIdx + phase} onSkip={() => advanceStep()}>
                    {phase === 'loading' && (() => {
                        const sub = meta.subject?.toLowerCase();
                        const theme = {
                            sst: { color: 'amber', icon: Compass, title: "Ready for an Adventure? 🚀", fact: '"The Great Wall of China is so long that it could wrap around the world twice!"', sub: "Preparing SST World..." },
                            science: { color: 'sky', icon: Zap, title: "Quantum Leap! ⚡", fact: '"A single bolt of lightning has enough energy to toast 100,000 slices of bread!"', sub: "Preparing Science Lab..." },
                            math: { color: 'emerald', icon: Trophy, title: "Solving the Puzzle! 🏆", fact: '"The symbol for division (÷) is called an \'obelus\'."', sub: "Preparing Number Land..." },
                            english: { color: 'indigo', icon: Sparkles, title: "Once Upon a Time... ✨", fact: '"The shortest complete sentence in the English language is \'I am.\'"', sub: "Preparing Story World..." },
                            default: { color: 'purple', icon: Search, title: "Magic is Happening... ✨", fact: '"Learning something new every day keeps your brain super strong!"', sub: "Preparing Quest World..." }
                        }[sub] || { color: 'purple', icon: Search, title: "Magic is Happening... ✨", fact: '"Learning something new every day keeps your brain super strong!"', sub: "Preparing Quest World..." };

                        const Icon = theme.icon;
                        const colorClass = theme.color;

                        return (
                            <div className={`flex-1 flex flex-col items-center justify-center p-8 overflow-hidden bg-${colorClass}-50/30 relative`}>
                                {/* Background Decorations */}
                                <div className={`absolute top-20 -left-10 w-40 h-40 bg-${colorClass}-200/20 rounded-full blur-3xl animate-pulse`} />
                                <div className={`absolute bottom-20 -right-10 w-60 h-60 bg-${colorClass}-200/20 rounded-full blur-3xl animate-pulse delay-700`} />
                                
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="relative mb-12">
                                        <div className={`absolute inset-[-15px] border-4 border-dashed border-${colorClass}-200 rounded-full animate-[spin_8s_linear_infinite]`} />
                                        <div className={`w-20 h-20 bg-${colorClass}-500 rounded-full shadow-2xl flex items-center justify-center text-white animate-[bounce_2s_infinite] border-4 border-white`}>
                                            <Icon size={32} strokeWidth={2.5} />
                                        </div>
                                    </div>

                                    <div className="space-y-6 text-center max-w-xs">
                                        <div className="space-y-2">
                                            <h3 className={`text-xl font-black text-${colorClass}-900 tracking-tight`}>{theme.title}</h3>
                                            <div className="flex justify-center gap-1">
                                                <div className={`w-2.5 h-2.5 bg-${colorClass}-400 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
                                                <div className={`w-2.5 h-2.5 bg-${colorClass}-400 rounded-full animate-bounce`} style={{ animationDelay: '200ms' }} />
                                                <div className={`w-2.5 h-2.5 bg-${colorClass}-400 rounded-full animate-bounce`} style={{ animationDelay: '400ms' }} />
                                            </div>
                                        </div>

                                        <div className={`bg-white/80 backdrop-blur-md rounded-3xl p-5 border-2 border-${colorClass}-100 shadow-sm mx-4`}>
                                            <p className={`text-[9px] font-black text-${colorClass}-600 uppercase tracking-widest mb-1 opacity-60`}>Did you know?</p>
                                            <p className={`text-xs font-bold text-${colorClass}-950 leading-relaxed italic m-0`}>{theme.fact}</p>
                                        </div>

                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{theme.sub}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {phase === 'running' && (
                        <div className="w-full flex-1 min-h-0 flex flex-col animate-in fade-in duration-500 overflow-hidden">
                            {activeEngine?.type === 'react' ? (
                                <div className="flex-1 min-h-0 w-full bg-[var(--bg-main)] flex flex-col">
                                    <Suspense fallback={(() => {
                                        const sub = meta.subject?.toLowerCase();
                                        const color = { sst: 'amber', science: 'sky', math: 'emerald', english: 'indigo' }[sub] || 'purple';
                                        return (
                                            <div className="flex-1 flex flex-col items-center justify-center p-20 gap-4">
                                                <div className={`w-12 h-12 border-4 border-${color}-100 border-t-${color}-500 rounded-full animate-spin`} />
                                                <p className={`text-[10px] font-black uppercase tracking-widest text-${color}-600 animate-pulse`}>Loading Module...</p>
                                            </div>
                                        );
                                    })()}>
                                        <activeEngine.component 
                                            key={`${stepIdx}-${activeEngine.type}`}
                                            data={activeEngine.data} 
                                            onComplete={() => {
                                                console.log(`[QuestRunner] Engine ${activeEngine.type} completed step ${stepIdx}`);
                                                advanceStep();
                                            }} 
                                            onResult={handleEngineResult}
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

            {/* ── FOOTER (CONTINUE button) ── */}
            {phase === 'running' && !activeEngine?.hideGlobalFooter && (!(steps[stepIdx]?.data?.mode === 'quiz' || steps[stepIdx]?.mode === 'quiz' || steps[stepIdx]?.data?.mode === 'puzzle' || steps[stepIdx]?.mode === 'puzzle') || meta.subject === 'english') && (
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
    );
}
