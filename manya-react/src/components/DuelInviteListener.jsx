import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Sword, Check, X } from 'lucide-react';
import { supabase } from '../backend/remote/supabaseClient';
import { syncService } from '../backend/sync/syncService';
import { updateBalanceThunk } from '../store/userSlice';
import { getGem } from '../config/assetUrls';

export default function DuelInviteListener() {
    const user = useSelector((state) => state.user.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [invite, setInvite] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.id || !supabase) return;

        // Subscribing to postgres changes on the quiz_duels table is 100% reliable.
        // It catches invitations even if there are network lags or page transitions.
        const dbChannel = supabase.channel(`my-invites:${user.id}`)
            .on(
                'postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'quiz_duels', 
                    filter: `challenged_id=eq.${user.id}` 
                },
                async (payload) => {
                    const newDuel = payload.new;
                    if (newDuel.status === 'pending') {
                        // Fetch the challenger's profile details to display their name/avatar
                        try {
                            const challengerProfile = await syncService.pullProfile(); // Fallback
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('full_name, avatar_url')
                                .eq('id', newDuel.challenger_id)
                                .single();

                            setInvite({
                                duelId: newDuel.id,
                                challengerName: profile?.full_name || 'Another Student',
                                challengerAvatar: profile?.avatar_url,
                                wager: newDuel.gem_wager,
                                currency: newDuel.wager_currency || 'gems',
                                subject: newDuel.subject
                            });
                            setError('');
                        } catch (e) {
                            console.error("Failed to fetch challenger profile:", e);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'quiz_duels',
                    filter: `challenged_id=eq.${user.id}`
                },
                (payload) => {
                    // If the challenger cancelled the challenge while B was looking at it, dismiss it
                    const updatedDuel = payload.new;
                    if (updatedDuel.status === 'cancelled' || updatedDuel.status === 'declined') {
                        setInvite(prev => (prev && prev.duelId === updatedDuel.id) ? null : prev);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(dbChannel);
        };
    }, [user?.id]);

    const handleDecline = async () => {
        if (!invite) return;
        setLoading(true);
        try {
            await syncService.declineOrExpireDuel(invite.duelId);
            setInvite(null);
        } catch (e) {
            console.error("Error declining challenge:", e);
            setInvite(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!invite) return;
        setLoading(true);
        setError('');

        // Perform balance pre-check for appropriate currency
        if (invite.currency === 'coins') {
            const playerCoins = user.coins || 0;
            if (playerCoins < invite.wager) {
                setError(`You need at least ${invite.wager} Coins to accept this challenge!`);
                setLoading(false);
                return;
            }
        } else {
            const playerGems = user.diamonds || 0;
            if (playerGems < invite.wager) {
                setError(`You need at least ${invite.wager} Gems to accept this challenge!`);
                setLoading(false);
                return;
            }
        }

        try {
            // Pre-flight check: Ensure Supabase has a valid online auth session
            const { data: sessionData } = await supabase.auth.getSession();
            let activeSession = sessionData?.session;

            if (!activeSession) {
                // Try background refresh using local refresh token
                const { data: refreshData } = await supabase.auth.refreshSession();
                activeSession = refreshData?.session;
            }

            if (!activeSession) {
                setError("Online Session expired. Please log out and back in to accept this challenge!");
                setLoading(false);
                return;
            }

            const response = await syncService.acceptQuizDuel(invite.duelId);
            if (response && response.success) {
                // Instantly update Redux balance locally to reflect deducted stake
                dispatch(updateBalanceThunk({
                    currency: invite.currency === 'coins' ? 'coins' : 'gem_overall',
                    amount: -invite.wager,
                    type: 'DUEL_ESCROW_OUT',
                    contextId: invite.duelId
                }));
                
                const duelId = invite.duelId;
                setInvite(null);
                
                // Redirect user to the active duel arena
                navigate(`/duel/${duelId}`);
            } else {
                setError(response?.message || 'Failed to accept challenge.');
            }
        } catch (e) {
            setError(e.message || 'An error occurred while accepting.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {invite && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <motion.div 
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-sm bg-gradient-to-b from-[#2a1c0d] to-[#1c1107] border-4 border-[#c5a880] rounded-[2rem] p-6 shadow-2xl overflow-hidden text-center"
                    >
                        <div className="absolute inset-2 border-2 border-dashed border-[#8d6e63]/40 rounded-[1.6rem] pointer-events-none" />
                        
                        <div className="relative z-10 mx-auto w-16 h-16 bg-[#3e2723] rounded-full border-2 border-[#c5a880] flex items-center justify-center mb-4 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                            <Sword size={28} className="text-[#c5a880] animate-pulse" />
                        </div>

                        <h2 className="relative z-10 text-xl font-black text-white tracking-tight mb-1">
                            CHALLENGE RECEIVED!
                        </h2>
                        
                        <p className="relative z-10 text-[#d7ccc8] text-xs mb-6">
                            <strong className="text-white text-sm">{invite.challengerName}</strong> has challenged you to a duel!
                        </p>

                        <div className="relative z-10 bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl p-4 flex flex-col items-center gap-3 mb-6 shadow-[inset_0_0_6px_rgba(62,39,35,0.2),0_3px_0_#1a0f08]">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-[#5d4037] uppercase tracking-widest">SUBJECT:</span>
                                <span className="text-xs font-black text-[#2e1d0f] uppercase">{invite.subject}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-[#5d4037] uppercase tracking-widest">STAKE:</span>
                                <span className="flex items-center gap-1.5 text-sm font-black text-amber-800">
                                    {invite.currency !== 'coins' && <img src={getGem(invite.subject)} className="w-4.5 h-4.5" alt="gem" />}
                                    {invite.wager} {invite.currency === 'coins' ? 'Coins 🪙' : 'Gems'}
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="relative z-10 mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-xs font-medium flex items-center gap-2 justify-center">
                                <ShieldAlert size={14} className="text-red-400 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="relative z-10 flex gap-4">
                            {/* DECLINE button — blood-carved stone */}
                            <button
                                disabled={loading}
                                onClick={handleDecline}
                                className="relative flex-1 group disabled:opacity-40"
                            >
                                <div className="absolute inset-0 rounded-xl bg-[#5a1a1a] translate-y-[3px] border-b-2 border-[#3a0a0a]" />
                                <div className="relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
                                    bg-gradient-to-b from-[#8b2020] via-[#6b1515] to-[#5a1010]
                                    border-2 border-[#a33030] border-b-[#5a1a1a]
                                    shadow-[inset_0_1px_0_rgba(255,120,120,0.15),0_0_8px_rgba(180,30,30,0.3)]
                                    active:translate-y-[2px] active:shadow-none transition-all duration-100
                                    group-hover:from-[#9b2525] group-hover:via-[#7b1a1a] group-hover:to-[#641212]">
                                    <X size={13} className="text-rose-200 shrink-0" />
                                    <span className="text-[11px] font-black text-rose-200 uppercase tracking-widest leading-none">Decline</span>
                                </div>
                            </button>

                            {/* ACCEPT button — gold-carved stone */}
                            <button
                                disabled={loading}
                                onClick={handleAccept}
                                className="relative flex-1 group disabled:opacity-40"
                            >
                                <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                                <div className="relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
                                    bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                    border-2 border-[#e0c060] border-b-[#3e2200]
                                    shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                    active:translate-y-[2px] active:shadow-none transition-all duration-100
                                    group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                                    <Check size={13} className="text-amber-100 shrink-0" />
                                    <span className="text-[11px] font-black text-amber-100 uppercase tracking-widest leading-none">
                                        {loading ? 'ACCEPTING...' : 'ACCEPT'}
                                    </span>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
