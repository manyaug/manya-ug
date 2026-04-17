/**
 * PUNCTUATION PORTAL DOMAIN LOGIC
 * Internal rules for sentence part mapping and punctuation validation.
 */

/**
 * Normalizes input curriculum data.
 */
export const initializePunctuationData = (data) => {
    const d = data?.data || data || {};
    return {
        queries: d.queries || [
            { 
                parts: ["Wait", " I'm coming with you", "!"], 
                slots: [{ index: 1, expected: ',', hint: "Use a comma after 'Wait'!" }]
            }
        ],
        availableMarks: d.marks || [',', '.', '!', '?', ';', ':', '-', '"']
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
