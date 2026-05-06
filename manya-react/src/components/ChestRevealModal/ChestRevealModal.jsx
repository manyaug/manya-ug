/**
 * ChestRevealModal - CINEMATIC EDITION v3.5
 * =========================================
 * A high-fidelity, full-screen reward experience.
 * Compacted UI & Fixed Sync Logic.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { dismissChest, awardCoins, awardGems } from '../../store/userSlice.js';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { audioService } from '../../infrastructure/audio/audioService';
import { WorldClassConfetti } from '../ui/CelebrationBling';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { IMAGES, getGem } from '../../config/assetUrls';
import FlyingRewards from './FlyingRewards';
import './ChestRevealModal.css';

const CHEST_CONFIG = {
    bronze:  { name: 'Bronze Chest',  color: '#cd7f32', glow: 'rgba(205, 127, 50, 0.4)' },
    silver:  { name: 'Silver Chest',  color: '#cbd5e1', glow: 'rgba(192, 192, 192, 0.4)' },
    gold:    { name: 'Gold Chest',    color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
    diamond: { name: 'Diamond Chest', color: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)' },
};

const REWARD_ICONS = { 
    coins: IMAGES.coin_gem,
    gems: (subject) => getGem(subject || 'master')
};

export default function ChestRevealModal() {
    const dispatch = useDispatch();
    const user = useSelector(s => s.user.data);
    const pendingChests = useSelector(s => s.user.data.pendingChests || [], (a, b) => a?.length === b?.length);
    const [phase, setPhase] = useState('closed'); // closed → intro → opening → rewards → done
    const [revealedRewards, setRevealedRewards] = useState([]);
    const [isCollecting, setIsCollecting] = useState(false);

    const chest = pendingChests[0];

    // Trigger animation sequence when a new chest appears
    useEffect(() => {
        if (!chest) {
            setPhase('closed');
            return;
        }

        if (phase === 'closed') {
            const startSequence = async () => {
                console.log("🎬 [ChestReveal] Starting Sequence for:", chest.chestType);
                setRevealedRewards([]);
                setPhase('intro');
                audioService.playSFX('riser');

                // 1. Shaking / Intro (0.8s)
                await new Promise(r => setTimeout(r, 800));
                setPhase('opening');
                audioService.playSFX('bass_drop');

                // 2. Open / Reward Reveal (1.8s total mark)
                await new Promise(r => setTimeout(r, 1000));
                setPhase('rewards');
                
                const items = (chest.rewards && chest.rewards.length > 0) 
                    ? chest.rewards 
                    : [{ type: 'coins', amount: 250 }, { type: 'gems', amount: 10, subject: 'master' }];

                console.log("💎 [ChestReveal] Revealing Rewards:", items);

                for (let i = 0; i < items.length; i++) {
                    await new Promise(r => setTimeout(r, 300));
                    setRevealedRewards(prev => [...prev, items[i]]);
                    audioService.playSFX('challenge_click');
                }

                setTimeout(() => audioService.playSFX('victory'), 600); // Trumpet Fanfare per request
            };

            startSequence();
        }
    }, [chest]);

    const handleCollect = useCallback(() => {
        if (isCollecting || phase !== 'rewards') return;
        setIsCollecting(true);
        audioService.playSFX('collect-points');
    }, [isCollecting, phase]);

    const finalizeCollection = useCallback(() => {
        console.log("✅ [ChestReveal] Finalizing Collection...");
        
        revealedRewards.forEach(r => {
            if (r.type === 'coins') {
                dispatch(awardCoins(r.amount));
            } else if (r.type === 'gems') {
                dispatch(awardGems({ subject: r.subject || 'master', amount: r.amount }));
            }
        });
        
        // Sync Logic FIXED: Aggregate both Coins and Gems (Diamonds)
        const totalCoins = revealedRewards.reduce((sum, r) => r.type === 'coins' ? sum + r.amount : sum, 0);
        const totalGems = revealedRewards.reduce((sum, r) => r.type === 'gems' ? sum + r.amount : sum, 0);
        
        const updatedUser = { 
            ...user, 
            coins: (user.coins || 0) + totalCoins,
            diamonds: (user.diamonds || 0) + Math.floor(totalGems / 2) // Diamonds are the base currency
        };

        // Add subject-specific gems if applicable
        revealedRewards.forEach(r => {
            if (r.type === 'gems' && r.subject) {
                const key = `${r.subject}Gems`;
                updatedUser[key] = (updatedUser[key] || 0) + r.amount;
            }
        });

        syncService.uploadProfile(updatedUser).catch(console.error);
        
        // Cleanup
        dispatch(dismissChest());
        setPhase('closed');
        setIsCollecting(false);
        setRevealedRewards([]);
    }, [dispatch, revealedRewards, user]);

    if (!chest || phase === 'closed') return null;

    const cfg = CHEST_CONFIG[chest.chestType] || CHEST_CONFIG.bronze;

    const getGemName = (subject) => {
        if (!subject || subject === 'master' || subject === 'general') return 'Master Gem';
        const s = subject.toLowerCase();
        if (s === 'science') return 'Science Gem';
        if (s === 'math' || s === 'mathematics') return 'Math Gem';
        if (s === 'sst') return 'SST Gem';
        if (s === 'english') return 'English Gem';
        return `${subject.charAt(0).toUpperCase() + subject.slice(1)} Gem`;
    };

    return (
        <div className="celebration-arena-overlay" style={{ '--chest-glow': cfg.glow }}>
            {/* RAY BACKGROUND */}
            {(phase === 'opening' || phase === 'rewards') && (
                <motion.div 
                    className="manya-reward-rays" 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.6, scale: 1 }}
                    transition={{ duration: 1 }}
                />
            )}

            {/* CONFETTI LAYER */}
            {phase === 'rewards' && <WorldClassConfetti />}

            {/* FLYING REWARDS ANIMATION */}
            <FlyingRewards 
                rewards={revealedRewards} 
                isCollecting={isCollecting} 
                onComplete={finalizeCollection} 
            />

            <div className="celebration-card-container !max-w-[380px]">
                {/* HEADER INFO */}
                <motion.div 
                    className="chest-header-section mb-2"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {chest.reason && (
                        <div className="chest-reason-tag !mb-2">{chest.reason}</div>
                    )}
                    <h1 className="chest-tier-name !text-3xl">{cfg.name}</h1>
                </motion.div>

                {/* THE CHEST HERO - Compacted */}
                <div className="chest-hero-wrapper !w-[220px] !h-[220px]">
                    <div className="chest-glow-backlight !w-[180px] !h-[180px]" />
                    <motion.div
                        className="w-full h-full relative z-10"
                        animate={phase === 'intro' ? {
                            rotate: [-2, 2, -2, 2, 0],
                            scale: [1, 1.05, 1],
                        } : {}}
                        transition={phase === 'intro' ? { repeat: Infinity, duration: 0.2 } : {}}
                    >
                        <DotLottieReact
                            src="/assets/chests/master_gem_chest.lottie"
                            autoplay
                            loop={false}
                        />
                    </motion.div>
                </div>

                {/* REWARD TILES - Compacted */}
                <div className="min-h-[120px] flex items-center justify-center">
                    <AnimatePresence>
                        {phase === 'rewards' && (
                            <motion.div className="reward-tiles-row !my-4">
                                {revealedRewards.map((r, i) => (
                                    <motion.div 
                                        key={i}
                                        className="reward-tile !w-[110px] !py-4"
                                        initial={{ opacity: 0, scale: 0.5, y: 20, rotateX: 90 }}
                                        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                                        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                                    >
                                        <img 
                                            src={r.type === 'coins' ? REWARD_ICONS.coins : REWARD_ICONS.gems(r.subject)} 
                                            alt={r.type} 
                                            className="reward-tile-icon !w-10 !h-10"
                                        />
                                        <div className="flex flex-col items-center">
                                            <span className="reward-tile-amount !text-xl">+{r.amount}</span>
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter">
                                                {r.type === 'coins' ? 'Coins' : getGemName(r.subject)}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ACTION BUTTON */}
                <motion.div 
                    className="w-full flex flex-col items-center mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase === 'rewards' ? 1 : 0 }}
                >
                    <button 
                        className="btn-claim-royal !h-14 !max-w-[240px]"
                        onClick={handleCollect}
                        disabled={isCollecting || phase !== 'rewards'}
                    >
                        {isCollecting ? 'COLLECTING...' : 'CLAIM TREASURE'}
                        {!isCollecting && <ArrowRight size={18} strokeWidth={3} />}
                    </button>

                    {phase === 'rewards' && !isCollecting && (
                        <p className="collect-hint-text">Tap to claim your rewards</p>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
