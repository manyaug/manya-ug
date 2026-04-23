/**
 * NOTE EXPLORER – LOGIC LAYER (v6 Clean Rewrite)
 * ------------------------------------------------
 * Pure data-processing. No UI, no React, no side-effects.
 */

/* ── Accent pulled from design-tokens.css: --manya-pink ── */
export const MANYA_PINK = 'hsl(330, 70%, 51%)';

export const CHEERS = [
  "You're on fire! 🔥",
  "Brain boost! 🧠",
  "Superstar! ⭐",
  "Knowledge unlocked! 🔓",
  "Amazing! 🌟",
  "Keep going! 💪",
];

/* ── Recursive note flattener ── */
export function flattenNotes(notes, parentTitle = '') {
  const cards = [];
  if (!notes || typeof notes !== 'object') return cards;

  for (const [key, value] of Object.entries(notes)) {
    if (['title', 'introduction', 'mode'].includes(key)) continue;
    const prettyTitle = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    if (typeof value === 'string') {
      cards.push({
        type: 'fact',
        title: prettyTitle,
        content: value,
        section: parentTitle || prettyTitle,
      });
    } else if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'string') {
        cards.push({
          type: 'list',
          title: prettyTitle,
          items: value,
          section: parentTitle || prettyTitle,
        });
      } else if (value.length > 0 && typeof value[0] === 'object') {
        cards.push({
          type: 'object_list',
          title: prettyTitle,
          items: value,
          section: parentTitle || prettyTitle,
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      const childEntries = Object.entries(value);
      const hasNestedObjects = childEntries.some(
        ([_, v]) => typeof v === 'object' && !Array.isArray(v)
      );
      const listCount = childEntries.filter(([_, v]) =>
        Array.isArray(v)
      ).length;

      if (!hasNestedObjects && listCount <= 1 && childEntries.length <= 6) {
        const description =
          childEntries.find(
            ([k, v]) => typeof v === 'string' && !['title', 'name'].includes(k)
          )?.[1] || '';
        const list =
          childEntries.find(([_, v]) => Array.isArray(v))?.[1] || [];
        const otherPairs = childEntries
          .filter(([, v]) => typeof v === 'string' && v !== description)
          .map(([k, v]) => ({
            label: k
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase()),
            value: v,
          }));

        cards.push({
          type: 'rich_detail',
          title: prettyTitle,
          description,
          list,
          pairs: otherPairs,
          section: parentTitle || prettyTitle,
        });
      } else {
        cards.push(...flattenNotes(value, prettyTitle));
      }
    }
  }
  return cards;
}

/* ── Entry-point initialiser ── */
export const initializeNoteData = (data) => {
  const notes = data?.study_notes || data;
  if (!notes) return { cards: [], title: 'Knowledge Quest' };

  const intro = {
    type: 'intro',
    title: notes.title || data?.subtopic || 'Knowledge Quest',
    content: notes.introduction || "Let's discover something incredible!",
    section: 'Welcome',
  };
  return {
    cards: [intro, ...flattenNotes(notes)],
    title: notes.title || data?.subtopic || 'Knowledge Quest',
  };
};
