import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { dismissBadgeCelebration } from '../store/userSlice';
import * as LucideIcons from 'lucide-react';
import { BADGES } from '../config/badges';
import { audioService } from '../infrastructure/audio/audioService';
import '../styles/badge-celebration.css';

const EMPTY_ARRAY = [];
const COOLDOWN_MS = 12000; // 12 second "breathing room"

const BadgeCelebrationModal = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const pending = useSelector(state => state.user.data.pendingBadgeCelebrations || EMPTY_ARRAY);
    const [isVisible, setIsVisible] = useState(false);
    const [isOnCooldown, setIsOnCooldown] = useState(false);
    
    // Get current badge to celebrate
    const currentBadgeId = pending?.[0];
    const badge = BADGES.find(b => b.id === currentBadgeId);

    // 🛡️ SECURITY & PACING: 
    // We only celebrate in "Neutral" zones (Home/Path) and with a delay.
    useEffect(() => {
        const isSafePath = !location.pathname.includes('/quest') && !location.pathname.includes('/learn');
        
        if (currentBadgeId && isSafePath && !isOnCooldown) {
            // Add a small random jitter (2-5s) so it feels organic
            const jitter = 2000 + (Math.random() * 3000);
            
            const timer = setTimeout(() => {
                setIsVisible(true);
                audioService.playSFX('victory');
            }, jitter);
            
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [currentBadgeId, location.pathname, isOnCooldown]);

    if (!badge || !isVisible) return null;

    const handleCollect = () => {
        setIsVisible(false);
        setIsOnCooldown(true);
        
        setTimeout(() => {
            dispatch(dismissBadgeCelebration());
            // Reset cooldown after the breathing room period
            setTimeout(() => setIsOnCooldown(false), COOLDOWN_MS);
        }, 300); // Wait for fade out
    };

    const renderIcon = (iconName) => {
        const Icon = LucideIcons[iconName] || LucideIcons.Award;
        return <Icon size={64} strokeWidth={2.5} />;
    };

    return (
        <div className={`badge-celebration-overlay ${isVisible ? 'is-active' : ''}`}>
            <div className="celebration-backdrop" />
            
            <div className={`badge-hero-card tier-${badge.tier.toLowerCase()}`}>
                <div className="badge-glow-ring" />
                
                <div className="badge-crest-vault">
                    <div className="badge-icon-reveal">
                        {renderIcon(badge.icon)}
                    </div>
                    <div className="badge-shine-effect" />
                </div>

                <div className="badge-celebration-text">
                    <span className="celebration-subtitle">NEW ACHIEVEMENT UNLOCKED</span>
                    <h1 className="celebration-badge-name">{badge.name}</h1>
                    <p className="celebration-description">{badge.desc}</p>
                    <div className="celebration-tier-badge">{badge.tier}</div>
                </div>

                <button className="badge-collect-btn" onClick={handleCollect}>
                    COLLECT REWARD
                    <LucideIcons.Sparkles size={20} />
                </button>
            </div>
            
            <div className="confetti-canvas-mock" />
        </div>
    );
};

export default BadgeCelebrationModal;
