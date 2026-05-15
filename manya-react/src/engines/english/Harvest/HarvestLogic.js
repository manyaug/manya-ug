/**
 * HARVEST ENGINE DOMAIN LOGIC v5.0
 * Internal rules for falling item physics, lane management, and collision detection.
 */

export const LANE_X = { left: 25, right: 75 }; // Perfectly centered with 50% width halves

/**
 * Initializes simulation config.
 */
export const initializeHarvestData = (data) => {
    const d = data?.data || data || {};
    
    // Support both 'words' and 'questions' or 'items' keys
    const rawWords = d.words || d.questions || d.items || [];
    
    const defaultWords = [
        { text: "Apple", type: "NOUN" },
        { text: "Run", type: "VERB" },
        { text: "Book", type: "NOUN" },
        { text: "Jump", type: "VERB" },
        { text: "Happy", type: "ADJECTIVE" },
        { text: "Beautiful", type: "ADJECTIVE" }
    ];

    const wordPool = (Array.isArray(rawWords) && rawWords.length > 0) ? rawWords : defaultWords;

    // Auto-detect categories if not provided
    const leftCategory = d.leftCategory || d.category1 || 'NOUN';
    const rightCategory = d.rightCategory || d.category2 || 'VERB';

    const config = {
        leftCat: String(leftCategory).toUpperCase().trim(),
        rightCat: String(rightCategory).toUpperCase().trim(),
        wordPool,
        winScore: d.winScore || d.targetScore || 50
    };
    console.log("🌾 [HarvestLogic] Initialized Config:", config);
    return config;
};

/**
 * Spawns a new falling item.
 */
export const spawnHarvestItem = (wordPool, leftCat, nextId) => {
    if (!wordPool || wordPool.length === 0) return null;
    const word = wordPool[Math.floor(Math.random() * wordPool.length)];
    const laneSide = Math.random() > 0.5 ? 'left' : 'right';
    
    return {
        id: nextId,
        text: word.text || word.word || "",
        cat: (word.type || word.category || "").toUpperCase().trim(),
        side: laneSide,
        // v9.9: Organic Tilt - Add slight x-jitter and randomized leftward rotation
        x: LANE_X[laneSide] + (Math.random() * 4 - 2), 
        y: -10,
        vy: 0.25 + Math.random() * 0.15,
        rotation: (Math.random() * -10) - 2, // Subtle leftward tilt (-2 to -12 deg)
        hue: Math.random() * 360 
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
