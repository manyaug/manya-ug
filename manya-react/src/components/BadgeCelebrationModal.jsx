import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { dismissBadgeCelebration, awardGems } from '../store/userSlice';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, X } from 'lucide-react';
import { BADGES } from '../config/badges';
import { audioService } from '../infrastructure/audio/audioService';
import { Ribbon, WorldClassConfetti } from './ui/CelebrationBling';
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
                audioService.playSFX('bass_drop'); // Heavy impact on the modal slide up
                // Start fanfare automatically shortly after
                setTimeout(() => audioService.playSFX('challenge_win'), 400);
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
        
        // Economy: Badges strictly award 1 Gem
        dispatch(awardGems({ subject: 'general', amount: 1, xp: 0 }));
        
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
        <div className={`celebration-arena-overlay ${isVisible ? 'is-active' : ''}`} style={{ visibility: isVisible ? 'visible' : 'hidden', opacity: isVisible ? 1 : 0 }}>
            {isVisible && <WorldClassConfetti />}
            
            <div className="celebration-card-container relative z-10" style={{ animation: isVisible ? 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none' }}>
                <button className="celebration-close-x" onClick={handleCollect}>
                    <X size={20} strokeWidth={4} />
                </button>

                <div className={`badge-hero-card tier-${badge.tier.toLowerCase()} !bg-transparent !border-0 !shadow-none !p-0 !transform-none w-full flex items-center justify-center mb-6`}>
                    <div className="badge-glow-ring" />
                    
                    <div className="badge-crest-vault !mb-0 z-10 relative">
                        <div className="badge-icon-reveal">
                            {renderIcon(badge.icon)}
                        </div>
                        <div className="badge-shine-effect" />
                    </div>
                </div>

                <Ribbon text="ACHIEVEMENT UNLOCKED" />

                <h1 className="celebration-title-premium mt-4">{badge.name}</h1>
                <p className="celebration-subtext-premium mb-2">{badge.desc}</p>
                <div className="flex justify-center items-center gap-2 mb-6">
                    <span className="celebration-tier-badge !mt-0 !mb-0">{badge.tier}</span>
                    <span className="font-black text-sm text-[var(--accent-glow)] tracking-wider px-3 py-1 bg-[var(--glass-bg)] border border-[var(--border-subtle)] rounded-full shadow-inner">+1 GEM 💎</span>
                </div>

                <button className="btn-collect-3d mt-2 w-full max-w-[280px] mx-auto block" onClick={handleCollect}>
                    <div className="btn-gloss-highlight" />
                    <span className="flex items-center justify-center gap-2">CLAIM GLORY <ArrowRight size={20} className="inline" strokeWidth={3} /></span>
                </button>
            </div>
        </div>
    );
};

export default BadgeCelebrationModal;
