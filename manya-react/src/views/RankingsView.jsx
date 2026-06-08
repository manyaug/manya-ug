import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Zap, Star, Sword, X, AlertCircle } from 'lucide-react';
import { syncService } from '../infrastructure/sync/syncService.js';
import { getGem } from '../config/assetUrls';
import { updateBalanceThunk } from '../store/userSlice';
import { supabase } from '../backend/remote/supabaseClient';
import '../styles/ranking.css';

const SUBJECTS = [
    { id: 'all', label: 'TOP', gem: getGem('master'), color: 'var(--manya-purple)' },
    { id: 'math', label: 'Math', gem: getGem('math'), color: 'var(--subject-math)' },
    { id: 'science', label: 'Sci', gem: getGem('science'), color: 'var(--subject-science)' },
    { id: 'sst', label: 'SST', gem: getGem('sst'), color: 'var(--subject-sst)' },
    { id: 'english', label: 'Eng', gem: getGem('english'), color: 'var(--subject-english)' }
];

export default function RankingsView() {
    const user = useSelector((state) => state.user.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [activeSub, setActiveSub] = useState('all');
    const [timeframe, setTimeframe] = useState('weekly'); // Default to weekly for leagues
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Selected Player for detail profile card modal
    const [selectedProfile, setSelectedProfile] = useState(null);
    
    // Challenge Config state
    const [isConfiguringChallenge, setIsConfiguringChallenge] = useState(false);
    const [wagerAmount, setWagerAmount] = useState(5);
    const [wagerCurrency, setWagerCurrency] = useState('gems'); // 'gems' | 'coins'
    const [challengeSub, setChallengeSub] = useState('math');
    const [sendingChallenge, setSendingChallenge] = useState(false);
    const [challengeError, setChallengeError] = useState('');
    const [proposedTime, setProposedTime] = useState('4:00 PM EAT');
    const [offlineSuccessInfo, setOfflineSuccessInfo] = useState(null);

    // Derived balance shorthand
    const myGems = user?.diamonds || 0;
    const myCoins = user?.coins || 0;
    const wagerGems = wagerCurrency === 'gems' ? wagerAmount : 0; // kept for refund compatibility

    // Challenger-side Pending Invitation Lobby Overlay
    const [pendingDuelId, setPendingDuelId] = useState(null);
    const [pendingDuelStatus, setPendingDuelStatus] = useState(null); // 'pending' | 'declined' | 'cancelled'
    const [pendingOpponentName, setPendingOpponentName] = useState('');
    const onlineUsers = useSelector(state => state.user.onlineUsers || []);

    // Leagues info scroll modal state
    const [showLeagueRules, setShowLeagueRules] = useState(false);

    // Dynamic 10-Tier Leagues definition
    const LEAGUE_TIERS = {
        'Wood': { name: 'Wood League', icon: '🪵', color: '#8d6e63', shield: '🤎' },
        'Bronze': { name: 'Bronze League', icon: '🥉', color: '#b57a55', shield: '🥉' },
        'Iron': { name: 'Iron League', icon: '⚔️', color: '#90a4ae', shield: '⚙️' },
        'Steel': { name: 'Steel League', icon: '🛡️', color: '#78909c', shield: '🛡️' },
        'Obsidian': { name: 'Obsidian League', icon: '🌋', color: '#37474f', shield: '🖤' },
        'Gold': { name: 'Gold League', icon: '👑', color: '#f57f17', shield: '👑' },
        'Sapphire': { name: 'Sapphire League', icon: '💎', color: '#0288d1', shield: '💙' },
        'Ruby': { name: 'Ruby League', icon: '🔥', color: '#d32f2f', shield: '❤️' },
        'Emerald': { name: 'Emerald League', icon: '❇️', color: '#388e3c', shield: '💚' },
        'Diamond': { name: 'Diamond League', icon: '🌌', color: '#00bcd4', shield: '💎' }
    };

    const userLeague = user?.league || 'Wood';
    const currentLeagueMeta = LEAGUE_TIERS[userLeague] || LEAGUE_TIERS['Wood'];

    // ── INITIAL FETCH ──
    useEffect(() => {
        async function loadRankings() {
            setLoading(true);
            if (timeframe === 'weekly') {
                const data = await syncService.pullLeagueCohortStandings();
                // Map fields to match Rankings structure
                const formatted = data.map(item => ({
                    user_id: item.user_id,
                    full_name: item.full_name,
                    avatar_url: item.avatar_url,
                    rank_pos: parseInt(item.rank),
                    total_stars: 0,
                    total_gems: 0,
                    power_score: item.weekly_xp,
                    league: item.league
                }));
                setRankings(formatted);
            } else {
                const data = await syncService.pullRankings(timeframe, activeSub);
                setRankings(data);
            }
            setLoading(false);
        }
        loadRankings();
    }, [activeSub, timeframe]);

    // ── LISTEN FOR DUEL ACCEPTANCE OR DECLINE ──
    useEffect(() => {
        if (!pendingDuelId || !supabase) return;

        const dbChannel = supabase.channel(`duel-status:${pendingDuelId}`)
            .on(
                'postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'quiz_duels', 
                    filter: `id=eq.${pendingDuelId}` 
                },
                (payload) => {
                    const updatedDuel = payload.new;
                    console.log("⚔️ Live Duel Status Update:", updatedDuel.status);
                    
                    if (updatedDuel.status === 'accepted') {
                        supabase.removeChannel(dbChannel);
                        setPendingDuelId(null);
                        setPendingDuelStatus(null);
                        navigate(`/duel/${pendingDuelId}`);
                    } else if (updatedDuel.status === 'declined') {
                        // Refund locally using the correct currency
                        dispatch(updateBalanceThunk({
                            currency: wagerCurrency === 'coins' ? 'coins' : 'gem_overall',
                            amount: wagerAmount,
                            type: 'DUEL_REFUND',
                            contextId: pendingDuelId
                        }));
                        setPendingDuelStatus('declined');
                        setTimeout(() => {
                            setPendingDuelId(null);
                            setPendingDuelStatus(null);
                        }, 3000);
                        supabase.removeChannel(dbChannel);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(dbChannel); };
    }, [pendingDuelId, navigate, dispatch, wagerAmount, wagerCurrency]);

    const activeColor = SUBJECTS.find(s => s.id === activeSub)?.color || '#7c3aed';
    const activeGem = SUBJECTS.find(s => s.id === activeSub)?.gem || getGem('master');
    
    const podium = rankings.slice(0, 3);
    const allRankings = rankings;

    const handlePlayerClick = (player) => {
        setSelectedProfile(player);
        setIsConfiguringChallenge(false);
        setChallengeError('');
    };

    const handleCancelChallenge = async () => {
        if (!pendingDuelId) return;
        try {
            await syncService.declineOrExpireDuel(pendingDuelId);
            // Refund locally (use the currency that was escrowed)
            dispatch(updateBalanceThunk({
                currency: wagerCurrency === 'coins' ? 'coins' : 'gem_overall',
                amount: wagerAmount,
                type: 'DUEL_REFUND',
                contextId: pendingDuelId
            }));
            setPendingDuelId(null);
            setPendingDuelStatus(null);
        } catch (e) {
            console.error("Failed to cancel challenge:", e);
        }
    };

    const handleSendChallenge = async () => {
        if (!selectedProfile || !supabase) return;
        setSendingChallenge(true);
        setChallengeError('');

        // Validate sender balance for the chosen currency
        if (wagerCurrency === 'coins') {
            if (myCoins < wagerAmount) {
                setChallengeError(`You only have ${myCoins} coins. Need ${wagerAmount} to place this wager!`);
                setSendingChallenge(false);
                return;
            }
        } else {
            if (myGems < wagerAmount) {
                setChallengeError(`You only have ${myGems} gems. Need ${wagerAmount} to place this wager!`);
                setSendingChallenge(false);
                return;
            }
        }

        try {
            // Pre-flight check: Ensure Supabase has a valid online auth session
            const { data: sessionData } = await supabase.auth.getSession();
            let activeSession = sessionData?.session;

            if (!activeSession) {
                const { data: refreshData } = await supabase.auth.refreshSession();
                activeSession = refreshData?.session;
            }

            if (!activeSession) {
                setChallengeError("Online Session expired. Please log out and back in to play PvP!");
                setSendingChallenge(false);
                return;
            }

            // 1. Fetch 5 random MCQ questions from manya_vault for this subject
            const { data: rawQuestions, error: qErr } = await supabase
                .from('manya_vault')
                .select('*')
                .eq('subject', challengeSub.toUpperCase())
                .eq('item_type', "MCQ's")
                .limit(45);

            if (qErr || !rawQuestions || rawQuestions.length === 0) {
                throw new Error('Failed to find quiz questions for this subject.');
            }

            // Shuffle and choose 5 questions
            const shuffled = [...rawQuestions].sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffled.slice(0, 5).map(q => {
                const rawOptions = q.options || [q.option_a, q.option_b, q.option_c, q.option_d];
                const cleanOptions = (Array.isArray(rawOptions) ? rawOptions : Object.values(rawOptions || {}))
                    .filter(opt => opt && opt !== 'null' && opt !== '');
                const finalOptions = cleanOptions.length > 0 ? cleanOptions : ["A", "B", "C", "D"];
                
                // Resolve correct answer value (Option_A / A / index -> full text string)
                const rawAns = q.correct_answer || q.answer || '';
                let resolvedAnswer = rawAns;
                
                const optMatch = String(rawAns).trim().match(/^option[ _]([a-d])$/i);
                if (optMatch) {
                    const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65;
                    if (idx >= 0 && idx < finalOptions.length) {
                        resolvedAnswer = finalOptions[idx];
                    }
                } else if (String(rawAns).trim().length === 1 && /^[a-d]$/i.test(String(rawAns).trim())) {
                    const idx = String(rawAns).trim().toUpperCase().charCodeAt(0) - 65;
                    if (idx >= 0 && idx < finalOptions.length) {
                        resolvedAnswer = finalOptions[idx];
                    }
                } else {
                    const num = parseInt(rawAns, 10);
                    if (!isNaN(num) && num >= 0 && num < finalOptions.length) {
                        resolvedAnswer = finalOptions[num];
                    } else {
                        const matchIdx = finalOptions.findIndex(o => String(o).trim().toLowerCase() === String(rawAns).trim().toLowerCase());
                        if (matchIdx !== -1) {
                            resolvedAnswer = finalOptions[matchIdx];
                        }
                    }
                }

                return {
                    id: q.qid || q.id,
                    question: q.question_text || q.prompt || q.text || q.question,
                    options: finalOptions,
                    answer: resolvedAnswer
                };
            });

            // 2. Execute RPC to escrow wager immediately
            const response = await syncService.createQuizDuel(
                selectedProfile.user_id,
                wagerAmount,
                challengeSub,
                selectedQuestions,
                wagerCurrency
            );

            if (response && response.success) {
                const duelId = response.duel_id;

                // 3. Deduct locally from Redux (optimistic)
                dispatch(updateBalanceThunk({
                    currency: wagerCurrency === 'coins' ? 'coins' : 'gem_overall',
                    amount: -wagerAmount,
                    type: 'DUEL_ESCROW_OUT',
                    contextId: duelId
                }));

                // 4. Update proposed meeting time if opponent is offline
                const isTargetOnline = onlineUsers.includes(selectedProfile.user_id);
                if (!isTargetOnline) {
                    try {
                        const { error: updateErr } = await supabase
                            .from('quiz_duels')
                            .update({ proposed_meet_time: proposedTime })
                            .eq('id', duelId);
                        if (updateErr) console.error("Error updating proposed meet time:", updateErr);
                    } catch (e) {
                        console.error("Failed to update proposed meet time:", e);
                    }

                    // Show custom offline success popup
                    setOfflineSuccessInfo({
                        opponentName: selectedProfile.full_name,
                        subject: challengeSub,
                        wagerAmount,
                        wagerCurrency,
                        proposedTime
                    });
                } else {
                    // Open the pending lobby overlay
                    setPendingOpponentName(selectedProfile.full_name);
                    setPendingDuelId(duelId);
                    setPendingDuelStatus('pending');
                }

                setSelectedProfile(null);
                setIsConfiguringChallenge(false);
            } else {
                setChallengeError(response?.message || 'Escrow wager failed.');
            }
        } catch (e) {
            setChallengeError(e.message || 'An error occurred.');
        } finally {
            setSendingChallenge(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rank-view"
        >
            {/* ── ARENA HEADER ── */}
            <header className="rank-arena-header">
                <div className="flex flex-col items-center">
                    <div className="live-pulse-dot" />
                    <h2 className="arena-title">National Arena</h2>
                    <p className="arena-subtitle">Uganda P.7 Hero Rankings</p>
                    
                    {timeframe === 'weekly' && (
                        <button
                            className="league-cohort-banner"
                            onClick={() => setShowLeagueRules(true)}
                            style={{ '--league-color': currentLeagueMeta.color }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <span className="text-3xl drop-shadow-lg">{currentLeagueMeta.shield}</span>
                                </div>
                                <div className="text-left flex-1">
                                    <div className="text-[9px] font-black text-amber-900 uppercase tracking-widest leading-none mb-0.5">
                                        YOUR COHORT LEAGUE
                                    </div>
                                    <div className="text-sm font-black text-[#2e1d0f] leading-tight">
                                        {currentLeagueMeta.name}
                                    </div>
                                    <div className="weekly-xp-bar mt-1.5" style={{ width: '120px' }}>
                                        <div
                                            className="weekly-xp-fill"
                                            style={{ width: `${Math.min(100, ((user?.weeklyXp || 0) / 500) * 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[9px] text-amber-800 font-bold mt-0.5">
                                        ⚡ {user?.weeklyXp || 0} XP this week
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[9px] font-black text-amber-800 border border-amber-800/40 rounded-lg px-2 py-1 uppercase tracking-wide whitespace-nowrap">
                                    📜 Rules
                                </span>
                                <span className="text-[8px] text-amber-700 font-bold opacity-70">Tap to view</span>
                            </div>
                        </button>
                    )}
                </div>
            </header>


            {/* ── TIMEFRAME TOGGLE ── */}
            <div className="px-5 mb-4">
                <div className="timeframe-toggle-bar">
                    <button 
                        className={`tf-btn ${timeframe === 'all-time' ? 'active' : ''}`}
                        onClick={() => setTimeframe('all-time')}
                    >
                        All-Time
                    </button>
                    <button 
                        className={`tf-btn ${timeframe === 'weekly' ? 'active' : ''}`}
                        onClick={() => setTimeframe('weekly')}
                    >
                        Weekly Sprint
                    </button>
                </div>
            </div>

            {/* ── SUBJECT HUD ── */}
            {timeframe !== 'weekly' && (
                <div className="subject-rank-grid">
                    {SUBJECTS.map(s => (
                        <button
                            key={s.id}
                            className={`rank-sub-pill ${activeSub === s.id ? 'active' : ''}`}
                            onClick={() => setActiveSub(s.id)}
                            style={{ '--tab-color': s.color }}
                        >
                            <img src={s.gem} className="w-5 h-5" alt={s.label} />
                            <span>{s.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── THE PODIUM ── */}
            <div className="podium-section">
                {loading ? (
                    <div className="podium-shimmer" />
                ) : (
                    <div className="podium-layout">
                        {/* Rank 2 */}
                        <div className="pod-slot slot-2">
                            {podium[1] ? (
                                <PodiumCard rank={2} data={podium[1]} color={activeColor} gem={activeGem} onClick={() => handlePlayerClick(podium[1])} />
                            ) : <div className="pod-placeholder">2nd</div>}
                        </div>
                        
                        {/* Rank 1 */}
                        <div className="pod-slot slot-1">
                            {podium[0] ? (
                                <PodiumCard rank={1} data={podium[0]} color={activeColor} gem={activeGem} onClick={() => handlePlayerClick(podium[0])} />
                            ) : <div className="pod-placeholder">1st</div>}
                        </div>
                        
                        {/* Rank 3 */}
                        <div className="pod-slot slot-3">
                            {podium[2] ? (
                                <PodiumCard rank={3} data={podium[2]} color={activeColor} gem={activeGem} onClick={() => handlePlayerClick(podium[2])} />
                            ) : <div className="pod-placeholder">3rd</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* ── LEADERBOARD LIST ── */}
            <div className="leaderboard-container">
                <div className="list-header">
                    <span>{timeframe === 'weekly' ? 'WEEKLY COHORT STANDINGS' : `${activeSub.toUpperCase()} LEADERBOARD`}</span>
                    <span>{timeframe === 'weekly' ? 'WEEKLY XP (⚡)' : 'HERO POWER (⚡)'}</span>
                </div>

                <div className="rank-list">
                    {loading ? (
                        <div className="py-20 text-center opacity-50">Calculating Ranks...</div>
                    ) : allRankings.length === 0 ? (
                        <div className="py-20 text-center opacity-50">No students ranked in this category yet.</div>
                    ) : (
                        allRankings.map((item) => (
                            <RankRow 
                                key={item.user_id} 
                                data={item} 
                                isUser={item.user_id === user?.id} 
                                color={activeColor}
                                gem={activeGem}
                                isWeekly={timeframe === 'weekly'}
                                isOnline={onlineUsers.includes(item.user_id) || item.user_id === user?.id}
                                onClick={() => handlePlayerClick(item)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* ── LEAGUE COVENANT RULES MODAL ── */}
            <AnimatePresence>
                {showLeagueRules && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/85 backdrop-blur-xs">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="parchment-scroll relative w-full max-w-[340px] p-6 text-center max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex justify-center mb-3">
                                <Trophy size={36} className="text-amber-800" />
                            </div>
                            <h3 className="text-lg font-black text-[#2e1d0f] uppercase tracking-tight mb-1">COVENANT LEAGUES</h3>
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wide mb-4">Ascend the 10 Medieval Tiers</p>
                            
                            <div className="text-left text-xs text-[#5d4037] font-bold space-y-3 mb-6 leading-relaxed">
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">🎯</span>
                                    <span>Students are dynamically matched into **cohort buckets of 30** active players.</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">⚔️</span>
                                    <span>Earn XP by completing quests, lessons, or defeating rivals in PvP duels.</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">📈</span>
                                    <span>The <strong className="text-emerald-800">Top 5 players</strong> at the end of the week gain promotion to the next tier!</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">📉</span>
                                    <span>The <strong className="text-rose-800">Bottom 5 players</strong> risk demotion to the previous tier.</span>
                                </div>
                                
                                <div className="border-t border-[#8c6b45]/30 pt-3 mt-3">
                                    <span className="text-[9px] font-black uppercase text-amber-900 tracking-widest block mb-2">The 10 Tiers of Glory</span>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        {Object.entries(LEAGUE_TIERS).map(([key, value]) => (
                                            <div key={key} className={`flex items-center gap-1 p-1 rounded border ${key === userLeague ? 'bg-[#3e2723] text-white border-amber-500' : 'bg-amber-100/30 border-amber-900/10'}`}>
                                                <span>{value.shield}</span>
                                                <span className="truncate">{value.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowLeagueRules(false)}
                                className="glow-button w-full py-3 text-xs"
                            >
                                CLOSE SCROLL
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── MEDIEVAL PLAYER PROFILE POPUP ── */}
            <AnimatePresence>
                {selectedProfile && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md" onClick={() => setSelectedProfile(null)}>
                        <motion.div 
                            initial={{ scale: 0.9, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 15, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 180 }}
                            className="relative w-full max-w-[330px] bg-[#2a1c0d] border-4 border-[#c5a880] rounded-[2rem] p-5 shadow-[0_0_30px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(0,0,0,0.5)] overflow-hidden text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute inset-2 border-2 border-dashed border-[#8d6e63]/40 rounded-[1.6rem] pointer-events-none" />
                            
                            <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 text-[#d7ccc8] hover:text-[#fff] transition-all bg-[#4e342e]/80 p-1.5 rounded-full border border-[#8d6e63]">
                                <X size={16} />
                            </button>

                            {/* State 1: Medieval Player Card */}
                            {!isConfiguringChallenge ? (
                                <div className="py-2">
                                    <div className="flex justify-center items-center gap-1.5 mb-2">
                                        <Sword size={14} className="text-[#c5a880]" />
                                        <span className="text-[10px] font-black text-[#c5a880] uppercase tracking-widest">PLAYER RECORD</span>
                                        <Sword size={14} className="text-[#c5a880] scale-x-[-1]" />
                                    </div>

                                    <div className="relative mx-auto w-24 h-24 rounded-full border-4 border-[#c5a880] overflow-hidden bg-[#3e2723] mb-4 shadow-[0_6px_0_#1a0f08,0_10px_20px_rgba(0,0,0,0.5)]">
                                        <img src={selectedProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedProfile.full_name}`} alt={selectedProfile.full_name} className="w-full h-full object-cover" />
                                    </div>

                                    <div className="bg-[#ebdcb9] border-2 border-[#b49060] rounded-xl px-3 py-1.5 mx-auto max-w-[200px] mb-4 shadow-[inset_0_0_6px_rgba(62,39,35,0.2),0_3px_0_#1a0f08]">
                                        <h3 className="text-base font-black text-[#2e1d0f] leading-none uppercase">
                                            {selectedProfile.full_name}
                                        </h3>
                                    </div>
                                    
                                    <p className="text-[9px] font-black text-[#a1887f] uppercase tracking-widest mb-4">
                                        RANK POS • #{selectedProfile.rank_pos} IN REALM
                                    </p>

                                    {/* Target Online/Offline Status Indicator */}
                                    <div className="mb-6 flex items-center justify-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${onlineUsers.includes(selectedProfile.user_id) ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        <span className="text-[11px] font-bold text-[#d7ccc8]">
                                            {onlineUsers.includes(selectedProfile.user_id) 
                                                ? 'Online (Ready for Live Duel)' 
                                                : 'Offline (Send Invitation Card)'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1 bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl p-2.5 mb-6 shadow-[0_4px_0_#1a0f08]">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-0.5 text-[#8d6e63] font-black text-sm">
                                                <Star size={13} fill="currentColor" className="text-amber-600" />
                                                <span>{selectedProfile.total_stars}</span>
                                            </div>
                                            <span className="text-[8px] text-[#5d4037] font-black uppercase tracking-wider mt-0.5">Stars</span>
                                        </div>

                                        <div className="flex flex-col items-center border-x border-[#b49060]/50">
                                            <div className="flex items-center gap-0.5 text-[#8d6e63] font-black text-sm">
                                                <img src={activeGem} className="w-3.5 h-3.5" alt="gem" />
                                                <span>{selectedProfile.total_gems}</span>
                                            </div>
                                            <span className="text-[8px] text-[#5d4037] font-black uppercase tracking-wider mt-0.5">Gems</span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-0.5 text-[#8d6e63] font-black text-sm">
                                                <Zap size={13} fill="currentColor" className="text-amber-600" />
                                                <span>{selectedProfile.power_score.toLocaleString()}</span>
                                            </div>
                                            <span className="text-[8px] text-[#5d4037] font-black uppercase tracking-wider mt-0.5">Power</span>
                                        </div>
                                    </div>

                                    {/* Action Duel CTA with Online checking */}
                                    {selectedProfile.user_id !== user?.id ? (
                                        isOnline ? (
                                            <button
                                                onClick={() => {
                                                    setChallengeSub(activeSub === 'all' ? 'math' : activeSub);
                                                    setWagerAmount(5);
                                                    setWagerCurrency('gems');
                                                    setIsConfiguringChallenge(true);
                                                }}
                                                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-black text-base rounded-2xl shadow-[0_4px_0_#795548] border border-amber-300/30 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                                            >
                                                <Sword size={16} />
                                                CHALLENGE DUEL
                                            </button>
                                        ) : (
                                            <div className="py-3.5 text-amber-800 font-bold text-xs bg-[#ebdcb9] rounded-2xl border-2 border-[#b49060] flex items-center justify-center gap-1.5 shadow-[0_3px_0_#1a0f08]">
                                                <AlertCircle size={14} className="text-amber-700" />
                                                <span>Connect to internet to play!</span>
                                            </div>
                                        )
                                    ) : (
                                        <div className="py-2.5 text-[#ebdcb9] font-black text-xs bg-[#4e342e] rounded-xl border border-[#8d6e63]/50">
                                            YOU STAND IN THE ARENA 👑
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* State 2: Configuring Wager */
                                <div className="py-2 text-left">
                                    <div className="text-center mb-3">
                                        <span className="text-[10px] font-black text-[#c5a880] uppercase tracking-widest">STRIKE COVENANT</span>
                                        <h3 className="text-sm font-black text-white uppercase tracking-tight mt-0.5">
                                            CHOOSE WAR STAKES
                                        </h3>
                                    </div>

                                    <div className="bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl p-4 flex flex-col gap-4 mb-3 shadow-[0_4px_0_#1a0f08]">

                                        {/* Subject selector */}
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase">⚔️ SELECT ARENA SUBJECT</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {SUBJECTS.filter(s => s.id !== 'all').map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setChallengeSub(s.id)}
                                                        className={`py-2 px-2.5 rounded-xl border-2 text-[11px] font-black transition-all flex items-center gap-1.5 justify-center ${challengeSub === s.id ? 'border-[#3e2723] bg-[#3e2723] text-white' : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#3e2723]'}`}
                                                    >
                                                        <img src={s.gem} className="w-3.5 h-3.5" alt={s.label} />
                                                        <span>{s.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Currency toggle */}
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase">🪙 WAGER CURRENCY</span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => { setWagerCurrency('gems'); setWagerAmount(5); }}
                                                    className={`py-2 px-3 rounded-xl border-2 text-[11px] font-black transition-all flex items-center gap-1.5 justify-center ${
                                                        wagerCurrency === 'gems'
                                                            ? 'border-amber-600 bg-amber-600/15 text-amber-800'
                                                            : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#5d4037]'
                                                    }`}
                                                >
                                                    <img src={getGem(challengeSub)} className="w-3.5 h-3.5" alt="gem" />
                                                    Gems
                                                    <span className="ml-auto text-[9px] opacity-60">{myGems}</span>
                                                </button>
                                                <button
                                                    onClick={() => { setWagerCurrency('coins'); setWagerAmount(50); }}
                                                    className={`py-2 px-3 rounded-xl border-2 text-[11px] font-black transition-all flex items-center gap-1.5 justify-center ${
                                                        wagerCurrency === 'coins'
                                                            ? 'border-yellow-500 bg-yellow-500/15 text-yellow-800'
                                                            : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#5d4037]'
                                                    }`}
                                                >
                                                    🪙 Coins
                                                    <span className="ml-auto text-[9px] opacity-60">{myCoins}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Amount selector */}
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase">
                                                {wagerCurrency === 'gems' ? '💎 PLEDGE GEMS' : '🪙 PLEDGE COINS'}
                                            </span>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(wagerCurrency === 'gems' ? [5, 10, 20] : [50, 100, 250]).map(val => {
                                                    const bal = wagerCurrency === 'gems' ? myGems : myCoins;
                                                    const cantAfford = bal < val;
                                                    return (
                                                        <button
                                                            key={val}
                                                            onClick={() => !cantAfford && setWagerAmount(val)}
                                                            disabled={cantAfford}
                                                            className={`py-2 px-2 rounded-xl border-2 text-xs font-black transition-all flex flex-col items-center gap-0.5 ${
                                                                cantAfford
                                                                    ? 'opacity-40 border-[#b49060]/20 bg-transparent text-[#8d6e63] cursor-not-allowed'
                                                                    : wagerAmount === val
                                                                        ? 'border-amber-600 bg-amber-600/15 text-amber-800'
                                                                        : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#5d4037]'
                                                            }`}
                                                        >
                                                            {wagerCurrency === 'gems'
                                                                ? <img src={getGem(challengeSub)} className="w-3.5 h-3.5" alt="gem" />
                                                                : <span className="text-[13px] leading-none">🪙</span>
                                                            }
                                                            <span>{val}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {/* Insufficient balance warning */}
                                            {(() => {
                                                const bal = wagerCurrency === 'gems' ? myGems : myCoins;
                                                const label = wagerCurrency === 'gems' ? 'gems' : 'coins';
                                                if (bal < wagerAmount) {
                                                    return (
                                                        <div className="flex items-center gap-1.5 p-2 bg-red-950/40 border border-red-500/40 rounded-lg text-red-300 text-[10px] font-bold">
                                                            <AlertCircle size={12} className="text-red-400 shrink-0" />
                                                            Not enough {label}! You have {bal}, need {wagerAmount}.
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {/* Proposed Meeting Time (only if target is offline) */}
                                        {!onlineUsers.includes(selectedProfile.user_id) && (
                                            <div className="flex flex-col gap-1.5 border-t border-[#b49060]/30 pt-3 mt-1 text-left">
                                                <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase flex items-center gap-1">
                                                    ⏰ PROPOSE MEETING HOUR (UGANDAN TIME - EAT)
                                                </span>
                                                <div className="relative">
                                                    <select
                                                        value={proposedTime}
                                                        onChange={(e) => setProposedTime(e.target.value)}
                                                        className="w-full bg-[#ebdcb9] border-2 border-[#b49060] rounded-xl px-3 py-2 text-xs font-black text-[#2e1d0f] shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] outline-none focus:border-[#3e2723] appearance-none cursor-pointer"
                                                        style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%235d4037'><path d='M3 4l3 3 3-3z'/></svg>")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat' }}
                                                    >
                                                        <option value="8:00 AM EAT">8:00 AM EAT</option>
                                                        <option value="9:00 AM EAT">9:00 AM EAT</option>
                                                        <option value="10:00 AM EAT">10:00 AM EAT</option>
                                                        <option value="11:00 AM EAT">11:00 AM EAT</option>
                                                        <option value="12:00 PM EAT">12:00 PM EAT</option>
                                                        <option value="1:00 PM EAT">1:00 PM EAT</option>
                                                        <option value="2:00 PM EAT">2:00 PM EAT</option>
                                                        <option value="3:00 PM EAT">3:00 PM EAT</option>
                                                        <option value="4:00 PM EAT">4:00 PM EAT</option>
                                                        <option value="5:00 PM EAT">5:00 PM EAT</option>
                                                        <option value="6:00 PM EAT">6:00 PM EAT</option>
                                                        <option value="7:00 PM EAT">7:00 PM EAT</option>
                                                        <option value="8:00 PM EAT">8:00 PM EAT</option>
                                                        <option value="9:00 PM EAT">9:00 PM EAT</option>
                                                        <option value="10:00 PM EAT">10:00 PM EAT</option>
                                                        <option value="11:00 PM EAT">11:00 PM EAT</option>
                                                    </select>
                                                </div>
                                                <span className="text-[8px] font-bold text-[#8d6e63] leading-tight mt-0.5">
                                                    Rival will see this proposal in their Shield Duel Inbox when they log in online.
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {challengeError && (
                                        <div className="mb-3 p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-200 text-xs font-medium flex items-center gap-1.5 justify-center">
                                            <AlertCircle size={14} className="text-red-400 shrink-0" />
                                            <span>{challengeError}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        {/* CANCEL button — blood-carved stone */}
                                        <button
                                            onClick={() => setIsConfiguringChallenge(false)}
                                            className="relative flex-1 group"
                                        >
                                            <div className="absolute inset-0 rounded-xl bg-[#5a1a1a] translate-y-[3px] border-b-2 border-[#3a0a0a]" />
                                            <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                bg-gradient-to-b from-[#8b2020] via-[#6b1515] to-[#5a1010]
                                                border-2 border-[#a33030] border-b-[#5a1a1a]
                                                shadow-[inset_0_1px_0_rgba(255,120,120,0.15),0_0_8px_rgba(180,30,30,0.3)]
                                                active:translate-y-[2px] active:shadow-none transition-all duration-100
                                                group-hover:from-[#9b2525] group-hover:via-[#7b1a1a] group-hover:to-[#641212]">
                                                <span className="text-[11px] font-black text-rose-200 uppercase tracking-widest leading-none">Cancel</span>
                                            </div>
                                        </button>

                                        {/* DUEL! button — gold-carved stone */}
                                        <button
                                            disabled={sendingChallenge || (wagerCurrency === 'gems' ? myGems : myCoins) < wagerAmount}
                                            onClick={handleSendChallenge}
                                            className="relative flex-1 group disabled:opacity-40"
                                        >
                                            <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                                            <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                                bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                                border-2 border-[#e0c060] border-b-[#3e2200]
                                                shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                                active:translate-y-[2px] active:shadow-none transition-all duration-100
                                                group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                                                <Sword size={13} className="text-amber-100 shrink-0" />
                                                <span className="text-[11px] font-black text-amber-100 uppercase tracking-widest leading-none">
                                                    {sendingChallenge ? 'SENDING...' : 'DUEL!'}
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── CHALLENGER-SIDE PENDING LOBBY OVERLAY ── */}
            <AnimatePresence>
                {pendingDuelId && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-[320px] bg-[#2a1c0d] border-4 border-[#c5a880] rounded-[2rem] p-6 shadow-2xl text-center"
                        >
                            <div className="absolute inset-2 border-2 border-dashed border-[#8d6e63]/40 rounded-[1.6rem] pointer-events-none" />
                            
                            {pendingDuelStatus === 'pending' ? (
                                <div className="py-4 flex flex-col items-center">
                                    <div className="relative w-20 h-20 mb-6">
                                        <div className="absolute inset-0 rounded-full border-4 border-amber-600 border-t-transparent animate-spin" />
                                        <Sword size={32} className="text-[#c5a880] absolute inset-0 m-auto animate-pulse" />
                                    </div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">SENDING CHALLENGE</h3>
                                    <p className="text-[#d7ccc8] text-xs max-w-xs mb-6 leading-relaxed">
                                        Waiting for <strong className="text-[#ebdcb9]">{pendingOpponentName}</strong> to accept your covenant to fight...
                                    </p>
                                    
                                    <button 
                                        onClick={handleCancelChallenge}
                                        className="relative w-full group"
                                    >
                                        <div className="absolute inset-0 rounded-xl bg-[#5a1a1a] translate-y-[3px] border-b-2 border-[#3a0a0a]" />
                                        <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                            bg-gradient-to-b from-[#8b2020] via-[#6b1515] to-[#5a1010]
                                            border-2 border-[#a33030] border-b-[#5a1a1a]
                                            shadow-[inset_0_1px_0_rgba(255,120,120,0.15),0_0_8px_rgba(180,30,30,0.3)]
                                            active:translate-y-[2px] active:shadow-none transition-all duration-100
                                            group-hover:from-[#9b2525] group-hover:via-[#7b1a1a] group-hover:to-[#641212]">
                                            <span className="text-[11px] font-black text-rose-200 uppercase tracking-widest leading-none">RETRACT CHALLENGE</span>
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <div className="py-4 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-red-950/40 border-2 border-red-500/50 rounded-full flex items-center justify-center mb-6">
                                        <X size={32} className="text-red-400" />
                                    </div>
                                    <h3 className="text-lg font-black text-red-400 uppercase tracking-tight mb-2">DECLINED</h3>
                                    <p className="text-[#d7ccc8] text-xs max-w-xs leading-relaxed">
                                        {pendingOpponentName} has declined the duel. Your gem wagers are returned to your vaults.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── OFFLINE INVITATION SUCCESS OVERLAY ── */}
            <AnimatePresence>
                {offlineSuccessInfo && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm" onClick={() => setOfflineSuccessInfo(null)}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-[320px] bg-[#2a1c0d] border-4 border-[#c5a880] rounded-[2rem] p-6 shadow-2xl text-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute inset-2 border-2 border-dashed border-[#8d6e63]/40 rounded-[1.6rem] pointer-events-none" />
                            
                            <div className="py-4 flex flex-col items-center">
                                <div className="w-16 h-16 bg-[#ebdcb9] border-2 border-[#b49060] rounded-full flex items-center justify-center mb-4 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                    <Sword size={28} className="text-amber-800" />
                                </div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">INVITATION SENT!</h3>
                                <p className="text-[#d7ccc8] text-xs max-w-xs mb-4 leading-relaxed text-center">
                                    An invitation card has been sent to <strong className="text-[#ebdcb9]">{offlineSuccessInfo.opponentName}</strong>'s Shield Inbox.
                                </p>
                                
                                <div className="w-full bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl p-3 flex flex-col items-center gap-1.5 mb-6 shadow-[inset_0_0_6px_rgba(62,39,35,0.2)]">
                                    <span className="text-[9px] font-black text-[#5d4037] uppercase tracking-widest">PROPOSED MEETING:</span>
                                    <span className="text-xs font-black text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-md uppercase tracking-tight">
                                        ⏰ {offlineSuccessInfo.proposedTime}
                                    </span>
                                </div>

                                <button 
                                    onClick={() => setOfflineSuccessInfo(null)}
                                    className="glow-button w-full py-3 text-xs cursor-pointer"
                                >
                                    CLOSE SCROLL
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function PodiumCard({ rank, data, color, gem, onClick }) {
    const isGold = rank === 1;
    const displayName = data.full_name.length > 10 ? data.full_name.split(' ')[0] : data.full_name;

    return (
        <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className={`pod-card pod-rank-${rank} cursor-pointer hover:scale-[1.03] transition-all`}
            onClick={onClick}
        >
            <div className="toy-card-gloss" />
            {isGold && <div className="crown-badge">👑</div>}
            <div className="pod-avatar-wrap">
                <img src={data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.full_name}`} alt={data.full_name} />
            </div>
            <p className="pod-name">{displayName}</p>
            
            <div className="pod-stats-row">
                <div className="pod-mini-stat">
                    <Star size={10} className="text-yellow-400" fill="currentColor" />
                    <span>{data.total_stars}</span>
                </div>
                <div className="pod-mini-stat">
                    <img src={gem} className="w-3 h-3" alt="gem" />
                    <span>{data.total_gems}</span>
                </div>
            </div>

            <div className="pod-score-pill">
                <Zap size={10} className="text-yellow-400" fill="currentColor" />
                <span>{data.power_score.toLocaleString()}</span>
            </div>
        </motion.div>
    );
}

function RankRow({ data, isUser, color, gem, isWeekly, isOnline, onClick }) {
    // Determine promotion / demotion styles if inside the weekly league sprint
    let rowStyleClass = "";
    let indicatorBadge = null;

    if (isWeekly) {
        if (data.rank_pos <= 5) {
            rowStyleClass = "zone-promote-row";
            indicatorBadge = (
                <div className="medieval-badge-promote scale-90 shrink-0">
                    <span>👑 PROMOTING</span>
                </div>
            );
        } else if (data.rank_pos >= 26) {
            rowStyleClass = "zone-demote-row";
            indicatorBadge = (
                <div className="medieval-badge-demote scale-90 shrink-0">
                    <span>⚠️ DANGER ZONE</span>
                </div>
            );
        }
    }

    return (
        <div 
            className={`rank-row-elite ${isUser ? 'is-user' : ''} ${rowStyleClass} cursor-pointer hover:scale-[1.01] transition-all`} 
            style={isUser ? { '--tab-color': color } : {}}
            onClick={onClick}
        >
            <span className="r-pos">#{data.rank_pos}</span>
            <div className="relative shrink-0">
                <div className="r-avatar">
                    <img src={data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.full_name}`} alt={data.full_name} />
                </div>
                <span className={`r-status-dot ${isOnline ? 'is-online' : ''}`} title={isOnline ? 'Online' : 'Offline'} />
            </div>
            <div className="r-info min-w-0">
                <span className="r-name">{data.full_name} {isUser ? '(YOU)' : ''}</span>
                {indicatorBadge && (
                    <div className="mt-1 flex">
                        {indicatorBadge}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-auto">
                <div className="r-stat-box">
                    <span className="r-score-num">{data.power_score.toLocaleString()}</span>
                    <span className="r-score-lbl">{isWeekly ? 'XP' : 'POWER'}</span>
                </div>
                {!isUser ? (
                    <div className="r-action-duel-btn shrink-0" title="Tap to Duel">
                        <span>⚔️</span>
                    </div>
                ) : (
                    <div className="r-user-crown-badge shrink-0" title="You stand in the arena!">
                        <span>👑</span>
                    </div>
                )}
            </div>
        </div>
    );
}
