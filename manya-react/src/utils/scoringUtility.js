/**
 * MANYA — UNIFIED SCORING PROTOCOL (USP) v1.0
 * -----------------------------------------
 * Normalizes interactive performance (Accuracy, Resilience, Efficiency)
 * into a standardized mastery score (0-100%).
 */

const SUBJECT_WEIGHTS = {
    math:    { accuracy: 0.80, resilience: 0.10, efficiency: 0.10 },
    science: { accuracy: 0.60, resilience: 0.30, efficiency: 0.10 },
    english: { accuracy: 0.70, resilience: 0.10, efficiency: 0.20 },
    sst:     { accuracy: 0.90, resilience: 0.05, efficiency: 0.05 },
    default: { accuracy: 0.75, resilience: 0.15, efficiency: 0.10 }
};

const DEFAULT_TARGET_TIMES = {
    SET_CLASSIFIER: 45000,
    SENTENCE_TRAIN: 30000,
    PIZZA_GAME: 60000,
    GRAMMAR_MAZE: 90000,
    BINARY_GAME: 120000,
    default: 60000
};

/**
 * Calculates a USP-standardized result.
 * @param {Object} rawData - { accuracy, mistakes, timeSpentMs, engineType }
 * @param {string} subject - math | science | english | sst
 * @returns {Object} { masteryScore, accuracy, resilience, efficiency }
 */
export const calculateUSP = (rawData, subject = 'math') => {
    const weights = SUBJECT_WEIGHTS[subject] || SUBJECT_WEIGHTS.default;
    const targetTime = DEFAULT_TARGET_TIMES[rawData.engineType] || DEFAULT_TARGET_TIMES.default;

    // 1. Accuracy (A): Directly from the engine (0.0 - 1.0)
    const accuracy = rawData.accuracy !== undefined ? Math.min(1, Math.max(0, rawData.accuracy)) : 1.0;

    // 2. Resilience (R): Persistence against mistakes
    // Formula: 1.0 - (mistakes * 0.05) [max 50% penalty to resilience]
    const resilience = Math.max(0.5, 1.0 - (rawData.mistakes || 0) * 0.05);

    // 3. Efficiency (E): Time-based performance
    // Exponential decay if they exceed targetTime
    let efficiency = 1.0;
    if (rawData.timeSpentMs > targetTime) {
        // Drop efficiency if slower than target. 
        // Example: 2x the time = ~36% efficiency
        efficiency = Math.exp(-0.00001 * (rawData.timeSpentMs - targetTime));
    }
    efficiency = Math.max(0.2, efficiency); // Minimum 20% efficiency floor

    // 4. Final Mastery Calculation
    const combinedMastery = (
        (accuracy * weights.accuracy) + 
        (resilience * weights.resilience) + 
        (efficiency * weights.efficiency)
    ) * 100;

    return {
        masteryScore: Math.round(combinedMastery),
        accuracy: Math.round(accuracy * 100),
        resilience: Math.round(resilience * 100),
        efficiency: Math.round(efficiency * 100),
        timeSpentMs: rawData.timeSpentMs,
        mistakes: rawData.mistakes || 0,
        isPassing: combinedMastery >= 60
    };
};
