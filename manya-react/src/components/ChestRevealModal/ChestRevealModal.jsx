/**
 * ChestRevealModal
 * =================
 * Full-screen animated chest opening experience.
 * Shows reward items one by one with sparkle effects.
 * Reads from Redux `user.data.pendingChests` and dispatches `dismissChest` when done.
 */
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowRight, X } from 'lucide-react';
import { dismissChest, awardCoins, addXP, awardGems } from '../../store/userSlice.js';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { assetUrl } from '../../config/assetUrls.js';
import { audioService } from '../../infrastructure/audio/audioService';
import { Ribbon, WorldClassConfetti } from '../ui/CelebrationBling';
import './ChestRevealModal.css';

const CHEST_CONFIG = {
    bronze: { img: 'chest_bronze.png', name: 'Bronze Chest', color: '#cd7f32', glow: 'rgba(205, 127, 50, 0.5)' },
    silver: { img: 'chest_silver.png', name: 'Silver Chest', color: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.5)' },
    gold:   { img: 'chest_gold.png',   name: 'Gold Chest',   color: '#ffd700', glow: 'rgba(255, 215, 0, 0.5)' },
};

const REWARD_ICONS = { 
    coins: 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.2/icons/coin.png',
    gems: 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.2/icons/gem.png',
    xp: '⭐', 
    unlock: '🔓', 
    badge: '🏆' 
};

export default function ChestRevealModal() {
    const dispatch = useDispatch();
    const pendingChests = useSelector(s => s.user.data.pendingChests || []);
    const [phase, setPhase] = useState('closed'); // closed → shaking → open → rewards → done
    const [revealedRewards, setRevealedRewards] = useState([]);

    const chest = pendingChests[0];

    // Trigger animation sequence when a new chest appears
    useEffect(() => {
        if (!chest) { setPhase('closed'); return; }

        setRevealedRewards([]);
        setPhase('shaking');
        audioService.playSFX('riser'); // Anticipation riser!

        const t1 = setTimeout(() => {
            setPhase('open');
            audioService.playSFX('bass_drop'); // Lid bursts open
        }, 1200);

        const t2 = setTimeout(() => {
            // Reveal rewards one by one
            if (chest.rewards?.length) {
                chest.rewards.forEach((r, i) => {
                    setTimeout(() => {
                        setRevealedRewards(prev => [...prev, r]);
                        audioService.playSFX('challenge_click'); // Snappy click for each item popping out
                    }, i * 400);
                });
            }
            setPhase('rewards');
            setTimeout(() => audioService.playSFX('challenge_win'), 800); // Final fanfare
        }, 1800);

        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [chest?.chestType, pendingChests.length]);

    // Apply rewards to Redux state
    useEffect(() => {
        if (!chest) return;
        for (const reward of chest.rewards || []) {
            if (reward.type === 'coins') dispatch(awardCoins(reward.amount));
            if (reward.type === 'xp')    dispatch(addXP(reward.amount));
            if (reward.type === 'gems')  dispatch(awardGems({ subject: 'general', amount: reward.amount, xp: 0 }));
        }
        // Persist to Supabase
        syncService.pushChestDrop(chest.chestType, chest.rewards).catch(() => {});
    }, [chest]); // eslint-disable-line

    if (!chest || phase === 'closed') return null;

    const cfg = CHEST_CONFIG[chest.chestType] || CHEST_CONFIG.bronze;

    const handleClose = () => {
        setPhase('closed');
        dispatch(dismissChest());
    };

    return (
        <div className="celebration-arena-overlay">
            <WorldClassConfetti />

            <div className="celebration-card-container relative z-10" style={{ animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                {phase === 'rewards' && revealedRewards.length === (chest.rewards?.length || 0) && (
                    <button className="celebration-close-x" onClick={handleClose}>
                        <X size={20} strokeWidth={4} />
                    </button>
                )}

                {/* UNIQUE ELEMENT: Badge Crest Vault nested inside Celebration Layout */}
                <div className={`badge-hero-card tier-${chest.chestType.toLowerCase()} !bg-transparent !border-0 !shadow-none !p-0 !transform-none w-full flex items-center justify-center mb-6`}>
                    <div className="badge-glow-ring" />
                    <div className="badge-crest-vault !mb-0 z-10 relative">
                        <div className={`badge-icon-reveal ${phase === 'shaking' ? 'shaking' : ''}`}>
                            <img src={assetUrl(`chests/${cfg.img}`)} alt={cfg.name} className="w-24 h-24 object-contain" />
                        </div>
                        <div className="badge-shine-effect" />
                    </div>
                </div>

                <Ribbon text="CHEST UNLOCKED" />

                <h1 className="celebration-title-premium mt-4" style={{ color: 'white' }}>{cfg.name}</h1>
                <p className="celebration-subtext-premium">Rewards have been added to your vault.</p>
                
                {phase === 'rewards' && (
                    <div className="premium-stats-list-celebration mt-6 gap-2">
                        {revealedRewards.map((r, i) => {
                            const icon = REWARD_ICONS[r.type] || '✨';
                            const isImg = icon.startsWith('http');
                            return (
                                <div key={i} className="stat-chip-celebration reward-pop-in" style={{ padding: '8px 16px' }}>
                                    <span className="label text-[10px] uppercase tracking-wider">{r.type}</span>
                                    <span className="val flex items-center gap-2" style={{ color: '#22d3ee' }}>
                                        +{r.amount || 1}
                                        {isImg ? <img src={icon} alt={r.type} className="w-5 h-5 object-contain" /> : <span className="text-sm">{icon}</span>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {phase === 'rewards' && revealedRewards.length === (chest.rewards?.length || 0) && (
                    <button className="btn-collect-3d mt-8 w-full max-w-[280px] mx-auto block" onClick={handleClose}>
                        <div className="btn-gloss-highlight" />
                        <span className="flex items-center justify-center gap-2">COLLECT REWARDS <ArrowRight size={20} className="inline" strokeWidth={3} /></span>
                    </button>
                )}
            </div>
        </div>
    );
}
