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
    const [timeframe, setTimeframe] = useState('all-time'); // 'all-time' | 'weekly'
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Selected Player for detail profile card modal
    const [selectedProfile, setSelectedProfile] = useState(null);
    
    // Challenge Config state
    const [isConfiguringChallenge, setIsConfiguringChallenge] = useState(false);
    const [wagerGems, setWagerGems] = useState(5);
    const [challengeSub, setChallengeSub] = useState('math');
    const [sendingChallenge, setSendingChallenge] = useState(false);
    const [challengeError, setChallengeError] = useState('');

    // Challenger-side Pending Invitation Lobby Overlay
    const [pendingDuelId, setPendingDuelId] = useState(null);
    const [pendingDuelStatus, setPendingDuelStatus] = useState(null); // 'pending' | 'declined' | 'cancelled'
    const [pendingOpponentName, setPendingOpponentName] = useState('');

    // ── INITIAL FETCH ──
    useEffect(() => {
        async function loadRankings() {
            setLoading(true);
            const data = await syncService.pullRankings(timeframe, activeSub);
            setRankings(data);
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
                        // Opponent accepted! Drag the challenger to the Arena
                        navigate(`/duel/${pendingDuelId}`);
                    } else if (updatedDuel.status === 'declined') {
                        // Opponent declined, trigger local Redux gem refund
                        dispatch(updateBalanceThunk({
                            currency: 'gem_overall',
                            amount: wagerGems,
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

        return () => {
            supabase.removeChannel(dbChannel);
        };
    }, [pendingDuelId, navigate, dispatch, wagerGems]);

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
            // Refund locally
            dispatch(updateBalanceThunk({
                currency: 'gem_overall',
                amount: wagerGems,
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

        // Validate sender gems balance
        const userGems = user?.diamonds || 0;
        if (userGems < wagerGems) {
            setChallengeError(`You need at least ${wagerGems} Gems to place this wager!`);
            setSendingChallenge(false);
            return;
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

            // 2. Execute RPC database transaction to escrow gems immediately
            const response = await syncService.createQuizDuel(
                selectedProfile.user_id,
                wagerGems,
                challengeSub,
                selectedQuestions
            );

            if (response && response.success) {
                const duelId = response.duel_id;

                // 3. Deduct gems locally from Redux/IndexedDB
                dispatch(updateBalanceThunk({
                    currency: 'gem_overall',
                    amount: -wagerGems,
                    type: 'DUEL_ESCROW_OUT',
                    contextId: duelId
                }));

                // 4. Open the pending lobby overlay instead of pushing them into the arena
                setPendingOpponentName(selectedProfile.full_name);
                setPendingDuelId(duelId);
                setPendingDuelStatus('pending');

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
                    <span>{activeSub.toUpperCase()} LEADERBOARD</span>
                    <span>HERO POWER (⚡)</span>
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
                                onClick={() => handlePlayerClick(item)}
                            />
                        ))
                    )}
                </div>
            </div>

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
                                    
                                    <p className="text-[9px] font-black text-[#a1887f] uppercase tracking-widest mb-6">
                                        RANK POS • #{selectedProfile.rank_pos} IN REALM
                                    </p>

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
                                                    setWagerGems(5);
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
                                /* State 2: Configuring Wager in Medieval Scroll design */
                                <div className="py-2 text-left">
                                    <div className="text-center mb-4">
                                        <span className="text-[10px] font-black text-[#c5a880] uppercase tracking-widest">STRIKE COVENANT</span>
                                        <h3 className="text-sm font-black text-white uppercase tracking-tight mt-1">
                                            CHOOSE WAR STAKES
                                        </h3>
                                    </div>

                                    <div className="bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl p-4 flex flex-col gap-4 mb-6 shadow-[0_4px_0_#1a0f08]">
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

                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase">💎 PLEDGE GEMS WAGER</span>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[5, 10, 20].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setWagerGems(val)}
                                                        className={`py-2 px-2 rounded-xl border-2 text-xs font-black transition-all flex items-center gap-1.5 justify-center ${wagerGems === val ? 'border-amber-600 bg-amber-600/10 text-amber-800' : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#5d4037]'}`}
                                                    >
                                                        <img src={getGem(challengeSub)} className="w-3.5 h-3.5" alt="gem" />
                                                        <span>{val}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {challengeError && (
                                        <div className="mb-4 p-3 bg-red-950/60 border border-red-500/30 rounded-xl text-red-200 text-xs font-medium flex items-center gap-1.5 justify-center">
                                            <AlertCircle size={14} className="text-red-400 shrink-0" />
                                            <span>{challengeError}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsConfiguringChallenge(false)}
                                            className="flex-1 py-3 bg-[#4e342e] hover:bg-[#3e2723] text-[#d7ccc8] border-2 border-[#8d6e63] font-black rounded-xl active:translate-y-0.5 transition-all text-xs"
                                        >
                                            CANCEL
                                        </button>
                                        <button
                                            disabled={sendingChallenge}
                                            onClick={handleSendChallenge}
                                            className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-black rounded-xl shadow-[0_3px_0_#795548] border border-amber-300/30 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 text-xs"
                                        >
                                            <Sword size={14} />
                                            {sendingChallenge ? 'SENDING...' : 'DUEL!'}
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
                                        className="w-full py-3 bg-[#4e342e] hover:bg-[#3e2723] text-[#d7ccc8] border-2 border-[#8d6e63] font-black rounded-xl active:translate-y-0.5 transition-all text-xs"
                                    >
                                        RETRACT CHALLENGE
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

function RankRow({ data, isUser, color, gem, onClick }) {
    return (
        <div 
            className={`rank-row-elite ${isUser ? 'is-user' : ''} cursor-pointer hover:scale-[1.01] transition-all`} 
            style={isUser ? { '--tab-color': color } : {}}
            onClick={onClick}
        >
            <span className="r-pos">#{data.rank_pos}</span>
            <div className="r-avatar">
                <img src={data.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.full_name}`} alt={data.full_name} />
            </div>
            <div className="r-info">
                <span className="r-name">{data.full_name} {isUser ? '(YOU)' : ''}</span>
                <div className="flex items-center gap-3 opacity-60">
                     <span className="r-stars flex items-center gap-1"><Star size={10} fill="currentColor" /> {data.total_stars}</span>
                     <span className="r-gems flex items-center gap-1"><img src={gem} className="w-2.5 h-2.5" /> {data.total_gems}</span>
                </div>
            </div>
            <div className="r-stat shrink-0">
                <span className="r-score-val">{data.power_score.toLocaleString()}</span>
                <Zap size={12} className="text-yellow-400" fill="currentColor" />
            </div>
        </div>
    );
}
