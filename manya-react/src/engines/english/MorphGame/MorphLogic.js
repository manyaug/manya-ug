/**
 * MORPH GAME DOMAIN LOGIC
 * Internal rules for morphological transformations and speech conversion.
 */

/**
 * Normalizes implementation data for the morph engine.
 */
export const initializeMorphData = (data) => {
    const rawData = data?.data || data; // Handle nested or flat data

    // 🧠 Handle the 'queries' format found in Reported Speech content
    if (rawData?.queries && rawData.queries.length > 0) {
        const query = rawData.queries[0];
        const before = query.before || "";
        const after = query.after || "";

        const beforeArr = before.split(' ');
        const afterArr = after.split(' ');

        // Smart Change Detection: Mark words as changed if they don't appear in the same position OR are unique
        const directWords = beforeArr.map((w, i) => ({
            id: `b-${i}`,
            text: w,
            changed: afterArr[i] !== w
        }));

        const indirectWords = afterArr.map((w, i) => ({
            id: `a-${i}`,
            text: w,
            changed: beforeArr[i] !== w
        }));

        return {
            themeColor: rawData?.themeColor || '#fbbf24',
            directWords,
            indirectWords,
            directHint: rawData.directHint || "Direct Speech: Original Statement.",
            indirectHint: query.changeType || "Reported Speech: Backshifted Tense.",
            variantTitle: rawData.title || "Speech Morphology"
        };
    }

    return {
        themeColor: rawData?.themeColor || '#6366f1',
        directWords: rawData?.direct || [],
        indirectWords: rawData?.indirect || [],
        directHint: rawData?.directHint || "Direct Speech: Current perspective.",
        indirectHint: rawData?.indirectHint || "Indirect Speech: Reported perspective.",
        variantTitle: rawData?.variantTitle || "Morphology"
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
