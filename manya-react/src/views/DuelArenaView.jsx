import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Trophy, Zap, Clock, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft, LogOut, BookOpen, ShieldCheck, Play } from 'lucide-react';
import { supabase } from '../backend/remote/supabaseClient';
import { syncService } from '../backend/sync/syncService';
import { updateBalanceThunk, userSlice } from '../store/userSlice';
import { getGem, IMAGES } from '../config/assetUrls';
import { audioService } from '../infrastructure/audio/audioService.js';
import '../styles/engines.css';

const checkCorrect = (selected, correct, options) => {
    if (!selected || !correct) return false;
    const selClean = String(selected).trim().toLowerCase();
    const corrClean = String(correct).trim().toLowerCase();
    if (selClean === corrClean) return true;
    
    if (!options) return false;
    
    // Check for option index match like option_a or option a or a/b/c/d
    const optMatch = corrClean.match(/^option[ _]([a-d])$/i);
    if (optMatch) {
        const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < options.length) {
            return selClean === String(options[idx]).trim().toLowerCase();
        }
    }
    if (corrClean.length === 1 && /^[a-d]$/i.test(corrClean)) {
        const idx = corrClean.toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < options.length) {
            return selClean === String(options[idx]).trim().toLowerCase();
        }
    }
    // Check for numeric index
    const num = parseInt(corrClean, 10);
    if (!isNaN(num) && num >= 0 && num < options.length) {
        return selClean === String(options[num]).trim().toLowerCase();
    }
    return false;
};

export default function DuelArenaView() {
    const { duelId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector(state => state.user.data);

    const [loading, setLoading] = useState(true);
    const [duel, setDuel] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [selectedOpt, setSelectedOpt] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    
    // Opponent Progress & Live presence
    const [opponentProgress, setOpponentProgress] = useState(null);
    const presenceChannelRef = useRef(null);
    
    // Timer state (30 seconds per question)
    const [timeLeft, setTimeLeft] = useState(30);
    const timerRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    
    // Duel resolution status
    const [finishing, setFinishing] = useState(false);
    const [duelResult, setDuelResult] = useState(null); // 'win' | 'lose' | 'tie' | 'waiting'
    const [error, setError] = useState('');

    // Forfeit dialog confirmation modal
    const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
    
    // Rules modal
    const [showRules, setShowRules] = useState(false);

    // RPG Battle logs, Mascot states, and Loot Chest
    const [battleLogs, setBattleLogs] = useState(["⚔️ The duel of minds has begun!"]);
    const [mascotState, setMascotState] = useState('idle');
    const [chestOpened, setChestOpened] = useState(false);
    const [chestShaking, setChestShaking] = useState(false);

    // Fetch duel details
    useEffect(() => {
        async function loadDuel() {
            try {
                const details = await syncService.fetchDuelDetails(duelId);
                setDuel(details);
                setQuestions(details.questions || []);
                startTimeRef.current = Date.now();
                setLoading(false);
            } catch (e) {
                setError('Failed to load duel details.');
                setLoading(false);
            }
        }
        loadDuel();
    }, [duelId]);

    // Setup Presence synchronization
    useEffect(() => {
        if (!user?.id || !duelId || loading || !supabase) return;

        const channel = supabase.channel(`duel-arena:${duelId}`);
        presenceChannelRef.current = channel;

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                Object.keys(state).forEach(key => {
                    const presenceGroup = state[key];
                    presenceGroup.forEach(p => {
                        if (p.userId !== user.id) {
                            setOpponentProgress(p);
                        }
                    });
                });
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                leftPresences.forEach(p => {
                    if (p.userId !== user.id) {
                        setOpponentProgress(prev => prev ? { ...prev, disconnected: true } : null);
                    }
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        userId: user.id,
                        nickname: user.nickname || 'Student',
                        avatarUrl: user.avatarUrl,
                        questionIndex: 0,
                        score: 0,
                        finished: false
                    });
                }
            });

        // Listen for database changes on the duel record (specifically when resolved/completed)
        const dbChannel = supabase.channel(`duel-db:${duelId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'quiz_duels', filter: `id=eq.${duelId}` },
                (payload) => {
                    const updatedDuel = payload.new;
                    setDuel(prev => ({ ...prev, ...updatedDuel }));
                    if (updatedDuel.status === 'completed') {
                        resolveMatchOutcome(updatedDuel);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(dbChannel);
        };
    }, [user?.id, duelId, loading]);

    // ── RPG BATTLE LOG TICKER & MASCOT WATCHERS ──
    const prevOpponentIdxRef = useRef(0);
    const abandonTimeoutRef = useRef(null);

    useEffect(() => {
        if (!opponentProgress) return;
        const currentOppIdx = opponentProgress.questionIndex;
        if (currentOppIdx > prevOpponentIdxRef.current) {
            const oppName = opponentProgress.nickname || 'Opponent';
            setBattleLogs(prev => [
                ...prev.slice(-3),
                `⚡ ${oppName} has locked in strike for Step ${currentOppIdx}!`
            ]);
            prevOpponentIdxRef.current = currentOppIdx;
        }

        if (opponentProgress.disconnected) {
            setBattleLogs(prev => [
                ...prev.slice(-3),
                `⚠️ Opponent has disconnected from the arena!`
            ]);
            
            // Auto-claim victory if opponent abandons (5 second grace period)
            if (!duelResult && !finishing && !opponentProgress.finished) {
                if (abandonTimeoutRef.current) clearTimeout(abandonTimeoutRef.current);
                abandonTimeoutRef.current = setTimeout(async () => {
                    try {
                        const result = await syncService.claimAbandonedDuel(duelId);
                        if (result && result.success && result.resolved) {
                            setBattleLogs(prev => [...prev.slice(-3), `🏆 Opponent abandoned! You claim the victory!`]);
                            resolveMatchOutcome(result);
                        }
                    } catch (e) {
                        console.error("Failed to claim abandoned duel:", e);
                    }
                }, 5000);
            }
        } else {
            // Clears the timeout if they reconnect
            if (abandonTimeoutRef.current) {
                clearTimeout(abandonTimeoutRef.current);
                abandonTimeoutRef.current = null;
            }
        }

        return () => {
            if (abandonTimeoutRef.current) clearTimeout(abandonTimeoutRef.current);
        };
    }, [opponentProgress, duelResult, finishing, duelId]);

    // Handle user refreshing the page (fallback forfeit)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!duelResult && !finishing) {
                // Best effort synchronous attempt to forfeit
                try {
                    const timeSpentMs = 9999999;
                    const forfeitedAnswers = questions.map(q => ({
                        questionId: q.id || q.qid,
                        selected: "FORFEITED",
                        correct: q.answer,
                        isCorrect: false
                    }));
                    syncService.submitDuelParticipantResults(duelId, 0, timeSpentMs, forfeitedAnswers).catch(() => {});
                } catch (err) {}
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [duelResult, finishing, duelId, questions]);

    // Mascot sweating state when time is low
    useEffect(() => {
        if (!isAnswered && timeLeft <= 8 && !duelResult && !showRules && !loading) {
            setMascotState('sweating');
        } else if (mascotState === 'sweating' && (timeLeft > 8 || isAnswered || duelResult)) {
            setMascotState('idle');
        }
    }, [timeLeft, isAnswered, duelResult, showRules, loading]);

    // Question-timer loop
    useEffect(() => {
        if (loading || duelResult || isAnswered || showForfeitConfirm || showRules || duel?.status === 'accepted_terms') return;

        setTimeLeft(30);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                // Play warning tick sound for the last 5 seconds
                if (prev <= 6 && prev > 1) {
                    try { audioService.playSFX('tick'); } catch (e) {}
                }
                
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [currentIdx, loading, duelResult, isAnswered, showForfeitConfirm, showRules]);

    const handleTimeOut = () => {
        try { audioService.error(); } catch (e) {}
        setSelectedOpt("TIME_OUT");
        setIsAnswered(true);
        setMascotState('sad');
        setBattleLogs(prev => [
            ...prev.slice(-3),
            `⏳ Time ran out on Step ${currentIdx + 1}!`
        ]);

        const q = questions[currentIdx];
        const newAnswers = [...answers, {
            questionId: q.id || q.qid,
            selected: "TIME_OUT",
            correct: q.answer,
            isCorrect: false
        }];
        setAnswers(newAnswers);

        updatePresenceState(currentIdx + 1, score);

        setTimeout(() => {
            if (currentIdx + 1 < questions.length) {
                setCurrentIdx(prev => prev + 1);
                setSelectedOpt(null);
                setIsAnswered(false);
                setMascotState('idle');
            } else {
                handleFinishMatch(score, newAnswers);
            }
        }, 1500);
    };

    // Update Presence whenever our question state changes
    const updatePresenceState = async (nextIdx, finalScore, isFinished = false) => {
        if (presenceChannelRef.current) {
            try {
                await presenceChannelRef.current.track({
                    userId: user.id,
                    nickname: user.nickname || 'Student',
                    avatarUrl: user.avatarUrl,
                    questionIndex: nextIdx,
                    score: finalScore,
                    finished: isFinished
                });
            } catch (err) {
                console.warn("Failed to track presence:", err);
            }
        }
    };

    const handleSelectOption = (opt) => {
        if (isAnswered) return;
        try { audioService.tap(); } catch (e) {}
        setSelectedOpt(opt);
    };

    const handleConfirmAnswer = async () => {
        if (isAnswered || !selectedOpt) return;
        clearInterval(timerRef.current);
        
        const q = questions[currentIdx];
        const isCorrect = checkCorrect(selectedOpt, q.answer, q.options);
        const newScore = score + (isCorrect ? 1 : 0);
        
        if (isCorrect) {
            try { audioService.success(); } catch (e) {}
            setScore(newScore);
            setMascotState('happy');
            setBattleLogs(prev => [
                ...prev.slice(-3),
                `🗡️ You struck correctly on Step ${currentIdx + 1}!`
            ]);
        } else {
            try { audioService.error(); } catch (e) {}
            setMascotState('sad');
            setBattleLogs(prev => [
                ...prev.slice(-3),
                `🛡️ Your strike missed on Step ${currentIdx + 1}!`
            ]);
        }
        
        setIsAnswered(true);

        const newAnswers = [...answers, {
            questionId: q.id || q.qid,
            selected: selectedOpt,
            correct: q.answer,
            isCorrect
        }];
        setAnswers(newAnswers);

        // Track live presence update
        await updatePresenceState(currentIdx + 1, newScore);

        setTimeout(async () => {
            if (currentIdx + 1 < questions.length) {
                setCurrentIdx(prev => prev + 1);
                setSelectedOpt(null);
                setIsAnswered(false);
                setMascotState('idle');
            } else {
                await handleFinishMatch(newScore, newAnswers);
            }
        }, 1500);
    };

    const handleFinishMatch = async (finalScore, finalAnswers) => {
        setFinishing(true);
        const timeSpentMs = Date.now() - startTimeRef.current;
        await updatePresenceState(questions.length, finalScore, true);

        try {
            // Pre-flight check: Ensure Supabase has a valid online auth session
            const { data: sessionData } = await supabase.auth.getSession();
            let activeSession = sessionData?.session;

            if (!activeSession) {
                const { data: refreshData } = await supabase.auth.refreshSession();
                activeSession = refreshData?.session;
            }

            if (!activeSession) {
                setError("Online Session expired. Please log out and back in to submit results!");
                setFinishing(false);
                return;
            }

            const result = await syncService.submitDuelParticipantResults(
                duelId,
                finalScore,
                timeSpentMs,
                finalAnswers
            );
            
            if (result && result.success) {
                if (result.resolved) {
                    resolveMatchOutcome({ winner_id: result.winner_id, status: 'completed' });
                } else {
                    setDuelResult('waiting');
                }
            } else {
                setError(result?.message || 'Error resolving match.');
            }
        } catch (e) {
            setError(e.message || 'Error submitting results.');
        } finally {
            setFinishing(false);
        }
    };

    // Forfeit/Abandon Action
    const handleForfeit = async () => {
        setShowForfeitConfirm(false);
        setFinishing(true);
        const timeSpentMs = 9999999; // Set speed to worst case
        const forfeitedAnswers = questions.map(q => ({
            questionId: q.id || q.qid,
            selected: "FORFEITED",
            correct: q.answer,
            isCorrect: false
        }));

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            let activeSession = sessionData?.session;

            if (!activeSession) {
                const { data: refreshData } = await supabase.auth.refreshSession();
                activeSession = refreshData?.session;
            }

            if (!activeSession) {
                setError("Online Session expired. Failed to record forfeit safely.");
                setFinishing(false);
                return;
            }

            // Submitting score 0 enforces that the opponent wins and claims the stake
            const result = await syncService.submitDuelParticipantResults(
                duelId,
                0, // Score is 0 due to forfeit
                timeSpentMs,
                forfeitedAnswers
            );

            if (result && result.success) {
                resolveMatchOutcome({ winner_id: duel.challenger_id === user.id ? duel.challenged_id : duel.challenger_id, status: 'completed' });
            } else {
                navigate('/rankings');
            }
        } catch (e) {
            navigate('/rankings');
        } finally {
            setFinishing(false);
        }
    };

    const resolveMatchOutcome = (updatedDuel) => {
        const currencyKey = duel.wager_currency === 'coins' ? 'coins' : 'gem_overall';
        if (updatedDuel.winner_id === user.id) {
            setDuelResult('win');
            try { audioService.playSFX('victory'); } catch (e) {}
            if (currencyKey === 'coins') {
                dispatch(userSlice.actions.awardCoins(duel.gem_wager * 2));
            } else {
                dispatch(userSlice.actions.awardGems({ subject: 'overall', amount: duel.gem_wager * 2 }));
            }
            // 🏆 LEAGUE: +25 XP for winning a duel
            syncService.incrementWeeklyXp(25).catch(() => {});
        } else if (updatedDuel.winner_id === null) {
            setDuelResult('tie');
            try { audioService.playSFX('pop'); } catch (e) {}
            if (currencyKey === 'coins') {
                dispatch(userSlice.actions.awardCoins(duel.gem_wager));
            } else {
                dispatch(userSlice.actions.awardGems({ subject: 'overall', amount: duel.gem_wager }));
            }
            // 🏆 LEAGUE: +10 XP for a tie
            syncService.incrementWeeklyXp(10).catch(() => {});
        } else {
            setDuelResult('lose');
            try { audioService.playSFX('bass_drop'); } catch (e) {}
            // 🏆 LEAGUE: +10 XP for participating even in a loss
            syncService.incrementWeeklyXp(10).catch(() => {});
        }
    };


    const toggleRulesModal = (val) => {
        try { audioService.whoosh(); } catch (e) {}
        setShowRules(val);
    };

    const handleOpenChest = () => {
        if (chestShaking || chestOpened) return;
        setChestShaking(true);
        try { audioService.playSFX('drumroll'); } catch (e) {}
        setTimeout(() => {
            setChestShaking(false);
            setChestOpened(true);
            try { audioService.playSFX('coin-drop'); } catch (e) {}
        }, 1200);
    };

    const getMascotImage = () => {
        const sub = String(duel?.subject || '').toLowerCase();
        if (sub.includes('science')) return IMAGES.kiki_full || IMAGES.kiki_icon;
        if (sub.includes('math')) return IMAGES.manya_icon;
        if (sub.includes('sst') || sub.includes('social')) return IMAGES.zany_full || IMAGES.zany_icon;
        if (sub.includes('english')) return IMAGES.polly_full || IMAGES.polly_icon;
        return IMAGES.kiki_full || IMAGES.kiki_icon;
    };

    const getMascotMessage = () => {
        if (mascotState === 'sweating') return "Hurry! The timer is burning! ⏱️🔥";
        if (mascotState === 'happy') return "Magnificent strike! Hit them again! ⚔️";
        if (mascotState === 'sad') return "Oops, a miss. Steady your aim! 🛡️";
        return "Focus, hero! Victory is near!";
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#1c120c] text-white p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#c5a880] border-t-transparent mb-4" />
                <p className="font-bold text-[#c5a880] tracking-widest uppercase text-xs">Entering Realm Arena...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-[#1c120c] text-white p-6 text-center">
                <ShieldAlert size={64} className="text-rose-500 mb-4 animate-pulse" />
                <h2 className="text-2xl font-black mb-2 text-[#c5a880]">Arena Error</h2>
                <p className="opacity-70 mb-8">{error}</p>
                <button onClick={() => navigate('/rankings')} className="px-6 py-3 bg-[#4e342e] border-2 border-[#8d6e63] rounded-2xl font-bold flex items-center gap-2">
                    <ArrowLeft size={16} /> Leave Arena
                </button>
            </div>
        );
    }

    const currentQuestion = questions[currentIdx];
    const opponent = duel.challenger_id === user.id ? duel.challenged : duel.challenger;
    const opponentLockedIn = opponentProgress && (opponentProgress.questionIndex > currentIdx || opponentProgress.finished);

    return (
        <div className="medieval-arena flex flex-col h-screen text-white overflow-hidden relative">
            
            {/* Embedded Medieval Styles to force layout compliance and wow factor */}
            <style dangerouslySetInnerHTML={{__html: `
                .medieval-arena {
                    background: radial-gradient(circle at center, #2e1d0f 0%, #150a04 100%) !important;
                    position: relative;
                    font-family: 'Outfit', sans-serif;
                }
                .colosseum-stone-overlay {
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(rgba(0, 0, 0, 0.4) 30%, rgba(0, 0, 0, 0.85)), 
                                      repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px);
                    pointer-events: none;
                }
                .parchment-scroll {
                    background: #ebdcb9 !important;
                    background-image: radial-gradient(circle at center, #f4ecd8 0%, #ebdcb9 100%) !important;
                    border: 5px solid #8c6b45 !important;
                    outline: 3px solid #b49060;
                    border-radius: 16px !important;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5), inset 0 0 30px rgba(139, 90, 43, 0.25) !important;
                    color: #2e1d0f !important;
                    position: relative;
                }
                .wooden-plank {
                    background: linear-gradient(180deg, #3e2723 0%, #2a1510 100%) !important;
                    border: 3px solid #8d6e63 !important;
                    border-bottom: 7px solid #4e342e !important;
                    border-radius: 14px !important;
                    color: #ebdcb9 !important;
                    font-weight: 850 !important;
                    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
                    box-shadow: 0 5px 8px rgba(0,0,0,0.4) !important;
                    transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .wooden-plank:hover:not(:disabled) {
                    background: linear-gradient(180deg, #4e342e 0%, #3e2723 100%) !important;
                    border-color: #c5a880 !important;
                    transform: translateY(-2px);
                }
                .wooden-plank:active:not(:disabled) {
                    border-bottom-width: 3px !important;
                    transform: translateY(3px);
                }
                .wooden-plank.selected {
                    background: linear-gradient(180deg, #d97706 0%, #b45309 100%) !important;
                    border-color: #fbbf24 !important;
                    border-bottom-color: #78350f !important;
                    box-shadow: 0 0 15px rgba(245, 158, 11, 0.4) !important;
                }
                .wooden-plank.correct {
                    background: linear-gradient(180deg, #10b981 0%, #047857 100%) !important;
                    border-color: #34d399 !important;
                    border-bottom-color: #064e3b !important;
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4) !important;
                }
                .wooden-plank.wrong {
                    background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%) !important;
                    border-color: #f87171 !important;
                    border-bottom-color: #7f1d1d !important;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
                }
                .gilded-hud {
                    background: linear-gradient(180deg, #2a1c0d 0%, #1c1107 100%) !important;
                    border-bottom: 4px solid #c5a880 !important;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6) !important;
                }
                .glow-button {
                    background: linear-gradient(90deg, #f59e0b, #d97706) !important;
                    border: 2px solid #fbbf24 !important;
                    border-bottom: 5px solid #b45309 !important;
                    border-radius: 14px !important;
                    font-weight: 900 !important;
                    color: white !important;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                    box-shadow: 0 4px 10px rgba(217, 119, 6, 0.3) !important;
                    transition: all 0.1s ease;
                }
                .glow-button:active:not(:disabled) {
                    border-bottom-width: 2px !important;
                    transform: translateY(3px);
                }
                .torch-glow-1 {
                    position: absolute;
                    top: 10%; left: 5%;
                    width: 150px; height: 150px;
                    background: radial-gradient(circle, rgba(217, 119, 6, 0.12) 0%, transparent 70%);
                    pointer-events: none;
                    animation: flamePulse 3s infinite alternate;
                }
                .torch-glow-2 {
                    position: absolute;
                    top: 10%; right: 5%;
                    width: 150px; height: 150px;
                    background: radial-gradient(circle, rgba(217, 119, 6, 0.12) 0%, transparent 70%);
                    pointer-events: none;
                    animation: flamePulse 3s infinite alternate-reverse;
                }
                @keyframes flamePulse {
                    0% { transform: scale(0.9) opacity: 0.8; }
                    100% { transform: scale(1.1) opacity: 1.2; }
                }
                @keyframes pulseVignette {
                    0% { box-shadow: inset 0 0 40px rgba(239, 68, 68, 0.4); }
                    100% { box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.85); }
                }
                .combustion-vignette {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 50;
                    animation: pulseVignette 0.8s infinite alternate;
                }
                @keyframes burnFlame {
                    0% { box-shadow: 0 0 10px #ef4444, 0 0 20px #f97316; }
                    100% { box-shadow: 0 0 20px #ef4444, 0 0 40px #f97316; }
                }
                .timer-burning {
                    animation: burnFlame 0.4s infinite alternate;
                    border-color: #ef4444 !important;
                    color: #ef4444 !important;
                }
                @keyframes chestShake {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    20%, 60% { transform: rotate(-5deg) scale(1.05); }
                    40%, 80% { transform: rotate(5deg) scale(1.05); }
                }
                .chest-shaking {
                    animation: chestShake 0.2s infinite;
                }
                @keyframes chestBurst {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); filter: brightness(1.5); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .chest-burst {
                    animation: chestBurst 0.5s ease-out;
                }
                @keyframes bounceSlow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                .animate-bounce-slow {
                    animation: bounceSlow 3s infinite ease-in-out;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.15s infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}} />

            <div className="colosseum-stone-overlay" />
            <div className="torch-glow-1" />
            <div className="torch-glow-2" />

            {/* Combustion overlay for low time */}
            {!isAnswered && !duelResult && timeLeft <= 8 && duel?.status !== 'accepted_terms' && (
                <div className="combustion-vignette" />
            )}

            {/* WAITING FOR OPPONENT OVERLAY */}
            {duel?.status === 'accepted_terms' && (
                <div className="absolute inset-0 z-[99999] bg-[#1c120c]/95 flex flex-col items-center justify-center p-6 backdrop-blur-md">
                    <div className="relative w-20 h-20 bg-[#3e2723] rounded-full border-4 border-[#c5a880] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(197,168,128,0.3)]">
                        <Sword size={36} className="text-[#c5a880] animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-white text-center tracking-widest uppercase mb-3">
                        Waiting for Opponent
                    </h2>
                    <p className="text-[#ebdcb9] text-center text-sm font-medium mb-10 max-w-xs">
                        The challenge has been accepted! The duel will commence as soon as {opponent?.full_name || opponent?.nickname || 'they'} arrives...
                    </p>
                    <div className="flex gap-3 items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#c5a880] animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#c5a880] animate-bounce shadow-sm" style={{ animationDelay: '150ms' }} />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#c5a880] animate-bounce shadow-sm" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}

            {/* ── ARENA HUD — Compact single row ── */}
            <header className="gilded-hud px-3 py-2.5 grid grid-cols-3 items-center relative z-10 gap-2">

                {/* LEFT: Player */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-9 h-9 rounded-full border-2 border-amber-500 bg-[#3e2723] shadow-sm shrink-0">
                        <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname}`}
                            alt={user.nickname}
                            className="w-full h-full object-cover rounded-full"
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none truncate">YOU</div>
                        <div className="text-[13px] font-black text-[#ebdcb9] leading-none mt-0.5">
                            ★ {score}
                            <span className="text-[#a1887f] text-[10px] ml-1">/{questions.length}</span>
                        </div>
                    </div>
                </div>

                {/* CENTER: Pool + Timer merged pill */}
                <div className="flex flex-col items-center gap-1">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 text-[11px] font-black tracking-wide ${
                        !isAnswered && !duelResult && timeLeft <= 8
                            ? 'border-rose-500 bg-rose-950/60 text-rose-300 timer-burning'
                            : 'border-[#c5a880]/50 bg-[#1c1107] text-[#ebdcb9]'
                    }`}>
                        {!isAnswered && !duelResult ? (
                            <>
                                <Clock size={11} className={timeLeft <= 8 ? "text-rose-400" : "text-amber-400"} />
                                <span>{timeLeft}s</span>
                                <span className="text-[#a1887f] mx-0.5">·</span>
                            </>
                        ) : (
                            <span className="text-amber-400 mr-0.5">⚔️</span>
                        )}
                        {duel.wager_currency === 'coins' ? (
                            <span className="text-[11px] mr-0.5">🪙</span>
                        ) : (
                            <img src={getGem(duel.subject)} className="w-3 h-3" alt="gem" />
                        )}
                        <span>{duel.gem_wager * 2}</span>
                    </div>
                    <div className="text-[8px] font-black text-[#8d6e63] uppercase tracking-widest leading-none">
                        Q {currentIdx + 1}/{questions.length}
                    </div>
                </div>

                {/* RIGHT: Opponent */}
                <div className="flex items-center gap-2 justify-end min-w-0">
                    <div className="min-w-0 text-right">
                        <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none truncate">
                            {opponent?.full_name?.split(' ')[0] || 'FOE'}
                        </div>
                        <div className="text-[13px] font-black text-[#ebdcb9] leading-none mt-0.5">
                            {opponentProgress?.disconnected ? (
                                <span className="text-rose-400 text-[9px] animate-pulse flex items-center gap-0.5 justify-end">
                                    <AlertTriangle size={9} /> offline
                                </span>
                            ) : (
                                <>
                                    ★ {opponentProgress?.score ?? 0}
                                    <span className="text-[#a1887f] text-[10px] ml-1">/{questions.length}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="relative w-9 h-9 rounded-full border-2 border-amber-500 bg-[#3e2723] shadow-sm shrink-0">
                        <img
                            src={opponent?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent?.full_name || 'opponent'}`}
                            alt="opponent"
                            className="w-full h-full object-cover rounded-full"
                        />
                        {opponentLockedIn && (
                            <div className="absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center border-2 border-amber-400 animate-pulse">
                                <Sword size={10} className="text-amber-400" />
                                <span className="text-[6px] font-black text-amber-400">IN</span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ── MAIN DUEL PANEL ── */}
            <main className="flex-1 overflow-y-auto px-3 pt-3 pb-2 flex flex-col relative z-10">
                <AnimatePresence mode="wait">
                    {!duelResult ? (
                        <motion.div 
                            key={currentIdx}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="max-w-xl mx-auto w-full flex flex-col gap-3"
                        >
                            {/* Question box (Medieval Parchment scroll layout) */}
                            <div className="parchment-scroll px-4 py-3 text-center">
                                <span className="text-[9px] font-black text-[#8d6e63] uppercase tracking-widest block mb-1">
                                    ⚔️ STEP {currentIdx + 1}/{questions.length} ⚔️
                                </span>
                                <h2 className="text-base font-black text-[#2e1d0f] leading-snug">
                                    {currentQuestion?.question}
                                </h2>
                            </div>

                            {/* Option buttons (Carved Wood planks style) */}
                            <div className="flex flex-col gap-2">
                                {currentQuestion?.options?.map((opt, i) => {
                                    let btnStyle = "";
                                    
                                    if (selectedOpt === opt) {
                                        btnStyle = "selected";
                                    }
                                    
                                    if (isAnswered) {
                                        const isOptCorrect = checkCorrect(opt, currentQuestion.answer, currentQuestion.options);
                                        if (isOptCorrect) {
                                            btnStyle = "correct";
                                        } else if (selectedOpt === opt) {
                                            btnStyle = "wrong";
                                        } else {
                                            btnStyle = "opacity-30 border-transparent shadow-none";
                                        }
                                    }

                                    const isOptCorrect = checkCorrect(opt, currentQuestion.answer, currentQuestion.options);

                                    return (
                                        <button
                                            key={i}
                                            disabled={isAnswered}
                                            onClick={() => handleSelectOption(opt)}
                                            className={`wooden-plank w-full text-left px-4 py-3 border-2 flex justify-between items-center text-sm ${btnStyle}`}
                                        >
                                            <span>{opt}</span>
                                            {isAnswered && isOptCorrect && <CheckCircle2 size={18} className="text-white shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Action Confirmation Footer */}
                            {!isAnswered && (
                                <button
                                    onClick={handleConfirmAnswer}
                                    disabled={!selectedOpt}
                                    className="glow-button w-full py-3 transition-all disabled:opacity-40"
                                >
                                    STRIKE ANSWER
                                </button>
                            )}

                            {/* RPG Battle Log Ticker */}
                            <div className="w-full bg-stone-900/85 border border-[#8d6e63]/30 rounded-xl px-3 py-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                    <span className="text-[9px] font-black uppercase text-[#c5a880] tracking-widest">Battle Chronicle</span>
                                </div>
                                <div className="space-y-0.5 text-[11px] font-semibold text-stone-300">
                                    {battleLogs.slice(-2).map((log, idx) => (
                                        <div key={idx} className="animate-fadeIn truncate">{log}</div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4 w-full z-20">
                            {/* Medieval End Battle Outcome Cards - High-End Parchment Banner Scroll */}
                            <motion.div 
                                initial={{ scale: 0.9, y: 15, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                className="max-w-md mx-auto w-full parchment-scroll p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center relative overflow-hidden"
                            >
                                {/* Inner premium borders and gold corner ornaments */}
                            <div className="absolute inset-2 border-2 border-[#8c6b45] rounded-xl pointer-events-none opacity-40" />
                            <div className="absolute inset-3 border border-dashed border-[#8c6b45]/30 rounded-lg pointer-events-none" />
                            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-800" />
                            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-800" />
                            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-800" />
                            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-800" />

                            {duelResult === 'waiting' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    <div className="relative w-20 h-20 mb-6">
                                        <div className="absolute inset-0 rounded-full border-4 border-amber-800 border-t-transparent animate-spin" />
                                        <Sword size={36} className="text-amber-900 absolute inset-0 m-auto animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black text-amber-950 uppercase tracking-widest leading-none mb-2">HONOR GUARD</h3>
                                    <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#8c6b45] to-transparent mb-4" />
                                    <p className="text-amber-900 text-xs font-bold max-w-xs leading-relaxed mb-6">
                                        You finished with a score of <strong className="text-amber-950 font-black text-sm">{score}/{questions.length}</strong>. Waiting for your opponent to complete their challenge...
                                    </p>
                                    
                                    <button 
                                        onClick={() => navigate('/rankings')}
                                        className="relative w-full group"
                                    >
                                        <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                                        <div className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                                            bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                            border-2 border-[#e0c060] border-b-[#3e2200]
                                            shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                            active:translate-y-[2px] active:shadow-none transition-all duration-100
                                            group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                                            <span className="text-xs font-black text-amber-100 uppercase tracking-widest leading-none">RETURN TO TOWN HALL</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {duelResult === 'win' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    {/* Animated Victory Chest */}
                                    <div 
                                        className="cursor-pointer mb-6 transform hover:scale-105 transition-all duration-200"
                                        onClick={handleOpenChest}
                                    >
                                        {!chestOpened ? (
                                            <div className="flex flex-col items-center">
                                                <svg width="120" height="120" viewBox="0 0 100 100" className={chestShaking ? "chest-shaking" : "animate-bounce-slow"}>
                                                    <ellipse cx="50" cy="85" rx="35" ry="8" fill="rgba(0,0,0,0.2)" />
                                                    <rect x="20" y="45" width="60" height="35" rx="4" fill="#5c3818" stroke="#361f0a" strokeWidth="3" />
                                                    <line x1="35" y1="45" x2="35" y2="80" stroke="#361f0a" strokeWidth="2" />
                                                    <line x1="65" y1="45" x2="65" y2="80" stroke="#361f0a" strokeWidth="2" />
                                                    <path d="M 20 45 Q 20 18 50 18 Q 80 18 80 45 Z" fill="#784b24" stroke="#361f0a" strokeWidth="3" />
                                                    <path d="M 32 20 Q 34 19 35 45" stroke="#fbbf24" strokeWidth="3" fill="none" />
                                                    <path d="M 68 20 Q 66 19 65 45" stroke="#fbbf24" strokeWidth="3" fill="none" />
                                                    <rect x="18" y="45" width="6" height="37" fill="#c5a880" />
                                                    <rect x="76" y="45" width="6" height="37" fill="#c5a880" />
                                                    <rect x="44" y="40" width="12" height="18" rx="2" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
                                                    <circle cx="50" cy="49" r="2.5" fill="#361f0a" />
                                                    <line x1="50" y1="51.5" x2="50" y2="56" stroke="#361f0a" strokeWidth="1.5" />
                                                </svg>
                                                <span className="text-[10px] font-black text-amber-800 animate-pulse tracking-widest uppercase mt-2">TAP TO OPEN REWARD CHEST</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <svg width="130" height="130" viewBox="0 0 100 100" className="chest-burst">
                                                    <ellipse cx="50" cy="85" rx="40" ry="10" fill="rgba(0,0,0,0.3)" />
                                                    <circle cx="50" cy="45" r="30" fill="url(#gold-glow)" opacity="0.6" />
                                                    <defs>
                                                        <radialGradient id="gold-glow" cx="50%" cy="50%" r="50%">
                                                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                                                            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                                                        </radialGradient>
                                                    </defs>
                                                    <circle cx="42" cy="38" r="4" fill="#fbbf24" />
                                                    <circle cx="58" cy="35" r="5" fill="#f59e0b" />
                                                    <circle cx="50" cy="30" r="4.5" fill="#eab308" />
                                                    <polygon points="32,35 37,30 42,35 37,40" fill="#3b82f6" />
                                                    <polygon points="68,36 73,31 78,36 73,41" fill="#ec4899" />
                                                    <polygon points="50,22 55,17 60,22 55,27" fill="#10b981" />
                                                    <rect x="20" y="48" width="60" height="32" rx="4" fill="#5c3818" stroke="#361f0a" strokeWidth="3" />
                                                    <line x1="35" y1="48" x2="35" y2="80" stroke="#361f0a" strokeWidth="2" />
                                                    <line x1="65" y1="48" x2="65" y2="80" stroke="#361f0a" strokeWidth="2" />
                                                    <path d="M 20 48 Q 20 53 50 53 Q 80 53 80 48 Z" fill="#784b24" stroke="#361f0a" strokeWidth="2" />
                                                    <rect x="18" y="48" width="6" height="34" fill="#c5a880" />
                                                    <rect x="76" y="48" width="6" height="34" fill="#c5a880" />
                                                    <path d="M 15 28 Q 50 5 85 28" fill="none" stroke="#784b24" strokeWidth="6" strokeLinecap="round" />
                                                    <path d="M 15 28 Q 50 5 85 28" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                                <span className="text-[10px] font-black text-emerald-800 tracking-widest uppercase mt-2">CHEST UNLOCKED!</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-2xl font-black text-emerald-800 mb-1 tracking-wide uppercase">VICTORY IS YOURS!</h3>
                                    <p className="text-[#5d4037] text-xs font-bold mb-6 max-w-xs">
                                        You defeated the opponent and captured the entire {duel.wager_currency === 'coins' ? 'coin' : 'gem'} treasury.
                                    </p>
                                    
                                    {chestOpened && (
                                        <motion.div 
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="bg-[#d7ccc8]/45 border-2 border-[#8c6b45]/60 rounded-2xl px-6 py-4 flex items-center justify-center gap-2 mb-8 shadow-[inset_0_0_6px_rgba(0,0,0,0.1),0_2px_0_rgba(139,90,43,0.3)]"
                                        >
                                            <span className="text-2xl font-black text-amber-950">+ {duel.gem_wager * 2}</span>
                                            {duel.wager_currency === 'coins' ? (
                                                <img src={IMAGES.coin_gem} className="w-6 h-6" alt="coin" />
                                            ) : (
                                                <img src={getGem(duel.subject)} className="w-6 h-6" alt="gem" />
                                            )}
                                        </motion.div>
                                    )}
                                    
                                    <button 
                                        onClick={() => navigate('/rankings')} 
                                        disabled={!chestOpened}
                                        className="relative w-full group disabled:opacity-40"
                                    >
                                        <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                                        <div className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                                            bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                            border-2 border-[#e0c060] border-b-[#3e2200]
                                            shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                            active:translate-y-[2px] active:shadow-none transition-all duration-100
                                            group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                                            <span className="text-xs font-black text-amber-100 uppercase tracking-widest leading-none">RETURN TO TOWN HALL</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {duelResult === 'lose' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    <div className="w-16 h-16 bg-rose-950/20 border-2 border-rose-800 rounded-full flex items-center justify-center mb-6">
                                        <AlertTriangle size={32} className="text-rose-800 animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black text-rose-800 mb-1 tracking-wide uppercase">DEFEAT</h3>
                                    <p className="text-[#5d4037] text-xs font-bold mb-6 max-w-xs">
                                        You fell in combat. Train harder and strike again!
                                    </p>
                                    <div className="bg-[#d7ccc8]/45 border-2 border-[#8c6b45]/60 rounded-2xl px-6 py-4 flex items-center justify-center gap-2 mb-8 shadow-[inset_0_0_6px_rgba(0,0,0,0.1),0_2px_0_rgba(139,90,43,0.3)]">
                                        <span className="text-2xl font-black text-rose-950">- {duel.gem_wager}</span>
                                        {duel.wager_currency === 'coins' ? (
                                            <img src={IMAGES.coin_gem} className="w-6 h-6" alt="coin" />
                                        ) : (
                                            <img src={getGem(duel.subject)} className="w-6 h-6" alt="gem" />
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => navigate('/rankings')}
                                        className="relative w-full group"
                                    >
                                        <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                                        <div className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                                            bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                            border-2 border-[#e0c060] border-b-[#3e2200]
                                            shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                            active:translate-y-[2px] active:shadow-none transition-all duration-100
                                            group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                                            <span className="text-xs font-black text-amber-100 uppercase tracking-widest leading-none">RETURN TO TOWN HALL</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {duelResult === 'tie' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    <div className="w-16 h-16 bg-[#d7ccc8]/40 border-2 border-amber-800 rounded-full flex items-center justify-center mb-6">
                                        <Sparkles size={30} className="text-amber-900" />
                                    </div>
                                    <h3 className="text-2xl font-black text-amber-950 mb-1 tracking-wide uppercase">MUTUAL DRAW</h3>
                                    <p className="text-[#5d4037] text-xs font-bold mb-6 max-w-xs">
                                        Stakes were identical. Wager returned to your vault.
                                    </p>
                                    <div className="bg-[#d7ccc8]/45 border-2 border-[#8c6b45]/60 rounded-2xl px-6 py-4 flex items-center justify-center gap-2 mb-8 shadow-[inset_0_0_6px_rgba(0,0,0,0.1),0_2px_0_rgba(139,90,43,0.3)]">
                                        <span className="text-2xl font-black text-amber-950">+ {duel.gem_wager}</span>
                                        {duel.wager_currency === 'coins' ? (
                                            <img src={IMAGES.coin_gem} className="w-6 h-6" alt="coin" />
                                        ) : (
                                            <img src={getGem(duel.subject)} className="w-6 h-6" alt="gem" />
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => navigate('/rankings')}
                                        className="relative w-full group"
                                    >
                                        <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                                        <div className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                                            bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                            border-2 border-[#e0c060] border-b-[#3e2200]
                                            shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                            active:translate-y-[2px] active:shadow-none transition-all duration-100
                                            group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                                            <span className="text-xs font-black text-amber-100 uppercase tracking-widest leading-none">RETURN TO TOWN HALL</span>
                                        </div>
                                    </button>
                                </div>
                            )}
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>

            {/* ── Mascot Companion Widget ── */}
            {!duelResult && (
                <div className="absolute bottom-16 right-4 z-40 flex items-end gap-2 pointer-events-none">
                    <AnimatePresence>
                        <motion.div
                            key={mascotState}
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="bg-[#ebdcb9] border-2 border-[#8c6b45] text-[#2e1d0f] p-2.5 rounded-2xl rounded-br-none shadow-lg max-w-[150px] relative text-[10px] font-bold"
                        >
                            <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-[#ebdcb9] border-r-2 border-b-2 border-[#8c6b45] rotate-45" />
                            {getMascotMessage()}
                        </motion.div>
                    </AnimatePresence>
                    <div className="w-14 h-14 relative flex-shrink-0 animate-bounce-slow">
                        <img 
                            src={getMascotImage()} 
                            alt="Companion" 
                            className={`w-full h-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.5)) ${
                                mascotState === 'sweating' ? 'animate-shake' : 
                                mascotState === 'happy' ? 'animate-bounce' : 
                                mascotState === 'sad' ? 'opacity-75 grayscale-[20%]' : ''
                            }`}
                        />
                    </div>
                </div>
            )}

            {/* ── FORFEIT / RULES FOOTER ── */}
            {!duelResult && (
                <footer className="px-3 pb-3 pt-2 flex justify-center gap-3 z-10 border-t border-[#5d3a1a]/40 bg-gradient-to-b from-transparent to-[#1a0f08]/60">
                    {/* RETREAT button — blood-carved stone */}
                    <button
                        onClick={() => setShowForfeitConfirm(true)}
                        className="relative flex-1 group"
                        style={{ maxWidth: '160px' }}
                    >
                        {/* Stone slab backing */}
                        <div className="absolute inset-0 rounded-xl bg-[#5a1a1a] translate-y-[3px] border-b-2 border-[#3a0a0a]" />
                        <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                            bg-gradient-to-b from-[#8b2020] via-[#6b1515] to-[#5a1010]
                            border-2 border-[#a33030] border-b-[#5a1a1a]
                            shadow-[inset_0_1px_0_rgba(255,120,120,0.15),0_0_8px_rgba(180,30,30,0.3)]
                            active:translate-y-[2px] active:shadow-none transition-all duration-100
                            group-hover:from-[#9b2525] group-hover:via-[#7b1a1a] group-hover:to-[#641212]">
                            <LogOut size={13} className="text-rose-300 shrink-0" />
                            <span className="text-[11px] font-black text-rose-200 uppercase tracking-widest leading-none">Retreat</span>
                        </div>
                    </button>

                    {/* Ornamental divider */}
                    <div className="flex items-center">
                        <span className="text-[#8d6e63]/60 text-base font-black select-none">⚔</span>
                    </div>

                    {/* RULES button — parchment stone */}
                    <button
                        onClick={() => toggleRulesModal(true)}
                        className="relative flex-1 group"
                        style={{ maxWidth: '160px' }}
                    >
                        {/* Stone slab backing */}
                        <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                        <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                            bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                            border-2 border-[#e0c060] border-b-[#3e2200]
                            shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                            active:translate-y-[2px] active:shadow-none transition-all duration-100
                            group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                            <BookOpen size={13} className="text-amber-100 shrink-0" />
                            <span className="text-[11px] font-black text-amber-100 uppercase tracking-widest leading-none">Rules</span>
                        </div>
                    </button>
                </footer>
            )}

            {/* ── RULES OF ENGAGEMENT MODAL ── */}
            <AnimatePresence>
                {showRules && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/85 backdrop-blur-xs">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="parchment-scroll relative w-full max-w-[325px] p-6 text-center"
                        >
                            <div className="flex justify-center mb-3">
                                <ShieldCheck size={36} className="text-amber-800" />
                            </div>
                            <h3 className="text-lg font-black text-[#2e1d0f] uppercase tracking-tight mb-3">COVENANT RULES</h3>
                            
                            <div className="text-left text-xs text-[#5d4037] font-bold space-y-3.5 mb-6 leading-relaxed">
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">⚔️</span>
                                    <span>Each question has a strict <strong className="text-[#2e1d0f]">30s timer</strong> limit. Missing it defaults to an incorrect result.</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">⚔️</span>
                                    <span>Both heroes answer the <strong className="text-[#2e1d0f]">exact same set</strong> of questions in real-time.</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">⚔️</span>
                                    <span>In the case of a score tie, the player with the <strong className="text-[#2e1d0f]">fastest answer time</strong> wins.</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[#a73a15]">⚔️</span>
                                    <span>Retreating or leaving the match early results in <strong className="text-[#a73a15]">instant forfeiture</strong> of your gem stake to the opponent.</span>
                                </div>
                            </div>

                            <button
                                onClick={() => toggleRulesModal(false)}
                                className="glow-button w-full py-3 text-xs"
                            >
                                CLOSE SCROLL
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── FORFEIT CONFIRMATION MODAL ── */}
            <AnimatePresence>
                {showForfeitConfirm && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xs">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-[310px] bg-[#2a1c0d] border-4 border-[#c5a880] rounded-[2rem] p-6 shadow-2xl text-center"
                        >
                            <div className="absolute inset-2 border-2 border-dashed border-[#8d6e63]/40 rounded-[1.6rem] pointer-events-none" />
                            
                            <div className="w-16 h-16 bg-rose-500/10 border-2 border-rose-500/50 rounded-full flex items-center justify-center mb-4 mx-auto shadow-md">
                                <AlertTriangle size={32} className="text-rose-500 animate-pulse" />
                            </div>

                            <h3 className="text-lg font-black text-rose-400 uppercase tracking-tight mb-2">ABANDON DUEL?</h3>
                            <p className="text-[#d7ccc8] text-xs leading-relaxed mb-6">
                                If you retreat now, you will **forfeit this duel** and your opponent will claim the entire pool of gems.
                            </p>

                            <div className="flex gap-3">
                                 {/* STAY & FIGHT button — gold-carved stone */}
                                 <button
                                     onClick={() => setShowForfeitConfirm(false)}
                                     className="relative flex-1 group"
                                 >
                                     <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                                     <div className="relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
                                         bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                         border-2 border-[#e0c060] border-b-[#3e2200]
                                         shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                         active:translate-y-[2px] active:shadow-none transition-all duration-100
                                         group-hover:from-[#d4ae40] group-hover:via-[#b08a28] group-hover:to-[#967518]">
                                         <span className="text-[11px] font-black text-amber-100 uppercase tracking-widest leading-none">STAY & FIGHT</span>
                                     </div>
                                 </button>

                                 {/* RETREAT button — blood-carved stone */}
                                 <button
                                     onClick={handleForfeit}
                                     className="relative flex-1 group"
                                 >
                                     <div className="absolute inset-0 rounded-xl bg-[#5a1a1a] translate-y-[3px] border-b-2 border-[#3a0a0a]" />
                                     <div className="relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
                                         bg-gradient-to-b from-[#8b2020] via-[#6b1515] to-[#5a1010]
                                         border-2 border-[#a33030] border-b-[#5a1a1a]
                                         shadow-[inset_0_1px_0_rgba(255,120,120,0.15),0_0_8px_rgba(180,30,30,0.3)]
                                         active:translate-y-[2px] active:shadow-none transition-all duration-100
                                         group-hover:from-[#9b2525] group-hover:via-[#7b1a1a] group-hover:to-[#641212]">
                                         <span className="text-[11px] font-black text-rose-200 uppercase tracking-widest leading-none">RETREAT</span>
                                     </div>
                                 </button>
                             </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

