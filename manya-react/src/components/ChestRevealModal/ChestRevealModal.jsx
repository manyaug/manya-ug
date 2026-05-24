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

const SUBJECT_COLORS = {
    science: 'rgba(16, 185, 129, 0.4)', // Vibrant emerald green for Science
    math: 'rgba(99, 102, 241, 0.4)',    // Purple/Indigo for Math
    sst: 'rgba(245, 158, 11, 0.4)',     // Amber Gold for SST
    english: 'rgba(219, 39, 119, 0.4)', // Pink/Rose for English
    overall: 'rgba(239, 68, 68, 0.4)'   // Red/Crimson for overall/master
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

                // Start fetching REAL rewards immediately in the background (runs in parallel with intro/shake)
                const rewardsPromise = dispatch(openChestThunk({ chestId: chest.id })).unwrap()
                    .then(res => res.rewards)
                    .catch(e => {
                        console.warn("⚠️ [ChestReveal] Fallback rewards used:", e.message);
                        return [{ type: 'coins', amount: 250 }, { type: 'gems', amount: 10, subject: 'master' }];
                    });

                // 1. Shaking / Intro (0.5s)
                await new Promise(r => setTimeout(r, 500));
                setPhase('opening');
                audioService.playSFX('bass_drop');

                // 2. Resolve the pre-fetched rewards (already resolved or near completion)
                const items = await rewardsPromise;

                // 3. Open / Reward Reveal (Snappy 0.3s)
                await new Promise(r => setTimeout(r, 300));
                setPhase('rewards');
                
                console.log("💎 [ChestReveal] Revealing Rewards:", items);

                for (let i = 0; i < items.length; i++) {
                    if (i > 0) {
                        await new Promise(r => setTimeout(r, 200)); // Super snappy and satisfying sequential reveal
                    }
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

    // --- Subject Extraction & Glow Isolation ---
    const s = String(chest.subject || '').toLowerCase();
    const r = String(chest.reason || '').toLowerCase();
    const path = String(window.location?.pathname || '').toLowerCase();
    
    let matchedSubject = s;
    if (!matchedSubject || matchedSubject === 'overall') {
        if (r.includes('math') || r.includes('algebra') || r.includes('geometry')) matchedSubject = 'math';
        else if (r.includes('science') || r.includes('biology') || r.includes('physics') || r.includes('chem')) matchedSubject = 'science';
        else if (r.includes('sst') || r.includes('social') || r.includes('history') || r.includes('geography')) matchedSubject = 'sst';
        else if (r.includes('english') || r.includes('grammar') || r.includes('vocab')) matchedSubject = 'english';
        else if (path.includes('science') || path.includes('sci')) matchedSubject = 'science';
        else if (path.includes('math') || path.includes('geometry')) matchedSubject = 'math';
        else if (path.includes('sst') || path.includes('social')) matchedSubject = 'sst';
        else if (path.includes('english') || path.includes('lang')) matchedSubject = 'english';
    }
    
    let canonicalSubject = 'overall';
    if (matchedSubject === 'english' || matchedSubject === 'eng') canonicalSubject = 'english';
    else if (matchedSubject === 'math' || matchedSubject === 'mathematics') canonicalSubject = 'math';
    else if (matchedSubject === 'science' || matchedSubject === 'sci') canonicalSubject = 'science';
    else if (matchedSubject === 'sst' || matchedSubject === 'social') canonicalSubject = 'sst';

    const glowColor = SUBJECT_COLORS[canonicalSubject] || cfg.glow;

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
        <div className="celebration-arena-overlay" style={{ '--chest-glow': glowColor }}>
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
                    <p className="text-white/70 text-[10px] mt-2 font-black tracking-wide max-w-[280px] leading-relaxed mx-auto bg-black/25 py-1.5 px-3 rounded-full border border-white/5 uppercase">
                        {(() => {
                            const rawReason = String(chest.reason || '').toLowerCase();
                            const prettySub = canonicalSubject === 'overall' ? 'OVERALL' : canonicalSubject.toUpperCase();
                            
                            if (rawReason.includes('perfect') || rawReason.includes('100%')) {
                                return `Royal Excellence: Perfect Score in ${prettySub}!`;
                            }
                            if (rawReason.includes('95%') || rawReason.includes('elite')) {
                                return `Elite Score: 95%+ Mastery in ${prettySub}!`;
                            }
                            if (rawReason.includes('90%') || rawReason.includes('master')) {
                                return `Master Score: 90%+ Mastery in ${prettySub}!`;
                            }
                            if (rawReason.includes('85%') || rawReason.includes('great')) {
                                return `Great Score: 85%+ Mastery in ${prettySub}!`;
                            }
                            if (rawReason.includes('80%') || rawReason.includes('solid')) {
                                return `Solid Score: 80%+ Mastery in ${prettySub}!`;
                            }
                            if (rawReason.includes('75%') || rawReason.includes('good') || rawReason.includes('job')) {
                                return `Good Score: 75%+ Mastery in ${prettySub}!`;
                            }
                            if (rawReason.includes('60%') || rawReason.includes('impr') || rawReason.includes('star')) {
                                return `Rapid Progress: Steady effort in ${prettySub}!`;
                            }
                            if (rawReason.includes('streak')) {
                                return `Daily habit: Keep your study streak burning!`;
                            }
                            if (rawReason.includes('first')) {
                                return `Rising Star: Completed your first quest!`;
                            }
                            return `Loot earned from quest in ${prettySub}!`;
                        })()}
                    </p>
                </motion.div>
                
                <div className={`chest-hero-wrapper-premium ${phase === 'intro' ? 'chest-shake-active' : ''}`}>
                    <div className="chest-glow-backlight" />
                    <div className="chest-lottie-container" style={{ width: '190px', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DotLottieReact
                            src={(() => {
                                const s = String(chest.subject || '').toLowerCase();
                                const r = String(chest.reason || '').toLowerCase();
                                const path = String(window.location?.pathname || '').toLowerCase();
                                
                                let matchedSubject = s;
                                if (!matchedSubject || matchedSubject === 'overall') {
                                    if (r.includes('math') || r.includes('algebra') || r.includes('geometry')) matchedSubject = 'math';
                                    else if (r.includes('science') || r.includes('biology') || r.includes('physics') || r.includes('chem')) matchedSubject = 'science';
                                    else if (r.includes('sst') || r.includes('social') || r.includes('history') || r.includes('geography')) matchedSubject = 'sst';
                                    else if (r.includes('english') || r.includes('grammar') || r.includes('vocab')) matchedSubject = 'english';
                                    else if (path.includes('science') || path.includes('sci')) matchedSubject = 'science';
                                    else if (path.includes('math') || path.includes('geometry')) matchedSubject = 'math';
                                    else if (path.includes('sst') || path.includes('social')) matchedSubject = 'sst';
                                    else if (path.includes('english') || path.includes('lang')) matchedSubject = 'english';
                                }

                                if (matchedSubject === 'english' || matchedSubject === 'eng') return "/assets/chests/english_gem_chest.lottie";
                                if (matchedSubject === 'math' || matchedSubject === 'mathematics') return "/assets/chests/math_gem_chest.lottie";
                                if (matchedSubject === 'science' || matchedSubject === 'sci') return "/assets/chests/science_gem_chest.lottie";
                                if (matchedSubject === 'sst' || matchedSubject === 'social') return "/assets/chests/sst_gem_chest.lottie";
                                return "/assets/chests/master_gem_chest.lottie";
                            })()}
                            autoplay
                            loop={false}
                            style={{ width: '190px', height: '190px' }}
                        />
                    </div>
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
