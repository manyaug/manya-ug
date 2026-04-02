/**
 * MANYA CONCEPT MASTERY SERVICE
 * ==============================
 * Persistently tracks per-concept mastery state, correct streaks,
 * and spaced repetition review schedules.
 * 
 * Ported from: Manya-app-master/server-enhanced.js (concept_mastery logic)
 * 
 * Storage: IndexedDB (concept_mastery store) + Supabase sync
 */

import { ManyaDB } from '../utils/manyaDB';
import { syncService } from './syncService';
import { spacedRepetitionService } from './spacedRepetitionService';

// ── Mastery Level Calculator ────────────────────────────────────────────────
// Ported from server-enhanced.js calculateMasteryLevel()

function calculateMasteryLevelFromStats({ totalAttempts, totalCorrect, correctStreak }) {
    if (totalAttempts === 0) return 'new';

    const accuracy = totalCorrect / totalAttempts;

    if (accuracy >= 0.9 && totalAttempts >= 10 && correctStreak >= 5) return 'mastered';
    if (accuracy >= 0.8 && totalAttempts >= 5)  return 'ready_for_v3';
    if (accuracy >= 0.7 && totalAttempts >= 3)  return 'ready_for_v2';
    if (accuracy >= 0.6)                        return 'learning';
    if (totalAttempts >= 2 && accuracy < 0.6)   return 'struggling_v1';

    return 'learning';
}

// ── Service ─────────────────────────────────────────────────────────────────

export const conceptMasteryService = {

    /**
     * Get or create a mastery record for a concept.
     */
    async getConceptRecord(subject, baseId) {
        const existing = await ManyaDB.getConceptMastery(subject, baseId);
        if (existing) return existing;

        // Create default record
        const record = {
            id: `${subject}::${baseId}`,
            subject,
            baseId,
            masteryLevel: 'new',
            reviewCount: 0,
            lastReviewedAt: null,
            nextReviewAt: null,
            correctStreak: 0,
            totalAttempts: 0,
            totalCorrect: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await ManyaDB.upsertConceptMastery(record);
        return record;
    },

    /**
     * Update concept mastery after an answer.
     * This is the critical function called by every Fetcher Engine.
     */
    async updateAfterAnswer(subject, baseId, wasCorrect) {
        try {
            const record = await this.getConceptRecord(subject, baseId);
            const now = new Date();

            // Update stats
            record.totalAttempts += 1;
            if (wasCorrect) {
                record.totalCorrect += 1;
                record.correctStreak += 1;
            } else {
                record.correctStreak = 0;
            }

            // Recalculate mastery level
            record.masteryLevel = calculateMasteryLevelFromStats({
                totalAttempts: record.totalAttempts,
                totalCorrect: record.totalCorrect,
                correctStreak: record.correctStreak
            });

            // Calculate next review date using spaced repetition
            const { nextReview, interval } = spacedRepetitionService.calculateNextReview(
                now,
                record.masteryLevel,
                record.reviewCount,
                wasCorrect
            );

            // Only increment reviewCount if they got it right 
            // (prevents pushing struggling students into 90-day cycles)
            if (wasCorrect) {
                record.reviewCount += 1;
            }
            
            record.lastReviewedAt = now.toISOString();
            record.nextReviewAt = nextReview.toISOString();
            record.updatedAt = now.toISOString();

            // Persist locally
            await ManyaDB.upsertConceptMastery(record);

            // Sync to Supabase (fire-and-forget)
            syncService.pushConceptMastery(subject, record).catch(e =>
                console.warn('[ConceptMastery] Sync failed, will retry:', e.message)
            );

            console.log(`📊 [ConceptMastery] ${baseId}: ${record.masteryLevel} | streak=${record.correctStreak} | next review in ${interval}d`);

            return record;
        } catch (err) {
            console.error('[ConceptMastery] updateAfterAnswer error:', err);
            return null;
        }
    },

    /**
     * Get all concepts due for spaced repetition review.
     */
    async getDueReviews(subject) {
        const all = await ManyaDB.getAllConceptMastery(subject);
        const now = new Date();

        return all
            .filter(c => c.nextReviewAt && new Date(c.nextReviewAt) <= now)
            .map(c => ({
                ...c,
                daysOverdue: Math.floor((now - new Date(c.nextReviewAt)) / (1000 * 60 * 60 * 24)),
                priority: spacedRepetitionService.getReviewPriority(c)
            }))
            .sort((a, b) => b.priority - a.priority);
    },

    /**
     * Get a fast mastery overview for the adaptive engine.
     * Returns: { [baseId]: 'mastery_level' }
     * 
     * This replaces the slow masteryService.getSubjectMasteryOverview() when
     * concept_mastery records exist.
     */
    async getSubjectOverview(subject) {
        const all = await ManyaDB.getAllConceptMastery(subject);
        const result = {};

        for (const record of all) {
            result[record.baseId] = record.masteryLevel;
        }

        return result;
    },

    /**
     * Bulk-load concept mastery from Supabase on login.
     */
    async pullFromCloud(subject) {
        try {
            const uid = await syncService.getUserId();
            if (!uid) return [];

            const { supabase } = await import('./supabaseClient');
            const { data, error } = await supabase
                .from('concept_mastery')
                .select('*')
                .eq('user_id', uid)
                .eq('subject', subject);

            if (error || !data) return [];

            // Store locally
            for (const row of data) {
                const record = {
                    id: `${row.subject}::${row.base_id}`,
                    subject: row.subject,
                    baseId: row.base_id,
                    masteryLevel: row.mastery_level || 'new',
                    reviewCount: row.review_count || 0,
                    lastReviewedAt: row.last_reviewed_at,
                    nextReviewAt: row.next_review_at,
                    correctStreak: row.correct_streak || 0,
                    totalAttempts: row.total_attempts || 0,
                    totalCorrect: row.total_correct || 0,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
                await ManyaDB.upsertConceptMastery(record);
            }

            console.log(`☁️ [ConceptMastery] Pulled ${data.length} records for ${subject}`);
            return data;
        } catch (err) {
            console.warn('[ConceptMastery] Cloud pull failed:', err.message);
            return [];
        }
    }
};
