import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Lightbulb, Check } from 'lucide-react';

/* ─────────────────────────────────────────────
   SUB-COMPONENTS – one per card type
   ───────────────────────────────────────────── */

const IntroCard = ({ card }) => (
  <div className="ne-card-body ne-card-intro">
    <p className="ne-intro-text">{card.content}</p>
  </div>
);

const FactCard = ({ card }) => (
  <div className="ne-card-body ne-card-fact">
    <div className="ne-fact-accent"><Lightbulb size={20} /></div>
    <p className="ne-body-text" dangerouslySetInnerHTML={{ __html: card.content }} />
  </div>
);

const ListCard = ({ card }) => (
  <div className="ne-card-body ne-card-list">
    {card.items.map((item, i) => (
      <motion.div
        key={i}
        className="ne-list-row"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
      >
        <span className="ne-list-num">{i + 1}</span>
        <span className="ne-list-txt" dangerouslySetInnerHTML={{ __html: item }} />
      </motion.div>
    ))}
  </div>
);

const ObjectListCard = ({ card }) => (
  <div className="ne-card-body ne-card-objlist">
    {card.items.map((item, i) => {
      const name = item.name || item.title || `Item ${i + 1}`;
      const def = item.description || item.Definition || item.meaning || '';
      const extras = Object.entries(item).filter(
        ([k]) => !['name', 'title', 'description', 'Definition', 'meaning'].includes(k)
      );
      return (
        <motion.div
          key={i}
          className="ne-obj-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <h4 className="ne-obj-name">{name}</h4>
          {def && <p className="ne-obj-def" dangerouslySetInnerHTML={{ __html: def }} />}
          {extras.length > 0 && (
            <div className="ne-obj-meta">
              {extras.map(([k, v]) => (
                <div key={k} className="ne-meta-pair">
                  <span className="ne-meta-k">{k.replace(/_/g, ' ')}</span>
                  <span className="ne-meta-v">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      );
    })}
  </div>
);

const RichDetailCard = ({ card }) => (
  <div className="ne-card-body ne-card-rich">
    {card.description && (
      <p className="ne-body-text" dangerouslySetInnerHTML={{ __html: card.description }} />
    )}
    {card.pairs?.length > 0 && (
      <div className="ne-rich-pairs">
        {card.pairs.map((p, i) => (
          <div key={i} className="ne-rich-row">
            <span className="ne-rich-label">{p.label}</span>
            <span className="ne-rich-val" dangerouslySetInnerHTML={{ __html: p.value }} />
          </div>
        ))}
      </div>
    )}
    {card.list?.length > 0 && (
      <div className="ne-rich-bullets">
        {card.list.map((item, i) => (
          <div key={i} className="ne-rich-bullet-row">
            <span className="ne-rich-dot" />
            <span dangerouslySetInnerHTML={{ __html: item }} />
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────
   MAIN RENDERER
   ───────────────────────────────────────────── */
const NoteRenderer = ({
  idx,
  dir,
  allCards,
  card,
  isLast,
  goNext,
  goPrev,
  onTouchStart,
  onTouchEnd,
  cheerText,
}) => {
  const total = allCards.length;
  const pct = ((idx + 1) / total) * 100;

  return (
    <div className="ne-root" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* ── HEADER ── */}
      <div className="ne-header">
        <div className="ne-progress-bar">
          <motion.div
            className="ne-progress-fill"
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.8 }}
          />
        </div>
        <div className="ne-header-row">
          <span className="ne-step-label">
            {card.type === 'intro' ? 'Welcome' : card.section || 'Insight'}
          </span>
          <span className="ne-step-count">{idx + 1} / {total}</span>
        </div>
        <h2 className="ne-title">{card.title}</h2>
      </div>

      {/* ── CONTENT ── */}
      <div className="ne-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={idx}
            className="ne-slide"
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.25 }}
          >
            {card.type === 'intro' && <IntroCard card={card} />}
            {card.type === 'fact' && <FactCard card={card} />}
            {card.type === 'list' && <ListCard card={card} />}
            {card.type === 'object_list' && <ObjectListCard card={card} />}
            {card.type === 'rich_detail' && <RichDetailCard card={card} />}
          </motion.div>
        </AnimatePresence>

        {/* Cheer toast */}
        <AnimatePresence>
          {cheerText && (
            <motion.div
              className="ne-cheer"
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {cheerText}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FOOTER NAV ── */}
      <div className="ne-footer">
        <button
          className="ne-btn ne-btn-prev"
          onClick={goPrev}
          disabled={idx === 0}
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <button className="ne-btn ne-btn-next" onClick={goNext}>
          <span>{isLast ? 'Complete' : 'Next'}</span>
          {isLast ? <Check size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
};

export default NoteRenderer;
