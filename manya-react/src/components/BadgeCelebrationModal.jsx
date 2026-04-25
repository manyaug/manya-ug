import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { dismissBadgeCelebration, awardGems } from '../store/userSlice';
import * as LucideIcons from 'lucide-react';
import { ArrowRight, X } from 'lucide-react';
import { BADGES } from '../config/badges';
import { audioService } from '../infrastructure/audio/audioService';
import { Ribbon, WorldClassConfetti } from './ui/CelebrationBling';
import { getGem, IMAGES } from '../config/assetUrls';
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
                
                // 🎶 Dynamic Celebration Audio
                setTimeout(() => {
                    if (badge.tier.toUpperCase() === 'DIAMOND') {
                        audioService.playSFX('applause');
                    } else {
                        audioService.playSFX('challenge_win');
                    }
                }, 600);
            }, jitter);
            
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [currentBadgeId, location.pathname, isOnCooldown, badge]);

    if (!badge || !isVisible) return null;

    const badgeSubject = badge.cat.toLowerCase();
    const gemIcon = getGem(badgeSubject === 'general' ? 'master' : badgeSubject);
    
    // Dynamic Shape Mapping
    const getShapeClass = (tier) => {
        const t = tier.toUpperCase();
        if (t === 'GOLD' || t === 'PLATINUM' || t === 'DIAMOND') return 'shape-royal';
        if (t === 'SILVER') return 'shape-spade';
        return 'shape-heater'; // Bronze
    };

    const handleCollect = () => {
        setIsVisible(false);
        setIsOnCooldown(true);
        
        // Economy: Award to specific subject or general
        dispatch(awardGems({ 
            subject: badgeSubject, 
            amount: 1, 
            xp: 0 
        }));
        
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

                <div className={`badge-hero-card tier-${badge.tier.toLowerCase()} !bg-transparent !border-0 !shadow-none !p-0 !transform-none w-full flex items-center justify-center mb-2`}>
                    <div className="badge-glow-ring" />
                    
                    <div className={`badge-crest-vault ${getShapeClass(badge.tier)} !mb-0 z-10 relative`}>
                        <div className="badge-icon-reveal">
                            {renderIcon(badge.icon)}
                        </div>
                        <div className="badge-shine-effect" />
                    </div>
                </div>

                <Ribbon text="ACHIEVEMENT UNLOCKED" />

                <div className="celebration-text-content px-6">
                    <h1 className="celebration-title-premium mt-1">{badge.name}</h1>
                    <p className="celebration-subtext-premium mb-2">{badge.desc}</p>
                </div>

                <div className="flex justify-center items-center gap-2 mb-2">
                    <span className="celebration-tier-badge !mt-0 !mb-0">{badge.tier}</span>
                    <div className="gem-reward-pill flex items-center gap-2 px-4 py-1.5 bg-slate-900/40 border border-white/10 rounded-full">
                        <img src={gemIcon} alt="Gem" className="w-5 h-5 object-contain" />
                        <span className="font-black text-xs text-white tracking-widest">+1</span>
                    </div>
                </div>

                <button className="btn-collect-3d mb-1 w-full max-w-[260px] mx-auto block" onClick={handleCollect}>
                    <div className="btn-gloss-highlight" />
                    <span className="flex items-center justify-center gap-2">CLAIM GLORY <ArrowRight size={20} className="inline" strokeWidth={3} /></span>
                </button>
            </div>
        </div>
    );
};

export default BadgeCelebrationModal;
