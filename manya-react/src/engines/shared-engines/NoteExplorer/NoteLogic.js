import { Globe, Flame, Compass, MapPin, Star, Gem, Telescope, Rocket } from 'lucide-react';

/**
 * MANYA NOTE EXPLORER LOGIC
 * Domain rules for data flattening and theme orchestration.
 */

export const THEMES = [
    { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#764ba2', pill: '#ede9fe', Icon: Globe },
    { gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', accent: '#e11d48', pill: '#ffe4e6', Icon: Flame },
    { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', accent: '#0284c7', pill: '#e0f2fe', Icon: Compass },
    { gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', accent: '#059669', pill: '#dcfce7', Icon: MapPin },
    { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', accent: '#e11d48', pill: '#fef3c7', Icon: Star },
    { gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', accent: '#7c3aed', pill: '#f3e8ff', Icon: Gem },
    { gradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)', accent: '#c026d3', pill: '#fae8ff', Icon: Telescope },
    { gradient: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)', accent: '#6366f1', pill: '#eef2ff', Icon: Rocket },
];

export const CHEERS = [
    "You're on fire! 🔥", "Brain boost! 🧠", "Superstar! ⭐",
    "Knowledge unlocked! 🔓", "Amazing! 🌟", "Keep going! 💪",
];

/**
 * Recursively flattens complex nested curriculum JSON into a flat array of display-ready cards.
 */
export function flattenNotes(notes, parentTitle = '') {
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
            
            // SMART CONSOLIDATION
            const hasNestedObjects = childEntries.some(([_, v]) => typeof v === 'object' && !Array.isArray(v));
            const listCount = childEntries.filter(([_, v]) => Array.isArray(v)).length;
            
            if (!hasNestedObjects && listCount <= 1 && childEntries.length <= 6) {
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
                cards.push(...flattenNotes(value, prettyTitle));
            }
        }
    }
    return cards;
}

/**
 * Orchestrates the data for the engine initialization.
 */
export const initializeNoteData = (data) => {
    const notes = data?.study_notes || data;
    if (!notes) return { cards: [], title: 'Knowledge Quest' };

    const intro = {
        type: 'intro',
        title: notes.title || data?.subtopic || 'Knowledge Quest',
        content: notes.introduction || "Let's discover something incredible!",
        section: 'Welcome'
    };
    return {
        cards: [intro, ...flattenNotes(notes)],
        title: notes.title || data?.subtopic || 'Knowledge Quest'
    };
};
