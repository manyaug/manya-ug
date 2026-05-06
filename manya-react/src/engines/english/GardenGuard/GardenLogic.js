/**
 * GARDEN GUARD DOMAIN LOGIC
 * Domain logic for the grammar protection game loop.
 */

/**
 * Initializes level configuration from the curriculum data.
 */
export const initializeGardenData = (data) => {
    const d = data?.data || data || {};
    
    // Support both 'queries' and 'questions' keys
    const rawQueries = d.queries || d.questions || d.items || [];
    
    const defaultQueries = [
        { text: "The team play well today", error: "play", correct: "plays" },
        { text: "She don't like apples", error: "don't", correct: "doesn't" },
        { text: "He go to school daily", error: "go", correct: "goes" }
    ];

    const config = {
        queries: (Array.isArray(rawQueries) && rawQueries.length > 0) ? rawQueries : defaultQueries,
        winScore: d.winScore || d.targetScore || 300,
        spawnRate: d.spawnRate || (d.difficulty === 'hard' ? 5000 : 8000)
    };
    console.log("🌳 [GardenLogic] Initialized Config:", config);
    return config;
};

/**
 * Spawns a new marching sentence object.
 */
export const spawnSentence = (queries) => {
    if (!queries || queries.length === 0) return null;
    const q = queries[Math.floor(Math.random() * queries.length)];
    const id = Math.random().toString(36).substr(2, 9);
    
    return {
        id: `sg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...q,
        words: (q.text || "").split(' '),
        startTime: Date.now(),
        duration: q.duration || 20000, 
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
