/**
 * SYNTAX ARCHITECT DOMAIN LOGIC
 * Internal rules for sentence construction validation and mastery-loop normalization.
 */

/**
 * Normalizes user input for structural comparison.
 */
export const normalizeSyntax = (text) => {
    if (!text) return "";
    return String(text)
        .toLowerCase()
        .replace(/[.,!?]$/, "") // Strip trailing punctuation
        .trim();
};

/**
 * Validates a syntax construction attempt.
 */
export const validateStructure = (input, expected) => {
    return normalizeSyntax(input) === normalizeSyntax(expected);
};

/**
 * Standardized Scoring Logic
 */
export const calculateSyntaxScoring = (mistakes, totalQuestions, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: mistakes === 0,
        accuracy: Math.max(0, (totalQuestions - mistakes) / totalQuestions),
        score: totalQuestions - mistakes,
        total: totalQuestions,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'SYNTAX_ARCHITECT'
    };
};
