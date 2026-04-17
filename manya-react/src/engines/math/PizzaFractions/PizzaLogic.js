/**
 * PIZZA FRACTIONS DOMAIN LOGIC
 * Domain logic for Set Theory applications in combinatorics.
 */

export const TOPPINGS = [
    { id: 0, icon: "🍅", label: "Tomato",    color: "#ef4444" },
    { id: 1, icon: "🫒", label: "Olive",     color: "#84cc16" },
    { id: 2, icon: "🍄", label: "Mushroom",  color: "#a78bfa" },
    { id: 3, icon: "🥓", label: "Bacon",     color: "#f97316" },
    { id: 4, icon: "🌶️", label: "Pepper",   color: "#10b981" },
    { id: 5, icon: "🍍", label: "Pineapple", color: "#fbbf24" },
];

export const CUSTOMERS = [
    { name: "Aisha",  avatar: "👩🏾‍🦱", vibe: "planning a birthday party" },
    { name: "Tomás",  avatar: "👨🏽‍🍳", vibe: "hosting a pizza tasting" },
    { name: "Fatima", avatar: "👩🏻‍🎓", vibe: "studying set theory over lunch" },
    { name: "Kwame",  avatar: "👦🏿",   vibe: "celebrating a football win" },
    { name: "Lena",   avatar: "👧🏼",   vibe: "trying every combo possible" },
];

/**
 * Calculates the total number of non-empty combinations (Proper Subsets minus Empty Set).
 * Formula: 2^n - 1
 */
export const calculateCombinations = (numToppings) => {
    return Math.pow(2, numToppings) - 1;
};

/**
 * Calculates a star rating based on mistakes.
 */
export const getStarRating = (mistakes) => {
    if (mistakes === 0) return 3;
    if (mistakes <= 1) return 2;
    return 1;
};

/**
 * Calculates the SVG/Canvas layout for toppings on a pizza.
 */
export const getToppingLayout = (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return [];
    return selectedIds.map((id, i) => {
        const angle = (i / selectedIds.length) * Math.PI * 2 - Math.PI / 2;
        const dist = 30; // Radius % from center
        return {
            id,
            x: 50 + Math.cos(angle) * dist,
            y: 50 + Math.sin(angle) * dist,
        };
    });
};

/**
 * Standardized Scoring Logic
 */
export const validateOrder = (numToppings, targetVal, mistakes, startTime) => {
    const isCorrect = calculateCombinations(numToppings) === targetVal;
    const duration = Date.now() - startTime;
    const accuracy = isCorrect ? (mistakes === 0 ? 1.0 : 0.5) : 0.0;

    return {
        isCorrect,
        accuracy,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation'
    };
};
