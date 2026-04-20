/**
 * HARVEST ENGINE DOMAIN LOGIC v5.0
 * Internal rules for falling item physics, lane management, and collision detection.
 */

export const LANE_X = { left: 25, right: 75 }; // Adjusted for wider basket

/**
 * Initializes simulation config.
 */
export const initializeHarvestData = (data) => {
    return {
        leftCat: (data?.leftCategory || 'NOUN').toUpperCase().trim(),
        rightCat: (data?.rightCategory || 'VERB').toUpperCase().trim(),
        wordPool: data?.words || [],
        winScore: data?.winScore ?? 50
    };
};

/**
 * Spawns a new falling item.
 */
export const spawnHarvestItem = (wordPool, leftCat, nextId) => {
    const word = wordPool[Math.floor(Math.random() * wordPool.length)];
    const laneSide = Math.random() > 0.5 ? 'left' : 'right';
    
    return {
        id: nextId,
        text: word.text,
        cat: word.type.toUpperCase().trim(),
        side: laneSide,
        x: LANE_X[laneSide],
        y: -10,
        vy: 0.6 + Math.random() * 0.25, // Base velocity
        hue: Math.random() * 360 // For "Juicy" variety
    };
};

/**
 * Validates a collision between the basket and an item.
 */
export const checkHarvestCollision = (item, currentSide, leftCat, rightCat) => {
    // Correctness is based on whether the item's category matches the Category of the Lane the basket is in
    const isCorrect = (currentSide === 'left' && item.cat === leftCat) ||
                     (currentSide === 'right' && item.cat === rightCat);
    
    // Perfect Catch Zone (82-88% Y range inside the 75-90 center)
    const isPerfect = isCorrect && (item.y > 82 && item.y < 88);

    return { isCorrect, isPerfect };
};

/**
 * Standardized Scoring Logic
 */
export const calculateHarvestScoring = (isWon, score, winScore, mistakes, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: isWon,
        accuracy: Math.max(0, (winScore - (mistakes * 5)) / winScore),
        score,
        total: winScore,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'HARVEST_GAME'
    };
};
