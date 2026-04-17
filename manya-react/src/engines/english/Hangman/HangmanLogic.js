/**
 * HANGMAN DOMAIN LOGIC
 * Internal rules for word generation, character guessing, and victory conditions.
 */

export const MAX_INCORRECT = 6;

/**
 * Normalizes input curriculum data.
 */
export const initializeHangmanData = (data) => {
    if (!data || !data.words) return [{ word: 'MANYA', hint: 'The learning app.' }];
    return data.words.map(w => {
        if (typeof w === 'string') return { word: w.toUpperCase(), hint: 'A mystery word.' };
        return { word: w.word.toUpperCase(), hint: w.hint || 'A mystery word.' };
    });
};

/**
 * Validates a letter guess.
 */
export const processGuess = (letter, word, guessedLetters, currentIncorrect) => {
    const isCorrect = word.includes(letter);
    const nextIncorrect = isCorrect ? currentIncorrect : currentIncorrect + 1;
    const nextGuessed = new Set(guessedLetters);
    nextGuessed.add(letter);

    // Check game state
    const wordChars = word.replace(/[^A-Z]/g, '').split('');
    const isWon = wordChars.every(char => nextGuessed.has(char));
    const isLost = nextIncorrect >= MAX_INCORRECT;

    return {
        isCorrect,
        nextIncorrect,
        nextGuessed,
        status: isWon ? 'won' : (isLost ? 'lost' : 'playing')
    };
};

/**
 * Standardized Scoring Logic
 */
export const calculateHangmanScoring = (finalResults, startTime) => {
    const duration = Date.now() - startTime;
    const totalWords = finalResults.length;
    const totalWon = finalResults.filter(r => r.status === 'won').length;
    
    return {
        isCorrect: totalWon === totalWords,
        accuracy: totalWon / totalWords,
        score: totalWon * 500,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'HANGMAN'
    };
};
