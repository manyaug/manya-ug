/**
 * ENGLISH RULE MASTER DOMAIN LOGIC
 * Internal rules for curriculum data normalization and rule-step management.
 */

/**
 * Normalizes input curriculum data.
 */
export const initializeRuleData = (data) => {
    // Exhaustive search for rules across all nesting levels.
    // The validation layer wraps data inconsistently, so rules might be at any depth.
    const findRules = (obj) => {
        if (!obj || typeof obj !== 'object') return [];
        
        // Priority search for common rule/list keys
        const keys = ['rules', 'items', 'words', 'list', 'data'];
        for (const k of keys) {
            const val = obj[k];
            if (Array.isArray(val) && val.length > 0) return val;
            
            // Check nested data object (common in Vault records)
            if (k === 'data' && val && typeof val === 'object') {
                for (const subK of ['rules', 'items', 'words', 'list']) {
                    if (Array.isArray(val[subK]) && val[subK].length > 0) return val[subK];
                }
            }
        }
        
        // Fallback: Check if the object ITSELF is an array (some JSONs are just [{},{}])
        if (Array.isArray(obj) && obj.length > 0) return obj;

        return [];
    };

    const rules = findRules(data);
    const d = data?.data || data || {};

    const result = {
        type: d.type || data?.type || "GRAMMAR_RULES",
        topicTitle: d.topicTitle || data?.topicTitle || "Essential Rules",
        rules,
        text: d.text || data?.text || '',
        content: d.content || data?.content || '',
    };

    if (result.rules.length === 0) {
        console.debug(`[RuleLogic] No rules found at any depth.`, {
            topLevelKeys: Object.keys(data || {}),
            nestedKeys: Object.keys(d),
        });
    }

    return result;
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
