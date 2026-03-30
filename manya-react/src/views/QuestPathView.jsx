/**
 * MANYA QUEST PATH VIEW - v4.0 (Dynamic Progress)
 * =================================================
 * Nodes unlock based on real student mastery from questProgressService.
 * Shows mastery %, retry indicators, and earned gems dynamically.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronLeft } from 'lucide-react';
import { setAmbientMode } from '../store/audioSlice';
import { buildSteps } from '../utils/questFactory';
import {
    getQuestProgress, getCurrentNodeIndex, getEarnedGems,
    getJustFinished, clearJustFinished, getQuestKey, UNLOCK_THRESHOLDS, NODE_ORDER
} from '../services/questProgressService';
import { findQuestData, preloadCurriculum } from '../services/curriculumService';
import { getGem, IMAGES } from '../config/assetUrls';
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
    
    // Animation states
    const [animatingUnlock, setAnimatingUnlock] = useState(null); // { from, to }
    const [showBurst, setShowBurst] = useState(null); // nodeId
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

    // Find quest data from curriculum
    const getQuestData = () => {
        if (!curriculum || !curriculum[subject]) return null;
        const units = curriculum[subject]?.units || [];
        for (const unit of units) {
            if (unit.id === unitId) {
                const quest = unit.quests?.find(q => q.title === title);
                return quest ? { ...quest, unitId: unit.id } : unit.quests?.[0] ? { ...unit.quests[0], unitId: unit.id } : null;
            }
        }
        for (const unit of units) {
            for (const quest of (unit.quests || [])) {
                if (quest.title === title || quest.folder === unitId) {
                    return { ...quest, unitId: unit.id };
                }
            }
        }
        return null;
    };

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
            
            console.log(`🎬 [QuestPath] Starting unlock animation: ${fromIdx} -> ${toIdx} for key ${questKey}`);

            if (fromIdx !== -1 && toIdx !== -1) {
                // Prepare animation
                setAnimatingUnlock({ from: fromIdx, to: toIdx });
                setIconPos({ x: layoutX[fromIdx], y: 90 - (fromIdx * 20) });
                
                // Clear the flag NOW that we've started the animation
                clearJustFinished();

                // Start movement after brief pause
                setTimeout(() => {
                    setIconPos({ x: layoutX[toIdx], y: 90 - (toIdx * 20) });
                    window.ManyaAudio?.whoosh?.();
                    
                    // Trigger burst after move duration (matches CSS transition)
                    setTimeout(() => {
                        setShowBurst(justFinished.nextNode);
                        window.ManyaAudio?.success?.();
                        
                        // IMPORTANT: Refresh local state to show the node as UNLOCKED after animation
                        // This ensures the "locked" icon disappears at the exact moment of the burst
                        const updatedProg = getQuestProgress(subject, questKey);
                        setProgress(updatedProg);

                        setTimeout(() => {
                            setShowBurst(null);
                            setAnimatingUnlock(null);
                        }, 1000);
                    }, 800);
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
        const t = setTimeout(() => window.ManyaAudio?.whoosh(), 300);
        return () => clearTimeout(t);
    }, []);

    // ── DATA SYNC ──
    useEffect(() => {
        (async () => {
            const curriculum = await preloadCurriculum();
            const data = findQuestData(subject, unitId, title);
            if (data) setQuestData(data);
            setCurriculum(curriculum);
        })();
    }, [subject, unitId, title]);


    // Dynamic derived values from progress
    const currentStep = progress ? getCurrentNodeIndex(subject, questKey) : 0;
    const totalGems = STEPS.length * 3;
    const earnedGems = progress ? getEarnedGems(subject, questKey) : 0;
    const progressPct = (earnedGems / totalGems) * 100;

    const handleStepTap = async (idx, stepDef, isLocked) => {
        if (isLocked || loading) return;
        window.ManyaAudio?.click();
        setLoading(true);

        const nodeType = stepDef.nodeType;

        try {
            const questData = getQuestData();
            if (!questData) {
                console.error('[QuestPath] No quest data found');
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
                console.warn('[QuestPath] No steps generated for:', nodeType);
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
                        <div className="header-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                </div>
                <div
                    className="header-stats quest-gem-pill"
                    onClick={() => navigate('/achievements')}
                    style={{ cursor: 'pointer' }}
                >
                    <img src={getGem(gemFile)} className="header-gem-icon" alt="gem" />
                    <span>{earnedGems}/{totalGems}</span>
                </div>
            </div>

            {/* Loading overlay / Skeleton */}
            {(loading || !curriculum) && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 100,
                    background: 'white', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <div className="text-amber-600 font-black text-xs tracking-widest animate-pulse">PREPARING QUEST WORLD...</div>
                </div>
            )}

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
                    <path d={`M${layoutX[0]},90 Q${layoutX[1]},70 ${layoutX[1]},70 Q${layoutX[2]},50 ${layoutX[2]},50 Q${layoutX[3]},30 ${layoutX[3]},30 Q${layoutX[4]},10 ${layoutX[4]},10`}
                        fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={`M${layoutX[0]},90 Q${layoutX[1]},70 ${layoutX[1]},70 Q${layoutX[2]},50 ${layoutX[2]},50 Q${layoutX[3]},30 ${layoutX[3]},30 Q${layoutX[4]},10 ${layoutX[4]},10`}
                        fill="none" stroke={biomeColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - (100 * ((currentStep + 1) / STEPS.length))}
                        style={{ 
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            filter: `drop-shadow(0 0 6px ${biomeRGB ? `rgba(${biomeRGB}, 0.8)` : biomeColor}) drop-shadow(0 0 2px ${biomeColor})`
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

                    // Gems: 3 if completed with high mastery, 2 if decent, 1 if barely passed
                    const gemsForNode = isCompleted
                        ? (nodeMastery >= 85 ? 3 : nodeMastery >= 70 ? 2 : 1)
                        : 0;

                    const yPct = 90 - (i * 20);
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
                            {/* Gem row */}
                            {!step.isChest && (
                                <div className="node-gem-rating">
                                    <img src={getGem(gemFile)} className={`mini-gem ${gemsForNode >= 1 ? 'earned' : 'empty'}`} alt="" />
                                    <img src={getGem(gemFile)} className={`mini-gem top-gem ${gemsForNode >= 2 ? 'earned' : 'empty'}`} alt="" />
                                    <img src={getGem(gemFile)} className={`mini-gem ${gemsForNode >= 3 ? 'earned' : 'empty'}`} alt="" />
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
                                {isActive && !animatingUnlock && <div className="active-pulse-ring" />}
                                <div className="node-icon-inner">
                                    {isLocked && !step.isChest ? '🔒' :
                                     isCompleted ? '✅' :
                                     step.icon}
                                </div>
                                {isActive && !animatingUnlock && (
                                    <div className={`hero-path-pointer ${heroClass}`}>
                                        <div className="hero-bubble">
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
                        className={`hero-path-pointer animating ${iconPos.x < 50 ? 'hero-right-side' : 'hero-left-side'}`}
                        style={{ 
                            position: 'absolute',
                            left: `${iconPos.x}%`,
                            top: `${iconPos.y}%`,
                            transform: 'translate(-50%, -50%)',
                            transition: 'left 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
