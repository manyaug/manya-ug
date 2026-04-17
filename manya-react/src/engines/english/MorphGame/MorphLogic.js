/**
 * MORPH GAME DOMAIN LOGIC
 * Internal rules for morphological transformations and speech conversion.
 */

/**
 * Normalizes implementation data for the morph engine.
 */
export const initializeMorphData = (data) => {
    return {
        themeColor: data?.themeColor || '#6366f1',
        directWords: data?.direct || [],
        indirectWords: data?.indirect || [],
        directHint: data?.directHint || "Direct Speech: Current perspective.",
        indirectHint: data?.indirectHint || "Indirect Speech: Reported perspective.",
        variantTitle: data?.variantTitle || "Morphology"
    };
};

/**
 * Standardized Scoring Logic
 */
export const calculateMorphScoring = (hasMorphed, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: hasMorphed,
        accuracy: hasMorphed ? 1.0 : 0.0,
        score: hasMorphed ? 150 : 0,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'MORPH_GAME'
    };
};
