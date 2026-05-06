/**
 * MEMORY MATCH DOMAIN LOGIC
 * Internal rules for card shuffling, match detection, and grid scaling.
 */

/**
 * Initializes and shuffles a memory deck from pairs.
 */
export const initializeMemoryDeck = (data) => {
    const raw = data?.data || data || {};
    const rawPairs = raw.pairs || raw.questions || raw.items || [];
    
    const defaultPairs = [
        { item1: 'Cat', item2: 'Kitten' },
        { item1: 'Dog', item2: 'Puppy' },
        { item1: 'Lion', item2: 'Cub' },
        { item1: 'Sheep', item2: 'Lamb' }
    ];

    const pairs = (Array.isArray(rawPairs) && rawPairs.length > 0) ? rawPairs : defaultPairs;
    
    const deck = [];
    pairs.forEach((pair, idx) => {
        const text1 = pair.item1 || pair.word1 || pair.q || (typeof pair === 'string' ? pair : '???');
        const text2 = pair.item2 || pair.word2 || pair.a || (typeof pair === 'string' ? pair : '???');
        deck.push({ id: `p${idx}-a`, pairId: idx, text: text1, state: 'hidden' });
        deck.push({ id: `p${idx}-b`, pairId: idx, text: text2, state: 'hidden' });
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
