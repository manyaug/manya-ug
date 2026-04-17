/**
 * IMAGE HOTSPOTS LOGIC
 * Domain rules and data normalization for the Hotspots engine.
 */

export const validatePinChoice = (selectedPinId, hotspots, choice) => {
    const hs = hotspots.find(h => h.id === selectedPinId);
    if (!hs) return false;
    return hs.label.toLowerCase() === choice.toLowerCase();
};

export const calculateHotspotsScore = (correctIds, hotspots, isQuizMode) => {
    const score = isQuizMode ? correctIds.size : 1;
    const total = isQuizMode ? hotspots.length : 1;
    return { score, total, isPassing: score === total };
};

export const formatEngineResult = (score, total, mistakes, duration, isQuizMode) => {
    return {
        isCorrect: score === total,
        score,
        total,
        mistakes,
        duration,
        type: isQuizMode ? 'labeling' : 'study'
    };
};

export const getHotspotsTheme = () => {
    return {
        pinActive: '#db2777',
        pinCorrect: '#10B981',
        pinError: '#f43f5e',
        pinDefault: '#7c3aed'
    };
};
