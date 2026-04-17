/**
 * MANYA SPACED REPETITION SERVICE
 * =================================
 * Implements the escalating review schedule: 1 → 7 → 30 → 90 days.
 * 
 * Ported from: Manya-app-master/server-enhanced.js (L170-228)
 * 
 * If a student gets a review WRONG, the interval shrinks by 50%.
 * If they get it RIGHT while mastered, the interval grows by 50%.
 */

const REVIEW_INTERVALS = [1, 7, 30, 90]; // Days

export const spacedRepetitionService = {

    /**
     * Calculate the next review date based on mastery state.
     * 
     * @param {Date}    lastReviewDate - When the concept was last practiced
     * @param {string}  masteryLevel   - 'new' | 'learning' | 'mastered' | etc.
     * @param {number}  reviewCount    - How many times this concept has been reviewed
     * @param {boolean} wasCorrect     - Whether the last answer was correct
     * @returns {{ nextReview: Date, interval: number, reason: string }}
     */
    calculateNextReview(lastReviewDate, masteryLevel, reviewCount = 0, wasCorrect = true) {
        const lastDate = new Date(lastReviewDate);

        // Pick the base interval from the escalation schedule
        const intervalIndex = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
        let interval = REVIEW_INTERVALS[intervalIndex];

        // Adjust based on performance
        if (!wasCorrect) {
            // Wrong answer → RESET to 1 day (Pedagogical fix v4.5)
            // If they fail, they must see it again tomorrow.
            interval = 1;
        } else if (masteryLevel === 'mastered' || masteryLevel === 'ready_for_v3') {
            // Mastered + correct → review LATER (50% longer)
            // Capped at 30 days to keep 'Mastered' content fresh
            interval = Math.min(30, Math.floor(interval * 1.5));
        }

        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + interval);

        return {
            nextReview: nextDate,
            interval,
            reason: wasCorrect
                ? `✅ Correct — next review in ${interval} day${interval !== 1 ? 's' : ''}`
                : `❌ Missed — reviewing sooner in ${interval} day${interval !== 1 ? 's' : ''}`
        };
    },

    /**
     * Calculate review priority for a concept.
     * Returns 0 if not due yet, 40+ if due, with +5 per day overdue.
     * 
     * @param {object} concept - Must have `nextReviewAt` field
     * @returns {number} Priority score (0 = not due, higher = more urgent)
     */
    getReviewPriority(concept) {
        if (!concept || !concept.nextReviewAt) return 0;

        const now = new Date();
        const nextReview = new Date(concept.nextReviewAt);

        // Not yet due
        if (now < nextReview) return 0;

        // Calculate how many days overdue
        const daysOverdue = Math.floor((now - nextReview) / (1000 * 60 * 60 * 24));

        // Base priority of 40 + 5 per day overdue (capped at +40)
        let priority = 40;
        priority += Math.min(40, daysOverdue * 5);

        return priority;
    },

    /**
     * Check if a concept is currently due for review.
     */
    isDueForReview(concept) {
        return this.getReviewPriority(concept) > 0;
    },

    /**
     * Get the review intervals for display/debug.
     */
    getIntervals() {
        return REVIEW_INTERVALS;
    }
};
