/**
 * ChestRevealModal
 * =================
 * Full-screen animated chest opening experience.
 * Shows reward items one by one with sparkle effects.
 * Reads from Redux `user.data.pendingChests` and dispatches `dismissChest` when done.
 */
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { dismissChest, awardCoins, addXP, awardGems } from '../../store/userSlice.js';
import { syncService } from '../../infrastructure/sync/syncService.js';
import { assetUrl } from '../../config/assetUrls.js';
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

        const t1 = setTimeout(() => setPhase('open'), 800);
        const t2 = setTimeout(() => {
            // Reveal rewards one by one
            if (chest.rewards?.length) {
                chest.rewards.forEach((r, i) => {
                    setTimeout(() => {
                        setRevealedRewards(prev => [...prev, r]);
                    }, i * 300);
                });
            }
            setPhase('rewards');
        }, 1400);

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

    return (
        <div className="chest-modal-overlay" role="dialog" aria-modal="true" aria-label="Chest Reward">
            <div className="chest-modal-card">
                {/* Header */}
                <p className="chest-modal-subtitle">You earned a</p>
                <h2 className="chest-modal-title" style={{ color: cfg.color }}>{cfg.name}</h2>

                {/* Chest visual with animation */}
                <div className={`chest-emoji-wrap ${phase === 'shaking' ? 'shaking' : ''} ${phase !== 'closed' && phase !== 'shaking' ? 'opened' : ''}`}
                     style={{ '--glow': cfg.glow }}>
                    <img src={assetUrl(`chests/${cfg.img}`)} alt={cfg.name} className="chest-render-img" />
                    {phase !== 'shaking' && phase !== 'closed' && (
                        <div className="chest-sparkles">
                            {[...Array(8)].map((_, i) => (
                                <span key={i} className="sparkle" style={{ '--i': i }} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Rewards list */}
                {phase === 'rewards' && (
                    <div className="chest-rewards-list">
                        {revealedRewards.map((r, i) => {
                            const icon = REWARD_ICONS[r.type] || '✨';
                            const isImg = icon.startsWith('http');
                            return (
                                <div key={i} className="chest-reward-item reward-pop-in">
                                    <span className="reward-icon">
                                        {isImg ? <img src={icon} alt={r.type} className="w-5 h-5 object-contain" /> : icon}
                                    </span>
                                    <span className="reward-text">
                                        {r.amount ? `+${r.amount} ${r.type.toUpperCase()}` : r.value || r.type}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Collect button */}
                {phase === 'rewards' && revealedRewards.length === (chest.rewards?.length || 0) && (
                    <button
                        id="chest-collect-btn"
                        className="chest-collect-btn"
                        onClick={() => { setPhase('closed'); dispatch(dismissChest()); }}
                        style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.glow})` }}
                    >
                        Collect!
                    </button>
                )}
            </div>
        </div>
    );
}
