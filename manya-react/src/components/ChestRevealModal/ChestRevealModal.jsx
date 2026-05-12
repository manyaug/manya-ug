/**
 * ChestRevealModal - CINEMATIC EDITION v3.5
 * =========================================
 * A high-fidelity, full-screen reward experience.
 * Compacted UI & Fixed Sync Logic.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { dismissChest, awardCoins, awardGems, openChestThunk } from '../../store/userSlice.js';
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
    const hasStartedRef = useRef(false);

    const chest = pendingChests[0];

    // Trigger animation sequence when a new chest appears
    useEffect(() => {
        if (!chest) {
            setPhase('closed');
            return;
        }

        if (phase === 'closed' && !hasStartedRef.current) {
            const startSequence = async () => {
                hasStartedRef.current = true;
                console.log("🎬 [ChestReveal] Starting Sequence for:", chest.chestType);
                setRevealedRewards([]);
                setPhase('intro');
                audioService.playSFX('riser');

                // 1. Shaking / Intro (0.5s)
                await new Promise(r => setTimeout(r, 500));
                setPhase('opening');
                audioService.playSFX('bass_drop');

                // 2. Fetch REAL rewards from Service while opening
                let items = [];
                try {
                    const result = await dispatch(openChestThunk({ chestId: chest.id })).unwrap();
                    items = result.rewards;
                } catch (e) {
                    console.warn("⚠️ [ChestReveal] Fallback rewards used:", e.message);
                    items = [{ type: 'coins', amount: 250 }, { type: 'gems', amount: 10, subject: 'master' }];
                }

                // 3. Open / Reward Reveal (Snappy 0.3s)
                await new Promise(r => setTimeout(r, 300));
                setPhase('rewards');
                
                console.log("💎 [ChestReveal] Revealing Rewards:", items);

                for (let i = 0; i < items.length; i++) {
                    await new Promise(r => setTimeout(r, 250)); // Faster reveal between items
                    setRevealedRewards(prev => [...prev, items[i]]);
                    audioService.playSFX('challenge_click');
                }

                setTimeout(() => audioService.playSFX('victory'), 200);
            };

            startSequence();
        }
    }, [chest, dispatch, phase]);

    const finalizeCollection = useCallback(() => {
        console.log("✅ [ChestReveal] Finalizing Collection...");
        dispatch(dismissChest());
        setPhase('closed');
        setIsCollecting(false);
        setRevealedRewards([]);
        hasStartedRef.current = false; // Reset for next chest in queue
    }, [dispatch]);

    const handleCollect = useCallback(() => {
        if (isCollecting || phase !== 'rewards') return;
        setIsCollecting(true);
        audioService.playSFX('collect-points');
    }, [isCollecting, phase]);

    if (!chest || phase === 'closed') return null;

    const cfg = CHEST_CONFIG[chest.chestType] || CHEST_CONFIG.bronze;

    const getSpicedReason = (rawReason) => {
        if (!rawReason) return "CHEST UNLOCKED!";
        const r = rawReason.toUpperCase();
        if (r.includes('QUEST COMPLETED')) return "QUEST CONQUERED! 🏆";
        if (r.includes('100% SCORE')) return "ROYAL EXCELLENCE! 👑";
        if (r.includes('95%')) return "ELITE PERFORMANCE! ⭐";
        if (r.includes('80%')) return "MASTERY MILESTONE! 🎯";
        if (r.includes('70%')) return "STEADY PROGRESS! 📈";
        if (r.includes('60%')) return "SCHOLAR'S PATH! 📖";
        if (r.includes('FIRST QUEST')) return "RISING STAR! ✨";
        if (r.includes('STREAK')) return "STREAK MASTER! 🔥";
        if (r.includes('WEEKEND')) return "WEEKEND WARRIOR! ⚔️";
        if (r.includes('EARLY BIRD')) return "EARLY BIRD! 🌅";
        if (r.includes('NIGHT OWL')) return "NIGHT OWL! 🦉";
        return r;
    };

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

            <div className="celebration-card-container">
                {/* HEADER INFO */}
                <motion.div 
                    className="chest-header-group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {chest.reason && (
                        <div className="achievement-badge-neon">{getSpicedReason(chest.reason)}</div>
                    )}
                    <h1 className="chest-tier-name">{cfg.name}</h1>
                </motion.div>
                
                {/* THE CHEST HERO - Balanced Scaling */}
                <div className="chest-hero-wrapper-premium">
                    <div className="chest-glow-backlight" />
                    <motion.div
                        className="chest-lottie-container"
                        animate={phase === 'intro' ? {
                            rotate: [-1, 1, -1, 1, 0],
                            scale: [1, 1.03, 1],
                        } : {}}
                        transition={phase === 'intro' ? { repeat: Infinity, duration: 0.25 } : {}}
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
                            <motion.div className="reward-tiles-row">
                                {revealedRewards.map((r, i) => (
                                    <motion.div 
                                        key={i}
                                        className={`reward-tile glow-${r.type} ${r.subject ? `glow-${r.subject}` : ''}`}
                                        initial={{ opacity: 0, scale: 0.5, y: 20, rotateX: 90 }}
                                        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                                        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                                    >
                                        <img 
                                            src={r.type === 'coins' ? REWARD_ICONS.coins : REWARD_ICONS.gems(r.subject)} 
                                            alt={r.type} 
                                            className="reward-tile-icon"
                                        />
                                        <div className="flex flex-col items-center">
                                            <span className="reward-tile-amount">+{r.amount}</span>
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

                {/* ACTION BUTTON - Pushed down for breathing room */}
                <motion.div 
                    className="w-full flex flex-col items-center mt-12 mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase === 'rewards' ? 1 : 0 }}
                >
                    <button 
                        className="btn-claim-royal"
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
