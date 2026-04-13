// NOTE: This file is a copy of the existing NoteExplorerEngine after cleanup.
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, ChevronLeft, Sparkles, Star,
    Globe, MapPin, Lightbulb, GraduationCap,
    Compass, Flame, Telescope, Gem, Rocket,
    Zap, ArrowRight
} from 'lucide-react';
import { IMAGES } from '../../config/assetUrls';
import '../../styles/note-explorer.css';

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
            const childEntries = Object.entries(value);
            
            // SMART CONSOLIDATION (v4.0)
            // If the object is a "Rich Detail" (mix of strings and maybe ONE list), don't recurse.
            const hasNestedObjects = childEntries.some(([_, v]) => typeof v === 'object' && !Array.isArray(v));
            const listCount = childEntries.filter(([_, v]) => Array.isArray(v)).length;
            
            if (!hasNestedObjects && listCount <= 1 && childEntries.length <= 6) {
                // Treat as a single consolidated card
                const description = childEntries.find(([_, v]) => typeof v === 'string' && !['title', 'name'].includes(_))?.[1] || '';
                const list = childEntries.find(([_, v]) => Array.isArray(v))?.[1] || [];
                const otherPairs = childEntries.filter(([k, v]) => typeof v === 'string' && v !== description).map(([k, v]) => ({
                    label: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    value: v
                }));

                cards.push({
                    type: 'rich_detail',
                    title: prettyTitle,
                    description,
                    list,
                    pairs: otherPairs,
                    section: parentTitle || prettyTitle
                });
            } else {
                // Too complex or has deeper nesting -> Recurse normally
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
                <div className="ne-list-marker" style={{ background: theme.gradient }}>{i + 1}</div>
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

const RichDetailCard = ({ card, theme }) => (
    <div className="ne-rich">
        {card.description && (
            <motion.p 
                className="ne-rich-desc"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                dangerouslySetInnerHTML={{ __html: card.description }}
            />
        )}
        
        {card.pairs?.length > 0 && (
            <div className="ne-rich-pairs">
                {card.pairs.map((p, i) => (
                    <motion.div key={i} className="ne-rich-pair" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
                        <span className="ne-rich-label" style={{ color: theme.accent }}>{p.label}:</span>
                        <span className="ne-rich-val" dangerouslySetInnerHTML={{ __html: p.value }} />
                    </motion.div>
                ))}
            </div>
        )}

        {card.list?.length > 0 && (
            <div className="ne-rich-list">
                <span className="ne-rich-list-title" style={{ color: theme.accent }}>Key Points / Examples:</span>
                {card.list.map((item, i) => (
                    <motion.div key={i} className="ne-rich-item" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}>
                        <div className="ne-rich-bullet" style={{ backgroundColor: theme.accent }} />
                        <span dangerouslySetInnerHTML={{ __html: item }} />
                    </motion.div>
                ))}
            </div>
        )}
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
            content: notes.introduction || "Let's discover something incredible!",
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
        <div className="ne-root immersive-root animate-in fade-in duration-500" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
                    >
                        {card.type === 'intro' && <IntroCard card={card} theme={theme} totalCards={allCards.length} />}
                        {card.type === 'fact' && <FactCard card={card} theme={theme} />}
                        {card.type === 'list' && <ListCard card={card} theme={theme} />}
                        {card.type === 'object_list' && <ObjectListCard card={card} theme={theme} />}
                        {card.type === 'key_value' && <KeyValueCard card={card} theme={theme} />}
                        {card.type === 'rich_detail' && <RichDetailCard card={card} theme={theme} />}
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
                        <><>FINISH </><GraduationCap size={20} /></>
                    ) : (
                        <><>NEXT </><ChevronRight size={20} /></>
                    )}
                </motion.button>
            </div>
        </div>
    );
};

NoteExplorerEngine.hideGlobalFooter = true;
export default NoteExplorerEngine;
