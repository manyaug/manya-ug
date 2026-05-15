/**
 * HANGMAN DOMAIN LOGIC
 * Internal rules for word generation, character guessing, and victory conditions.
 */

export const MAX_INCORRECT = 6;

/**
 * Normalizes input curriculum data.
 */
export const initializeHangmanData = (data) => {
    // v9.9: Hardened Data Extraction - Support for hydrated payloads
    const payload = data?.data || data;
    const words = payload?.words || payload?.vocabulary || payload?.items || payload?.word_list;

    if (!Array.isArray(words) || words.length === 0) {
        // Support for single word/hint payloads
        const singleWord = payload?.word || payload?.text || payload?.term;
        if (singleWord) {
            return [{ word: String(singleWord).toUpperCase(), hint: payload.hint || payload.definition || 'A mystery word.' }];
        }
        return [{ word: 'MANYA', hint: 'The learning app.' }];
    }

    return words.map(w => {
        if (typeof w === 'string') return { word: w.toUpperCase(), hint: 'A mystery word.' };
        const wordStr = w.word || w.text || w.term || w.name || "";
        const hintStr = w.hint || w.definition || w.desc || 'A mystery word.';
        return { word: String(wordStr).toUpperCase(), hint: hintStr };
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

    // Check game state (Letters and apostrophes must be guessed)
    const wordChars = word.replace(/[^A-Z']/g, '').split('');
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
