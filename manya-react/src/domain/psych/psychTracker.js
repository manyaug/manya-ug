/**
 * MANYA PSYCHOLOGICAL TRACKER
 * ============================
 * Real-time frustration and hesitation tracking.
 * Ported from: QUESTION FETCHER ENGINE/server/engines/psychologicalEngine.js
 *
 * These scores influence the adaptive engine:
 * - Frustration > 70 → serve easier questions, disable game modes
 * - High hesitation → add encouragement, consider study sim
 */

// ─── Frustration Calculator ─────────────────────────────────────────────────

/**
 * Calculate current frustration score based on session state.
 * @param {object} sessionState - from userStateService.getSession()
 * @returns {{ score: number, factors: string[], level: 'low'|'medium'|'high' }}
 */
export function calculateFrustration(sessionState) {
    let score = 0;
    const factors = [];

    // 1. Consecutive wrong answers (goal-blocking)
    if (sessionState.consecutiveWrong >= 3) {
        score += 30;
        factors.push('3+ wrong');
        if (sessionState.consecutiveWrong >= 5) {
            score += 20;
            factors.push('5+ wrong');
        }
    }

    // 2. Excessive hint usage
    const totalQ = sessionState.questionsAnswered || 1;
    const hintRate = sessionState.hintCount / totalQ;
    if (hintRate > 0.5) {
        score += 20;
        factors.push('hint dependent');
    }

    // 3. Multiple answer changes
    if (sessionState.answerChangeCount > 2) {
        score += 15;
        factors.push('multiple changes');
    }

    // 4. Use the running frustration from session
    score = Math.max(score, sessionState.frustrationLevel || 0);

    return {
        score: Math.min(100, score),
        factors,
        level: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
    };
}

// ─── Hesitation Calculator ──────────────────────────────────────────────────

/**
 * Calculate hesitation for a single answer.
 * @param {{ answerChanged: boolean, changeCount: number, timeSpentMs: number, hintUsed: boolean }}
 * @returns {{ score: number, events: string[], level: 'low'|'medium'|'high' }}
 */
export function calculateHesitation({ answerChanged, changeCount = 0, timeSpentMs, hintUsed }) {
    let score = 0;
    const events = [];

    // PRIMARY: Answer changes
    if (answerChanged) {
        score += 40;
        events.push('changed answer');
        if (changeCount >= 2) {
            score += 20;
            events.push('multiple changes');
        }
    }

    // Response time analysis (baseline = 15 seconds)
    const responseTime = timeSpentMs / 1000;
    if (responseTime > 30) {
        score += 25;
        events.push('very slow');
    } else if (responseTime > 22.5) {
        score += 15;
        events.push('slow');
    }

    // Hint usage
    if (hintUsed) {
        score += 15;
        events.push('used hint');
    }

    return {
        score: Math.min(100, score),
        events,
        level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
    };
}

// ─── Trend Detection ────────────────────────────────────────────────────────

/**
 * Detect if the student is improving, stable, or declining.
 * @param {Array} recentAnswers - last 10 answers from history
 * @returns {'improving' | 'stable' | 'declining'}
 */
export function detectTrend(recentAnswers) {
    if (!recentAnswers || recentAnswers.length < 10) return 'stable';

    const recent5 = recentAnswers.slice(0, 5);
    const previous5 = recentAnswers.slice(5, 10);

    const recentCorrect = recent5.filter(a => a.isCorrect).length / 5;
    const previousCorrect = previous5.filter(a => a.isCorrect).length / 5;

    if (recentCorrect > previousCorrect + 0.2) return 'improving';
    if (recentCorrect < previousCorrect - 0.2) return 'declining';
    return 'stable';
}

/**
 * Calculate historical psychological state (The Brain 🧠)
 * @param {Array} telemetry - from syncService.fetchRecentTelemetry()
 */
export function calculateHistoricalPsych(telemetry) {
    if (!telemetry || telemetry.length === 0) return { avgFrustration: 0, avgConfidence: 10, trend: 'stable' };
    
    const validF = telemetry.filter(t => t.frustration_level !== undefined);
    const avgFrustration = validF.length > 0 
        ? validF.reduce((sum, t) => sum + t.frustration_level, 0) / validF.length 
        : 0;

    const validC = telemetry.filter(t => t.confidence_rating !== undefined);
    const avgConfidence = validC.length > 0
        ? validC.reduce((sum, t) => sum + t.confidence_rating, 0) / validC.length
        : 10;
    
    const half = Math.floor(telemetry.length / 2);
    const recent = telemetry.slice(0, half);
    const older = telemetry.slice(half);
    
    const recentCorrect = recent.filter(t => t.is_correct).length / (recent.length || 1);
    const olderCorrect = older.filter(t => t.is_correct).length / (older.length || 1);
    
    let trend = 'stable';
    if (recentCorrect > olderCorrect + 0.1) trend = 'improving';
    else if (recentCorrect < olderCorrect - 0.1) trend = 'declining';
    
    return { avgFrustration, avgConfidence, trend };
}
