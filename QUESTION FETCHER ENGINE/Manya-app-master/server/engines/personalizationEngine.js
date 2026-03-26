// Handles variant progression, mastery levels, spaced repetition
const pool = require('../config/database');

const REVIEW_INTERVALS = [1, 7, 30, 90];

function parseQuestionId(qId) {
    if (!qId) return { baseId: 'unknown', variant: 'V1', variantNum: 1 };
    const match = qId.match(/^(.+)-V(\d+)$/);
    if (match) {
        return {
            baseId: match[1],
            variant: 'V' + match[2],
            variantNum: parseInt(match[2])
        };
    }
    return { baseId: qId, variant: 'V1', variantNum: 1 };
}

function getRecommendedVariant(userAnswers, baseId) {
    const conceptAnswers = (userAnswers || []).filter(a => {
        const parsed = parseQuestionId(a.q_id);
        return parsed.baseId === baseId;
    });
    
    if (conceptAnswers.length === 0) {
        return { variant: 'V1', reason: '🌱 New concept - start with V1' };
    }
    
    const v1Answers = conceptAnswers.filter(a => a.q_id.endsWith('-V1'));
    const v2Answers = conceptAnswers.filter(a => a.q_id.endsWith('-V2'));
    
    const v1Accuracy = v1Answers.length > 0 
        ? v1Answers.filter(a => a.is_correct).length / v1Answers.length 
        : 0;
    
    if (v1Answers.length < 3 || v1Accuracy < 0.7) {
        if (v1Answers.length < 3) {
            return { 
                variant: 'V1', 
                reason: `📝 Need ${3 - v1Answers.length} more V1 attempts` 
            };
        } else {
            return { 
                variant: 'V1', 
                reason: `📝 V1 accuracy ${Math.round(v1Accuracy * 100)}% - need 70%` 
            };
        }
    }
    
    if (!v2Answers.length) {
        return { variant: 'V2', reason: '🌿 V1 mastered! Ready for V2' };
    }
    
    const v2Accuracy = v2Answers.length > 0 
        ? v2Answers.filter(a => a.is_correct).length / v2Answers.length 
        : 0;
    
    if (v2Answers.length < 3 || v2Accuracy < 0.7) {
        if (v2Answers.length < 3) {
            return { 
                variant: 'V2', 
                reason: `📝 Need ${3 - v2Answers.length} more V2 attempts` 
            };
        } else {
            return { 
                variant: 'V2', 
                reason: `📝 V2 accuracy ${Math.round(v2Accuracy * 100)}% - need 70%` 
            };
        }
    }
    
    return { variant: 'V3', reason: '🌳 Ready for V3' };
}

function calculateNextReview(lastReviewDate, masteryLevel, reviewCount = 0, wasCorrect = true) {
    const lastDate = new Date(lastReviewDate);
    const intervalIndex = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
    let interval = REVIEW_INTERVALS[intervalIndex];
    
    if (!wasCorrect) interval = Math.max(1, Math.floor(interval * 0.5));
    else if (masteryLevel === 'mastered') interval = Math.floor(interval * 1.5);
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + interval);
    
    return { nextReview: nextDate, interval };
}

function calculateMasteryLevel(conceptStats) {
    const { totalAttempts, totalCorrect, correctStreak } = conceptStats;
    if (totalAttempts === 0) return 'new';
    const accuracy = totalCorrect / totalAttempts;
    if (accuracy >= 0.9 && totalAttempts >= 10 && correctStreak >= 5) return 'mastered';
    if (accuracy >= 0.8 && totalAttempts >= 5) return 'progressing';
    if (accuracy >= 0.6) return 'learning';
    return 'struggling';
}

function getReviewPriority(concept) {
    if (!concept || !concept.nextReviewAt) return 0;
    const now = new Date();
    const nextReview = new Date(concept.nextReviewAt);
    if (now < nextReview) return 0;
    const daysOverdue = Math.floor((now - nextReview) / (1000 * 60 * 60 * 24));
    return 40 + Math.min(40, daysOverdue * 5);
}

module.exports = {
    parseQuestionId,
    getRecommendedVariant,
    calculateNextReview,
    calculateMasteryLevel,
    getReviewPriority
};