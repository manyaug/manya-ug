/**
 * GlobalHUD — Manya World Header
 * =================================
 * Redesigned after the manya_logic app header visual.
 * Features:
 *   - Streak pill (🔥)
 *   - Diamond/Gem pill with idle bounce animation
 *   - Coin pill with animated count-up (ported from coinAnimation.js)
 *   - Fly-to-HUD coin effect triggered by Redux `coins` change
 */
import { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getGem } from '../config/assetUrls';
import { useCoinAnimation } from '../domain/gamification/useCoinAnimation.js';
import '../styles/globalHud.css';

function GlobalHUD() {
    const user       = useSelector(s => s.user.data);
    const navigate   = useNavigate();
    const coinPillRef = useRef(null);

    // Current coin value from Redux
    const realCoins = user?.coins || 0;
    const { displayCoins, triggerFloatCoin } = useCoinAnimation(realCoins);

    // When Redux coins go up, trigger the floating animation
    const prevCoinsRef = useRef(realCoins);
    useEffect(() => {
        if (realCoins > prevCoinsRef.current) {
            const gained = realCoins - prevCoinsRef.current;
            triggerFloatCoin(coinPillRef, gained);
        }
        prevCoinsRef.current = realCoins;
    }, [realCoins, triggerFloatCoin]);

    if (!user) return null;

    const streak     = user.current_streak || user.currentStreak || 0;
    const diamonds   = user.diamonds || 0;

    return (
        <header className="app-header-master">
            <motion.div
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                className="hud-master-shell"
            >
                {/* ── LEFT: Avatar + XP bar ─────────────────────────────── */}
                <div className="hud-left-content" onClick={() => navigate('/profile')}>
                    <div className="hud-avatar-wrapper">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`} alt="Manya" className="hud-avatar-img" />
                    </div>
                    <div className="hud-user-text">
                        <span className="hud-nickname-text">{(user.nickname || 'Student')}</span>
                    </div>
                </div>

                {/* ── RIGHT: Streak + Gems + Coins ──────────────────────── */}
                <div className="hud-right-content">
                    {/* Coins — animated count-up */}
                    <div
                        id="hud-coin-pill"
                        ref={coinPillRef}
                        className="hud-pill hud-coin-pill"
                        title="Coins"
                    >
                        <img
                            src={getGem('coin.svg')}
                            className="hud-gem-icon hud-coin-idle"
                            alt="Coin"
                        />
                        <span className="hud-pill-value">{displayCoins.toLocaleString()}</span>
                    </div>

                    {/* Diamonds / overall gems */}
                    <div
                        className="hud-pill hud-gem-pill"
                        title="Total Diamonds"
                        onClick={() => navigate('/achievements')}
                    >
                        <img
                            src={getGem('master_gem.svg')}
                            className="hud-gem-icon hud-gem-idle"
                            alt="Diamond"
                        />
                        <span className="hud-pill-value">{diamonds}</span>
                    </div>
                </div>
            </motion.div>
        </header>
    );
}

export default GlobalHUD;
