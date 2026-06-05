import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Trophy, Zap, Clock, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, ArrowLeft, LogOut, BookOpen, ShieldCheck, Play } from 'lucide-react';
import { supabase } from '../backend/remote/supabaseClient';
import { syncService } from '../backend/sync/syncService';
import { updateBalanceThunk } from '../store/userSlice';
import { getGem } from '../config/assetUrls';
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

    // Question-timer loop
    useEffect(() => {
        if (loading || duelResult || isAnswered || showForfeitConfirm || showRules) return;

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
        } else {
            try { audioService.error(); } catch (e) {}
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
        if (updatedDuel.winner_id === user.id) {
            setDuelResult('win');
            try { audioService.playSFX('victory'); } catch (e) {}
            dispatch(updateBalanceThunk({
                currency: 'gem_overall',
                amount: duel.gem_wager * 2,
                type: 'DUEL_WIN',
                contextId: duelId
            }));
        } else if (updatedDuel.winner_id === null) {
            setDuelResult('tie');
            try { audioService.playSFX('pop'); } catch (e) {}
            dispatch(updateBalanceThunk({
                currency: 'gem_overall',
                amount: duel.gem_wager,
                type: 'DUEL_REFUND',
                contextId: duelId
            }));
        } else {
            setDuelResult('lose');
            try { audioService.playSFX('bass_drop'); } catch (e) {}
        }
    };

    const toggleRulesModal = (val) => {
        try { audioService.whoosh(); } catch (e) {}
        setShowRules(val);
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
            `}} />

            <div className="colosseum-stone-overlay" />
            <div className="torch-glow-1" />
            <div className="torch-glow-2" />

            {/* ── MEDIEVAL WAR BOARD HUD ── */}
            <header className="gilded-hud p-4 flex justify-between items-center relative z-10">
                {/* User HUD */}
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full border-2 border-[#c5a880] overflow-hidden bg-[#3e2723] shadow-md shrink-0">
                        <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname}`} alt={user.nickname} />
                    </div>
                    <div>
                        <div className="text-[9px] font-black text-[#c5a880] uppercase tracking-wider">YOU (HERO)</div>
                        <div className="text-sm font-black flex items-center gap-1.5 leading-none mt-0.5">
                            <span className="text-[#ebdcb9]">Score: {score}</span>
                            <span className="text-[#a1887f]">({currentIdx + 1}/{questions.length})</span>
                        </div>
                    </div>
                </div>

                {/* Match Info & Timer & Rules Trigger */}
                <div className="flex flex-col items-center">
                    <div className="px-3 py-1 bg-[#ebdcb9] border-2 border-[#b49060] rounded-full flex items-center gap-1.5 text-[#3e2723] font-black text-xs shadow-[0_2px_0_#1a0f08]">
                        <Sword size={12} className="text-[#3e2723]" />
                        <span>POOL: {duel.gem_wager * 2}</span>
                        <img src={getGem(duel.subject)} className="w-4 h-4" alt="gem" />
                    </div>
                    
                    {/* Timer & Rules Link */}
                    <div className="flex items-center gap-3 mt-2">
                        {!isAnswered && !duelResult && (
                            <div className="flex items-center gap-1 text-xs font-black tracking-widest text-[#ebdcb9]">
                                <Clock size={12} className={timeLeft <= 8 ? "text-rose-500 animate-pulse" : "text-[#c5a880]"} />
                                <span className={timeLeft <= 8 ? "text-rose-500" : ""}>{timeLeft}s</span>
                            </div>
                        )}
                        <button 
                            onClick={() => toggleRulesModal(true)}
                            className="text-[9px] font-black uppercase text-[#c5a880] border border-[#c5a880]/30 hover:border-[#c5a880] rounded px-1.5 py-0.5 flex items-center gap-0.5 transition-all"
                        >
                            <BookOpen size={9} />
                            Rules
                        </button>
                    </div>
                </div>

                {/* Opponent HUD */}
                <div className="flex items-center gap-2.5 text-right">
                    <div>
                        <div className="text-[9px] font-black text-[#c5a880] uppercase tracking-wider">{opponent?.full_name || 'Opponent'}</div>
                        <div className="text-sm font-black flex items-center gap-1.5 justify-end leading-none mt-0.5">
                            {opponentProgress?.disconnected ? (
                                <span className="text-rose-500 text-[9px] font-black animate-pulse flex items-center gap-1"><AlertTriangle size={10} /> DISCONNECTED</span>
                            ) : (
                                <>
                                    <span className="text-[#ebdcb9]">Score: {opponentProgress?.score ?? 0}</span>
                                    <span className="text-[#a1887f]">({(opponentProgress?.questionIndex ?? 0)}/{questions.length})</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-[#c5a880] overflow-hidden bg-[#3e2723] shadow-md shrink-0">
                        <img src={opponent?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponent?.full_name || 'opponent'}`} alt="opponent" />
                    </div>
                </div>
            </header>

            {/* ── MAIN DUEL PANEL ── */}
            <main className="flex-1 overflow-y-auto p-5 flex flex-col justify-center relative z-10">
                <AnimatePresence mode="wait">
                    {!duelResult ? (
                        <motion.div 
                            key={currentIdx}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="max-w-xl mx-auto w-full flex flex-col gap-6"
                        >
                            {/* Question box (Medieval Parchment scroll layout) */}
                            <div className="parchment-scroll p-6 text-center">
                                <span className="text-[9px] font-black text-[#8d6e63] uppercase tracking-widest block mb-2">
                                    ⚔️ COVENANT STEP {currentIdx + 1} OF {questions.length} ⚔️
                                </span>
                                <h2 className="text-lg font-black text-[#2e1d0f] leading-relaxed mt-2">
                                    {currentQuestion?.question}
                                </h2>
                            </div>

                            {/* Option buttons (Carved Wood planks style) */}
                            <div className="flex flex-col gap-3">
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
                                            className={`wooden-plank w-full text-left p-4.5 border-2 flex justify-between items-center text-sm ${btnStyle}`}
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
                                    className="glow-button w-full py-4.5 transition-all disabled:opacity-40"
                                >
                                    STRIKE ANSWER
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        /* Medieval End Battle Outcome Cards */
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="max-w-md mx-auto w-full bg-[#2a1c0d] border-4 border-[#c5a880] rounded-[2.5rem] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.8)] text-center relative overflow-hidden"
                        >
                            <div className="absolute inset-2 border border-dashed border-[#8d6e63]/30 rounded-[2.1rem] pointer-events-none" />

                            {duelResult === 'waiting' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    <div className="relative w-20 h-20 mb-6">
                                        <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                                        <Sword size={36} className="text-[#c5a880] absolute inset-0 m-auto animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-black mb-2 text-white uppercase tracking-tight">HONOR GUARD</h3>
                                    <p className="text-[#d7ccc8] text-xs max-w-xs leading-relaxed">
                                        You finished with a score of <strong className="text-white font-black">{score}/{questions.length}</strong>. Waiting for your opponent to complete their challenge...
                                    </p>
                                </div>
                            )}

                            {duelResult === 'win' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    <div className="w-16 h-16 bg-emerald-500/20 border-2 border-[#c5a880] rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(197,168,128,0.3)] animate-bounce">
                                        <Trophy size={32} className="text-yellow-400" />
                                    </div>
                                    <h3 className="text-2xl font-black text-emerald-400 mb-1 tracking-wide uppercase">VICTORY IS YOURS!</h3>
                                    <p className="text-[#d7ccc8] text-xs mb-6 max-w-xs">
                                        You defeated the opponent and captured the entire gem treasury.
                                    </p>
                                    <div className="bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl px-6 py-4 flex items-center justify-center gap-2 mb-8 shadow-[inset_0_0_6px_rgba(0,0,0,0.2),0_3px_0_#1a0f08]">
                                        <span className="text-2xl font-black text-[#2e1d0f]">+ {duel.gem_wager * 2}</span>
                                        <img src={getGem(duel.subject)} className="w-6 h-6" alt="gem" />
                                    </div>
                                    <button onClick={() => navigate('/rankings')} className="glow-button w-full py-3.5">
                                        RETURN TO TOWN HALL
                                    </button>
                                </div>
                            )}

                            {duelResult === 'lose' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    <div className="w-16 h-16 bg-rose-500/20 border-2 border-[#c5a880] rounded-full flex items-center justify-center mb-6">
                                        <AlertTriangle size={32} className="text-rose-400 animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black text-rose-400 mb-1 tracking-wide uppercase">DEFEAT</h3>
                                    <p className="text-[#d7ccc8] text-xs mb-6 max-w-xs">
                                        You fell in combat. Train harder and strike again!
                                    </p>
                                    <div className="bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl px-6 py-4 flex items-center justify-center gap-2 mb-8 shadow-[inset_0_0_6px_rgba(0,0,0,0.2),0_3px_0_#1a0f08]">
                                        <span className="text-2xl font-black text-[#2e1d0f]">- {duel.gem_wager}</span>
                                        <img src={getGem(duel.subject)} className="w-6 h-6" alt="gem" />
                                    </div>
                                    <button onClick={() => navigate('/rankings')} className="w-full py-3.5 bg-[#4e342e] hover:bg-[#3e2723] text-[#ebdcb9] border-2 border-[#8d6e63] font-black rounded-xl active:translate-y-0.5 transition-all text-xs">
                                        RETURN TO TOWN HALL
                                    </button>
                                </div>
                            )}

                            {duelResult === 'tie' && (
                                <div className="flex flex-col items-center py-4 relative z-10">
                                    <div className="w-16 h-16 bg-[#3e2723] border-2 border-[#c5a880] rounded-full flex items-center justify-center mb-6">
                                        <Sparkles size={30} className="text-[#c5a880]" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-1 tracking-wide uppercase">MUTUAL DRAW</h3>
                                    <p className="text-[#d7ccc8] text-xs mb-6 max-w-xs">
                                        Stakes were identical. Wager returned to your vault.
                                    </p>
                                    <div className="bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl px-6 py-4 flex items-center justify-center gap-2 mb-8 shadow-[inset_0_0_6px_rgba(0,0,0,0.2),0_3px_0_#1a0f08]">
                                        <span className="text-2xl font-black text-[#2e1d0f]">+ {duel.gem_wager}</span>
                                        <img src={getGem(duel.subject)} className="w-6 h-6" alt="gem" />
                                    </div>
                                    <button onClick={() => navigate('/rankings')} className="glow-button w-full py-3.5">
                                        RETURN TO TOWN HALL
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* ── FORFEIT / ABANDON RETREAT BUTTON ── */}
            {!duelResult && (
                <footer className="p-4 bg-[#2a1c0d]/30 flex justify-center z-10 border-t border-[#8d6e63]/20">
                    <button 
                        onClick={() => setShowForfeitConfirm(true)}
                        className="py-2.5 px-6 border-2 border-rose-900 bg-rose-950/40 text-rose-300 hover:bg-rose-950/70 font-black rounded-xl text-xs tracking-wider transition-all flex items-center gap-1.5"
                    >
                        <LogOut size={12} />
                        RETREAT & SURRENDER
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
                                <button
                                    onClick={() => setShowForfeitConfirm(false)}
                                    className="flex-1 py-3 bg-[#4e342e] text-[#d7ccc8] border-2 border-[#8d6e63] font-black rounded-xl active:translate-y-0.5 transition-all text-xs"
                                >
                                    STAY & FIGHT
                                </button>
                                <button
                                    onClick={handleForfeit}
                                    className="flex-1 py-3 bg-[#4e342e] hover:bg-rose-950 hover:text-rose-200 text-[#d7ccc8] border-2 border-rose-900 font-black rounded-xl active:translate-y-0.5 transition-all text-xs"
                                >
                                    RETREAT
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

