/**
 * MANYA QUEST PATH VIEW - v2.0
 * All 5 nodes visible in ONE screen — no vertical scroll.
 * Locked from horizontal movement. Gem pill → achievements.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronLeft } from 'lucide-react';
import '../styles/quest-path.css';

const STEPS = [
    { id: 'warmup',        label: 'Warmup',      icon: '⚡', color: '#10B981' },
    { id: 'exploration',   label: 'Explore',     icon: '🔍', color: '#3B82F6' },
    { id: 'practice',      label: 'Practice',    icon: '🧠', color: '#8B5CF6' },
    { id: 'reinforcement', label: 'Reinforce',   icon: '💎', color: '#EC4899' },
    { id: 'mastery',       label: 'Boss Chest',  icon: '🎁', color: '#F59E0B', isChest: true },
];

// Zigzag X positions for each node (in %)
const ZIG_X = [30, 65, 30, 65, 50];

function QuestPathView() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const user = useSelector(s => s.user.data);

    const {
        subject = 'math',
        unitId = '',
        title = 'Quest',
        gemFile = 'math_gem.svg',
        biomeColor = '#7c3aed',
    } = state || {};

    const currentStep = 1; // step 1 = active, 0 = completed, 2-4 = locked
    const totalGems = STEPS.length * 3;
    const earnedGems = currentStep * 3;
    const progressPct = (earnedGems / totalGems) * 100;

    const handleStepTap = (idx, stepId, isLocked) => {
        if (isLocked) return;
        navigate('/quest', {
            state: { subject, unit: unitId, quest: unitId, stepID: stepId, title }
        });
    };

    return (
        <div
            className="quest-path-root animate-in"
            style={{
                '--biome-color': biomeColor,
                overflowX: 'hidden',  /* lock horizontal scroll */
                overflowY: 'hidden',
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

                {/* Gem pill → gem vault */}
                <div
                    className="header-stats quest-gem-pill"
                    onClick={() => navigate('/achievements')}
                    style={{ cursor: 'pointer' }}
                >
                    <img src={`/assets/images/gems/${gemFile}`} className="header-gem-icon" alt="gem" />
                    <span>{earnedGems}/{totalGems}</span>
                </div>
            </div>

            {/* ── FIXED HEIGHT PATH AREA (all 5 nodes, no scroll) ── */}
            <div className="quest-path-body">
                {/* SVG connecting path line */}
                <svg className="quest-svg-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                        d="M30,90 Q65,70 65,70 Q30,50 30,50 Q65,30 65,30 Q50,10 50,10"
                        fill="none"
                        stroke="rgba(0,0,0,0.08)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M30,90 Q65,70 65,70 Q30,50 30,50 Q65,30 65,30 Q50,10 50,10"
                        fill="none"
                        stroke={biomeColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="200"
                        strokeDashoffset={200 - (200 * (currentStep / STEPS.length))}
                        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                    />
                </svg>

                {/* NODES — absolutely placed at zigzag positions */}
                {STEPS.map((step, i) => {
                    const isCompleted = i < currentStep;
                    const isActive = i === currentStep;
                    const isLocked = i > currentStep;

                    const stateClass = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
                    const gemsEarned = isCompleted ? 3 : isActive ? 2 : 0;

                    // Y spread from bottom to top (90% bottom, 10% top)
                    const yPct = 90 - (i * 20);
                    const xPct = ZIG_X[i];

                    return (
                        <div
                            key={step.id}
                            className={`quest-node-abs ${stateClass} ${step.isChest ? 'chest-node' : ''}`}
                            style={{ left: `${xPct}%`, top: `${yPct}%` }}
                            onClick={() => handleStepTap(i, step.id, isLocked)}
                        >
                            {/* Gem row */}
                            {!step.isChest && (
                                <div className="node-gem-rating">
                                    <img src={`/assets/images/gems/${gemFile}`} className={`mini-gem ${gemsEarned >= 1 ? 'earned' : 'empty'}`} alt="" />
                                    <img src={`/assets/images/gems/${gemFile}`} className={`mini-gem top-gem ${gemsEarned >= 2 ? 'earned' : 'empty'}`} alt="" />
                                    <img src={`/assets/images/gems/${gemFile}`} className={`mini-gem ${gemsEarned >= 3 ? 'earned' : 'empty'}`} alt="" />
                                </div>
                            )}

                            {/* Main button */}
                            <button className="tactile-node">
                                {isActive && <div className="active-pulse-ring" />}
                                <div className="node-icon-inner">
                                    {isLocked && !step.isChest ? '🔒' : step.icon}
                                </div>
                                {isActive && (
                                    <div className="hero-path-pointer">
                                        <div className="hero-bubble">
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed}`}
                                                alt="Hero"
                                            />
                                        </div>
                                    </div>
                                )}
                            </button>

                            <span className="path-step-label">{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default QuestPathView;
