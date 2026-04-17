/**
 * SUBSET EXPLORER DOMAIN LOGIC
 * Domain logic for Power Set discovery and membership validation.
 */

export const ICONS = { 
    "Apple": "🍎", "Banana": "🍌", "Orange": "🍊", 
    "Mango": "🥭", "Pen": "🖊️", "Book": "📘", 
    "Car": "🚗", "Ball": "⚽", "Bear": "🧸", "Robot": "🤖", "Doll": "🪆",
    "Spade": "♠️", "Heart": "♥️", "Club": "♣️", "Diamond": "♦️",
    "Black": "⚫", "Yellow": "🟡", "Red": "🔴"
};

export const COLORS = {
    "Black": "#0f172a", "Yellow": "#eab308", "Red": "#ef4444",
    "Green": "#22c55e", "Blue": "#3b82f6", "White": "#ffffff"
};

/**
 * Normalizes a subset into a stable key for discovery tracking.
 * @param {Array} items List of items in the subset.
 * @returns {string} Comma-separated sorted key or "EMPTY".
 */
export const getSubsetKey = (items) => {
    if (!items || items.length === 0) return "EMPTY";
    return [...items].sort().join(',');
};

/**
 * Calculates the total number of subsets (Power Set size).
 * Formula: 2^n
 */
export const calculatePowerSetSize = (n) => {
    return Math.pow(2, n);
};

/**
 * Standardized Scoring & Discovery Logic
 */
export const validateDiscovery = (insideItems, foundSet, totalSubsets, startTime) => {
    const key = getSubsetKey(Array.from(insideItems));
    const isNew = !foundSet.has(key);
    const duration = Date.now() - startTime;
    
    // We only count as "Correct" if it's a new discovery in this game mode
    return {
        isCorrect: isNew,
        key,
        accuracy: isNew ? 1.0 : 0.0,
        mistakes: isNew ? 0 : 1,
        isComplete: (foundSet.size + (isNew ? 1 : 0)) === totalSubsets,
        timeSpentMs: duration,
        type: 'simulation'
    };
};
