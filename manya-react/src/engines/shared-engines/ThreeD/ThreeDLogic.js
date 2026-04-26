/**
 * THREE D STUDY LOGIC
 * Domain rules and data normalization for the 3D engine.
 */

/**
 * Calculates camera orbit based on normal string
 * normStr: "x y z"
 */
export const calculateOrbit = (normStr) => {
    if (!normStr) return "0deg 75deg 80%";
    const parts = normStr.split(' ').map(Number);
    let theta = Math.atan2(parts[0], parts[2]) * (180 / Math.PI);
    let phi = Math.acos(parts[1]) * (180 / Math.PI);
    
    // CAP PHI: Prevent looking straight down from top (0) or up from bottom (180)
    // 45deg to 135deg is a safe "portrait" range for models like skeletons.
    phi = Math.max(45, Math.min(135, phi));
    
    return `${theta}deg ${phi}deg 40%`;
};

export const getThreeDAccent = (subject) => {
    return subject?.toLowerCase() === 'science' ? '#7c3aed' : '#3b82f6';
};

export const formatThreeDResult = (score, total, mistakes, duration, isQuiz) => {
    return {
        isCorrect: score === total,
        score,
        total,
        mistakes,
        accuracy: total > 0 ? (score / total) : 1,
        duration,
        type: isQuiz ? 'labeling' : 'study'
    };
};
