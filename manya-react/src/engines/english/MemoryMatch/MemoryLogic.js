/**
 * MEMORY MATCH DOMAIN LOGIC
 * Internal rules for card shuffling, match detection, and grid scaling.
 */

/**
 * Initializes and shuffles a memory deck from pairs.
 */
export const initializeMemoryDeck = (pairs) => {
    if (!pairs) return [];
    
    const deck = [];
    pairs.forEach((pair, idx) => {
        deck.push({ id: `p${idx}-a`, pairId: idx, text: pair.item1, state: 'hidden' });
        deck.push({ id: `p${idx}-b`, pairId: idx, text: pair.item2, state: 'hidden' });
    });

    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
};

/**
 * Validates a card flip and checks for matches.
 */
export const checkMatch = (idx1, idx2, cards) => {
    const isMatch = cards[idx1].pairId === cards[idx2].pairId;
    return {
        isMatch,
        pairId: cards[idx1].pairId,
        scoreDelta: isMatch ? 20 : -5
    };
};

/**
 * Standardized Scoring Logic
 */
export const calculateMemoryScoring = (score, numMatches, totalPairs, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: numMatches === totalPairs,
        accuracy: numMatches / totalPairs,
        score,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'MEMORY_MATCH'
    };
};
