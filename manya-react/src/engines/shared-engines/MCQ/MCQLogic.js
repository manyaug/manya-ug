/**
 * MCQ STANDALONE LOGIC
 * Domain rules and data normalization for the MCQ engine.
 */

export const parseSolution = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        const parsed = JSON.parse(raw);
        return parsed;
    } catch {
        return { explanation: raw };
    }
};

export const normalizeOptions = (dataOptions) => {
    if (Array.isArray(dataOptions)) {
        return dataOptions.map((text, i) => ({
            id: text,
            letter: String.fromCharCode(65 + i),
            text
        }));
    }
    return Object.entries(dataOptions || {})
        .filter(([, v]) => v && v !== 'null' && v !== '')
        .map(([key, val]) => ({
            id: key,
            letter: key.split('_')[1] || key[0],
            text: val
        }));
};

export const getThemeForSubject = (subject) => {
    switch (subject?.toLowerCase()) {
        case 'math':    return { bg: '#8b5cf6', border: '#7c3aed' };
        case 'science': return { bg: '#2dd4bf', border: '#0d9488' };
        case 'sst':     return { bg: '#f59e0b', border: '#b45309' };
        case 'english': return { bg: '#f472b6', border: '#db2777' };
        default:        return { bg: '#f59e0b', border: '#b45309' }; // Amber
    }
};

export const validateMCQAnswer = (selectedId, correctId, options) => {
    const normalize = (val) => String(val || '').trim().toLowerCase();
    const sel = normalize(selectedId);
    const cor = normalize(correctId);
    
    // Direct match
    if (sel === cor) return true;
    
    // Match by text (if ID is something like Option_A)
    const corOpt = options.find(o => normalize(o.id) === cor);
    if (corOpt && normalize(corOpt.text) === sel) return true;
    
    return false;
};
