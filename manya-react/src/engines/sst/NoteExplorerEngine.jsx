import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, ChevronLeft, Sparkles, Star,
    Globe, MapPin, Lightbulb, GraduationCap,
    Compass, Flame, Telescope, Gem, Rocket,
    Zap, ArrowRight
} from 'lucide-react';
import { IMAGES } from '../../config/assetUrls';

/**
 * NOTE EXPLORER ENGINE — v3.5 (Storybook + Manya Mascot)
 * =======================================================
 * Rules:
 * 1. ONLY app CSS tokens (--bg-main, --text-main, etc.)
 * 2. Manya mascot from IMAGES.manya_icon (Supabase)
 * 3. No title duplication between header and content
 * 4. Large, readable typography with generous spacing
 * 5. Interactive, bouncy animations that feel alive
 */

const MANYA_ICON = IMAGES.manya_icon;

// ── THEME PALETTES ──────────────────────────────────────────────────────────
const THEMES = [
    { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#764ba2', pill: '#ede9fe', Icon: Globe },
    { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', accent: '#e11d48', pill: '#ffe4e6', Icon: Flame },
    { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', accent: '#0284c7', pill: '#e0f2fe', Icon: Compass },
    { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', accent: '#059669', pill: '#dcfce7', Icon: MapPin },
    { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', accent: '#e11d48', pill: '#fef3c7', Icon: Star },
    { gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', accent: '#7c3aed', pill: '#f3e8ff', Icon: Gem },
    { gradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', accent: '#c026d3', pill: '#fae8ff', Icon: Telescope },
    { gradient: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)', accent: '#6366f1', pill: '#eef2ff', Icon: Rocket },
];

const CHEERS = [
    "You're on fire! 🔥", "Brain boost! 🧠", "Superstar! ⭐",
    "Knowledge unlocked! 🔓", "Amazing! 🌟", "Keep going! 💪",
];

// ── FLATTEN ─────────────────────────────────────────────────────────────────
function flattenNotes(notes, parentTitle = '') {
    const cards = [];
    if (!notes || typeof notes !== 'object') return cards;
    for (const [key, value] of Object.entries(notes)) {
        if (['title', 'introduction', 'mode'].includes(key)) continue;
        const prettyTitle = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (typeof value === 'string') {
            cards.push({ type: 'fact', title: prettyTitle, content: value, section: parentTitle || prettyTitle });
        } else if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'string') {
                cards.push({ type: 'list', title: prettyTitle, items: value, section: parentTitle || prettyTitle });
            } else if (value.length > 0 && typeof value[0] === 'object') {
                cards.push({ type: 'object_list', title: prettyTitle, items: value, section: parentTitle || prettyTitle });
            }
        } else if (typeof value === 'object' && value !== null) {
            const childKeys = Object.keys(value);
            const allStrings = childKeys.every(k => typeof value[k] === 'string');
            if (allStrings) {
                cards.push({
                    type: 'key_value', title: prettyTitle,
                    pairs: Object.entries(value).map(([k, v]) => ({
                        label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: v
                    })),
                    section: parentTitle || prettyTitle
                });
            } else {
                cards.push(...flattenNotes(value, prettyTitle));
            }
        }
    }
    return cards;
}


// ── PROGRESS BAR ────────────────────────────────────────────────────────────
const ProgressTrack = ({ current, total, theme }) => {
    const pct = ((current + 1) / total) * 100;
    return (
        <div className="ne-progress-wrap">
            <div className="ne-progress-track">
                <motion.div
                    className="ne-progress-fill"
                    style={{ background: theme.gradient }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
                >
                    <div className="ne-progress-shimmer" />
                </motion.div>
            </div>
            <span className="ne-progress-label">{current + 1}/{total}</span>
        </div>
    );
};

// ── MANYA SPEECH BUBBLE ─────────────────────────────────────────────────────
const ManyaSpeech = ({ text, theme }) => (
    <div className="ne-manya-row">
        <motion.img
            src={MANYA_ICON}
            alt="Manya"
            className="ne-manya-img"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        />
        <div className="ne-speech-bubble">
            <p className="ne-speech-text">{text}</p>
            <div className="ne-speech-tail" />
        </div>
    </div>
);

// ── CARD RENDERERS ──────────────────────────────────────────────────────────

const IntroCard = ({ card, theme, totalCards }) => (
    <div className="ne-intro">
        <motion.img
            src={MANYA_ICON}
            alt="Manya"
            className="ne-intro-mascot"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0, y: [0, -8, 0] }}
            transition={{
                scale: { type: 'spring', bounce: 0.5 },
                y: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
            }}
        />
        <p className="ne-intro-desc">{card.content}</p>
        <div className="ne-intro-badge" style={{ backgroundColor: theme.pill, color: theme.accent }}>
            <Sparkles size={14} />
            <span>{totalCards - 1} knowledge cards ahead!</span>
        </div>
    </div>
);

const FactCard = ({ card, theme }) => (
    <div className="ne-fact">
        <motion.div
            className="ne-fact-icon"
            style={{ background: theme.gradient }}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
        >
            <Lightbulb size={26} color="white" />
        </motion.div>
        <motion.p
            className="ne-fact-text"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            dangerouslySetInnerHTML={{ __html: card.content }}
        />
    </div>
);

const ListCard = ({ card, theme }) => (
    <div className="ne-list">
        {card.items.map((item, i) => (
            <motion.div
                key={i}
                className="ne-list-item"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 140, damping: 18 }}
            >
                <div className="ne-list-marker" style={{ background: theme.gradient }}>
                    {i + 1}
                </div>
                <p className="ne-list-text" dangerouslySetInnerHTML={{ __html: item }} />
            </motion.div>
        ))}
    </div>
);

const ObjectListCard = ({ card, theme }) => (
    <div className="ne-obj-list">
        {card.items.map((item, i) => {
            const name = item.name || item.title || `Item ${i + 1}`;
            const entries = Object.entries(item).filter(([k]) => !['name', 'title'].includes(k));
            return (
                <motion.div
                    key={i}
                    className="ne-obj-card"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                >
                    <div className="ne-obj-header">
                        <div className="ne-obj-icon" style={{ background: theme.gradient }}>
                            <MapPin size={14} color="white" />
                        </div>
                        <h4 className="ne-obj-name">{name}</h4>
                    </div>
                    {entries.map(([k, v]) => (
                        <div key={k} className="ne-obj-row">
                            <span className="ne-obj-label">{k.replace(/_/g, ' ')}</span>
                            <span className="ne-obj-value">{String(v)}</span>
                        </div>
                    ))}
                </motion.div>
            );
        })}
    </div>
);

const KeyValueCard = ({ card, theme }) => (
    <div className="ne-kv">
        {card.pairs.map((pair, i) => (
            <motion.div
                key={i}
                className="ne-kv-item"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
            >
                <span className="ne-kv-label" style={{ color: theme.accent }}>{pair.label}</span>
                <p className="ne-kv-value" dangerouslySetInnerHTML={{ __html: pair.value }} />
            </motion.div>
        ))}
    </div>
);

// ── MAIN ENGINE ─────────────────────────────────────────────────────────────

const NoteExplorerEngine = ({ data, onComplete }) => {
    const notes = data?.study_notes || data;
    const [idx, setIdx] = useState(0);
    const [dir, setDir] = useState(1);
    const touchRef = useRef(null);

    const allCards = useMemo(() => {
        if (!notes) return [];
        const intro = {
            type: 'intro',
            title: notes.title || data?.subtopic || 'Knowledge Quest',
            content: notes.introduction || 'Let\'s discover something incredible!',
            section: 'Welcome'
        };
        return [intro, ...flattenNotes(notes)];
    }, [notes, data]);

    const theme = THEMES[idx % THEMES.length];
    const card = allCards[idx];
    const isLast = idx >= allCards.length - 1;

    const goNext = useCallback(() => {
        if (isLast) {
            onComplete?.({ success: true, score: 100, isCorrect: true, type: 'study' });
            return;
        }
        setDir(1);
        setIdx(i => i + 1);
        window.ManyaAudio?.click?.();
    }, [isLast, onComplete]);

    const goPrev = useCallback(() => {
        if (idx <= 0) return;
        setDir(-1);
        setIdx(i => i - 1);
        window.ManyaAudio?.whoosh?.();
    }, [idx]);

    const onTouchStart = (e) => { touchRef.current = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
        if (!touchRef.current) return;
        const diff = touchRef.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
        touchRef.current = null;
    };

    if (!notes || allCards.length === 0) {
        return <div className="ne-empty">No study notes found.</div>;
    }

    return (
        <div className="ne-root" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {/* ── HEADER ── */}
            <div className="ne-header" style={{ background: theme.gradient }}>
                <div className="ne-orb ne-orb-1" />
                <div className="ne-orb ne-orb-2" />
                <div className="ne-orb ne-orb-3" />

                <div className="ne-header-inner">
                    {/* Progress */}
                    <ProgressTrack current={idx} total={allCards.length} theme={theme} />

                    {/* Section tag */}
                    <div className="ne-section-row">
                        <motion.div
                            key={idx}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.5 }}
                            className="ne-section-icon"
                        >
                            <theme.Icon size={14} color="white" />
                        </motion.div>
                        <span className="ne-section-text">
                            {card.type === 'intro' ? 'Welcome' : card.section}
                        </span>
                    </div>

                    {/* Title — full, no truncation */}
                    <h2 className="ne-title">{card.title}</h2>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="ne-content">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={idx}
                        className="ne-content-inner"
                        initial={{ opacity: 0, x: dir * 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: dir * -50 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 180 }}
                    >
                        {card.type === 'intro' && <IntroCard card={card} theme={theme} totalCards={allCards.length} />}
                        {card.type === 'fact' && <FactCard card={card} theme={theme} />}
                        {card.type === 'list' && <ListCard card={card} theme={theme} />}
                        {card.type === 'object_list' && <ObjectListCard card={card} theme={theme} />}
                        {card.type === 'key_value' && <KeyValueCard card={card} theme={theme} />}

                        {/* Manya encouragement every 3 cards */}
                        {idx > 0 && idx % 3 === 0 && (
                            <ManyaSpeech text={CHEERS[idx % CHEERS.length]} theme={theme} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── FOOTER ── */}
            <div className="ne-footer">
                <AnimatePresence>
                    {idx > 0 && (
                        <motion.button
                            className="ne-btn-back"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 56, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ type: 'spring', bounce: 0 }}
                            onClick={goPrev}
                        >
                            <ChevronLeft size={22} />
                        </motion.button>
                    )}
                </AnimatePresence>
                <motion.button
                    className="ne-btn-next"
                    style={{ background: theme.gradient }}
                    whileTap={{ scale: 0.96 }}
                    onClick={goNext}
                >
                    {isLast ? (
                        <>FINISH <GraduationCap size={20} /></>
                    ) : (
                        <>NEXT <ChevronRight size={20} /></>
                    )}
                </motion.button>
            </div>

            {/* ── STYLES ── */}
            <style>{`
                /* ─── ROOT ─── */
                .ne-root {
                    display: flex; flex-direction: column;
                    height: 100%; width: 100%;
                    background: var(--bg-main);
                    color: var(--text-main);
                    font-family: var(--font-main, 'Plus Jakarta Sans', system-ui, sans-serif);
                    overflow: hidden; position: relative;
                    -webkit-user-select: none; user-select: none;
                }
                .ne-empty {
                    display: flex; align-items: center; justify-content: center;
                    height: 100%; color: var(--text-muted); font-weight: 800; font-size: 15px;
                }

                /* ─── HEADER ─── */
                .ne-header {
                    position: relative; flex-shrink: 0;
                    padding: 18px 22px 24px;
                    border-radius: 0 0 var(--radius-xl, 32px) var(--radius-xl, 32px);
                    overflow: hidden; z-index: 5;
                    box-shadow: 0 12px 40px -12px rgba(0,0,0,0.25);
                }
                .ne-header-inner { position: relative; z-index: 2; }

                .ne-orb {
                    position: absolute; border-radius: 50%;
                    background: rgba(255,255,255,0.08);
                }
                .ne-orb-1 { width: 140px; height: 140px; top: -40px; right: -30px; filter: blur(30px); }
                .ne-orb-2 { width: 90px; height: 90px; bottom: -20px; left: 10%; filter: blur(20px); }
                .ne-orb-3 { width: 60px; height: 60px; top: 50%; left: 60%; filter: blur(15px); background: rgba(255,255,255,0.05); }

                /* ─── PROGRESS BAR ─── */
                .ne-progress-wrap {
                    display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
                }
                .ne-progress-track {
                    flex: 1; height: 6px; border-radius: 100px;
                    background: rgba(255,255,255,0.18); overflow: hidden;
                }
                .ne-progress-fill {
                    height: 100%; border-radius: 100px;
                    position: relative; overflow: hidden;
                }
                .ne-progress-shimmer {
                    position: absolute; inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
                    animation: ne-shimmer 2s infinite linear;
                }
                @keyframes ne-shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                .ne-progress-label {
                    font-size: 11px; font-weight: 900; color: rgba(255,255,255,0.7);
                    font-variant-numeric: tabular-nums;
                }

                /* ─── SECTION TAG ─── */
                .ne-section-row {
                    display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
                }
                .ne-section-icon {
                    width: 26px; height: 26px; border-radius: 9px;
                    background: rgba(255,255,255,0.18);
                    display: flex; align-items: center; justify-content: center;
                }
                .ne-section-text {
                    font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.6);
                    text-transform: uppercase; letter-spacing: 0.15em;
                }

                /* ─── TITLE ─── */
                .ne-title {
                    font-size: 18px; font-weight: 900; color: white;
                    line-height: 1.3; margin: 0;
                    display: -webkit-box; -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical; overflow: hidden;
                }

                /* ─── CONTENT ─── */
                .ne-content {
                    flex: 1; overflow-y: auto; overflow-x: hidden;
                    padding: 20px 20px 8px;
                    -webkit-overflow-scrolling: touch;
                }
                .ne-content::-webkit-scrollbar { width: 3px; }
                .ne-content::-webkit-scrollbar-track { background: transparent; }
                .ne-content::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }

                /* ─── INTRO ─── */
                .ne-intro {
                    text-align: center; padding: 8px 0;
                    display: flex; flex-direction: column; align-items: center;
                }
                .ne-intro-mascot {
                    width: 100px; height: 100px; object-fit: contain;
                    margin-bottom: 20px;
                    filter: drop-shadow(0 8px 20px rgba(124, 58, 237, 0.25));
                }
                .ne-intro-desc {
                    font-size: 15px; font-weight: 600; line-height: 1.65;
                    color: var(--text-sub); max-width: 320px; margin: 0 0 20px;
                }
                .ne-intro-badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 10px 18px; border-radius: 100px;
                    font-size: 12px; font-weight: 800;
                }

                /* ─── MANYA SPEECH ─── */
                .ne-manya-row {
                    display: flex; align-items: flex-end; gap: 10px;
                    margin-top: 20px; padding: 0 4px;
                }
                .ne-manya-img {
                    width: 44px; height: 44px; object-fit: contain; flex-shrink: 0;
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
                }
                .ne-speech-bubble {
                    position: relative;
                    padding: 10px 16px; border-radius: 16px 16px 16px 4px;
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                }
                .ne-speech-text {
                    font-size: 12px; font-weight: 800; color: var(--text-main); margin: 0;
                }

                /* ─── FACT ─── */
                .ne-fact {
                    display: flex; flex-direction: column; align-items: center;
                    text-align: center; padding: 28px 4px;
                    min-height: 200px; justify-content: center;
                }
                .ne-fact-icon {
                    width: 60px; height: 60px; border-radius: 18px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 28px -6px rgba(0,0,0,0.25);
                }
                .ne-fact-text {
                    font-size: 16px; font-weight: 700; line-height: 1.65;
                    color: var(--text-main); margin: 0;
                }
                .ne-fact-text b { font-weight: 900; }

                /* ─── LIST ─── */
                .ne-list { display: flex; flex-direction: column; gap: 10px; }
                .ne-list-item {
                    display: flex; gap: 12px; align-items: flex-start;
                    padding: 14px; border-radius: var(--radius-md, 16px);
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                }
                .ne-list-marker {
                    width: 26px; height: 26px; border-radius: 9px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    color: white; font-weight: 900; font-size: 11px;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.12);
                    margin-top: 1px;
                }
                .ne-list-text {
                    font-size: 13.5px; font-weight: 600; line-height: 1.55;
                    color: var(--text-main); margin: 0;
                }
                .ne-list-text b { font-weight: 900; }

                /* ─── OBJECT LIST ─── */
                .ne-obj-list { display: flex; flex-direction: column; gap: 12px; }
                .ne-obj-card {
                    padding: 16px; border-radius: var(--radius-md, 16px);
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                }
                .ne-obj-header {
                    display: flex; gap: 10px; align-items: center; margin-bottom: 10px;
                }
                .ne-obj-icon {
                    width: 26px; height: 26px; border-radius: 9px;
                    display: flex; align-items: center; justify-content: center;
                }
                .ne-obj-name {
                    font-size: 14px; font-weight: 900; color: var(--text-main); margin: 0;
                }
                .ne-obj-row {
                    display: flex; gap: 8px; margin-bottom: 5px;
                    font-size: 12px; line-height: 1.4;
                }
                .ne-obj-label {
                    font-weight: 800; color: var(--text-muted);
                    text-transform: uppercase; letter-spacing: 0.04em;
                    min-width: 65px; flex-shrink: 0;
                }
                .ne-obj-value { font-weight: 600; color: var(--text-main); }

                /* ─── KEY VALUE ─── */
                .ne-kv { display: flex; flex-direction: column; gap: 10px; }
                .ne-kv-item {
                    padding: 14px 16px; border-radius: var(--radius-md, 16px);
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                }
                .ne-kv-label {
                    font-size: 10px; font-weight: 900;
                    text-transform: uppercase; letter-spacing: 0.12em;
                    display: block; margin-bottom: 4px;
                }
                .ne-kv-value {
                    font-size: 14px; font-weight: 700; line-height: 1.55;
                    color: var(--text-main); margin: 0;
                }
                .ne-kv-value b { font-weight: 900; }

                /* ─── FOOTER ─── */
                .ne-footer {
                    display: flex; gap: 10px; padding: 12px 20px 28px;
                    flex-shrink: 0;
                    background: linear-gradient(to top, var(--bg-main) 70%, transparent);
                }
                .ne-btn-back {
                    height: 54px; border-radius: var(--radius-md, 16px);
                    background: var(--bg-card);
                    border: 1.5px solid var(--border-color);
                    display: flex; align-items: center; justify-content: center;
                    color: var(--text-main); cursor: pointer;
                    flex-shrink: 0; overflow: hidden;
                }
                .ne-btn-next {
                    flex: 1; height: 54px; border-radius: var(--radius-md, 16px);
                    border: none;
                    color: white; font-weight: 900; font-size: 14px;
                    letter-spacing: 0.08em; text-transform: uppercase;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    cursor: pointer;
                    box-shadow: 0 6px 20px -4px rgba(0,0,0,0.2);
                }

            `}</style>
        </div>
    );
};

export default NoteExplorerEngine;
