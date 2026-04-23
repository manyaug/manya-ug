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
                    style={{ background: theme.accent || '#6366f1' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 1.2 }}
                >
                    <div className="ne-progress-shimmer" />
                </motion.div>
            </div>
            <div className="ne-progress-label">
                <span className="opacity-40 uppercase tracking-widest mr-1">Node</span>
                {current + 1}/{total}
            </div>
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
            // Use description as the primary content if it exists
            const definition = item.description || item.Definition || item.meaning || "";
            const entries = Object.entries(item).filter(([k]) => !['name', 'title', 'description', 'Definition', 'meaning'].includes(k));
            
            return (
                <motion.div
                    key={i} className="ne-lexicon-card"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                >
                    <div className="ne-lexicon-glow" style={{ backgroundColor: theme.accent }} />
                    <div className="toy-card-gloss" />
                    
                    <div className="ne-lexicon-header">
                        <div className="ne-lexicon-indicator" style={{ backgroundColor: theme.accent }} />
                        <h4 className="ne-lexicon-name">{name}</h4>
                    </div>

                    {definition && (
                        <div className="ne-lexicon-definition">
                            <p dangerouslySetInnerHTML={{ __html: definition }} />
                        </div>
                    )}

                    {entries.length > 0 && (
                        <div className="ne-lexicon-meta">
                            {entries.map(([k, v]) => (
                                <div key={k} className="ne-meta-row">
                                    <span className="ne-meta-label">{k.replace(/_/g, ' ')}</span>
                                    <span className="ne-meta-value">{String(v)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Interactive Bolt Decor */}
                    <div className="ne-lexicon-bolt">
                        <Zap size={14} fill="currentColor" className="opacity-40" />
                    </div>
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
            <div className="ne-header-elite">
                <div className="ne-orb-elite ne-orb-primary" style={{ backgroundColor: theme.accent }} />
                <div className="ne-orb-elite ne-orb-secondary" style={{ backgroundColor: theme.pill }} />
                
                <div className="ne-header-inner-elite">
                    <ProgressTrack current={idx} total={allCards.length} theme={theme} />
                    
                    <div className="flex items-center gap-3 mb-2">
                        <div className="ne-tag-pill" style={{ borderColor: `${theme.accent}40`, color: theme.accent }}>
                            <theme.Icon size={12} />
                            <span>{card.type === 'intro' ? 'Exploration' : card.section || 'Insight'}</span>
                        </div>
                    </div>

                    <h2 className="ne-title-elite">{card.title}</h2>
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

            <div className="ne-footer-elite">
                <AnimatePresence>
                    {idx > 0 && (
                        <button className="ne-btn-back-elite" onClick={goPrev}>
                            <ChevronLeft size={24} />
                        </button>
                    )}
                </AnimatePresence>
                <div className="flex-1" />
                <button 
                    className="ne-btn-next-elite" 
                    style={{ '--accent': theme.accent || '#6366f1' }}
                    onClick={goNext}
                >
                    <div className="btn-toy-gloss" />
                    <span>{isLast ? 'COMPLETE VAULT' : 'NEXT INSIGHT'}</span>
                    {isLast ? <GraduationCap size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>
        </div>
    );
};

export default NoteRenderer;
