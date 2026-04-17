/**
 * ENGLISH CURRICULUM LOGIC
 * Pure logic for answer validation, adaptive rescue, and achievement scoring.
 */

/**
 * Robust Answer Verification (v6.0)
 * Handles OPTION_X, raw values, and index mapping.
 */
export const verifyEnglishAnswer = (selected, correct, options) => {
    if (selected === undefined || selected === null || correct === undefined || correct === null) return false;
    
    const clean = str => String(str || "").trim().toLowerCase().replace(/\u00A0/g, ' ');
    const sel = clean(selected);
    const ans = clean(correct).replace(/^option[ _]?/i, ''); 

    // 1. Direct Match
    if (sel === ans) return true;

    // 2. Index Mapping
    const letters = ['a', 'b', 'c', 'd'];
    if (!isNaN(ans) && letters[parseInt(ans)] === sel) return true;
    
    // 3. Cross-Reference
    if (options) {
        const correctKey = ans.toUpperCase(); 
        const correctIdx = letters.indexOf(ans);
        const correctValue = options[correctKey] || (Array.isArray(options) ? options[correctIdx] : options[ans]);
        if (correctValue && clean(correctValue) === sel) return true;
        
        const userValue = options[selected] || (Array.isArray(options) ? options[letters.indexOf(sel)] : null);
        if (userValue && clean(userValue) === ans) return true;
    }

    return false;
};

/**
 * Resolve correct text for explanations.
 */
export const resolveCorrectText = (target, options) => {
    if (!target || !options) return 'N/A';
    const clean = str => String(str || '').trim().toLowerCase();
    const t = clean(target);
    const directIdx = options.findIndex(opt => clean(opt) === t);
    if (directIdx !== -1) return options[directIdx];
    const optMatch = t.match(/option_([a-d])/i);
    if (optMatch) { const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65; return options[idx] || target; }
    if (t.length === 1 && /^[a-d]$/i.test(t)) { return options[t.toUpperCase().charCodeAt(0) - 65] || target; }
    return target;
};

/**
 * Rescue Recap Logic
 */
export const checkRescueInjection = (consecutiveWrongs, recapSteps, nodeType) => {
    if (consecutiveWrongs >= 3 && recapSteps.length > 0 && nodeType !== 'WARMUP') {
        return true;
    }
    return false;
};

/**
 * Score Calculation
 */
export const calculateEnglishMastery = (score, total) => {
    return Math.round((score / Math.max(1, total)) * 100);
};

export const NODE_METADATA = {
    WARMUP: { label: 'Warmup', color: 'text-amber-500', bg: 'bg-amber-50' },
    EXPLORE: { label: 'Story', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    PRACTICE: { label: 'Practice', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    REINFORCE: { label: 'Reinforce', color: 'text-purple-500', bg: 'bg-purple-50' },
    MASTERY: { label: 'Mastery', color: 'text-rose-500', bg: 'bg-rose-50' }
};
