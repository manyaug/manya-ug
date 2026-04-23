/**
 * QuestHUD
 * ========
 * Pixel-perfect replica of the quest header from manya_logic.
 * Features a dark theme, recessed close button, and glowing subject labels.
 */
import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useSelector } from 'react-redux';
import { AnimatePresence } from 'framer-motion';
import { getGem } from '../config/assetUrls.js';
import { audioService } from '../infrastructure/audio/audioService';
import QuestExitModal from './QuestExitModal';
import '../styles/QuestHUD.css';

const QuestHUD = ({ 
    subject = 'science', 
    current = 1, 
    total = 1, 
    correctCount = 0,
    streakCount = 0,
    masteryScore = 0,
    onClose 
}) => {
    const user = useSelector(state => state.user.data);
    const [isAbsorbing, setIsAbsorbing] = useState(false);
    const [isCoinAbsorbing, setIsCoinAbsorbing] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);

    // Current coin value from Redux
    const coins = user?.coins || 0;


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
        setShowExitModal(true);
    };

    // Map subject codes to display names
    const subjectNames = {
        science: 'SCIENCE',
        math: 'MATHEMATICS',
        sst: 'SOCIAL STUDIES',
        english: 'ENGLISH'
    };

    // Use specific gems
    const gemIcon = getGem(`${subject.toLowerCase()}_gem.svg`);

    const progressPct = total > 0 ? (current / total) * 100 : 0;
    
    // Predictive Pass Calculation
    const PASS_THRESHOLD = 75;
    const isPassing = masteryScore >= PASS_THRESHOLD;
    const masteryColor = masteryScore < 50 ? '#ef4444' : (masteryScore < 75 ? '#f59e0b' : '#10b981');

    return (
        <div className="quest-hud-minimal" data-subject={subject.toLowerCase()}>

            <QuestExitModal 
                isOpen={showExitModal}
                subject={subject}
                onClose={() => setShowExitModal(false)}
                onConfirm={onClose}
            />

            <div className="hud-top-flex">
                <div className="hud-left-group">
                    <button className="hud-x-btn" onClick={handleClose}>
                        <X size={20} />
                    </button>
                    <div className="hud-subject-badge">
                        {subjectNames[subject.toLowerCase()] || subject.toUpperCase()}
                    </div>
                </div>

                <div className="hud-right-group">
                    <div id="hud-coin-pill" className={`hud-stat-box ${isCoinAbsorbing ? 'hud-absorb-pulse' : ''}`}>
                        <img src={getGem('coin.svg')} alt="Coin" className="hud-mini-icon" />
                        <span>{coins.toLocaleString()}</span>
                    </div>
                    <div id="hud-gem-pill" className={`hud-stat-box ${isAbsorbing ? 'hud-absorb-pulse' : ''}`}>
                        <img src={gemIcon} alt="Gem" className="hud-mini-icon" />
                        <span>{current}/{total}</span>
                    </div>
                </div>
            </div>

            <div className="hud-mastery-section">
                <div className="hud-bar-lane">
                    <div className="hud-progress-bg">
                        <div 
                            className="hud-progress-fill" 
                            style={{ width: `${progressPct}%` }}
                        />
                        <div 
                            className="hud-pass-tick" 
                            style={{ left: `${PASS_THRESHOLD}%` }}
                        />
                        <div 
                            className="hud-mastery-dot" 
                            style={{ left: `${masteryScore}%`, backgroundColor: masteryColor }}
                        />
                    </div>
                </div>
                <div className="hud-mastery-info">
                    <span className="hud-mastery-label" style={{ color: masteryColor }}>
                        MASTERY: {Math.round(masteryScore)}%
                    </span>
                    <span className="hud-target-label">
                        TARGET: {PASS_THRESHOLD}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default QuestHUD;
