/**
 * MANYA GAME MODE ENGINE (Headless)
 * ====================================
 * Manages QuickFire, Timed, Marathon, and Reverse question rendering modes.
 * This is the stateless logic layer — no React, no DB.
 * 
 * Ported from: manya_logic/server/engines/questEngine.js → selectGameMode()
 *              manya_logic/quest-manager.js → skipQuest(), questId definitions
 */

// ── QUICKFIRE MODE ────────────────────────────────────────────────────────────
// Student must answer in TIME_LIMIT seconds or the question auto-fails.
export const QUICKFIRE_TIME_LIMIT_MS = 8000;  // 8 seconds per question

// ── TIMED MODE ────────────────────────────────────────────────────────────────
// Quest 5 (MASTERY) boss mode. Student has a total time budget for all questions.
export const TIMED_PER_QUESTION_MS = 15000;   // 15 seconds per question

// ── MARATHON MODE ─────────────────────────────────────────────────────────────
// No special time restriction. Quest is elongated. No game-mode UI badge needed.

/**
 * Is this quest in QuickFire mode?
 * @param {string} gameMode
 * @returns {boolean}
 */
export function isQuickFire(gameMode) {
    return gameMode?.toLowerCase() === 'quickfire';
}

/**
 * Is this quest in Timed mode?
 * @param {string} gameMode
 * @returns {boolean}
 */
export function isTimed(gameMode) {
    return gameMode?.toLowerCase() === 'timed';
}

/**
 * Is this quest in Marathon mode?
 * @param {string} gameMode
 * @returns {boolean}
 */
export function isMarathon(gameMode) {
    return gameMode?.toLowerCase() === 'marathon';
}

/**
 * Get the time limit (ms) for the current game mode, per question.
 * @param {string} gameMode
 * @returns {number|null} - null means no time limit
 */
export function getTimeLimitMs(gameMode) {
    if (isQuickFire(gameMode)) return QUICKFIRE_TIME_LIMIT_MS;
    if (isTimed(gameMode)) return TIMED_PER_QUESTION_MS;
    return null;
}

/**
 * Calculates coins bonus multiplier for speed/reverse modes.
 * Ported from: question-fetcher.js → isSpeedOrReverse coin bonus
 * @param {string} gameMode
 * @param {boolean} isReverse
 * @returns {number} Multiplier (1.0 = normal, 2.0 = double)
 */
export function getModeCoinMultiplier(gameMode, isReverse = false) {
    if (isReverse || isQuickFire(gameMode) || isTimed(gameMode)) return 2.0;
    if (isMarathon(gameMode)) return 1.0; // Marathon is a penalty mode, no bonus
    return 1.0;
}

// ── REVERSE MODE ──────────────────────────────────────────────────────────────

/**
 * Transforms a standard MCQ question object into Reverse Mode format.
 * In Reverse Mode, the ANSWER is shown as the prompt, and the OPTIONS contain
 * the original question texts for the student to identify the correct one.
 *
 * @param {object} question - Standard Manya question object
 * @param {object[]} distractors - 3 other questions from the same subtopic (used as wrong options)
 * @returns {object} Reverse mode question object
 */
export function buildReverseQuestion(question, distractors = []) {
    // The "prompt" is the correct answer text
    const correctAnswerText = question.answer || question.correctAnswer || '';

    // Build options from question texts (the student must find the right question)
    const wrongOptions = distractors
        .slice(0, 3)
        .map(d => d.question || d.text || d.Question_Text || '');

    const correctOption = question.question || question.text || question.Question_Text || '';

    // Shuffle all 4 options
    const allOptions = [correctOption, ...wrongOptions].sort(() => Math.random() - 0.5);
    const correctIndex = allOptions.indexOf(correctOption);

    return {
        ...question,
        isReverse: true,
        // The visual "question" displayed = the answer text
        displayPrompt: `📌 What question matches this answer?\n"${correctAnswerText}"`,
        // Standard options array updated for this mode
        options: allOptions,
        // Correct letter key (A/B/C/D)
        reverseCorrectAnswer: String.fromCharCode(65 + correctIndex), // 'A', 'B', 'C', 'D'
        originalQuestion: question.question || question.text || '',
        originalAnswer: correctAnswerText,
    };
}

/**
 * Validates a Reverse Mode answer selection.
 * @param {string} selected - 'A' | 'B' | 'C' | 'D' or the full text
 * @param {object} reverseQuestion - Output of buildReverseQuestion()
 * @returns {boolean}
 */
export function validateReverseAnswer(selected, reverseQuestion) {
    if (!reverseQuestion?.isReverse) return false;
    const normalize = s => String(s || '').trim().toUpperCase();
    return normalize(selected) === normalize(reverseQuestion.reverseCorrectAnswer);
}

// ── QUEST SKIP COST ────────────────────────────────────────────────────────────

/**
 * Calculates the coin cost to skip a quest.
 * Ported from: quest-manager.js → skipQuest()
 * @param {{ difficulty: string, baseQuestions: number }} questMeta
 * @returns {number} Coin cost
 */
export function calculateSkipCost(questMeta) {
    const BASE = 350;
    const PER_DIFFICULTY = 80;
    const PER_QUESTION = 6;

    const diffLevels = { easy: 1, medium: 2, hard: 3, exam: 4 };
    const diffLevel = diffLevels[questMeta?.difficulty] || 1;

    return Math.round(BASE + (diffLevel * PER_DIFFICULTY) + ((questMeta?.baseQuestions || 8) * PER_QUESTION));
}
