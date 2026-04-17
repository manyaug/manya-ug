/**
 * GARDEN GUARD DOMAIN LOGIC
 * Domain logic for the grammar protection game loop.
 */

/**
 * Initializes level configuration from the curriculum data.
 */
export const initializeGardenData = (data) => {
    const d = data?.data || data || {};
    return {
        queries: d.queries || [
            { text: "The team play well today", error: "play", correct: "plays" },
            { text: "She don't like apples", error: "don't", correct: "doesn't" }
        ],
        winScore: d.winScore || 300,
        spawnRate: d.spawnRate || 5000
    };
};

/**
 * Spawns a new marching sentence object.
 */
export const spawnSentence = (queries) => {
    const query = queries[Math.floor(Math.random() * queries.length)];
    const id = Math.random().toString(36).substr(2, 9);
    
    return {
        id,
        ...query,
        words: query.text.split(' '),
        startTime: Date.now(),
        duration: 10000 + Math.random() * 4000, 
        isHealed: false
    };
};

/**
 * Validates a word click against the error in a specific sentence.
 */
export const handleWordInteraction = (sentence, word) => {
    if (word === sentence.error && !sentence.isHealed) {
        return {
            isCorrect: true,
            updatedSentence: { 
                ...sentence, 
                isHealed: true, 
                words: sentence.words.map(w => w === sentence.error ? sentence.correct : w) 
            }
        };
    }
    return { isCorrect: false, updatedSentence: sentence };
};

/**
 * Standardized Scoring Logic
 */
export const calculateGardenScoring = (phase, score, totalHealed, totalMissed, winScore, startTime) => {
    const duration = Date.now() - startTime;
    const accuracy = totalHealed / (totalHealed + totalMissed || 1);
    
    return {
        isCorrect: phase === 'victory',
        accuracy,
        score,
        total: winScore,
        healed: totalHealed,
        missed: totalMissed,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'GARDEN_GUARD'
    };
};
