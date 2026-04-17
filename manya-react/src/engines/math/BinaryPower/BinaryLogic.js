/**
 * BINARY POWER DOMAIN LOGIC
 * Reusable logic for exponential growth and power-of-two calculations.
 */

/**
 * Calculates the power of two for a given exponent.
 * @param {number} n The exponent.
 * @returns {number} 2^n
 */
export const calculatePower = (n) => {
    return Math.pow(2, n);
};

/**
 * Validates if the current value matches the target.
 * @param {number} current The user's current value (exponent).
 * @param {number} target The target power of two.
 * @returns {boolean}
 */
export const validatePower = (current, target) => {
    return calculatePower(current) === target;
};

/**
 * Calculates orbit distribution for atoms/electrons.
 * @param {number} index Electronic index (0-7).
 * @returns {Object} Shell index and starting angle.
 */
export const getElectronMapping = (index) => {
    // Shell distribution: 2 per shell for visual clarity in this game
    const shellIndex = Math.floor(index / 2);
    const radius = 60 + (shellIndex * 45); 
    const angle = (index % 2) * 180 + (index * 15);
    
    return { shellIndex, radius, angle };
};

/**
 * Standardized Scoring Logic
 */
export const calculateScoring = (isCorrect, mistakes, startTime) => {
    const duration = Date.now() - startTime;
    const accuracy = isCorrect ? (mistakes === 0 ? 1.0 : 0.5) : 0.0;
    
    return {
        isCorrect,
        accuracy,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation'
    };
};
