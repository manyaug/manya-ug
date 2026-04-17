import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronRight, ChevronLeft, Sparkles, Lightbulb, 
    MapPin, GraduationCap 
} from 'lucide-react';
import { IMAGES } from '../../../config/assetUrls';

const MANYA_ICON = IMAGES.manya_icon;

// ── SUB-COMPONENTS ──────────────────────────────────────────────────────────

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

const ManyaSpeech = ({ text, theme }) => (
    <div className="ne-manya-row">
        <motion.img
            src={MANYA_ICON} alt="Manya" className="ne-manya-img"
            animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        />
        <div className="ne-speech-bubble">
            <p className="ne-speech-text">{text}</p>
            <div className="ne-speech-tail" />
        </div>
    </div>
);

const IntroCard = ({ card, theme, totalCards }) => (
    <div className="ne-intro">
        <motion.img
            src={MANYA_ICON} alt="Manya" className="ne-intro-mascot"
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0, y: [0, -8, 0] }}
            transition={{ scale: { type: 'spring', bounce: 0.5 }, y: { repeat: Infinity, duration: 3, ease: 'easeInOut' } }}
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
            className="ne-fact-icon" style={{ background: theme.gradient }}
            initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
        >
            <Lightbulb size={26} color="white" />
        </motion.div>
        <motion.p
            className="ne-fact-text" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} dangerouslySetInnerHTML={{ __html: card.content }}
        />
    </div>
);

const ListCard = ({ card, theme }) => (
    <div className="ne-list">
        {card.items.map((item, i) => (
            <motion.div
                key={i} className="ne-list-item"
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
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
                    key={i} className="ne-obj-card"
                    initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
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

const RichDetailCard = ({ card, theme }) => (
    <div className="ne-rich">
        {card.description && (
            <motion.p className="ne-rich-desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} dangerouslySetInnerHTML={{ __html: card.description }} />
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

// ── MAIN RENDERER ───────────────────────────────────────────────────────────

const NoteRenderer = ({
    idx,
    dir,
    allCards,
    theme,
    card,
    isLast,
    goNext,
    goPrev,
    onTouchStart,
    onTouchEnd,
    cheerText
}) => {
    return (
        <div className="ne-root immersive-root animate-in fade-in duration-500" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="ne-header" style={{ background: theme.gradient }}>
                <div className="ne-orb ne-orb-1" /><div className="ne-orb ne-orb-2" /><div className="ne-orb ne-orb-3" />
                <div className="ne-header-inner">
                    <ProgressTrack current={idx} total={allCards.length} theme={theme} />
                    <div className="ne-section-row">
                        <motion.div key={idx} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="ne-section-icon">
                            <theme.Icon size={14} color="white" />
                        </motion.div>
                        <span className="ne-section-text">{card.type === 'intro' ? 'Welcome' : card.section}</span>
                    </div>
                    <h2 className="ne-title">{card.title}</h2>
                </div>
            </div>

            <div className="ne-content">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={idx} className="ne-content-inner"
                        initial={{ opacity: 0, x: dir * 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -50 }}
                    >
                        {card.type === 'intro' && <IntroCard card={card} theme={theme} totalCards={allCards.length} />}
                        {card.type === 'fact' && <FactCard card={card} theme={theme} />}
                        {card.type === 'list' && <ListCard card={card} theme={theme} />}
                        {card.type === 'object_list' && <ObjectListCard card={card} theme={theme} />}
                        {card.type === 'rich_detail' && <RichDetailCard card={card} theme={theme} />}
                        {cheerText && <ManyaSpeech text={cheerText} theme={theme} />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="ne-footer">
                <AnimatePresence>
                    {idx > 0 && (
                        <motion.button
                            className="ne-btn-back" initial={{ width: 0, opacity: 0 }} animate={{ width: 56, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }} transition={{ type: 'spring', bounce: 0 }} onClick={goPrev}
                        >
                            <ChevronLeft size={22} />
                        </motion.button>
                    )}
                </AnimatePresence>
                <motion.button className="ne-btn-next" style={{ background: theme.gradient }} whileTap={{ scale: 0.96 }} onClick={goNext}>
                    {isLast ? <><>FINISH </><GraduationCap size={20} /></> : <><>NEXT </><ChevronRight size={20} /></>}
                </motion.button>
            </div>
        </div>
    );
};

export default NoteRenderer;
