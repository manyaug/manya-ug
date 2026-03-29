import { calculateFrustration } from './psychTracker';
import { parseQuestionId, areSameConcept } from '../utils/questionParser';
import { masteryService } from './masteryService';

/**
 * MANYA ADAPTIVE ENGINE (V2)
 * ==========================
 * The intelligent brain of the Manya learning system.
 * Implements: 6-Factor Priority Scoring, 7-State Mastery Ladder, 
 *             2:1 PLE Pool Ratio, and Spaced Repetition.
 */

// ── CONSTANTS & CONFIG ──────────────────────────────────────────────────────

const VARIANT_DISTRIBUTIONS = {
    WARMUP:    { V1: 1.00, V2: 0.00, V3: 0.00 },
    EXPLORE:   { V1: 0.60, V2: 0.30, V3: 0.10 },
    PRACTICE:  { V1: 0.30, V2: 0.50, V3: 0.20 },
    REINFORCE: { V1: 0.20, V2: 0.40, V3: 0.40 },
    MASTERY:   { V1: 0.10, V2: 0.20, V3: 0.70 },
};

const BASE_LENGTHS = { WARMUP: 4, EXPLORE: 8, PRACTICE: 10, REINFORCE: 12, MASTERY: 15 };

const MASTERY_WEIGHTS = {
    new: 100,
    struggling_v1: 90,
    struggling_v2: 85,
    struggling_v3: 80,
    learning: 60,
    ready_for_v2: 50,
    ready_for_v3: 50,
    mastered: 20,
};

// ── CORE ADAPTIVE LOGIC ─────────────────────────────────────────────────────

/**
 * Scoring Factor 1-6 Implementation
 */
export async function scoreQuestion(question, history, subject, subjectMasteryMap) {
    let score = 0;
    const factors = [];

    const { baseId: conceptId, variant } = parseQuestionId(question.id);
    const mastery = subjectMasteryMap[conceptId] || 'new';

    // 1. Mastery Level Weight (Base Score)
    const baseWeight = MASTERY_WEIGHTS[mastery] || 60;
    score += baseWeight;
    factors.push(`mastery_${mastery}`);

    // 2. Freshness / Spaced Repetition
    const conceptAnswers = history.filter(ans => (ans.concept_id || parseQuestionId(ans.questionId).baseId) === conceptId);
    const lastSeen = conceptAnswers.length > 0 ? new Date(conceptAnswers[conceptAnswers.length - 1].answeredAt) : null;
    
    if (lastSeen) {
        const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 7 && mastery === 'mastered') {
            score += 40; // Due for review
            factors.push('spaced_rep_due');
        } else if (daysSince < 0.1) {
            score -= 100; // Penalize repeats in same session (spacing)
            factors.push('repeat_penalty');
        }
    } else {
        score += 30; // Never seen bonus
        factors.push('never_seen');
    }

    // 3. PLE Boost (Exam Readiness)
    const isPLE = question.pool === 'yes' || question.isPLE;
    if (isPLE) {
        score = score * 1.5;
        factors.push('ple_priority');
    }

    // 4. Frustration Mercy
    // (Handled partially in selection, but here we penalize high-difficulty if frustrated)
    // frustration logic injected via generator

    // 5. Hint Dependency
    const hintCount = conceptAnswers.filter(a => a.hintUsed).length;
    if (conceptAnswers.length > 0 && (hintCount / conceptAnswers.length) > 0.3) {
        score += 30;
        factors.push('high_hint_dependency');
    }

    // 6. Difficulty Matching (Variant Logic)
    // We boost the question if its variant matches the mastery "Ready" state
    if (mastery === 'ready_for_v2' && variant === 'V2') score += 50;
    else if (mastery === 'ready_for_v3' && variant === 'V3') score += 50;
    else if (mastery === 'new' && variant === 'V1') score += 50;
    else if (mastery.startsWith('struggling') && variant === 'V1') score += 60;

    return { score, factors, mastery };
}

/**
 * PLE Ratio Selector (2:1 Ratio)
 */
function selectTargetPool(history) {
    const recent = history.slice(-10);
    const pleCount = recent.filter(a => a.pool === 'yes' || a.is_ple).length;
    const practiceCount = recent.filter(a => a.pool === 'no' || !a.is_ple).length;
    
    // Target: 66% PLE (2:1)
    if (pleCount < practiceCount * 2) return 'yes';
    return 'no';
}

/**
 * Spacing Validator
 */
function validateSpacing(questionId, selected, minSpacing = 3) {
    const { baseId: conceptId } = parseQuestionId(questionId);
    const window = selected.slice(-minSpacing);
    return !window.some(q => parseQuestionId(q.id).baseId === conceptId);
}

// ── MAIN API — GENERATE ADAPTIVE QUEST ──────────────────────────────────────

/**
 * The entry point for all Subject Fetcher Engines.
 */
export async function generateAdaptiveQuest(allQuestions, nodeType, subject, questKey, session, history, resources = []) {
    console.log(`🧠 [Adaptive] Generating ${nodeType} quest for ${subject}...`);
    
    const frustration = calculateFrustration(session);
    const subjectMasteryMap = await masteryService.getSubjectMasteryOverview(subject);
    const targetPool = selectTargetPool(history);
    const questLength = BASE_LENGTHS[nodeType] || 10;

    let availableQuestions = allQuestions;

    // Boss Test Strict Constraint: Mastery must strictly be Hard + PLE questions
    if (nodeType === 'MASTERY') {
        const strictQuestions = allQuestions.filter(q => 
            (q.difficulty === 'hard' || q.difficulty === 'H') && 
            (q.pool === 'yes' || q.isPLE || q.is_ple)
        );
        if (strictQuestions.length > 0) {
            availableQuestions = strictQuestions;
        } else {
            console.warn("🚨 [Adaptive] Insufficient Hard/PLE questions for Mastery. Relaxing constraint to just PLE.");
            const fallback = allQuestions.filter(q => q.pool === 'yes' || q.isPLE || q.is_ple);
            availableQuestions = fallback.length > 0 ? fallback : allQuestions;
        }
    }

    // 1. Filter & Score
    const candidates = await Promise.all(availableQuestions.map(async q => {
        const metadata = await scoreQuestion(q, history, subject, subjectMasteryMap);
        
        // Mercy Rule: If frustrated, hard-block V3 and difficult MCQs
        if (frustration.score > 70 && (q.variant === 'V3' || q.difficulty === 'H')) {
            metadata.score = -1000;
        }

        return { ...q, _adaptive: metadata };
    }));

    // 2. Sort by Score
    candidates.sort((a, b) => b._adaptive.score - a._adaptive.score);

    // 3. Selection with Spacing & Variety
    const selected = [];
    const usedConceptIds = new Set();

    for (const q of candidates) {
        if (selected.length >= questLength) break;
        
        // Ensure spacing (don't show same concept too close)
        if (!validateSpacing(q.id, selected, 3)) continue;

        // Try to maintain the target pool (PLE vs Practice) if possible
        const isTargetMatch = (q.pool === targetPool || q.isPLE === (targetPool === 'yes'));
        
        // If we have enough candidates, be picky about the pool
        if (selected.length < questLength - 2 && !isTargetMatch && Math.random() < 0.7) {
            continue; 
        }

        selected.push(q);
    }

    // 4. Final Processing & Jitter
    const finalQuestions = selected.sort(() => Math.random() - 0.5);

    // 5. Mode Selection (Standard vs Quickfire)
    const gameMode = (frustration.score < 30 && subjectMasteryMap['total'] > 50) ? 'quickfire' : 'standard';

    return {
        questions: finalQuestions,
        questLength: finalQuestions.length,
        metadata: {
            frustration: frustration.score,
            subjectMasteryMap,
            nodeType,
            subject,
            pleRatio: targetPool,
            gameMode
        }
    };
}

/**
 * Determine if a Warmup is needed based on time and performance
 */
export function needsWarmup(history, session) {
    if (!history || history.length === 0) return true;

    // Time-based check (>12 hours)
    const lastAnswer = history[history.length - 1];
    if (lastAnswer?.answeredAt) {
        const hoursSince = (Date.now() - new Date(lastAnswer.answeredAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 12) return true;
    }

    // Performance-based (struggling in current session)
    if (session.consecutiveWrong >= 3) return true;

    return false;
}
