import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { dismissBadgeCelebration, awardGems, syncUserData, updateBalanceThunk } from '../store/userSlice';
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
    const user = useSelector(state => state.user.data);
    const pending = user?.pendingBadgeCelebrations || EMPTY_ARRAY;
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
                    audioService.playSFX('victory'); // Use fanfare for all badges per user request
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

    const handleCollect = (e) => {
        setIsVisible(false);
        setIsOnCooldown(true);
        
        // Economy: Use Transactional Thunk for guaranteed cloud sync
        const currencyKey = (badgeSubject === 'general' || badgeSubject === 'master') 
            ? 'gem_overall' 
            : `gem_${badgeSubject}`;

        // 🚀 Trigger Gem Flight Animation
        if (e && e.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            
            window.dispatchEvent(new CustomEvent('manya-fx-flight', {
                detail: {
                    x: startX,
                    y: startY,
                    type: badgeSubject === 'general' ? 'master' : badgeSubject,
                    amount: 1
                }
            }));
        }

        dispatch(updateBalanceThunk({ 
            currency: currencyKey, 
            amount: 1, 
            type: 'BADGE_EARNED',
            contextId: badge.id
        }));
        
        setTimeout(() => {
            dispatch(dismissBadgeCelebration());
            setTimeout(() => setIsOnCooldown(false), COOLDOWN_MS);
        }, 300);
    };

    const renderIcon = (iconName) => {
        const Icon = LucideIcons[iconName] || LucideIcons.Award;
        return <Icon size={64} strokeWidth={2.5} />;
    };

    return (
        <div className={`badge-celebration-overlay ${isVisible ? 'is-active' : ''}`} style={{ visibility: isVisible ? 'visible' : 'hidden', opacity: isVisible ? 1 : 0 }}>
            <div className="celebration-backdrop" onClick={handleCollect} />
            
            {/* The Solid Card Container */}
            <div className={`badge-hero-card tier-${badge.tier.toLowerCase()} z-10`} style={{ animation: isVisible ? 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none' }}>
                <button className="celebration-close-x absolute top-4 right-4 text-slate-400 hover:text-white" onClick={handleCollect}>
                    <X size={24} strokeWidth={3} />
                </button>

                <div className="relative w-full flex items-center justify-center mt-6 mb-8">
                    
                    {/* ✨ EPIC ROTATING FLARES (Behind the Crest) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={`ray-${i}`}
                                initial={{ opacity: 0, rotate: i * 30 }}
                                animate={{ 
                                    opacity: [0, 0.4, 0], 
                                    rotate: [i * 30, i * 30 + 120] 
                                }}
                                transition={{ 
                                    duration: 4 + (i % 2), 
                                    repeat: Infinity, 
                                    ease: "linear" 
                                }}
                                className="absolute w-[600px] h-[3px] bg-gradient-to-r from-transparent via-amber-200/60 to-transparent blur-[2px]"
                            />
                        ))}
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute w-40 h-40 bg-amber-400/20 rounded-full blur-2xl"
                        />
                    </div>

                    <motion.div 
                        className={`badge-crest-vault ${getShapeClass(badge.tier)} !mb-0 z-10 relative`}
                        animate={{ 
                            rotateY: [0, 15, -15, 0],
                            y: [0, -10, 0]
                        }}
                        transition={{ 
                            duration: 4, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                        }}
                    >
                        <div className="badge-icon-reveal">
                            {renderIcon(badge.icon)}
                        </div>
                        <motion.div 
                            className="badge-shine-effect"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />
                    </motion.div>
                </div>

                <div className="-mt-4 relative z-10 w-full flex justify-center">
                    <Ribbon text="ACHIEVEMENT UNLOCKED" />
                </div>

                <div className="celebration-text-content px-6 mt-6">
                    <h1 className="celebration-badge-name mt-1 text-3xl font-black text-white">{badge.name}</h1>
                    <p className="celebration-description mb-2 text-slate-300">{badge.desc}</p>
                </div>

                <div className="flex justify-center items-center gap-3 mb-6 mt-2">
                    <span className="celebration-tier-badge !mt-0 !mb-0 px-4 py-1 bg-slate-800 rounded-full text-xs font-bold border border-white/10">{badge.tier}</span>
                    <div className="gem-reward-pill flex items-center gap-2 px-4 py-1 bg-slate-800 rounded-full border border-white/10">
                        <img src={gemIcon} alt="Gem" className="w-4 h-4 object-contain" />
                        <span className="font-black text-xs text-white tracking-widest">+1</span>
                    </div>
                </div>

                <button className="badge-collect-btn mb-1 w-full max-w-[260px] mx-auto block bg-gradient-to-r from-indigo-500 to-purple-600 border border-purple-400 text-white shadow-lg" onClick={handleCollect}>
                    <div className="btn-gloss-highlight" />
                    <span className="flex items-center justify-center gap-2">CLAIM REWARD <ArrowRight size={20} className="inline" strokeWidth={3} /></span>
                </button>
            </div>

            {/* 🎉 Confetti is now ABOVE the modal (z-10001) */}
            <div className="fixed inset-0 pointer-events-none z-[10001]">
                {isVisible && <WorldClassConfetti />}
            </div>
        </div>
    );
};

export default BadgeCelebrationModal;
