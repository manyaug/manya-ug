/**
 * ENGLISH RULE MASTER DOMAIN LOGIC
 * Internal rules for curriculum data normalization and rule-step management.
 */

/**
 * Normalizes input curriculum data.
 */
export const initializeRuleData = (data) => {
    const d = data?.data || data || {};
    return {
        type: d.type || "GRAMMAR_RULES",
        topicTitle: d.topicTitle || "Essential Rules",
        rules: d.rules || []
    };
};

/**
 * Validates if the rule set is valid for display.
 */
export const hasValidRules = (rules, type) => {
    return rules.length > 0 || type === "VOCABULARY_LIST";
};

/**
 * Standardized Scoring Logic
 */
export const calculateRuleScoring = (step, totalRules, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: true,
        accuracy: 1.0,
        score: totalRules * 10,
        timeSpentMs: duration,
        type: 'study',
        engineType: 'RULE_MASTER'
    };
};
