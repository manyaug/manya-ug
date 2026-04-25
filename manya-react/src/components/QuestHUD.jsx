/**
 * QuestHUD
 * ========
 * Pixel-perfect replica of the quest header from manya_logic.
 * Features a dark theme, recessed close button, and glowing subject labels.
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Check, Zap } from 'lucide-react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
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

    // Subject gems mapping
    const subjectGems = user?.subjectGems?.[subject.toLowerCase()] || user?.[`${subject.toLowerCase()}Gems`] || 0;
    const gemIcon = getGem(`${subject.toLowerCase()}_gem.svg`);

    const progressPct = total > 0 ? (current / total) * 100 : 0;
    
    // Predictive Pass Calculation
    const PASS_THRESHOLD = 75;
    const masteryColor = masteryScore < 50 ? '#f43f5e' : (masteryScore < 75 ? '#f59e0b' : '#10b981');

    return (
        <div className="quest-hud-premium" data-subject={subject.toLowerCase()}>
            <QuestExitModal 
                isOpen={showExitModal}
                subject={subject}
                onClose={() => setShowExitModal(false)}
                onConfirm={onClose}
            />

            {/* TOP BAR: SUBJECT & PERSISTENT WEALTH */}
            <div className="hud-top-flex">
                <div className="hud-left-group">
                    <button className="hud-x-btn" onClick={handleClose}>
                        <X size={18} strokeWidth={4} />
                    </button>
                    <div className="hud-subject-badge">
                        {subjectNames[subject.toLowerCase()] || subject.toUpperCase()}
                    </div>
                </div>

                <div className="hud-right-group">
                    <div id="hud-coin-pill" className={`hud-pill-premium ${isCoinAbsorbing ? 'hud-absorb-pulse' : ''}`}>
                        <div className="hud-coin-icon-wrapper">
                            <img src={getGem('coin.svg')} alt="Coin" className="w-4 h-4 object-contain" />
                        </div>
                        <span>{coins.toLocaleString()}</span>
                    </div>
                    <div id="hud-gem-pill" className={`hud-pill-premium ${isAbsorbing ? 'hud-absorb-pulse' : ''}`}>
                        <div className="hud-gem-icon-wrapper">
                            <img src={gemIcon} alt="Gem" className="w-4 h-4 object-contain" />
                        </div>
                        <span>{subjectGems}</span>
                    </div>
                </div>
            </div>

            {/* MASTERY SECTION: THE DETAILED BAR */}
            <div className="hud-mastery-card-premium">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                         <Trophy size={16} className="text-amber-400" />
                         <span className="font-black text-[11px] tracking-widest text-white/50 uppercase">Quest Mastery Progress</span>
                    </div>
                    <span className="font-black text-sm" style={{ color: masteryColor }}>{Math.round(masteryScore)}%</span>
                </div>

                <div className="hud-progress-container">
                    <div className="hud-progress-track">
                         {/* Scale Markers */}
                         <div className="hud-scale-marker" style={{ left: '25%' }}><div className="marker-line" /><span>25%</span></div>
                         <div className="hud-scale-marker" style={{ left: '50%' }}><div className="marker-line" /><span>50%</span></div>
                         <div className="hud-scale-marker" style={{ left: '75%' }}><div className="marker-line" /><span>75%</span></div>
                         <div className="hud-scale-marker !right-0 !left-auto"><span>100%</span></div>

                         {/* The Fill */}
                         <div className="hud-progress-fill-gradient" style={{ width: `${masteryScore}%`, backgroundColor: masteryColor }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestHUD;
