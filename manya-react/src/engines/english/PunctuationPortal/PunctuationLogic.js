/**
 * PUNCTUATION PORTAL DOMAIN LOGIC
 * Internal rules for sentence part mapping and punctuation validation.
 */

/**
 * Normalizes input curriculum data.
 */
export const initializePunctuationData = (data) => {
    // v9.9: Hardened extraction to handle various DB payload structures
    const d = data?.data || data?.metadata || data?.payload || data || {};
    const rawQueries = d.queries || d.questions || d.items || d.steps || [];
    
    const defaultQueries = [
        { 
            parts: ["Wait", " I'm coming with you", "!"], 
            slots: [{ index: 1, expected: ',', hint: "Use a comma after 'Wait'!" }]
        }
    ];

    return {
        queries: (Array.isArray(rawQueries) && rawQueries.length > 0) ? rawQueries : defaultQueries,
        availableMarks: d.marks || d.availableMarks || [',', '.', '!', '?', ';', ':', '-', '"']
    };
};

/**
 * Validates if the current stickers placed in slots are correct.
 */
export const validatePunctuation = (slots) => {
    return slots.every(s => s.current === s.expected);
};

/**
 * Standardized Scoring Logic
 */
export const calculatePunctuationScoring = (isSuccess, mistakes, numQueries, startTime) => {
    const duration = Date.now() - startTime;
    const accuracy = isSuccess ? Math.max(0, (numQueries - mistakes) / numQueries) : 0;
    
    return {
        isCorrect: isSuccess,
        accuracy,
        score: numQueries * 20,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'PUNCTUATION_PORTAL'
    };
};
