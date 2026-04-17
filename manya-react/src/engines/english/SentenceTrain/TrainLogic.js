/**
 * SENTENCE TRAIN DOMAIN LOGIC
 * Internal rules for sentence construction, word pooling, and locomotive status.
 */

/**
 * Prepares a sentence pool from raw string.
 */
export const prepareSentencePool = (sentence, qIdx) => {
    const words = sentence.split(' ');
    return words.map(w => ({ 
        id: `${qIdx}-${Math.random().toString(36).slice(2)}`, 
        text: w 
    })).sort(() => Math.random() - 0.5);
};

/**
 * Validates if the train order matches the target sentence.
 */
export const validateTrainOrder = (train, targetSentence) => {
    return train.map(w => w.text).join(' ') === targetSentence;
};

/**
 * Standardized Scoring Logic
 */
export const calculateTrainScoring = (isSuccess, mistakes, numQuestions, startTime) => {
    const duration = Date.now() - startTime;
    return {
        isCorrect: isSuccess,
        accuracy: Math.max(0, (numQuestions - mistakes) / numQuestions),
        score: isSuccess ? numQuestions * 100 : 0,
        total: numQuestions,
        mistakes,
        timeSpentMs: duration,
        type: 'simulation',
        engineType: 'SENTENCE_TRAIN'
    };
};
