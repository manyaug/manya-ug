/**
 * MANYA QUEST PATH VIEW - v4.0 (Dynamic Progress)
 * =================================================
 * Nodes unlock based on real student mastery from questProgressService.
 * Shows mastery %, retry indicators, and earned gems dynamically.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronLeft, Compass, Zap, Trophy, Sparkles, Search } from 'lucide-react';
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
                setIconPos({ x: layoutX[fromIdx], y: 85 - (fromIdx * 18) });
                
                // Clear the flag NOW that we've started the animation
                clearJustFinished();

                // Start movement after brief pause
                setTimeout(() => {
                    setIconPos({ x: layoutX[toIdx], y: 85 - (toIdx * 18) });
                    window.ManyaAudio?.whoosh?.();
                    
                    // Trigger burst after move duration (matches CSS transition)
                    // The character now moves "elegantly and slowly" over 2 seconds
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
        const t = setTimeout(() => window.ManyaAudio?.whoosh(), 300);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        (async () => {
            const { fetchDynamicCurriculum, preloadCurriculum } = await import('../services/curriculumService');
            
            // 0. Ensure master curriculum is loaded FIRST to prevent race conditions
            const currCache = await preloadCurriculum();

            // 1. Try to discover quest in established cached curriculum
            let data = findQuestData(subject, unitId, title);
            
            // 2. If not found, it's likely a dynamic subject (SST, English, etc.) - Fetch from Vault
            if (!data) {
                console.log(`🌐 [QuestPath] Subject ${subject} not in static master. Fetching dynamic Vault...`);
                const curr = await fetchDynamicCurriculum(subject);
                setCurriculum(prev => ({ ...prev, [subject]: curr }));
                data = findQuestData(subject, unitId, title);
            } else {
                setCurriculum(prev => ({ ...prev, [subject]: currCache[subject] }));
            }

            console.log(`🔍 [QuestPath] Discovery result for ${title}:`, data);
            if (data) setQuestData(data);
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
                    className="header-stats quest-gem-pill"
                    onClick={() => navigate('/achievements')}
                    style={{ cursor: 'pointer' }}
                >
                    <img src={getGem(gemFile)} className="header-gem-icon" alt="gem" />
                    <span>{earnedGems}/{totalGems}</span>
                </div>
            </div>

            {/* ── PLAYFUL ADVENTURE LOADING OVERLAY (v3.0) ── */}
            {(loading || !curriculum) && (() => {
                const theme = {
                    sst: { color: 'amber', icon: Compass, title: "Ready for an Adventure? 🚀", fact: '"The Great Wall of China is so long that it could wrap around the world twice!"', sub: "Preparing SST World..." },
                    science: { color: 'sky', icon: Zap, title: "Quantum Leap! ⚡", fact: '"A single bolt of lightning has enough energy to toast 100,000 slices of bread!"', sub: "Preparing Science Lab..." },
                    math: { color: 'emerald', icon: Trophy, title: "Solving the Puzzle! 🏆", fact: '"The symbol for division (÷) is called an \'obelus\'."', sub: "Preparing Number Land..." },
                    english: { color: 'indigo', icon: Sparkles, title: "Once Upon a Time... ✨", fact: '"The shortest complete sentence in the English language is \'I am.\'"', sub: "Preparing Story World..." },
                    default: { color: 'purple', icon: Search, title: "Magic is Happening... ✨", fact: '"Learning something new every day keeps your brain super strong!"', sub: "Preparing Quest World..." }
                }[subject] || { color: 'purple', icon: Search, title: "Magic is Happening... ✨", fact: '"Learning something new every day keeps your brain super strong!"', sub: "Preparing Quest World..." };

                const Icon = theme.icon;
                const colorClass = theme.color;
                
                return (
                    <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center p-8 overflow-hidden bg-${colorClass}-50/50 backdrop-blur-md`}>
                        {/* Background Decorations */}
                        <div className={`absolute top-20 -left-10 w-40 h-40 bg-${colorClass}-200/20 rounded-full blur-3xl animate-pulse`} />
                        <div className={`absolute bottom-20 -right-10 w-60 h-60 bg-${colorClass}-200/20 rounded-full blur-3xl animate-pulse delay-700`} />
                        
                        <div className="relative z-10 flex flex-col items-center">
                            {/* Bouncing Subject Coin */}
                            <div className="relative mb-12">
                                {/* Orbiting Ring */}
                                <div className={`absolute inset-[-15px] border-4 border-dashed border-${colorClass}-200 rounded-full animate-[spin_8s_linear_infinite]`} />
                                
                                <div className={`w-24 h-24 bg-${colorClass}-500 rounded-full shadow-2xl flex items-center justify-center text-white animate-[bounce_2s_infinite] border-4 border-white`}>
                                    <Icon size={40} strokeWidth={2.5} />
                                </div>
                            </div>

                            <div className="space-y-6 text-center max-w-xs">
                                <div className="space-y-2">
                                    <h3 className={`text-xl font-black text-${colorClass}-900 tracking-tight`}>
                                        {theme.title}
                                    </h3>
                                    <div className="flex justify-center gap-1">
                                        <div className={`w-3 h-3 bg-${colorClass}-400 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
                                        <div className={`w-3 h-3 bg-${colorClass}-400 rounded-full animate-bounce`} style={{ animationDelay: '200ms' }} />
                                        <div className={`w-3 h-3 bg-${colorClass}-400 rounded-full animate-bounce`} style={{ animationDelay: '400ms' }} />
                                    </div>
                                </div>

                                {/* Fun Loading Fact */}
                                <div className={`bg-white/80 backdrop-blur-md rounded-3xl p-5 border-2 border-${colorClass}-100 shadow-sm`}>
                                    <p className={`text-[10px] font-black text-${colorClass}-600 uppercase tracking-widest mb-2 opacity-60`}>Did you know?</p>
                                    <p className={`text-xs font-bold text-${colorClass}-950 leading-relaxed italic m-0`}>
                                        {theme.fact}
                                    </p>
                                </div>

                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {theme.sub}
                                </p>
                            </div>
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
                    <path d={`M${layoutX[0]},85 L${layoutX[1]},67 L${layoutX[2]},49 L${layoutX[3]},31 L${layoutX[4]},13`}
                        fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={`M${layoutX[0]},85 L${layoutX[1]},67 L${layoutX[2]},49 L${layoutX[3]},31 L${layoutX[4]},13`}
                        fill="none" stroke={biomeColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - (100 * (currentStep / (STEPS.length - 1)))}
                        style={{ 
                            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            filter: `drop-shadow(0 0 8px ${biomeRGB ? `rgba(${biomeRGB}, 0.8)` : biomeColor}) drop-shadow(0 0 3px ${biomeColor})`
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
                        className={`hero-path-pointer animating ${iconPos.x < 50 ? 'hero-right-side' : 'hero-left-side'}`}
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
