/**
 * QuestHUD
 * ========
 * Pixel-perfect replica of the quest header from manya_logic.
 * Features a dark theme, recessed close button, and glowing subject labels.
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Check, Zap, Brain } from 'lucide-react';
import { useSelector } from 'react-redux';
import { getGem } from '../config/assetUrls.js';
import { audioService } from '../infrastructure/audio/audioService';
import '../styles/QuestHUD.css';

const QuestHUD = ({ 
    subject = 'science', 
    current = 1, 
    total = 1, 
    correctCount = 0,
    streakCount = 0,
    masteryScore = 0,
    sessionCoins = 0,
    sessionGems = 0,
    frustration = 0,
    hideTracker = false,
    onClose 
}) => {
    const user = useSelector(state => state.user.data);
    const [isAbsorbing, setIsAbsorbing] = useState(false);
    const [isCoinAbsorbing, setIsCoinAbsorbing] = useState(false);

    // Current coin value from Redux
    const coins = user?.coins || 0;

    // Brain State Styling
    const brainState = frustration > 70 ? 'rescue' : frustration > 40 ? 'tuning' : 'healthy';
    const brainColor = brainState === 'rescue' ? '#3b82f6' : brainState === 'tuning' ? '#f59e0b' : '#10b981';
    const brainLabel = brainState === 'rescue' ? 'Rescue Mode' : brainState === 'tuning' ? 'Adaptive' : 'Healthy Focus';

    // Listen for global reward arrival (emitted by FXLayer)
    useEffect(() => {
        const handler = (e) => {
            const rewardType = e.detail?.type || 'gem';
            if (rewardType === 'coin') {
                setIsCoinAbsorbing(true);
                setTimeout(() => setIsCoinAbsorbing(false), 500);
            } else {
                setIsAbsorbing(true);
                setTimeout(() => setIsAbsorbing(false), 500);
            }
        };
        window.addEventListener('manya-reward-arrived', handler);
        return () => window.removeEventListener('manya-reward-arrived', handler);
    }, []);
    
    const handleClose = () => {
        onClose?.();
    };

    // Map subject codes to display names
    const subjectNames = {
        science: 'SCIENCE',
        math: 'MATHEMATICS',
        sst: 'SOCIAL STUDIES',
        english: 'ENGLISH'
    };

    // Subject gems mapping
    const subjectGems = user?.subjectGems?.[subject.toLowerCase()] || user?.[`${subject.toLowerCase()}Gems`] || 0;
    const gemIcon = getGem(`${subject.toLowerCase()}_gem.svg`);

    const progressPct = Math.min(100, total > 0 ? (current / total) * 100 : 0);
    
    // Target Calculation: Percentage of the way to the 60% PASS_THRESHOLD
    const PASS_THRESHOLD = 60;
    const isPassing = masteryScore >= PASS_THRESHOLD;
    
    // Gold state for passing, Green for leading up to it
    const masteryColor = isPassing ? '#fbbf24' : '#10b981'; 
    const fillGlow = isPassing ? 'rgba(251, 191, 36, 0.4)' : 'rgba(16, 185, 129, 0.3)';

    return (
        <div className="quest-hud-premium">
            {/* HEADER ROW: EXIT | SUBJECT | RESOURCES */}
            <div className="hud-top-flex">
                <div className="hud-left-group">
                    <button className="hud-x-btn" onClick={handleClose}>
                        <X size={14} strokeWidth={4} />
                    </button>
                    <div className="hud-subject-badge">
                        {subjectNames[subject.toLowerCase()] || subject.toUpperCase()}
                    </div>

                    {/* 🧠 THE BRAIN INDICATOR */}
                    <div className={`hud-brain-indicator brain-${brainState}`} title={brainLabel}>
                        <Brain size={12} color={brainColor} />
                        <span style={{ color: brainColor }}>{brainLabel}</span>
                    </div>
                </div>

                <div className="hud-right-group">
                    <div id="hud-coin-pill" className={`hud-pill-premium ${isCoinAbsorbing ? 'hud-absorb-pulse' : ''}`}>
                        <img src={getGem('coin.svg')} alt="C" className="w-3.5 h-3.5" />
                        <span>{(coins + sessionCoins).toLocaleString()}</span>
                    </div>
                    <div id="hud-gem-pill" className={`hud-pill-premium ${isAbsorbing ? 'hud-absorb-pulse' : ''}`}>
                        <img src={gemIcon} alt="G" className="w-3.5 h-3.5" />
                        <span>{subjectGems + sessionGems}</span>
                    </div>
                </div>
            </div>

            {/* PROGRESS COMPONENT */}
            {!hideTracker && (
                <div className="hud-mastery-card-premium">
                    <div className="mastery-label-flex">
                        <div className="mastery-progress-header">
                             <Trophy size={10} className="text-amber-400" />
                             <span>Target Tracker</span>
                        </div>
                        <span className="mastery-pct-val" style={{ 
                            color: masteryColor,
                            textShadow: isPassing ? `0 0 10px ${masteryColor}88` : 'none'
                        }}>
                            {Math.round(masteryScore)}% / {PASS_THRESHOLD}%
                        </span>
                    </div>

                    <div className="hud-progress-container">
                        <div className="hud-progress-track">
                             {/* Scale Markers */}
                             <div className="hud-scale-marker" style={{ left: '0%' }}><div className="marker-line" /></div>
                             <div className="hud-scale-marker marker-target" style={{ left: '60%' }}><div className="marker-line" /></div>
                             <div className="hud-scale-marker" style={{ left: '100%' }}><div className="marker-line" /></div>

                             {/* The Target-Based Fill */}
                             <div className="hud-progress-fill-gradient" 
                                  style={{ 
                                      width: `${masteryScore}%`, 
                                      backgroundColor: masteryColor,
                                      boxShadow: `0 0 15px ${fillGlow}`
                                  }} 
                             />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestHUD;
