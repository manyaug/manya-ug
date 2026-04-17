/**
 * TENSE TREEHOUSE DOMAIN LOGIC
 * Internal rules for verb-tense categorization and temporal logic validation.
 */

/**
 * Normalizes implementation data for the tense engine.
 */
export const initializeTenseData = (data) => {
    const d = data?.data || data || {};
    return {
        queries: d.queries || [
            { 
                base: "She eats an apple", 
                targetTense: "The Past", 
                options: ["ate", "eaten", "eats"], 
                correct: "ate", 
                fullCorrect: "She ate an apple" 
            }
        ]
    };
};

/**
 * Validates a tense selection against the target.
 */
export const validateTenseSelection = (selection, correct) => {
    return selection === correct;
};

/**
 * Standardized Scoring Logic
 */
export const calculateTenseScoring = (mistakes, numQueries, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: mistakes === 0,
        accuracy: Math.max(0, (numQueries - mistakes) / numQueries),
        score: numQueries * 15,
        total: numQueries,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'TENSE_TREEHOUSE'
    };
};
