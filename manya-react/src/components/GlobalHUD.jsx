/**
 * GlobalHUD — Manya World Header
 * =================================
 * Redesigned after the manya_logic app header visual.
 * Features:
 *   - Diamond/Gem pill with idle bounce animation
 *   - Coin pill with animated count-up (ported from coinAnimation.js)
 *   - Fly-to-HUD coin effect triggered by Redux `coins` change
 *   - Notification bell → navigates to /inbox
 */
import { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { getGem } from '../config/assetUrls';
import { useCoinAnimation } from '../domain/gamification/useCoinAnimation.js';
import { supabase } from '../backend/remote/supabaseClient';
import { addToast } from '../store/toastSlice';
import '../styles/globalHud.css';

function GlobalHUD() {
    const user       = useSelector(s => s.user.data);
    const dispatch   = useDispatch();
    const navigate   = useNavigate();
    const coinPillRef = useRef(null);

    const [inviteCount, setInviteCount] = useState(0);

    // Current coin value from Redux
    const realCoins = user?.coins || 0;
    const { displayCoins, triggerFloatCoin, triggerDeductCoin } = useCoinAnimation(realCoins);

    // When Redux coins change, trigger the floating or deduction animations
    const prevCoinsRef = useRef(realCoins);
    useEffect(() => {
        if (realCoins > prevCoinsRef.current) {
            const gained = realCoins - prevCoinsRef.current;
            triggerFloatCoin(coinPillRef, gained);
        } else if (realCoins < prevCoinsRef.current) {
            const lost = prevCoinsRef.current - realCoins;
            triggerDeductCoin(coinPillRef, lost);
        }
        prevCoinsRef.current = realCoins;
    }, [realCoins, triggerFloatCoin, triggerDeductCoin]);

    // Track pending invite count for the badge
    useEffect(() => {
        if (!user?.id || !supabase) return;

        const fetchCount = async () => {
            try {
                const { count, error } = await supabase
                    .from('quiz_duels')
                    .select('id', { count: 'exact', head: true })
                    .or(`and(challenged_id.eq.${user.id},status.eq.pending),and(challenger_id.eq.${user.id},status.eq.accepted_terms)`);
                if (!error) setInviteCount(count || 0);
            } catch (err) {
                console.error('[HUD] invite count error:', err);
            }
        };
        fetchCount();

        const channel = supabase.channel(`hud-count:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quiz_duels'
                },
                (payload) => {
                    if (payload.new) {
                        const isRelevant = (payload.new.challenged_id === user.id && payload.new.status === 'pending') ||
                                           (payload.new.challenger_id === user.id && payload.new.status === 'accepted_terms');
                        if (isRelevant) fetchCount();
                        else if (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') fetchCount(); // Safe fallback
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id]);



    // Check for recently abandoned duels
    useEffect(() => {
        if (!user?.id || !supabase) return;
        const checkAbandoned = async () => {
            try {
                const { data, error } = await supabase
                    .from('quiz_duels')
                    .select('id, wager_currency, gem_wager')
                    .eq('abandoned_by', user.id)
                    .eq('status', 'completed')
                    .order('resolved_at', { ascending: false })
                    .limit(1);
                    
                if (!error && data && data.length > 0) {
                    const duel = data[0];
                    const dismissedStr = localStorage.getItem('manya_dismissed_abandons') || '[]';
                    const dismissed = JSON.parse(dismissedStr);
                    if (!dismissed.includes(duel.id)) {
                        dispatch(addToast({
                            type: 'error',
                            message: `You were disqualified from a recent duel for leaving the arena. Wager lost.`,
                            duration: 10000
                        }));
                        dismissed.push(duel.id);
                        localStorage.setItem('manya_dismissed_abandons', JSON.stringify(dismissed));
                    }
                }
            } catch (err) {}
        };
        // Delay slightly to ensure toast renders after navigation/mounting
        const t = setTimeout(checkAbandoned, 1500);
        return () => clearTimeout(t);
    }, [user?.id, dispatch]);

    if (!user) return null;

    const diamonds   = user.diamonds || 0;

    return (
        <header className="app-header-master">
            <motion.div
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                className="hud-master-shell"
            >
                {/* ── LEFT: Avatar + Name ─────────────────────────────── */}
                <div className="hud-left-content" onClick={() => navigate('/profile')}>
                    <div className="hud-avatar-wrapper">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`} alt="Manya" className="hud-avatar-img" />
                    </div>
                    <div className="hud-user-text">
                        <span className="hud-nickname-text">{(user.nickname || 'Student')}</span>
                    </div>
                </div>

                {/* ── RIGHT: Bell + Coins + Gems ─────────────────────── */}
                <div className="hud-right-content">
                    {/* Notification Bell → opens dedicated Inbox page */}
                    <button
                        className={`hud-pill hud-bell-pill ${inviteCount > 0 ? 'hud-bell-active' : ''}`}
                        title="Message Center"
                        onClick={() => navigate('/inbox')}
                        style={{ border: '1px solid var(--border-subtle)' }}
                    >
                        <div className="relative flex items-center justify-center">
                            <Bell size={18} className={`hud-bell-icon ${inviteCount > 0 ? 'hud-bell-wiggle' : ''}`} />
                            {inviteCount > 0 && (
                                <span className="hud-bell-badge">{inviteCount}</span>
                            )}
                        </div>
                    </button>

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
