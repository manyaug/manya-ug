import { ManyaDB } from '../../infrastructure/db/manyaDB.js';

/**
 * MANYA MASTERY SERVICE
 * =====================
 * Calculates student mastery for any given concept based on historical performance.
 * Implements the 7-state mastery ladder:
 * new | struggling_v1 | learning | ready_for_v2 | struggling_v2 | ready_for_v3 | mastered
 */
export const masteryService = {
    
    /**
     * Parse a Q_ID into its base ConceptID and Variant (V1/V2/V3)
     */
    parseId(qId) {
        if (!qId) return { conceptId: 'unknown', variant: 'V1' };
        
        // Handle standard formats: "concept_name-V1", "concept_name-V2", etc.
        const parts = qId.split('-');
        const lastPart = parts[parts.length - 1];
        
        if (lastPart.startsWith('V') && lastPart.length <= 3) {
            const variantNum = lastPart; // "V1", "V2", "V3"
            const conceptId = parts.slice(0, -1).join('-');
            return { conceptId, variant: variantNum };
        }
        
        return { conceptId: qId, variant: 'V1' };
    },

    /**
     * Calculate 7-state mastery for a specific concept
     */
    async getConceptMastery(subject, conceptId) {
        const history = await ManyaDB.getAnswerHistory(subject);
        
        // Filter history for this specific concept
        const conceptAnswers = history.filter(ans => {
            const parsed = this.parseId(ans.questionId);
            return parsed.conceptId === conceptId || ans.concept_id === conceptId;
        });

        if (conceptAnswers.length === 0) return 'new';

        // Group results by variant
        const stats = {
            V1: { attempts: 0, correct: 0 },
            V2: { attempts: 0, correct: 0 },
            V3: { attempts: 0, correct: 0 }
        };

        conceptAnswers.forEach(ans => {
            const v = ans.variant || this.parseId(ans.questionId).variant;
            if (stats[v]) {
                stats[v].attempts++;
                if (ans.isCorrect) stats[v].correct++;
            }
        });

        const v1Acc = stats.V1.attempts > 0 ? stats.V1.correct / stats.V1.attempts : 0;
        const v2Acc = stats.V2.attempts > 0 ? stats.V2.correct / stats.V2.attempts : 0;
        const v3Acc = stats.V3.attempts > 0 ? stats.V3.correct / stats.V3.attempts : 0;

        // ── MASTERY LADDER LOGIC ──
        
        // 1. Mastered (V3 Mastery)
        if (stats.V3.attempts >= 3 && v3Acc >= 0.8) return 'mastered';
        
        // 2. Ready for V3
        if (stats.V2.attempts >= 3 && v2Acc >= 0.8) return 'ready_for_v3';
        
        // 3. Ready for V2
        if (stats.V1.attempts >= 3 && v1Acc >= 0.8) return 'ready_for_v2';
        
        // 4. Struggling Logic
        if (stats.V3.attempts >= 2 && v3Acc < 0.6) return 'struggling_v3';
        if (stats.V2.attempts >= 2 && v2Acc < 0.6) return 'struggling_v2';
        if (stats.V1.attempts >= 2 && v1Acc < 0.6) return 'struggling_v1';
        
        // 5. Default Learning State
        return 'learning';
    },

    /**
     * Get mastery overview for an entire subject's concepts
     * Returns Map: { conceptId: 'mastery_state' }
     */
    async getSubjectMasteryOverview(subject) {
        const history = await ManyaDB.getAnswerHistory(subject);
        const conceptsMap = new Map();

        // Pass 1: Categorize all answers by concept
        history.forEach(ans => {
            const { conceptId } = this.parseId(ans.questionId);
            const actualConceptId = ans.concept_id || conceptId;
            
            if (!conceptsMap.has(actualConceptId)) {
                conceptsMap.set(actualConceptId, {
                    V1: { attempts: 0, correct: 0 },
                    V2: { attempts: 0, correct: 0 },
                    V3: { attempts: 0, correct: 0 }
                });
            }
            
            const v = ans.variant || this.parseId(ans.questionId).variant || 'V1';
            const node = conceptsMap.get(actualConceptId);
            if (node[v]) {
                node[v].attempts++;
                if (ans.isCorrect) node[v].correct++;
            }
        });

        // Pass 2: Calculate states
        const result = {};
        conceptsMap.forEach((stats, conceptId) => {
            const v1Acc = stats.V1.attempts > 0 ? stats.V1.correct / stats.V1.attempts : 0;
            const v2Acc = stats.V2.attempts > 0 ? stats.V2.correct / stats.V2.attempts : 0;
            const v3Acc = stats.V3.attempts > 0 ? stats.V3.correct / stats.V3.attempts : 0;

            let state = 'learning';
            if (stats.V3.attempts >= 3 && v3Acc >= 0.8) state = 'mastered';
            else if (stats.V2.attempts >= 3 && v2Acc >= 0.8) state = 'ready_for_v3';
            else if (stats.V1.attempts >= 3 && v1Acc >= 0.8) state = 'ready_for_v2';
            else if (stats.V3.attempts >= 2 && v3Acc < 0.6) state = 'struggling_v3';
            else if (stats.V2.attempts >= 2 && v2Acc < 0.6) state = 'struggling_v2';
            else if (stats.V1.attempts >= 2 && v1Acc < 0.6) state = 'struggling_v1';

            result[conceptId] = state;
        });

        return result;
    }
};
