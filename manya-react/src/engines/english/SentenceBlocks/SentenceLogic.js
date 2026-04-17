/**
 * SENTENCE BLOCKS DOMAIN LOGIC
 * Domain logic for grammar structure validation and word bank management.
 */

/**
 * Normalizes input data into the game-ready slots and bank format.
 */
export const initializeLevelData = (data) => {
    const raw = data?.data || data || {};
    const slots = raw.slots || [
        { id: 's1', expected: 'The brave knight' },
        { id: 's2', expected: 'conquered' },
        { id: 's3', expected: 'the dragon' },
    ];
    const distractors = raw.distractors || ['quickly', 'sleeping'];

    const initialSlots = slots.map(slot => ({ ...slot, current: null }));
    
    // Generate bank
    const colors = ['bg-amber-400', 'bg-sky-400', 'bg-rose-400', 'bg-emerald-400', 'bg-violet-400'];
    const bank = [
        ...slots.map(slot => ({ 
            id: `b-${slot.id}`, 
            text: slot.expected, 
            color: colors[Math.floor(Math.random() * colors.length)] 
        })),
        ...distractors.map((text, i) => ({ 
            id: `d-${i}`, 
            text: text, 
            color: 'bg-slate-400' 
        }))
    ].sort(() => Math.random() - 0.5);

    return { initialSlots, bank };
};

/**
 * Validates if the current structure is grammatically stable/correct.
 */
export const validateStructure = (slots) => {
    return slots.every(s => s.current?.text === s.expected);
};

/**
 * Standardized Scoring Protocol (USP)
 */
export const calculateSentenceScoring = (isCorrect, mistakes, totalSlots, startTime) => {
    const duration = Date.now() - startTime;
    const accuracy = isCorrect ? Math.max(0, (totalSlots - mistakes) / totalSlots) : 0;
    
    return {
        isCorrect,
        accuracy,
        mistakes,
        score: totalSlots * 10,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'SENTENCE_BLOCKS'
    };
};
