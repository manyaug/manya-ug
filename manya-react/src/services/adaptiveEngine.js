/**
 * MANYA ADAPTIVE ENGINE
 * ======================
 * The brain of the adaptive learning system.
 * Ported from: questEngine.js, mastery-calculator.js, personalizationEngine.js,
 *              priority-scorer.js, pleManager.js
 *
 * This service selects the RIGHT questions at the RIGHT difficulty
 * for the current student's state.
 *
 * Usage:
 *   import { generateAdaptiveQuest } from './adaptiveEngine';
 *   const quest = generateAdaptiveQuest(allQuestions, nodeType, subject, questKey);
 */

import { getSession, getAnswerHistory, getUserState } from './userStateService';
import { calculateFrustration } from './psychTracker';
import { parseQuestionId, areSameConcept } from '../utils/questionParser';
import { getWrongQuestions } from './questProgressService';

// ─────────────────────────────────────────────────────────────────────────────
// 1. VARIANT DISTRIBUTIONS (from questEngine.js)
//    Maps our 5 quest nodes to their V1/V2/V3 question mix.
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_DISTRIBUTIONS = {
    WARMUP:    { V1: 0.80, V2: 0.20, V3: 0.00 },
    EXPLORE:   { V1: 0.50, V2: 0.40, V3: 0.10 },
    PRACTICE:  { V1: 0.30, V2: 0.45, V3: 0.25 },
    REINFORCE: { V1: 0.20, V2: 0.50, V3: 0.30 },
    MASTERY:   { V1: 0.10, V2: 0.15, V3: 0.75 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. QUEST LENGTH (from questEngine.js calculateQuestLength)
//    Dynamic question count per node, adjusted by student state.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_LENGTHS = { WARMUP: 6, EXPLORE: 8, PRACTICE: 10, REINFORCE: 10, MASTERY: 12 };
const MAX_LENGTHS  = { WARMUP: 8, EXPLORE: 10, PRACTICE: 15, REINFORCE: 15, MASTERY: 20 };
const MIN_LENGTHS  = { WARMUP: 5, EXPLORE: 6, PRACTICE: 6,  REINFORCE: 7,  MASTERY: 8  };

function calculateQuestLength(nodeType, session) {
    let length = BASE_LENGTHS[nodeType] || 8;
    const frustration = calculateFrustration(session);

    // Elongation for struggling students (Practice+ only)
    if (['PRACTICE', 'REINFORCE', 'MASTERY'].includes(nodeType)) {
        const hintRate = session.hintCount / Math.max(1, session.questionsAnswered);
        if (frustration.score > 70 || hintRate > 0.45) {
            // High frustration → FEWER questions (mercy rule)
            length = Math.max(MIN_LENGTHS[nodeType], length - 2);
        }
    }

    // Warmup is always short
    if (nodeType === 'WARMUP') {
        length = Math.min(length, 6);
    }

    return Math.min(MAX_LENGTHS[nodeType], Math.max(MIN_LENGTHS[nodeType], length));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SIMULATION RATIOS (from questEngine.js getSimulationRatio)
//    Determines what % of quest steps should be simulations.
// ─────────────────────────────────────────────────────────────────────────────

const SIM_RATIOS = { WARMUP: 0.10, EXPLORE: 0.12, PRACTICE: 0.20, REINFORCE: 0.22, MASTERY: 0.25 };

export function getSimulationRatio(nodeType) {
    return Math.min(0.30, SIM_RATIOS[nodeType] || 0.10);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GAME MODE SELECTION (from questEngine.js selectGameMode)
//    Determines the mode overlay: none, quickfire, timed, marathon
// ─────────────────────────────────────────────────────────────────────────────

export function selectGameMode(nodeType, session, answerHistory) {
    const frustration = calculateFrustration(session);

    // Frustration guardrail — never add pressure when frustrated
    if (frustration.score > 70) return 'none';

    // Calculate overall accuracy from recent answers
    const recent = answerHistory.slice(-20);
    const accuracy = recent.length > 0
        ? (recent.filter(a => a.isCorrect).length / recent.length) * 100
        : 50;

    // QuickFire: high confidence + high accuracy + fast responses
    const avgTime = recent.length > 0
        ? recent.reduce((s, a) => s + (a.timeSpentMs || 15000), 0) / recent.length / 1000
        : 15;

    if (accuracy >= 65 && avgTime < 15 && session.consecutiveCorrect >= 3) {
        return 'quickfire';
    }

    // Timed: only in MASTERY
    if (nodeType === 'MASTERY' && accuracy >= 70) {
        return 'timed';
    }

    // Marathon: only in REINFORCE when struggling
    if (nodeType === 'REINFORCE' && (session.consecutiveWrong >= 2 || (session.hintCount / Math.max(1, session.questionsAnswered)) > 0.45)) {
        return 'marathon';
    }

    return 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MASTERY CALCULATOR (from mastery-calculator.js + personalizationEngine.js)
//    Determines student's concept mastery and recommends next variant.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate mastery level for a single concept.
 * @param {object} conceptStats - { v1Attempts, v1Correct, v2Attempts, v2Correct, v3Attempts, v3Correct }
 * @returns {'new'|'struggling_v1'|'learning'|'ready_for_v2'|'struggling_v2'|'ready_for_v3'|'mastered'}
 */
export function calculateConceptMastery(conceptStats) {
    const { v1Attempts = 0, v1Correct = 0, v2Attempts = 0, v2Correct = 0, v3Attempts = 0, v3Correct = 0 } = conceptStats;

    if (v1Attempts === 0 && v2Attempts === 0 && v3Attempts === 0) return 'new';

    const v1Acc = v1Attempts > 0 ? v1Correct / v1Attempts : 0;
    const v2Acc = v2Attempts > 0 ? v2Correct / v2Attempts : 0;
    const v3Acc = v3Attempts > 0 ? v3Correct / v3Attempts : 0;

    if (v3Attempts >= 3 && v3Acc >= 0.8) return 'mastered';
    if (v2Attempts >= 3 && v2Acc >= 0.8) return 'ready_for_v3';
    if (v1Attempts >= 3 && v1Acc >= 0.8) return 'ready_for_v2';
    if (v1Attempts >= 2 && v1Acc < 0.6) return 'struggling_v1';
    if (v2Attempts >= 2 && v2Acc < 0.6) return 'struggling_v2';
    if (v1Attempts > 0 || v2Attempts > 0 || v3Attempts > 0) return 'learning';

    return 'new';
}

/**
 * Recommend which variant to serve next.
 * @param {object} conceptStats
 * @param {string} mastery
 * @returns {{ variant: 'V1'|'V2'|'V3', reason: string }}
 */
export function getRecommendedVariant(conceptStats, mastery) {
    switch (mastery) {
        case 'new':            return { variant: 'V1', reason: 'New concept — start with basics' };
        case 'struggling_v1':  return { variant: 'V1', reason: 'More V1 practice needed' };
        case 'struggling_v2':  return { variant: 'V1', reason: 'Review V1 before continuing V2' };
        case 'learning':       return { variant: 'V1', reason: 'Continue learning path' };
        case 'ready_for_v2':   return { variant: 'V2', reason: 'V1 mastered! Ready for V2' };
        case 'ready_for_v3':   return { variant: 'V3', reason: 'V2 mastered! Ready for V3' };
        case 'mastered':       return { variant: 'V3', reason: 'Mastered — seeking challenge' };
        default:               return { variant: 'V1', reason: 'Default path' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PRIORITY SCORER (from priority-scorer.js)
//    Scores each question to pick the most valuable one.
// ─────────────────────────────────────────────────────────────────────────────

const WEIGHTS = {
    new: 100,
    struggling_v1: 80, struggling_v2: 80,
    learning: 60,
    ready_for_v2: 50, ready_for_v3: 50,
    mastered: 20,
};

function scoreQuestion(question, answerHistory, subject, wrongQuestions = []) {
    let score = 0;
    const factors = [];

    // Build concept stats from history
    const conceptAnswers = answerHistory.filter(a => areSameConcept(a.questionId, question.id));
    const attempts = conceptAnswers.length;
    const correct = conceptAnswers.filter(a => a.isCorrect).length;
    const accuracy = attempts > 0 ? correct / attempts : 0;

    // ── REPHRASED HOOK ──
    // If this is a rephrased version (source_sheet: 'Rephrased') and the parent was failed recently
    const isNewRephrased = question.source === 'Rephrased';
    const parentFailed = wrongQuestions.some(wq => wq.id === question.parentid);
    
    if (isNewRephrased && parentFailed) {
        score += 500; // MASSIVE BOOST to bring it to the front
        factors.push('rephrased_accurate_retry');
    }

    // fallback to generic concept retry if no exact parent match
    const conceptFailed = wrongQuestions.some(wq => areSameConcept(wq.id, question.id));
    if (isNewRephrased && conceptFailed && !parentFailed) {
        score += 150;
        factors.push('rephrased_similar_concept');
    }

    // ── PLE CHALLENGE ──
    // Prioritize PLE questions for high-performers, or if they are in MASTERY
    const overallAccuracy = answerHistory.slice(-10).filter(a => a.isCorrect).length / Math.max(1, Math.min(10, answerHistory.length));
    const isPLE = question.isPLE;
    
    if (isPLE) {
        if (overallAccuracy > 0.8) {
            score += 150; // Challenge the pros
            factors.push('ple_challenge_high');
        } else if (overallAccuracy < 0.5) {
            score -= 50; // Spare the strugglers
            factors.push('ple_mercy_low');
        } else {
            score += 30; // Standard PLE weight
            factors.push('ple_standard');
        }
    }

    // Simple mastery classification
    let mastery = 'new';
    if (attempts === 0) mastery = 'new';
    else if (attempts >= 3 && accuracy >= 0.8) mastery = 'mastered';
    else if (attempts >= 2 && accuracy < 0.6) mastery = 'struggling_v1';
    else mastery = 'learning';

    score += WEIGHTS[mastery] || 60;
    factors.push(mastery);

    // Freshness bonus — questions not seen recently get priority
    const lastSeen = conceptAnswers[conceptAnswers.length - 1]?.answeredAt;
    if (lastSeen) {
        const daysSince = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) { score += 40; factors.push('due_for_review'); }
        else if (daysSince > 3) { score += 20; factors.push('recent'); }
    } else {
        score += 30; // Never seen = boost
        factors.push('never_seen');
    }

    // Hint dependency boost
    const hintCount = conceptAnswers.filter(a => a.hintUsed).length;
    if (attempts > 0 && hintCount / attempts > 0.3) {
        score += 30;
        factors.push('high_hint_usage');
    }

    // Difficulty weighting
    if (overallAccuracy < 0.5 && question.difficulty === 'E') {
        score += 50; // Give easier questions to strugglers
        factors.push('mercy_difficulty_e');
    }

    return { score, factors, mastery };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. VARIANT SPACING (from priority-scorer.js validateVariantSpacing)
//    Prevents the same concept from appearing within 3 questions.
// ─────────────────────────────────────────────────────────────────────────────

function validateSpacing(questionId, recentIds, minSpacing = 3) {
    if (!recentIds || recentIds.length === 0) return true;
    const recent = recentIds.slice(-minSpacing);
    return !recent.some(id => areSameConcept(id, questionId));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. PLE RATIO (from pleManager.js)
//    Maintains 66% exam-style / 33% practice mix.
// ─────────────────────────────────────────────────────────────────────────────

function selectPool(answerHistory, targetRatio = 2) {
    if (answerHistory.length < 5) return 'exam'; // Start with exam-style

    const recent = answerHistory.slice(-10);
    const examCount = recent.filter(a => a.pool === 'exam').length;
    const practiceCount = recent.filter(a => a.pool === 'practice').length;
    const currentRatio = examCount / Math.max(1, practiceCount);

    if (currentRatio < targetRatio) return 'exam';
    if (currentRatio > targetRatio + 0.5) return 'practice';
    return Math.random() < 0.7 ? 'exam' : 'practice';
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. MAIN API — generateAdaptiveQuest
//    This is what questFactory calls to get an adaptive set of questions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate an adaptive quest based on the student's real-time state.
 *
 * @param {Array} allQuestions  - Full question bank for this topic (from sstMockDB/englishMockDB)
 * @param {string} nodeType     - 'WARMUP' | 'PRACTICE' | 'REINFORCE' | 'MASTERY'
 * @param {string} subject      - 'sst' | 'english' | 'math' | 'science'
 * @param {string} questKey     - Unique key like 'sst/locating_africa/quest_1_world_stage'
 * @param {Array}  resources    - Available JSON resources for this quest
 * @returns {{ questions: Array, questLength: number, gameMode: string, variantMix: object, metadata: object }}
 */
export function generateAdaptiveQuest(allQuestionsRaw, nodeType, subject, questKey, resources = []) {
    const session = getSession();
    const history = getAnswerHistory(subject);
    const frustration = calculateFrustration(session);

    // ── 0. DATA NORMALIZATION ──
    // Identify intrinsic simulations early
    const allQuestions = allQuestionsRaw.map(q => ({
        ...q,
        isSimulation: q.isSimulation || !!q.engine_type || !!q.json_reference_path,
        type: q.engine_type === 'UniversalGlobeEngine' ? 'INTERACTIVE_PUZZLE' : q.type
    }));

    // 1. Calculate dynamic quest length
    const questLength = calculateQuestLength(nodeType, session);

    // 2. Get variant distribution
    const variantMix = VARIANT_DISTRIBUTIONS[nodeType] || VARIANT_DISTRIBUTIONS.PRACTICE;

    // 3. Select game mode
    const gameMode = selectGameMode(nodeType, session, history);

    // 4. Get recent wrong questions
    const wrongQuestions = getWrongQuestions(subject);

    // 5. Score every question
    const scored = allQuestions.map(q => {
        const score = scoreQuestion(q, history, subject, wrongQuestions);
        // BOOST simulations slightly so they appear as "rewards" or active learning steps
        if (q.isSimulation) score.score += 100; 
        
        // ADD JITTER: Ensures different questions are picked when scores are tied (e.g. many "New" questions)
        score.score += (Math.random() * 8); 
        
        return { ...q, _score: score };
    });

    // 5. Sort by priority
    scored.sort((a, b) => b._score.score - a._score.score);

    // 6. Select questions
    const selected = [];
    const selectedIds = [];

    for (const q of scored) {
        if (selected.length >= questLength) break;
        if (!validateSpacing(q.id, selectedIds)) continue;
        if (frustration.score > 70 && q._score.mastery === 'new') continue;

        selected.push(q);
        selectedIds.push(q.id);
    }

    // 7. Final questions processing
    let finalQuestions = shuffleArray(selected).map(({ _score, ...q }) => q);

    // 8. DYNAMIC INJECTION (Recaps & Extras)
    const accuracy = history.slice(-5).filter(a => a.isCorrect).length / Math.max(1, Math.min(5, history.length));

    // STREAK PUZZLE (Fallback injection if no sims were picked naturally)
    const hasSim = finalQuestions.some(q => q.isSimulation);
    if (!hasSim && session.consecutiveCorrect >= 2 && nodeType !== 'MASTERY') {
        const availableSims = allQuestions.filter(q => q.isSimulation && !finalQuestions.some(sq => sq.id === q.id));
        if (availableSims.length > 0) {
            // Pick a random simulation from the pool instead of just the first one
            const puzzle = availableSims[Math.floor(Math.random() * availableSims.length)];
            finalQuestions.push(puzzle);
            console.log(`🎁 [Adaptive] Injected Random Simulation via Streak: ${puzzle.id}`);
        }
    }

    // FRUSTRATION RECAP
    if (frustration.score > 60 && nodeType !== 'WARMUP') {
        const recap = allQuestions.find(q => q.isSimulation && (q.id.includes('study') || q.id.includes('recap')));
        if (recap && !finalQuestions.some(q => q.id === recap.id)) {
            const injectionIdx = Math.min(2, Math.floor(finalQuestions.length / 2));
            finalQuestions.splice(injectionIdx, 0, recap);
            console.log(`🧠 [Adaptive] Injected Study Recap: ${recap.id}`);
        }
    }

    return {
        questions: finalQuestions,
        questLength,
        gameMode,
        variantMix,
        metadata: {
            frustration: frustration.score,
            frustrationLevel: frustration.level,
            totalPool: allQuestions.length,
            selectedCount: finalQuestions.length,
            nodeType,
            subject,
            questKey,
        },
    };
}

// ─── Warmup Check (from mastery-calculator.js) ───────────────────────────────

/**
 * Determine if the student needs a warmup before starting.
 */
export function needsWarmup(subject) {
    const history = getAnswerHistory(subject);
    if (history.length === 0) return true; // New user

    const lastAnswer = history[history.length - 1];
    if (lastAnswer?.answeredAt) {
        const hoursSince = (Date.now() - new Date(lastAnswer.answeredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 12) return true; // 12+ hours since last session
    }

    const session = getSession();
    return session.questionsAnswered % 20 === 0; // Every 20 questions
}

// ─── Utility ────────────────────────────────────────────────────────────────

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
