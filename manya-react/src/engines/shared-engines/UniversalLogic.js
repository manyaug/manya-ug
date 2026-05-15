/**
 * MANYA UNIVERSAL LOGIC v5.0
 * Shared domain rules for all subjects.
 */

export const SUPPORTED_SIM_ENGINES = [
    'SST_STUDY', 'NOTE_EXPLORER', 'GLOBE_TIME_ENGINE', 'GLOBE_ENGINE', 
    'UNIVERSAL_GLOBE', 'IMAGE_HOTSPOTS', 'GALLERY_STUDY', 'READER_STUDY',
    'THREE_D_STUDY', '3D_SKELETON', 'SET_THEORY', 'SET_STUDY', 'VENN_PROB',
    'SUBSET_GAME', 'PIZZA_GAME', 'BINARY_GAME', 'VENN_SPOTLIGHT', 'SET_CLASSIFIER',
    'VENN_LOGIC', 'VENN_PROB_ENGINE', 'MATH_STUDY', 'STUDY_RECAP'
];

/**
 * Normalizes strings for robust comparison.
 */
export const normalize = (str) => String(str || '').trim().toLowerCase();

/**
 * Robustly extracts and parses data payloads from varied resource shapes.
 * Handles: Raw DB rows, CDN resource objects, and already-parsed JSON.
 */
export const hydrateStepData = (q) => {
    if (!q) return {};
    
    // v5.0: Priority Extraction
    // 1. If it's already a clean data object
    if (q.questions || q.sets || q.zones || q.slides) return q;
    
    // 2. Extract from common container keys
    const raw = q.data || q.metadata || q.payload || q.content;
    if (!raw) return q; // Fallback to the object itself

    try {
        const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw);
        // If the parsed result is still just a string, it might be double-encoded
        return (typeof parsed === 'string' ? JSON.parse(parsed) : parsed) || {};
    } catch (e) {
        console.warn("[UniversalLogic] Hydration failed for:", q.id || q.qid);
        return {};
    }
};

/**
 * Determines the engine type from question data with heuristic fallbacks.
 */
export const getEngineType = (q) => {
    const data = q?.data || q;
    const raw = data?.engine_type || data?.engineType || q?.engine_type || q?.engineType || data?.type || q?.type || "";
    const type = String(raw).toUpperCase().trim();
    
    // Heuristic: Auto-detect NoteExplorer (Shared)
    if (data?.study_notes || data?.mode === 'note_explorer' || data?.item_type === 'NOTE') return 'NOTE_EXPLORER';

    // Heuristic: Auto-detect ReaderStudy for generic lesson nodes
    if (!type && (data?.text || data?.explanation || data?.steps || data?.content)) {
        return 'READER_STUDY';
    }
    
    // Fallback for identified types that lack an engine
    if (!type && q?.item_type === 'SIMULATION') return 'NOTE_EXPLORER';
    
    return type || 'MCQ_STANDALONE';
};

/**
 * Robust check to see if an item should be rendered as a simulation.
 * Prevents MCQs from being mistaken for simulations due to engine_type metadata.
 */
export const isSimSafe = (q) => {
    const eType = getEngineType(q);
    if (!SUPPORTED_SIM_ENGINES.includes(eType)) return false;

    const data = hydrateStepData(q);
    
    // A real simulation must have structural interactive data
    const hasSimStructure = !!(
        data.questions || data.sets || data.zones || 
        data.interaction || data.content || data.steps || data.slides
    );
    
    // An MCQ has options and an answer
    const isMCQ = !!(q?.options && q?.answer && q.options.length > 0);
    
    return hasSimStructure && !isMCQ;
};

/**
 * Validates MCQ options against the correct answer. (Universal Matcher v5.0)
 */
export const validateAnswer = (opt, answer, options) => {
    if (!answer || !options) return false;
    const t = normalize(answer);
    const o = normalize(opt);
    if (o === t) return true;
    
    // Handle "Option_B" or "B" style answers
    const optMatch = t.match(/option_([a-d])/i);
    if (optMatch) { 
        const idx = optMatch[1].toUpperCase().charCodeAt(0) - 65; 
        return normalize(options[idx] || "") === o; 
    }
    
    if (t.length === 1 && /^[a-d]$/i.test(t)) { 
        const idx = t.toUpperCase().charCodeAt(0) - 65; 
        return normalize(options[idx] || "") === o; 
    }
    
    return false;
};

/**
 * Resolves the display text for the correct answer.
 */
export const resolveCorrectText = (target, options) => {
    if (!target || !options) return 'N/A';
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
 * Find a rephrased variant for adaptive retries.
 */
export const findRephrasedVariant = (wrongQuestion, bank, currentQuestions) => {
    const baseId = wrongQuestion.id?.replace(/-V\d+$/, '') || '';
    const wrongDifficulty = wrongQuestion.difficulty || 'E';

    const nextDiffSymbol = { 'E': 'E', 'M': 'E', 'H': 'M' };
    const targetDiff = nextDiffSymbol[wrongDifficulty] || 'E';

    const usedIds = new Set(currentQuestions.map(q => q.id));
    
    const candidate = bank.find(q =>
        q.id !== wrongQuestion.id &&
        !usedIds.has(q.id) &&
        q.subtopic === wrongQuestion.subtopic &&
        q.difficulty === targetDiff
    );

    if (candidate) return { ...candidate, isRephrased: true, originalId: wrongQuestion.id };

    const fallback = bank.find(q =>
        q.id !== wrongQuestion.id &&
        !usedIds.has(q.id) &&
        q.subtopic === wrongQuestion.subtopic
    );

    if (fallback) return { ...fallback, isRephrased: true, originalId: wrongQuestion.id };

    return null;
};
