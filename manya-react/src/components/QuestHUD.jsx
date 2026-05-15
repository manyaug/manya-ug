/**
 * QuestHUD
 * ========
 * Pixel-perfect replica of the quest header from manya_logic.
 * Features a dark theme, recessed close button, and glowing subject labels.
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Check, Zap, Brain } from 'lucide-react';
import { useSelector } from 'react-redux';
import { getGem, IMAGES } from '../config/assetUrls.js';
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
    nodeType = 'PRACTICE',
    hideTracker = false,
    immersive = false,
    internalIndex = 0,
    internalTotal = 0,
    onClose 
}) => {
    const user = useSelector(state => state.user.data);
    const [isAbsorbing, setIsAbsorbing] = useState(false);
    const [isCoinAbsorbing, setIsCoinAbsorbing] = useState(false);

    // Current coin value from Redux
    const coins = user?.coins || 0;

    // Brain State Styling
    const brainState = frustration > 70 ? 'rescue' : frustration > 40 ? 'tuning' : 'healthy';
    const brainColor = brainState === 'rescue' ? 'var(--manya-purple)' : brainState === 'tuning' ? 'var(--manya-gold)' : 'var(--manya-green)';
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

    // Progress = Percentage passed from the runner (which now includes sub-progress)
    const progressPct = Math.min(100, current); 
    
    // Mastery = Accuracy (Toward the 60% goal)
    const PASS_THRESHOLD = 60;
    const isPassing = masteryScore >= PASS_THRESHOLD;
    
    const themeColor = 'var(--manya-gold)'; // Unified Amber/Gold for high-contrast visibility

    const showMastery = nodeType !== 'EXPLORE'; 

    return (
        <div className="quest-hud-premium" data-subject={subject.toLowerCase()}>
            {/* 📏 TOP INDICATOR (v8.3) */}
            <div className="hud-completion-track">
                <div 
                    className="hud-completion-fill" 
                    style={{ 
                        width: `${progressPct}%`, 
                        background: isPassing ? 'var(--manya-gold)' : 'var(--manya-green)',
                        transition: 'background 0.6s ease, width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} 
                />
            </div>

            {/* HEADER ROW */}
            <div className="hud-top-flex">
                <div className="hud-left-group">
                    <button className="hud-x-btn" onClick={handleClose}>
                        <X size={14} strokeWidth={4} />
                    </button>
                    <div className="hud-subject-badge">
                        {subjectNames[subject.toLowerCase()] || subject.toUpperCase()}
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

            {/* PROGRESS SECTION */}
            {!hideTracker && (
                <div className={`hud-mastery-card-premium ${immersive ? 'hud-immersive-compact' : ''}`}>
                    <div className="mastery-label-flex">
                        <div className="mastery-progress-header">
                             <span>{internalTotal > 0 ? `Step ${internalIndex}/${internalTotal}` : 'Mastery Progress'}</span>
                        </div>
                        {showMastery && (
                            <span className="mastery-pct-val" style={{ 
                                color: themeColor,
                                textShadow: `0 0 10px ${themeColor}66`
                            }}>
                                <Trophy size={10} className="inline mr-1" />
                                Mastery: {Math.round(masteryScore)}% / {PASS_THRESHOLD}%
                            </span>
                        )}
                    </div>

                    <div className="hud-progress-container">
                        <div className="hud-progress-track">
                             <div className="hud-scale-marker" style={{ left: '0%' }}><div className="marker-line" /></div>
                             {showMastery && (
                                 <div className="hud-scale-marker marker-target" style={{ left: '60%' }}><div className="marker-line" /></div>
                             )}
                             <div className="hud-scale-marker" style={{ left: '100%' }}><div className="marker-line" /></div>

                             {/* MAIN BAR = COMPLETION */}
                             <div className="hud-progress-fill-gradient" 
                                  style={{ 
                                      width: `${progressPct}%`, 
                                      backgroundColor: isPassing ? 'var(--manya-gold)' : 'var(--manya-green)',
                                      boxShadow: isPassing 
                                          ? '0 0 15px rgba(251, 191, 36, 0.4)'
                                          : '0 0 15px rgba(16, 185, 129, 0.3)',
                                      transition: 'background-color 0.6s ease, box-shadow 0.6s ease'
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
