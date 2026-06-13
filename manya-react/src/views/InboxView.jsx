/**
 * InboxView — Manya Message Center
 * ==================================
 * Full-page dedicated inbox matching Preferences / Profile view patterns.
 * Uses design-tokens.css variables for full dark/light theme support.
 *
 * Shows:
 *   - Pending duel invitations (real student names, wager, subject, meet time)
 *   - System / Manya Management announcements
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    Sword,
    Bell,
    Inbox,
    AlertCircle,
    Megaphone,
    Clock,
    Sparkles,
    Trash2,
    X,
    ChevronDown
} from 'lucide-react';
import { supabase } from '../backend/remote/supabaseClient';
import { syncService } from '../infrastructure/sync/syncService.js';
import { updateBalanceThunk } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { getGem } from '../config/assetUrls';
import '../styles/inbox.css';

const SUBJECTS = [
    { id: 'all', label: 'Overall', gem: getGem('master'), color: 'var(--manya-purple)' },
    { id: 'math', label: 'Math', gem: getGem('math'), color: 'var(--subject-math)' },
    { id: 'science', label: 'Sci', gem: getGem('science'), color: 'var(--subject-science)' },
    { id: 'sst', label: 'SST', gem: getGem('sst'), color: 'var(--subject-sst)' },
    { id: 'english', label: 'Eng', gem: getGem('english'), color: 'var(--subject-english)' }
];

/* ── Hardcoded system announcements from Manya Management ── */
const SYSTEM_MESSAGES = [
    {
        id: 'sys-welcome',
        type: 'system',
        sender: 'Manya Team',
        title: 'Welcome to Shield Duels!',
        body: 'Challenge your peers from the Rankings page. Wager gems or coins, pick a subject, and battle in real-time quiz duels. Good luck, champion!',
        created_at: new Date('2026-06-01T09:00:00').toISOString()
    },
    {
        id: 'sys-update-v2',
        type: 'system',
        sender: 'Manya Management',
        title: 'Offline Invitations are Live!',
        body: 'You can now challenge students who are offline. Choose a meeting hour in Ugandan time (EAT) and they will see your invitation when they come online.',
        created_at: new Date('2026-06-08T07:00:00').toISOString()
    }
];

const TABS = [
    { id: 'all',     label: 'All',    icon: Inbox },
    { id: 'duels',   label: 'Duels',  icon: Sword },
    { id: 'system',  label: 'System', icon: Megaphone }
];

/** Format a timestamp to a relative human-readable string */
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.max(0, now - then);
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' });
}

export default function InboxView() {
    const user        = useSelector(s => s.user.data);
    const onlineUsers = useSelector(s => s.user.onlineUsers || []);
    const dispatch    = useDispatch();
    const navigate    = useNavigate();

    const [tab, setTab]                         = useState('all');
    const [invites, setInvites]                 = useState([]);
    const [loading, setLoading]                 = useState(true);
    const [error, setError]                     = useState('');
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [bargainingInvite, setBargainingInvite] = useState(null);

    // Track dismissed system messages
    const [dismissedSys, setDismissedSys]       = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('manya_dismissed_sys') || '[]');
        } catch { return []; }
    });

    // ── Fetch pending duel invitations & ready handshakes ──────────────────────
    const fetchInvites = useCallback(async () => {
        if (!user?.id || !supabase) return;
        setLoading(true);
        try {
            const { data, error: fetchErr } = await supabase
                .from('quiz_duels')
                .select('*, challenger:challenger_id(full_name, avatar_url), challenged:challenged_id(full_name, avatar_url)')
                .or(`and(challenged_id.eq.${user.id},status.eq.pending),and(challenger_id.eq.${user.id},status.eq.accepted_terms)`)
                .order('created_at', { ascending: false });

            if (fetchErr) {
                console.error('[Inbox] Supabase fetch error:', fetchErr);
            }
            if (data) {
                setInvites(data);
            }
        } catch (err) {
            console.error('[Inbox] Error fetching invites:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => { fetchInvites(); }, [fetchInvites]);

    // ── Realtime subscription for live updates ──────────────
    useEffect(() => {
        if (!user?.id || !supabase) return;

        const channel = supabase.channel(`inbox-rt:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'quiz_duels'
                },
                async (payload) => {
                    const isRelevantNew = payload.new && (
                        (payload.new.challenged_id === user.id && payload.new.status === 'pending') ||
                        (payload.new.challenger_id === user.id && payload.new.status === 'accepted_terms')
                    );
                    
                    if (payload.eventType === 'INSERT' && isRelevantNew) {
                        try {
                            const { data: profile } = await supabase
                                .from('profiles')
                                .select('full_name, avatar_url')
                                .eq('id', payload.new.challenger_id === user.id ? payload.new.challenged_id : payload.new.challenger_id)
                                .single();
                            
                            const enriched = { 
                                ...payload.new, 
                                challenger: payload.new.challenger_id === user.id ? user : profile,
                                challenged: payload.new.challenged_id === user.id ? user : profile
                            };
                            
                            setInvites(prev => {
                                if (prev.some(d => d.id === payload.new.id)) return prev;
                                return [enriched, ...prev];
                            });
                        } catch (e) {
                            console.error('[Inbox] Error enriching new invite:', e);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        if (isRelevantNew) {
                            // Enforce re-fetch or manual update
                            fetchInvites();
                        } else {
                            // If it's no longer relevant (e.g. accepted or completed), remove it
                            setInvites(prev => prev.filter(d => d.id !== payload.new.id));
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setInvites(prev => prev.filter(d => d.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id, fetchInvites]);

    // ── Accept a duel ───────────────────────────────────────
    const handleAccept = async (invite) => {
        setActionLoadingId(invite.id);
        setError('');

        const isPending = invite.status === 'pending';
        const isAcceptedTerms = invite.status === 'accepted_terms';

        if (isPending) {
            // I am the challenged, accepting the terms
            const wager    = invite.gem_wager || 0;
            const currency = invite.wager_currency || 'gems';

            if (currency === 'coins') {
                if ((user.coins || 0) < wager) {
                    setError(`You need at least ${wager} Coins to accept this duel.`);
                    setActionLoadingId(null);
                    return;
                }
            } else {
                if ((user.diamonds || 0) < wager) {
                    setError(`You need at least ${wager} Gems to accept this duel.`);
                    setActionLoadingId(null);
                    return;
                }
            }

            try {
                const response = await syncService.acceptQuizDuel(invite.id);
                if (response?.success) {
                    dispatch(updateBalanceThunk({
                        currency: currency === 'coins' ? 'coins' : 'gem_overall',
                        amount: -wager,
                        type: 'DUEL_ESCROW_OUT',
                        contextId: invite.id
                    }));
                    dispatch(addToast({
                        message: 'Challenge accepted! Waiting for the opponent to start the match.',
                        type: 'success'
                    }));
                    // Do NOT navigate yet. Remove from local list since it's no longer pending for us
                    setInvites(prev => prev.filter(d => d.id !== invite.id));
                } else {
                    setError(response?.message || 'Failed to accept challenge.');
                }
            } catch (e) {
                setError(e.message || 'An error occurred.');
            } finally {
                setActionLoadingId(null);
            }
        } else if (isAcceptedTerms) {
            // I am the original challenger, finalizing the match start
            try {
                const response = await syncService.readyQuizDuel(invite.id);
                if (response?.success) {
                    // Start the duel and pull us in
                    navigate(`/duel/${invite.id}`);
                } else {
                    setError(response?.message || 'Failed to start the match.');
                }
            } catch (e) {
                setError(e.message || 'An error occurred.');
            } finally {
                setActionLoadingId(null);
            }
        }
    };

    // ── Counter Propose / Bargain ───────────────────────────
    const handleCounterPropose = async (oldInvite, newSubject, newCurrency, newWager, newTime, message, numQs = 5) => {
        setActionLoadingId(oldInvite.id);
        setError('');
        try {
            // Check balance for new wager
            if (typeof newWager !== 'number' || newWager <= 0 || isNaN(newWager)) {
                setError('Please enter a valid wager amount greater than 0.');
                setActionLoadingId(null);
                return;
            }

            if (newCurrency === 'coins') {
                if ((user.coins || 0) < newWager) {
                    setError(`You need at least ${newWager} Coins to send this proposal.`);
                    setActionLoadingId(null);
                    return;
                }
            } else {
                if ((user.diamonds || 0) < newWager) {
                    setError(`You need at least ${newWager} Gems to send this proposal.`);
                    setActionLoadingId(null);
                    return;
                }
            }

            // 1. Decline old invite
            await syncService.declineOrExpireDuel(oldInvite.id);
            setInvites(prev => prev.filter(d => d.id !== oldInvite.id));
            
            // 2. Fetch random MCQ questions — multi-subject if 'all'
            let rawQuestions = [];
            let qErr = null;

            if (newSubject === 'all') {
                const subKeys = ['MATH', 'SCIENCE', 'ENGLISH', 'SST'];
                const results = await Promise.all(
                    subKeys.map(sub =>
                        supabase.from('manya_vault').select('*')
                            .eq('subject', sub).eq('item_type', "MCQ's")
                            .limit(Math.max(15, numQs))
                    )
                );
                results.forEach(res => {
                    if (res.error) qErr = res.error;
                    if (res.data) rawQuestions.push(...res.data);
                });
            } else {
                const { data, error } = await supabase.from('manya_vault').select('*')
                    .eq('subject', newSubject.toUpperCase())
                    .eq('item_type', "MCQ's")
                    .limit(Math.max(45, numQs * 3));
                rawQuestions = data;
                qErr = error;
            }

            if (qErr || !rawQuestions || rawQuestions.length === 0) {
                throw new Error('Failed to find quiz questions for this subject.');
            }

            // Shuffle and choose the requested number of questions
            const shuffled = [...rawQuestions].sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffled.slice(0, numQs).map(q => {
                const rawOptions = q.options || [q.option_a, q.option_b, q.option_c, q.option_d];
                const cleanOptions = (Array.isArray(rawOptions) ? rawOptions : Object.values(rawOptions || {}))
                    .filter(opt => opt && opt !== 'null' && opt !== '');
                const finalOptions = cleanOptions.length > 0 ? cleanOptions : ["A", "B", "C", "D"];
                
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
            
            // 3. Create new counter-invite (challenged_id = old challenger)
            const response = await syncService.createQuizDuel(
                oldInvite.challenger_id,
                newWager,
                newSubject,
                selectedQuestions,
                newCurrency,
                message
            );
            
            if (response && response.success) {
                dispatch(addToast({
                    message: 'Counter proposal sent!',
                    type: 'success'
                }));
            }
            setBargainingInvite(null);
        } catch (e) {
            setError(e.message || 'Failed to send counter proposal.');
        } finally {
            setActionLoadingId(null);
        }
    };


    // ── Decline a duel ──────────────────────────────────────
    const handleDecline = async (duelId) => {
        setActionLoadingId(duelId);
        setError('');
        try {
            await syncService.declineOrExpireDuel(duelId);
            setInvites(prev => prev.filter(d => d.id !== duelId));
        } catch (e) {
            setError('Failed to decline duel.');
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Delete / dismiss a duel invitation ──────────────────
    const handleDeleteDuel = async (duelId) => {
        setActionLoadingId(duelId);
        setError('');
        try {
            await syncService.declineOrExpireDuel(duelId);
            setInvites(prev => prev.filter(d => d.id !== duelId));
        } catch (e) {
            setError('Failed to delete invitation.');
        } finally {
            setActionLoadingId(null);
        }
    };

    // ── Dismiss a system message ────────────────────────────
    const handleDismissSystem = (msgId) => {
        const next = [...dismissedSys, msgId];
        setDismissedSys(next);
        try {
            localStorage.setItem('manya_dismissed_sys', JSON.stringify(next));
        } catch { /* ignore */ }
    };

    // ── Build combined message list ─────────────────────────
    const duelMessages = invites.map(inv => ({
        ...inv,
        type: 'duel',
        sortDate: inv.created_at
    }));

    const systemMessages = SYSTEM_MESSAGES
        .filter(m => !dismissedSys.includes(m.id))
        .map(m => ({ ...m, sortDate: m.created_at }));

    let filteredMessages;
    if (tab === 'duels') {
        filteredMessages = duelMessages;
    } else if (tab === 'system') {
        filteredMessages = systemMessages;
    } else {
        filteredMessages = [...duelMessages, ...systemMessages].sort(
            (a, b) => new Date(b.sortDate) - new Date(a.sortDate)
        );
    }

    const totalCount = duelMessages.length + systemMessages.length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inbox-view"
        >
            {/* ── STICKY HEADER (same as Preferences) ────────── */}
            <header className="inbox-header-bar">
                <button className="inbox-back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={22} strokeWidth={3} />
                </button>

                <div className="inbox-header-center">
                    <span className="inbox-breadcrumb">Message Center</span>
                    <h1 className="inbox-title">Inbox</h1>
                </div>

                {totalCount > 0 ? (
                    <div className="inbox-header-badge">{totalCount}</div>
                ) : (
                    <div className="inbox-header-spacer" />
                )}
            </header>

            {/* ── TAB ROW (pill buttons) ─────────────────────── */}
            <div className="inbox-tab-row">
                {TABS.map(t => {
                    const Icon = t.icon;
                    let count = 0;
                    if (t.id === 'all')    count = totalCount;
                    if (t.id === 'duels')  count = duelMessages.length;
                    if (t.id === 'system') count = systemMessages.length;
                    return (
                        <button
                            key={t.id}
                            className={`inbox-tab ${tab === t.id ? 'active' : ''}`}
                            onClick={() => setTab(t.id)}
                        >
                            <Icon size={12} />
                            {t.label}
                            {count > 0 && (
                                <span className="inbox-tab-count">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── ERROR BANNER ────────────────────────────────── */}
            {error && (
                <div className="inbox-error-bar">
                    <AlertCircle size={14} />
                    <span style={{ flex: 1 }}>{error}</span>
                    <button
                        onClick={() => setError('')}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── MESSAGE LIST ────────────────────────────────── */}
            <div className="inbox-card-list">
                {loading && filteredMessages.length === 0 ? (
                    <div className="inbox-empty-state">
                        <div className="inbox-empty-icon-box">
                            <Bell size={28} />
                        </div>
                        <h4>Loading messages…</h4>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className="inbox-empty-state">
                        <div className="inbox-empty-icon-box">
                            <span style={{ fontSize: '38px', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}>📜</span>
                        </div>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--text-primary)' }}>Your Inbox is Empty</h4>
                        <p>
                            {tab === 'duels'
                                ? 'When another student challenges you to a duel, it will appear here.'
                                : tab === 'system'
                                ? 'Announcements from the Manya team will show up here.'
                                : 'Challenge peers from the Rankings page or check back for updates!'}
                        </p>
                    </div>
                ) : (
                    filteredMessages.map(msg => (
                        msg.type === 'duel'
                            ? <DuelCard
                                key={msg.id}
                                invite={msg}
                                onlineUsers={onlineUsers}
                                onAccept={handleAccept}
                                onDecline={handleDecline}
                                onBargain={setBargainingInvite}
                                onDelete={handleDeleteDuel}
                                actionLoadingId={actionLoadingId}
                              />
                            : <SystemCard
                                key={msg.id}
                                message={msg}
                                onDismiss={handleDismissSystem}
                              />
                    ))
                )}
            </div>



            {/* ── BARGAINING MODAL OVERLAY ── */}
            <AnimatePresence>
                {bargainingInvite && (
                    <CounterProposeModal
                        invite={bargainingInvite}
                        user={user}
                        onCancel={() => setBargainingInvite(null)}
                        onSubmit={handleCounterPropose}
                        sending={actionLoadingId === bargainingInvite.id}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   DUEL INVITE CARD
   ════════════════════════════════════════════════════════════ */
function DuelCard({ invite, onlineUsers, onAccept, onDecline, onBargain, onDelete, actionLoadingId }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const user = useSelector(state => state.user.data);

    const isChallenger = invite.challenger_id === user?.id;
    const opponent = isChallenger ? invite.challenged : invite.challenger;
    const opponentName = opponent?.full_name || 'Unknown Student';
    const avatarUrl = opponent?.avatar_url
        || `https://api.dicebear.com/7.x/avataaars/svg?seed=${opponentName}`;
    const isOnline = onlineUsers.includes(isChallenger ? invite.challenged_id : invite.challenger_id);
    const wager    = invite.gem_wager || 0;
    const currency = invite.wager_currency || 'gems';
    const subject  = invite.subject || 'general';
    const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);
    const isLoading = actionLoadingId === invite.id;

    return (
        <div className={`inbox-card is-duel ${isExpanded ? 'expanded' : ''}`}>
            <div className="inbox-card-accent" />

            {/* Delete button */}
            <button
                className="inbox-delete-btn"
                title="Delete invitation"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(invite.id);
                }}
                disabled={actionLoadingId !== null}
            >
                <Trash2 size={13} />
            </button>

            {/* Top row (clickable to expand) */}
            <div 
                className="inbox-card-row" 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer' }}
            >
                <div className="inbox-avatar-box">
                    <img src={avatarUrl} alt={opponentName} />
                </div>
                <div className="inbox-card-meta">
                    <div className="inbox-sender-name">
                        {opponentName}
                        {isOnline && <span className="inbox-online-dot" title="Online now" />}
                    </div>
                    <div className="inbox-card-subtitle">
                        {invite.status === 'accepted_terms' 
                            ? `⚔️ Accepted ${subjectLabel} Challenge` 
                            : `⚔️ ${subjectLabel} Duel Challenge`}
                    </div>
                </div>
                <div className="inbox-card-timestamp" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {timeAgo(invite.created_at)}
                    <ChevronDown 
                        size={14} 
                        style={{ 
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }} 
                    />
                </div>
            </div>

            {/* Expandable Body */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        {/* Details chips */}
                        <div className="inbox-chips" style={{ paddingTop: '12px' }}>
                            {invite.message && (
                                <div className="w-full bg-[#3e2723]/30 border border-[#b49060]/30 rounded-xl p-3 mb-2">
                                    <div className="text-[9px] font-black text-[#b49060] uppercase tracking-wider mb-1 flex items-center gap-1">
                                        ✉️ Message from {opponentName}
                                    </div>
                                    <div className="text-sm font-medium text-[#ebdcb9] italic">
                                        "{invite.message}"
                                    </div>
                                </div>
                            )}
                            <div className="inbox-chip">
                                <span className="inbox-chip-label">Subject</span>
                                <img src={getGem(subject)} alt={subject} />
                                <span className="inbox-chip-value">{subjectLabel}</span>
                            </div>
                            <div className="inbox-chip">
                                <span className="inbox-chip-label">Stakes</span>
                                {currency !== 'coins' && <img src={getGem(subject)} alt="gem" />}
                                <span className="inbox-chip-value is-stakes">
                                    {wager} {currency === 'coins' ? 'Coins' : 'Gems'}
                                </span>
                            </div>
                            {invite.questions?.length > 0 && (
                                <div className="inbox-chip">
                                    <span className="inbox-chip-label">🎯 Questions</span>
                                    <span className="inbox-chip-value">{invite.questions.length} Qs</span>
                                </div>
                            )}
                            {invite.proposed_meet_time && (
                                <div className="inbox-chip">
                                    <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                                    <span className="inbox-chip-label">Meet</span>
                                    <span className="inbox-chip-value is-time">{invite.proposed_meet_time}</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="inbox-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                            {invite.status === 'accepted_terms' ? (
                                <>
                                    <button
                                        className="inbox-btn btn-decline"
                                        disabled={actionLoadingId !== null}
                                        onClick={(e) => { e.stopPropagation(); onDecline(invite.id); }}
                                        style={{ flex: 1 }}
                                    >
                                        <X size={12} />
                                        {isLoading ? '...' : 'Cancel'}
                                    </button>
                                    <button
                                        className="inbox-btn btn-accept"
                                        disabled={actionLoadingId !== null}
                                        onClick={(e) => { e.stopPropagation(); onAccept(invite); }}
                                        style={{ flex: 2 }}
                                    >
                                        <Sword size={12} />
                                        {isLoading ? '...' : 'Start Match'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="inbox-btn btn-decline"
                                        disabled={actionLoadingId !== null}
                                        onClick={(e) => { e.stopPropagation(); onDecline(invite.id); }}
                                        style={{ flex: 1 }}
                                    >
                                        <X size={12} />
                                        {isLoading ? '...' : 'Decline'}
                                    </button>
                                    <button
                                        className="inbox-btn"
                                        disabled={actionLoadingId !== null}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onBargain({
                                                ...invite,
                                                proposed_wager: wager || 5,
                                                proposed_currency: currency || 'gems',
                                                proposed_subject: subject || 'general',
                                                proposed_meet_time: invite.proposed_meet_time || '4:00 PM EAT'
                                            });
                                        }}
                                        style={{ flex: 1, backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                                    >
                                        <Clock size={12} />
                                        Counter
                                    </button>
                                    <button
                                        className="inbox-btn btn-accept"
                                        disabled={actionLoadingId !== null}
                                        onClick={(e) => { e.stopPropagation(); onAccept(invite); }}
                                        style={{ flex: 1 }}
                                    >
                                        <Sword size={12} />
                                        {isLoading ? '...' : 'Accept'}
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   COUNTER PROPOSE MODAL (BARGAINING)
   ════════════════════════════════════════════════════════════ */
function CounterProposeModal({ invite, user, onCancel, onSubmit, sending }) {
    const challengerName = invite.challenger?.full_name || 'Student';
    const myCoins = user?.coins || 0;

    const [wagerCurrency, setWagerCurrency] = useState(invite.proposed_currency || 'gems');
    const [wagerAmount, setWagerAmount] = useState(invite.proposed_wager || 5);
    const [challengeSub, setChallengeSub] = useState(invite.proposed_subject || 'math');
    const [proposedTime, setProposedTime] = useState(invite.proposed_meet_time || '4:00 PM EAT');
    const [message, setMessage] = useState('');
    const [numQuestions, setNumQuestions] = useState(
        invite.questions?.length && [5, 10, 15].includes(invite.questions.length)
            ? invite.questions.length
            : 5
    );

    const getSubjectGems = (subject) => {
        switch (subject) {
            case 'math': return user?.mathGems || 0;
            case 'science': return user?.scienceGems || 0;
            case 'english': return user?.englishGems || 0;
            case 'sst': return user?.sstGems || 0;
            default: return user?.diamonds || 0;
        }
    };
    const myGems = getSubjectGems(challengeSub);

    const cantAfford = wagerCurrency === 'gems' ? myGems < wagerAmount : myCoins < wagerAmount;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-[320px] bg-[#2a1c0d] border-4 border-[#c5a880] rounded-[2rem] p-5 shadow-2xl text-center"
            >
                <div className="absolute inset-2 border-2 border-dashed border-[#8d6e63]/40 rounded-[1.6rem] pointer-events-none" />
                
                <div className="relative py-2 text-left z-10">
                    <div className="text-center mb-3">
                        <span className="text-[10px] font-black text-[#c5a880] uppercase tracking-widest flex items-center justify-center gap-1">
                            <Clock size={10} /> OFFLINE OPPONENT
                        </span>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight mt-0.5">
                            COUNTER-PROPOSE
                        </h3>
                        <p className="text-[9px] font-bold text-[#ebdcb9] mt-1 opacity-80 leading-tight">
                            {challengerName} is offline. Adjust stakes or propose a new time.
                        </p>
                    </div>

                    <div className="bg-[#ebdcb9] border-2 border-[#b49060] rounded-2xl p-4 flex flex-col gap-4 mb-4 shadow-[0_4px_0_#1a0f08]">
                        
                        {/* Currency toggle */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase">🪙 WAGER CURRENCY</span>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setWagerCurrency('gems'); setWagerAmount(5); }}
                                    className={`py-2 px-2 rounded-xl border-2 text-[10px] font-black transition-all flex items-center gap-1 justify-center ${
                                        wagerCurrency === 'gems'
                                            ? 'border-amber-600 bg-amber-600/15 text-amber-800'
                                            : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#5d4037]'
                                    }`}
                                >
                                    <img src={getGem(challengeSub)} className="w-3 h-3" alt="gem" />
                                    Gems
                                    <span className="ml-auto text-[8px] opacity-60">{myGems}</span>
                                </button>
                                <button
                                    onClick={() => { setWagerCurrency('coins'); setWagerAmount(50); }}
                                    className={`py-2 px-2 rounded-xl border-2 text-[10px] font-black transition-all flex items-center gap-1 justify-center ${
                                        wagerCurrency === 'coins'
                                            ? 'border-yellow-500 bg-yellow-500/15 text-yellow-800'
                                            : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#5d4037]'
                                    }`}
                                >
                                    🪙 Coins
                                    <span className="ml-auto text-[8px] opacity-60">{myCoins}</span>
                                </button>
                            </div>
                        </div>

                        {/* Amount selector */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase">
                                {wagerCurrency === 'gems' ? '💎 PLEDGE GEMS' : '🪙 PLEDGE COINS'}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="number"
                                        min="1"
                                        max={wagerCurrency === 'gems' ? myGems : myCoins}
                                        value={wagerAmount === '' ? '' : wagerAmount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (isNaN(val)) setWagerAmount('');
                                            else setWagerAmount(val);
                                        }}
                                        className="w-full py-2 pl-9 pr-3 rounded-xl border-2 border-[#b49060]/60 bg-[#d7ccc8]/30 text-[#3e2723] font-black text-sm focus:outline-none focus:border-amber-600 focus:bg-[#ebdcb9] transition-all"
                                        placeholder="Amount..."
                                    />
                                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {wagerCurrency === 'gems'
                                            ? <img src={getGem(challengeSub)} className="w-4 h-4 opacity-90" alt="gem" />
                                            : <span className="text-[14px] leading-none opacity-90">🪙</span>
                                        }
                                    </div>
                                </div>
                                <button
                                    onClick={() => setWagerAmount(wagerCurrency === 'gems' ? myGems : myCoins)}
                                    className="py-2 px-4 rounded-xl bg-[#3e2723] text-[#ebdcb9] font-black text-xs hover:bg-[#4e342e] active:scale-95 transition-all shadow-[0_2px_0_#1a0f08] border border-[#5d4037]"
                                >
                                    MAX
                                </button>
                            </div>
                            {cantAfford && (
                                <div className="flex items-center gap-1.5 p-2 bg-red-950/40 border border-red-500/40 rounded-lg text-red-500 text-[9px] font-bold mt-1">
                                    <AlertCircle size={10} className="shrink-0" />
                                    Not enough {wagerCurrency}! Need {wagerAmount}, have {wagerCurrency === 'gems' ? myGems : myCoins}.
                                </div>
                            )}
                        </div>

                        {/* Question Count selector */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase">🎯 DUEL LENGTH</span>
                            <div className="grid grid-cols-3 gap-2">
                                {[5, 10, 15].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setNumQuestions(n)}
                                        className={`py-2 px-2 rounded-xl border-2 text-[11px] font-black transition-all flex flex-col items-center gap-0.5 ${numQuestions === n ? 'border-[#3e2723] bg-[#3e2723] text-white' : 'border-[#b49060]/40 bg-[#d7ccc8]/25 text-[#3e2723]'}`}
                                    >
                                        <span className="text-base leading-none">{n}</span>
                                        <span className="text-[8px] font-bold opacity-70">Qs</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Proposed Meeting Time */}
                        <div className="flex flex-col gap-1.5 border-t border-[#b49060]/30 pt-3 mt-1 text-left">
                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase flex items-center gap-1">
                                ⏰ PROPOSE MEETING HOUR (EAT)
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
                        </div>

                        {/* Optional Message */}
                        <div className="flex flex-col gap-1.5 border-t border-[#b49060]/30 pt-3 mt-1 text-left">
                            <span className="text-[8px] font-black text-[#5d4037] tracking-wider uppercase flex items-center gap-1">
                                ✉️ ADD A MESSAGE (OPTIONAL)
                            </span>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="E.g., Let's see who is better at Math!"
                                maxLength={60}
                                className="w-full bg-[#ebdcb9] border-2 border-[#b49060] rounded-xl px-3 py-2 text-xs font-black text-[#2e1d0f] shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] outline-none focus:border-[#3e2723] resize-none h-16"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {/* CANCEL */}
                        <button
                            disabled={sending}
                            onClick={onCancel}
                            className="relative flex-1 group disabled:opacity-50"
                        >
                            <div className="absolute inset-0 rounded-xl bg-[#5a1a1a] translate-y-[3px] border-b-2 border-[#3a0a0a]" />
                            <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                bg-gradient-to-b from-[#8b2020] via-[#6b1515] to-[#5a1010]
                                border-2 border-[#a33030] border-b-[#5a1a1a]
                                shadow-[inset_0_1px_0_rgba(255,120,120,0.15),0_0_8px_rgba(180,30,30,0.3)]
                                active:translate-y-[2px] active:shadow-none transition-all duration-100">
                                <span className="text-[11px] font-black text-rose-200 uppercase tracking-widest leading-none">Cancel</span>
                            </div>
                        </button>

                        {/* SEND OFFER */}
                        <button
                            disabled={sending || cantAfford}
                            onClick={() => onSubmit(invite, challengeSub, wagerCurrency, wagerAmount, proposedTime, message, numQuestions)}
                            className="relative flex-[1.5] group disabled:opacity-40"
                        >
                            <div className="absolute inset-0 rounded-xl bg-[#3e2200] translate-y-[3px] border-b-2 border-[#1a0f00]" />
                            <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                bg-gradient-to-b from-[#c5a036] via-[#a07d20] to-[#8a6a10]
                                border-2 border-[#e0c060] border-b-[#3e2200]
                                shadow-[inset_0_1px_0_rgba(255,230,100,0.25),0_0_10px_rgba(197,160,54,0.25)]
                                active:translate-y-[2px] active:shadow-none transition-all duration-100">
                                <Sword size={13} className="text-amber-100 shrink-0" />
                                <span className="text-[11px] font-black text-amber-100 uppercase tracking-widest leading-none">
                                    {sending ? 'SENDING...' : 'SEND OFFER'}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   SYSTEM / MANYA MANAGEMENT MESSAGE CARD
   ════════════════════════════════════════════════════════════ */
function SystemCard({ message, onDismiss }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`inbox-card is-system ${isExpanded ? 'expanded' : ''}`}>
            <div className="inbox-card-accent" />

            {/* Dismiss button */}
            <button
                className="inbox-delete-btn"
                title="Dismiss"
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(message.id);
                }}
            >
                <X size={13} />
            </button>

            <div 
                className="inbox-card-row"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer' }}
            >
                <div className="inbox-avatar-box is-system-icon">
                    <Sparkles size={20} />
                </div>
                <div className="inbox-card-meta">
                    <div className="inbox-sender-name">
                        {message.sender}
                    </div>
                    <div className="inbox-card-subtitle">
                        📢 {message.title}
                    </div>
                </div>
                <div className="inbox-card-timestamp" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {timeAgo(message.created_at)}
                    <ChevronDown 
                        size={14} 
                        style={{ 
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s ease'
                        }} 
                    />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="inbox-system-body" style={{ marginTop: '12px' }}>
                            {message.body}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
