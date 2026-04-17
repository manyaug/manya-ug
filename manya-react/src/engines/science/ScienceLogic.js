/**
 * SCIENCE DOMAIN LOGIC
 * Pure functions for engine detection, answer validation, and adaptive sequencing.
 */

export const SUPPORTED_SIM_ENGINES = [
    'SST_STUDY', 'NOTE_EXPLORER', 'GLOBE_TIME_ENGINE', 'GLOBE_ENGINE', 
    'UNIVERSAL_GLOBE', 'IMAGE_HOTSPOTS', 'GALLERY_STUDY', 'READER_STUDY',
    'THREE_D_STUDY', '3D_SKELETON'
];

/**
 * UNIFIED ENGINE DETECTION (v3.2)
 */
export const getEngineType = (q) => {
    const data = q?.data || q;
    const raw = data?.engine_type || data?.engineType || q?.engine_type || q?.engineType || data?.type || q?.type || "";
    return String(raw).toUpperCase().trim();
};

/**
 * ULTRA-ROBUST ANSWER MATCHER (v5.1)
 */
export const validateScienceAnswer = (selected, target, options) => {
    if (!target || !options) return false;
    
    const normalize = (str) => String(str || '').trim().toLowerCase();
    const t = normalize(target);
    const s = normalize(selected);
    
    // 1. Direct Text Match
    if (s === t) return true;
    
    // 2. Option_X Key Match
    const optMatch = t.match(/option_([a-d])/i);
    if (optMatch) {
        const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65;
        const optText = normalize(options[idx]);
        if (optText === s) return true;
    }
    
    // 3. Single Letter Match (A, B, C, D)
    if (t.length === 1 && /^[a-d]$/i.test(t)) {
        const idx = t.toUpperCase().charCodeAt(0) - 65;
        const optText = normalize(options[idx]);
        if (optText === s) return true;
    }
    
    return false;
};

/**
 * Resolve Human-Readable Correct Text
 */
export const resolveCorrectText = (target, options) => {
    if (!target || !options) return 'N/A';
    const normalize = (str) => String(str || '').trim().toLowerCase();
    const t = normalize(target);
    
    const directIdx = options.findIndex(opt => normalize(opt) === t);
    if (directIdx !== -1) return options[directIdx];
    
    const optMatch = t.match(/option_([a-d])/i);
    if (optMatch) {
        const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65;
        return options[idx] || target;
    }
    
    if (t.length === 1 && /^[a-d]$/i.test(t)) {
        return options[t.toUpperCase().charCodeAt(0) - 65] || target;
    }
    
    return target;
};

/**
 * Find a rephrased variant of a question in the bank.
 */
export const findRephrasedVariant = (wrongQuestion, bank, currentQuestions) => {
    const baseId = wrongQuestion.id?.replace(/-V\d+$/, '') || '';
    const wrongDifficulty = wrongQuestion.difficulty || 'E';

    const nextDiffSymbol = { 'E': 'E', 'M': 'E', 'H': 'M' };
    const targetDiff = nextDiffSymbol[wrongDifficulty] || 'E';

    const usedIds = new Set(currentQuestions.map(q => q.id));
    
    // Strategy 1: Targeted Difficulty variant
    const candidate = bank.find(q =>
        q.id !== wrongQuestion.id &&
        !usedIds.has(q.id) &&
        q.subtopic === wrongQuestion.subtopic &&
        q.difficulty === targetDiff
    );

    if (candidate) return { ...candidate, isRephrased: true, originalId: wrongQuestion.id };

    // Strategy 2: Any unused question from same subtopic
    const fallback = bank.find(q =>
        q.id !== wrongQuestion.id &&
        !usedIds.has(q.id) &&
        q.subtopic === wrongQuestion.subtopic
    );

    if (fallback) return { ...fallback, isRephrased: true, originalId: wrongQuestion.id };

    return null;
};
