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
    const s = typeof subject === 'object' ? (subject.id || '') : (subject || '');
    switch (s.toLowerCase()) {
        case 'math':    return { bg: '#8b5cf6', border: '#7c3aed' };
        case 'science': return { bg: '#2dd4bf', border: '#0d9488' };
        case 'sst':     return { bg: '#f59e0b', border: '#b45309' };
        case 'english': return { bg: '#f472b6', border: '#db2777' };
        default:        return { bg: '#f59e0b', border: '#b45309' }; // Amber
    }
};

export const validateMCQAnswer = (selectedId, correctId, options) => {
    const normalize = (val) => {
        let s = String(val || '').trim().toLowerCase();
        // Strip common prefixes from database identifiers
        s = s.replace(/^(option|choice|answer)[_\s-]?/, '');
        return s;
    };
    
    const sel = normalize(selectedId);
    const cor = normalize(correctId);
    
    // 1. Direct Normalized Match (e.g., "option_d" vs "d" -> "d" === "d")
    if (sel === cor) return true;
    
    // 2. Cross-reference options
    const selectedOpt = options.find(o => 
        normalize(o.id) === sel || 
        normalize(o.letter) === sel || 
        normalize(o.text) === sel
    );
    const correctOpt = options.find(o => 
        normalize(o.id) === cor || 
        normalize(o.letter) === cor || 
        normalize(o.text) === cor
    );

    if (selectedOpt && correctOpt) {
        return selectedOpt.id === correctOpt.id;
    }

    // 3. Fallback: match selected normalized value against correct option's components
    if (correctOpt && (sel === normalize(correctOpt.letter) || sel === normalize(correctOpt.text))) return true;
    
    return false;
};
