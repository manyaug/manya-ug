// priority-scorer.js - Add this at the top if you use QuestionParser
const QuestionParser = require('./question-parser');

// priority-scorer.js - Calculate question priority scores

class PriorityScorer {
    constructor(config = {}) {
        this.config = {
            newConceptWeight: 100,
            strugglingWeight: 80,
            learningWeight: 60,
            readyWeight: 50,
            masteredWeight: 20,
            reviewBonus: 40,
            hintPenalty: 30,
            markYesMultiplier: 1.5, // PLE-like questions get 50% boost
            ...config
        };
    }

    /**
     * Calculate priority score for a concept
     */
    scoreConcept(conceptId, variants, mastery, userProgress, mark) {
        let score = 0;
        const factors = [];
        
        // Base priority by mastery level
        switch(mastery) {
            case 'new':
                score += this.config.newConceptWeight;
                factors.push('new_concept');
                break;
            case 'struggling_v1':
            case 'struggling_v2':
            case 'struggling_v3':
                score += this.config.strugglingWeight;
                factors.push('struggling_needs_help');
                break;
            case 'learning':
                score += this.config.learningWeight;
                factors.push('in_progress');
                break;
            case 'ready_for_v2':
            case 'ready_for_v3':
                score += this.config.readyWeight;
                factors.push('ready_to_advance');
                break;
            case 'mastered':
                score += this.config.masteredWeight;
                factors.push('mastered');
                break;
        }
        
        // Mark boost (PLE-like questions)
        if (mark === 'yes') {
            score *= this.config.markYesMultiplier;
            factors.push('ple_style_question');
        }
        
        // Time since last practice (spaced repetition)
        const allVariants = variants.filter(v => v?.lastSeen);
        if (allVariants.length > 0) {
            const mostRecent = Math.max(...allVariants.map(v => new Date(v.lastSeen).getTime()));
            const daysSince = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24);
            
            if (daysSince > 7) {
                score += this.config.reviewBonus;
                factors.push('due_for_review');
            } else if (daysSince > 3) {
                score += this.config.reviewBonus / 2;
                factors.push('recent');
            }
        }
        
        // Hint usage boost (indicates difficulty)
        const totalHints = variants.reduce((sum, v) => sum + (v.hintsUsed || 0), 0);
        const totalAttempts = variants.reduce((sum, v) => sum + (v.attempts || 0), 0);
        
        if (totalAttempts > 0) {
            const hintRatio = totalHints / totalAttempts;
            if (hintRatio > 0.3) {
                score += this.config.hintPenalty;
                factors.push('high_hint_usage');
            }
        }
        
        // Topic sequentiality boost
        if (userProgress.currentTopic && userProgress.nextTopicInLine) {
            const isCurrentTopic = variants.some(v => 
                v.Q_ID.startsWith(userProgress.currentTopic)
            );
            const isNextTopic = variants.some(v => 
                v.Q_ID.startsWith(userProgress.nextTopicInLine)
            );
            
            if (isCurrentTopic) {
                score += 30;
                factors.push('current_topic');
            } else if (isNextTopic && userProgress.currentTopicMastered) {
                score += 20;
                factors.push('next_topic_ready');
            }
        }
        
        return { score: Math.round(score), factors };
    }

    /**
     * Select next question pool based on PLE ratio
     */
    selectPool(userStats, ratio = 2) {
        // ratio: 2 = 2:1 (66% PLE), 3 = 3:1 (75% PLE)
        if (!userStats || userStats.totalAnswers === 0) {
            return 'yes'; // Start with PLE-like for new users
        }
        
        const recentQuestions = userStats.recentQuestions || [];
        const recentMarkYes = recentQuestions.filter(q => q.mark === 'yes').length;
        const recentMarkNo = recentQuestions.filter(q => q.mark === 'no').length;
        
        // Maintain ratio over last N questions
        const targetYes = ratio;
        const targetNo = 1;
        const totalRecent = recentQuestions.length;
        
        if (totalRecent >= 4) {
            const yesRatio = recentMarkYes / totalRecent;
            const expectedRatio = targetYes / (targetYes + targetNo);
            
            if (yesRatio < expectedRatio) {
                return 'yes'; // Need more PLE questions
            } else {
                return 'no'; // Need more practice questions
            }
        }
        
        // Not enough history, use random with weighting
        const rand = Math.random() * (targetYes + targetNo);
        return rand < targetYes ? 'yes' : 'no';
    }

    /**
     * Ensure variant spacing (no same concept questions close together)
     */
    validateVariantSpacing(selectedQuestion, sessionHistory, minSpacing = 3) {
        if (!sessionHistory || sessionHistory.length === 0) return true;
        
        const parsed = QuestionParser.parseId(selectedQuestion.Q_ID);
        
        // Check last N questions for same concept
        const recentConcepts = sessionHistory
            .slice(-minSpacing)
            .map(q => QuestionParser.parseId(q.Q_ID).baseId);
        
        if (recentConcepts.includes(parsed.baseId)) {
            return false; // Same concept seen too recently
        }
        
        return true;
    }

    /**
     * Get warmup questions (easy, V1, from current topic)
     */
    async getWarmupSequence(currentTopic, count = 3) {
        return {
            questions: [], // Will be filled by database query
            reason: 'Warm-up session',
            count
        };
    }
}

module.exports = PriorityScorer;