/**
 * MANYA EMOTION TRACKER (Headless)
 * ===================================
 * Ported from: manya_logic/server/services/gamificationService.js → trackEmotion()
 * Determines a student's emotion label + intensity from their live answer data.
 * Sends payloads to Supabase via syncService (fire-and-forget).
 */

import { syncService } from '../../infrastructure/sync/syncService.js';

// ── EMOTION CLASSIFIERS ──────────────────────────────────────────────────────

/**
 * Classify the student's emotional state from the current answer payload.
 * Returns an object ready to push to the `emotional_metrics` table.
 *
 * @param {{ isCorrect, hintUsed, answerChanged, changeCount, timeSpentMs, frustrationLevel }} answerMeta
 * @returns {{ emotion: string, intensity: number, context: string }}
 */
export function classifyEmotion(answerMeta) {
    const { isCorrect, hintUsed, answerChanged, changeCount = 0, timeSpentMs, frustrationLevel = 0 } = answerMeta;

    // ── HIGH FRUSTRATION CHECK (overrides all) ───────────────────────────────
    if (frustrationLevel > 70) {
        return {
            emotion: 'frustrated',
            intensity: Math.min(100, frustrationLevel),
            context: 'high_frustration_override'
        };
    }

    // ── HESITANT: Changed answer + used hint + slow ──────────────────────────
    let hesitationScore = 0;
    if (answerChanged) hesitationScore += 40;
    if (changeCount >= 2) hesitationScore += 20;
    if (hintUsed) hesitationScore += 15;
    if (timeSpentMs > 30000) hesitationScore += 25;

    if (hesitationScore >= 60) {
        return {
            emotion: 'hesitant',
            intensity: Math.min(100, hesitationScore),
            context: 'slow_uncertain_answer'
        };
    }

    // ── CONFIDENT: Correct + fast + no hints ────────────────────────────────
    if (isCorrect && !hintUsed && !answerChanged && timeSpentMs < 10000) {
        const intensity = timeSpentMs < 5000 ? 90 : 75;
        return {
            emotion: 'confident',
            intensity,
            context: 'fast_correct_no_hint'
        };
    }

    // ── STRUGGLING: Wrong + slow ─────────────────────────────────────────────
    if (!isCorrect && timeSpentMs > 20000) {
        return {
            emotion: 'frustrated',
            intensity: Math.min(100, 45 + frustrationLevel),
            context: 'wrong_and_slow'
        };
    }

    // ── DEFAULT: Neutral engagement ──────────────────────────────────────────
    return {
        emotion: 'engaged',
        intensity: 50,
        context: 'standard_answer'
    };
}

// ── EMOTIONAL MODIFIER CALCULATOR ────────────────────────────────────────────

/**
 * Given recent session emotions, return reward/unlock modifiers.
 * Matches logic in gamificationService.js → getEmotionalModifiers()
 *
 * @param {{ emotion: string, intensity: number }[]} recentEmotions
 * @returns {{ frustrationModifier: number, confidenceModifier: number, hesitationModifier: number }}
 */
export function getEmotionalModifiers(recentEmotions = []) {
    const modifiers = {
        frustrationModifier: 1.0,
        confidenceModifier: 1.0,
        hesitationModifier: 1.0,
    };

    for (const { emotion, intensity } of recentEmotions) {
        if (emotion === 'frustrated' && intensity > 70) {
            modifiers.frustrationModifier = 0.75; // Compassion: 25% less unlock cost
        }
        if (emotion === 'confident' && intensity > 80) {
            modifiers.confidenceModifier = 1.15; // Bonus 15% rewards
        }
        if (emotion === 'hesitant' && intensity > 60) {
            modifiers.hesitationModifier = 1.10; // Consolation +10%
        }
    }

    return modifiers;
}

// ── SUPABASE PUSH (Fire-and-forget) ─────────────────────────────────────────

/**
 * Classifies and immediately posts emotion data to Supabase.
 * Called from answer submit handlers. Non-blocking.
 *
 * @param {object} answerMeta - Same payload as classifyEmotion()
 */
export async function trackAndPushEmotion(answerMeta) {
    const classified = classifyEmotion(answerMeta);
    try {
        await syncService.pushEmotion(classified);
    } catch (_) {
        // Silent — emotions are analytics, never block the game
    }
}
