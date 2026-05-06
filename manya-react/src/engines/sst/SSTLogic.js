/**
 * MANYA SST FETCHER LOGIC
 * Domain rules for adaptive quest generation, MCQ validation, and engine routing.
 */

export const SUPPORTED_SIM_ENGINES = [
    'SST_STUDY', 'NOTE_EXPLORER', 'GLOBE_TIME_ENGINE', 'GLOBE_ENGINE', 
    'UNIVERSAL_GLOBE', 'IMAGE_HOTSPOTS', 'GALLERY_STUDY', 'READER_STUDY',
    'THREE_D_STUDY', '3D_SKELETON'
];

/**
 * Normalizes strings for robust comparison.
 */
export const normalize = (str) => String(str || '').trim().toLowerCase();

/**
 * Determines the engine type from question data.
 */
export const getEngineType = (q) => {
    const data = q?.data || q;
    const raw = data?.engine_type || data?.engineType || q?.engine_type || q?.engineType || data?.type || q?.type || "";
    const type = String(raw).toUpperCase().trim();
    
    // Auto-detect NoteExplorer
    if (data?.study_notes || data?.mode === 'note_explorer') return 'NOTE_EXPLORER';

    // Auto-detect ReaderStudy for generic lesson nodes
    if (!type && (data?.text || data?.explanation || data?.steps || data?.content)) {
        return 'READER_STUDY';
    }
    
    return type;
};

/**
 * Validates MCQ options against the correct answer.
 */
export const isOptionCorrect = (opt, answer, options) => {
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
 * Logic to find a rephrased variant for adaptive retries.
 */
export const findRephrased = (wrongQuestion, allBank, questionsQueue) => {
    const baseId = wrongQuestion.id?.replace(/-V\d+$/, '') || '';
    const wrongDifficulty = wrongQuestion.difficulty || 'E';

    // Strategy: If wrong, give an EASIER version (H -> M -> E)
    const nextDiff = { 'E': 'E', 'M': 'E', 'H': 'M' };
    const targetDiff = nextDiff[wrongDifficulty] || 'E';

    const usedIds = new Set(questionsQueue.map(q => q.id));
    
    // 1. High-fidelity match (matching concept + target difficulty)
    let candidate = allBank.find(q =>
        q.id !== wrongQuestion.id &&
        !usedIds.has(q.id) &&
        q.subtopic === wrongQuestion.subtopic &&
        q.difficulty === targetDiff
    );

    // 2. Fallback: Any unused question from same subtopic
    if (!candidate) {
        candidate = allBank.find(q =>
            q.id !== wrongQuestion.id &&
            !usedIds.has(q.id) &&
            q.subtopic === wrongQuestion.subtopic
        );
    }

    if (candidate) return { ...candidate, isRephrased: true, originalId: wrongQuestion.id };
    return null;
};

export const NODE_METADATA = {
    WARMUP: { label: 'Warmup', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    EXPLORE: { label: 'Explore', color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    PRACTICE: { label: 'Practice', color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    REINFORCE: { label: 'Reinforce', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
    MASTERY: { label: 'Mastery', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' }
};
