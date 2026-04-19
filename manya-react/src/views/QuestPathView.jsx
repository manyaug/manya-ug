/**
 * MANYA QUEST PATH VIEW - v4.0 (Dynamic Progress)
 * =================================================
 * Nodes unlock based on real student mastery from questProgressService.
 * Shows mastery %, retry indicators, and earned gems dynamically.
 */
import { useEffect, useState } from 'react';
import { audioService } from '../infrastructure/audio/audioService.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
    getQuestProgress, getCurrentNodeIndex, getEarnedGems as getEarnedStars,
    getJustFinished, clearJustFinished, getQuestKey, UNLOCK_THRESHOLDS, NODE_ORDER
} from '../domain/progress/questProgressService.js';
import { findQuestData, preloadCurriculum } from '../services/curriculumService';
import { IMAGES } from '../config/assetUrls';
import { Star, ChevronLeft, Zap, Sparkles, Search } from 'lucide-react';
import { setAmbientMode } from '../store/audioSlice';
import { buildSteps } from '../utils/questFactory';
import { getLoadingConfig, getRandomFact } from '../config/loadingData';
import '../styles/quest-path.css';

const STEPS = [
    { id: 'warmup',        label: 'Warmup',      icon: '⚡', nodeType: 'WARMUP' },
    { id: 'exploration',   label: 'Explore',     icon: '🔍', nodeType: 'EXPLORE' },
    { id: 'practice',      label: 'Practice',    icon: '🧠', nodeType: 'PRACTICE' },
    { id: 'reinforcement', label: 'Reinforce',   icon: '💎', nodeType: 'REINFORCE' },
    { id: 'mastery',       label: 'Boss Chest',  icon: '🎁', isChest: true, nodeType: 'MASTERY' },
];

const PATH_LAYOUTS = {
    math: [30, 65, 30, 65, 50],
    science: [25, 75, 50, 25, 50],
    sst: [50, 20, 80, 20, 50],
    english: [70, 30, 70, 30, 50],
    default: [35, 65, 35, 65, 50]
};

// Clean, subtle background assets styled per Duolingo aesthetic
const BACKGROUND_ASSETS = {
    math: ['➗', '∑', 'π', '△', '∞'],
    science: ['🌿', '🧬', '🔬', '⚛️', '🦠'],
    sst: ['🌍', '🧭', '🏛️', '🏺', '👑'],
    english: ['✒️', '📖', 'Aa', '✨', '📝']
};

function QuestPathView() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(s => s.user.data);
    const { isNightMode } = useSelector(s => s.audio);

    const [curriculum, setCurriculum] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    
    const [animatingUnlock, setAnimatingUnlock] = useState(null); 
    const [isWalking, setIsWalking] = useState(false);
    const [showBurst, setShowBurst] = useState(null); 
    const [iconPos, setIconPos] = useState(null); // { x, y }

    const {
        subject = 'math',
        unitId = '',
        title = 'Quest',
        gemFile = 'math_gem.svg',
        biomeColor = '#7c3aed',
    } = state || {};

    const layoutX = PATH_LAYOUTS[subject] || PATH_LAYOUTS.default;
    const assets = BACKGROUND_ASSETS[subject] || BACKGROUND_ASSETS.math;

    // 1. Initial stable key (from state)
    // 2. Refresh questData from curriculum when available
    const [questData, setQuestData] = useState(() => findQuestData(subject, unitId, title));
    const questKey = getQuestKey(subject, questData?.unitId || unitId, questData?.folder || title);

    // Load progress and check for just-finished-unlock
    useEffect(() => {
        const prog = getQuestProgress(subject, questKey);
        setProgress(prog);
        console.log(`🗺️ [QuestPath] Loaded progress for ${questKey}:`, prog);
        
        const justFinished = getJustFinished();
        console.log(`🚩 [QuestPath] Just Finished:`, justFinished);

        if (justFinished && justFinished.questKey === questKey && justFinished.unlocked) {
            const fromIdx = NODE_ORDER.indexOf(justFinished.nodeType);
            const toIdx = NODE_ORDER.indexOf(justFinished.nextNode);

            if (fromIdx !== -1 && toIdx !== -1) {
                console.log(`🎬 [QuestPath] Starting unlock animation: ${fromIdx} -> ${toIdx} for key ${questKey}`);
                // Prepare animation
                setAnimatingUnlock({ from: fromIdx, to: toIdx });
                setIconPos({ x: layoutX[fromIdx], y: 85 - (fromIdx * 18) });
                
                // Clear the flag NOW that we've started the animation
                clearJustFinished();

                // Start movement after brief pause
                setTimeout(() => {
                    setIsWalking(true);
                    setIconPos({ x: layoutX[toIdx], y: 85 - (toIdx * 18) });
                    audioService.whoosh?.();
                    
                    // Trigger burst after move duration (matches CSS transition)
                    // The character now moves "elegantly and slowly" over 2 seconds
                    setTimeout(() => {
                        setShowBurst(justFinished.nextNode);
                        audioService.success?.();
                        
                        // IMPORTANT: Refresh local state to show the node as UNLOCKED after animation
                        // This ensures the "locked" icon disappears at the exact moment of the burst
                        const updatedProg = getQuestProgress(subject, questKey);
                        setProgress(updatedProg);

                        setTimeout(() => {
                            setShowBurst(null);
                            setAnimatingUnlock(null);
                            setIsWalking(false);
                        }, 1000);
                    }, 2000); // Wait 2s for movement to finish
                }, 1000);
            }
        }
    }, [subject, questKey]);

    // Ambient audio
    useEffect(() => {
        dispatch(setAmbientMode(isNightMode ? 'night' : 'day'));
    }, [dispatch, isNightMode]);

    // Entry whoosh
    useEffect(() => {
        const t = setTimeout(() => audioService.whoosh(), 300);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            // 0. Ensure master curriculum is loaded FIRST
            const currCache = await preloadCurriculum();
            if (!isMounted) return;

            // 1. Try to discover quest in established cached curriculum
            let data = findQuestData(subject, unitId, title);
            
            // 2. If not found, it's likely a dynamic subject (SST, English, etc.) - Fetch from Vault
            if (!data) {
                // The new fetchDynamicCurriculum implementation handles the fetch-lock internally
                const curr = await fetchDynamicCurriculum(subject);
                if (!isMounted) return;
                
                setCurriculum(prev => ({ ...prev, [subject]: curr }));
                data = findQuestData(subject, unitId, title);
            } else {
                setCurriculum(prev => ({ ...prev, [subject]: currCache[subject] }));
            }

            if (data && isMounted) {
                console.log(`🔍 [QuestPath] Discovery result for ${title}:`, data);
                setQuestData(data);
            }
        })();

        return () => { isMounted = false; };
    }, [subject, unitId, title]);


    // Dynamic derived values from progress
    const currentStep = progress ? getCurrentNodeIndex(subject, questKey) : 0;
    const totalStars = STEPS.length * 3;
    const earnedStars = progress ? getEarnedStars(subject, questKey) : 0;
    const progressPct = (earnedStars / totalStars) * 100;

    const handleStepTap = async (idx, stepDef, isLocked) => {
        if (isLocked || loading) return;
        audioService.click();
        setLoading(true);

        const nodeType = stepDef.nodeType;

        try {
            // Using the stable discovered questData from state
            if (!questData) {
                console.error('[QuestPath] No quest data found in state');
                setLoading(false);
                return;
            }

            const steps = await buildSteps({
                subject,
                unitId: questData.unitId,
                questFolder: questData.folder,
                prefix: questData.prefix || '',
                practiceCount: questData.practiceCount || 0,
                resources: questData.resources || [],
                nodeType,
            });

            if (steps.length > 0) {
                navigate('/quest', {
                    state: {
                        steps,
                        title: `${title} — ${stepDef.label}`,
                        subject,
                        gemFile,
                        biomeColor,
                        // Pass context so SSTFetcherEngine can save progress
                        questKey,
                        nodeType,
                        questIndex: state?.index !== undefined ? state.index : 0,
                    }
                });
            } else {
                console.warn('[QuestPath] No steps generated for:', nodeType, '(Continuing with adaptive engine)');
                // Optionally handle empty steps if needed, for now just log
            }
        } catch (err) {
            console.error('[QuestPath] Failed to build steps:', err);
        } finally {
            setLoading(false);
        }
    };

    // Bulletproof hex to rgb for browser compatibility instead of color-mix()
    const hexToRgb = (hex) => {
        let r = 0, g = 0, b = 0;
        if (hex.startsWith('#')) {
            const cleanHex = hex.slice(1);
            if (cleanHex.length === 3) {
                r = parseInt(cleanHex[0] + cleanHex[0], 16);
                g = parseInt(cleanHex[1] + cleanHex[1], 16);
                b = parseInt(cleanHex[2] + cleanHex[2], 16);
            } else if (cleanHex.length === 6) {
                r = parseInt(cleanHex.substring(0, 2), 16);
                g = parseInt(cleanHex.substring(2, 4), 16);
                b = parseInt(cleanHex.substring(4, 6), 16);
            }
        }
        return `${r}, ${g}, ${b}`;
    };

    const biomeRGB = hexToRgb(biomeColor);

    return (
        <div
            className="quest-path-root animate-in"
            style={{ 
                '--biome-color': biomeColor, 
                '--biome-color-rgb': biomeRGB,
                overflowX: 'hidden', 
                overflowY: 'hidden' 
            }}
        >
            {/* ── TOP HEADER ── */}
            <div className="quest-top-header">
                <button className="back-to-map-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={20} strokeWidth={3} />
                </button>
                <div className="header-info">
                    <div className="header-subtitle">{subject.toUpperCase()} QUEST</div>
                    <div className="header-title">{title}</div>
                    <div className="header-progress-bar">
                        <div className="header-progress-fill" style={{ width: `${progressPct}%` }}>
                            <div className="btn-toy-gloss" />
                        </div>
                    </div>
                </div>
                <div
                    className="header-stats quest-star-pill"
                    onClick={() => navigate('/achievements')}
                    style={{ cursor: 'pointer' }}
                >
                    <Star size={20} fill="#FFD700" color="#B8860B" strokeWidth={2.5} />
                    <span>{earnedStars}/{totalStars}</span>
                </div>
            </div>

            {/* ── PLAYFUL ADVENTURE LOADING OVERLAY (v5.0 — Manya World) ── */}
            {(loading || !curriculum) && (() => {
                const cfg = getLoadingConfig(subject);
                const randomFact = getRandomFact(subject);

                return (
                    <div className="quest-loading-overlay" style={{ '--loader-color': cfg.color, '--loader-dark': cfg.colorDark, '--loader-bg': cfg.bgLight }}>
                        {/* Ambient Glow Blobs */}
                        <div className="loader-blob loader-blob-1" style={{ background: cfg.color }} />
                        <div className="loader-blob loader-blob-2" style={{ background: cfg.color }} />

                        <div className="loader-content-card">
                            {/* Mascot Hero */}
                            <div className="loader-mascot-ring" style={{ borderColor: cfg.color }}>
                                <img src={cfg.mascot} alt={cfg.name} className="loader-mascot-img" />
                            </div>

                            {/* Title & Bounce Dots */}
                            <h3 className="loader-title">{cfg.title}</h3>
                            <div className="loader-bounce-dots">
                                <span className="loader-dot" style={{ background: cfg.color, animationDelay: '0ms' }} />
                                <span className="loader-dot" style={{ background: cfg.color, animationDelay: '200ms' }} />
                                <span className="loader-dot" style={{ background: cfg.color, animationDelay: '400ms' }} />
                            </div>

                            {/* Fun Fact Card */}
                            <div className="loader-fact-card" style={{ borderColor: `${cfg.color}30` }}>
                                <span className="loader-fact-label" style={{ color: cfg.color }}>Did you know?</span>
                                <p className="loader-fact-text">{randomFact}</p>
                            </div>

                            {/* Status */}
                            <p className="loader-status-text">{cfg.sub}</p>
                        </div>
                    </div>
                );
            })()}

            {/* ── PATH AREA ── */}
            <div className="quest-path-body">
                {/* Subject Specific Background Assets */}
                <div className="quest-bg-assets">
                    {assets.map((asset, i) => (
                        <div key={i} className={`bg-asset asset-${i}`} style={{ color: biomeColor }}>
                            {asset}
                        </div>
                    ))}
                </div>

                <svg className="quest-svg-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Shadow/Base Path */}
                    <path d={`M${layoutX[0]},85 L${layoutX[1]},67 L${layoutX[2]},49 L${layoutX[3]},31 L${layoutX[4]},13`}
                        fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* The "Glow" under-layer - Radiant Trail */}
                    <path d={`M${layoutX[0]},85 L${layoutX[1]},67 L${layoutX[2]},49 L${layoutX[3]},31 L${layoutX[4]},13`}
                        fill="none" stroke={biomeColor} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - (100 * (currentStep / (STEPS.length - 1)))}
                        style={{ 
                            opacity: 0.3,
                            filter: 'blur(8px)',
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }} />

                    {/* The Active Glowing Path */}
                    <path d={`M${layoutX[0]},85 L${layoutX[1]},67 L${layoutX[2]},49 L${layoutX[3]},31 L${layoutX[4]},13`}
                        fill="none" stroke={biomeColor} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - (100 * (currentStep / (STEPS.length - 1)))}
                        style={{ 
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            filter: `drop-shadow(0 0 12px ${biomeRGB ? `rgba(${biomeRGB}, 0.9)` : biomeColor}) 
                                     drop-shadow(0 0 4px white)`
                        }} />
                </svg>

                {/* NODES */}
                {STEPS.map((step, i) => {
                    const nodeType = step.nodeType;
                    const nodeProgress = progress?.[nodeType];
                    const nodeStatus = nodeProgress?.status || (i === 0 ? 'available' : 'locked');
                    const nodeMastery = nodeProgress?.mastery || 0;

                    const isCompleted = nodeStatus === 'completed';
                    const isActive = nodeStatus === 'available';
                    const isLocked = nodeStatus === 'locked';

                    const stateClass = isCompleted ? 'completed' : isActive ? 'active' : 'locked';

                    // Stars: 3 if completed with high mastery, 2 if decent, 1 if barely passed
                    const starsForNode = isCompleted
                        ? (nodeMastery >= 85 ? 3 : nodeMastery >= 70 ? 2 : 1)
                        : 0;

                    const yPct = 85 - (i * 18);
                    const xPct = layoutX[i];

                    // Determine if the node is on the left side (xPct < 50)
                    // If left, avatar goes to the right to avoid edge cutoff. If right, avatar goes to left.
                    const isLeftSide = xPct < 50;
                    const heroClass = isLeftSide ? "hero-right-side" : "hero-left-side";

                    // Check if this node needs retry (completed but didn't unlock next)
                    const nextNode = i < NODE_ORDER.length - 1 ? NODE_ORDER[i + 1] : null;
                    const nextThreshold = nextNode ? UNLOCK_THRESHOLDS[nextNode] : 0;
                    const needsRetry = isCompleted && nextNode && nodeMastery < nextThreshold;

                    return (
                        <div
                            key={step.id}
                            className={`quest-node-abs ${stateClass} ${step.isChest ? 'chest-node' : ''}`}
                            style={{ left: `${xPct}%`, top: `${yPct}%` }}
                            onClick={() => handleStepTap(i, step, isLocked)}
                        >
                            {/* Star rating */}
                            {!step.isChest && (
                                <div className="node-star-rating">
                                    <Star size={20} className={`mini-star ${starsForNode >= 1 ? 'earned' : 'empty'}`} fill={starsForNode >= 1 ? '#FFD700' : 'none'} />
                                    <Star size={24} className={`mini-star top-star ${starsForNode >= 2 ? 'earned' : 'empty'}`} fill={starsForNode >= 2 ? '#FFD700' : 'none'} />
                                    <Star size={20} className={`mini-star ${starsForNode >= 3 ? 'earned' : 'empty'}`} fill={starsForNode >= 3 ? '#FFD700' : 'none'} />
                                </div>
                            )}

                            {/* Burst effect layer */}
                            {showBurst === nodeType && (
                                <div className="unlock-burst-effect">
                                    <div className="burst-ring" />
                                    <div className="burst-particles">
                                        {[...Array(8)].map((_, i) => <div key={i} className="particle" style={{ '--angle': `${i * 45}deg` }} />)}
                                    </div>
                                </div>
                            )}

                             {/* Main button */}
                            <button className="tactile-node">
                                <div className="btn-toy-gloss" />
                                {isActive && !animatingUnlock && <div className="active-pulse-ring" />}
                                <div className="node-icon-inner">
                                    {isLocked && !step.isChest ? '🔒' :
                                     isCompleted ? '✅' :
                                     step.icon}
                                </div>
                                {isActive && !animatingUnlock && (
                                    <div className={`hero-path-pointer ${heroClass}`}>
                                        <div className="hero-bubble">
                                            <div className="btn-toy-gloss" />
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed}`}
                                                alt="Hero"
                                            />
                                        </div>
                                    </div>
                                )}
                            </button>

                            {/* Mastery indicator on completed nodes */}
                            {isCompleted && (
                                <div style={{
                                    fontSize: '9px', fontWeight: 900, marginTop: '2px',
                                    color: needsRetry ? '#ef4444' : '#10b981',
                                    textAlign: 'center', letterSpacing: '0.5px'
                                }}>
                                    {nodeMastery}% {needsRetry && '↻'}
                                </div>
                            )}

                            <span className="path-step-label">{step.label}</span>
                        </div>
                    );
                })}

                {/* ANIMATING HERO ICON */}
                {animatingUnlock && iconPos && (
                    <div 
                        className={`hero-path-pointer animating ${iconPos.x < 50 ? 'hero-right-side' : 'hero-left-side'} ${isWalking ? 'walking' : ''}`}
                        style={{ 
                            position: 'absolute',
                            left: `${iconPos.x}%`,
                            top: `${iconPos.y}%`,
                            transform: 'translate(-50%, -50%)',
                            transition: 'left 2s cubic-bezier(0.4, 0, 0.2, 1), top 2s cubic-bezier(0.4, 0, 0.2, 1)',
                            zIndex: 50
                        }}
                    >
                        <div className="hero-bubble active">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed}`}
                                alt="Hero"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuestPathView;
