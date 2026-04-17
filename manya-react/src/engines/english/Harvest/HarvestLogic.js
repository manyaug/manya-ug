/**
 * HARVEST ENGINE DOMAIN LOGIC
 * Internal rules for falling item physics, lane management, and collision detection.
 */

export const LANE_X = { left: 30, right: 70 };

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
    const isLeft = word.type.toUpperCase().trim() === leftCat;
    const laneSide = isLeft ? 'left' : 'right';
    
    return {
        id: nextId,
        text: word.text,
        cat: word.type.toUpperCase().trim(),
        side: laneSide,
        x: LANE_X[laneSide],
        y: -10,
        vy: 0.55 + Math.random() * 0.2
    };
};

/**
 * Validates a collision between the basket and an item.
 */
export const checkHarvestCollision = (item, currentSide, leftCat, rightCat) => {
    // catch zone: newY >= 75 && newY <= 90 && item.side === currentSide
    const wasCaught = item.side === currentSide;
    const isCorrect = (item.side === 'left' && item.cat === leftCat) ||
                     (item.side === 'right' && item.cat === rightCat);
    
    return { wasCaught, isCorrect };
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
