/**
 * FUNCTIONAL COMPOSER DOMAIN LOGIC
 * Internal rules for spatial composition, item placement, and layout validation.
 */

/**
 * Normalizes item pool with placement status.
 */
export const normalizeComposerPool = (items, placedItems) => {
    if (!items) return [];
    return items.map(item => ({
        ...item,
        isPlaced: Object.values(placedItems).includes(item.id)
    }));
};

/**
 * Validates the entire composition layout.
 */
export const validateComposition = (slots, placedItems) => {
    let allCorrect = true;
    slots.forEach(slot => {
        if (placedItems[slot.id] !== slot.correctId) {
            allCorrect = false;
        }
    });
    return allCorrect;
};

/**
 * Standardized Scoring Logic
 */
export const calculateComposerScoring = (isSuccess, numQuestions, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: isSuccess,
        accuracy: isSuccess ? 1.0 : 0.0,
        score: isSuccess ? numQuestions * 20 : 0,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'FUNCTIONAL_COMPOSER'
    };
};
