// server/engines/psychologicalEngine.js
const pool = require('../config/database');

class PsychologicalEngine {
    // Calculate frustration based on multiple factors
    calculateFrustration(userState) {
        let score = 0;
        const factors = [];
        
        // 1. Consecutive wrong answers (goal-blocking)
        if (userState.consecutiveWrong >= 3) {
            score += 30;
            factors.push('3+ wrong');
            if (userState.consecutiveWrong >= 5) {
                score += 20;
                factors.push('5+ wrong');
            }
        }
        
        // 2. Time stuck on same concept
        if (userState.timeOnConcept > 120) { // 2+ minutes
            score += 25;
            factors.push('stuck >2min');
        }
        
        // 3. Excessive hint usage
        if (userState.hintUsageRate > 0.5) {
            score += 20;
            factors.push('hint dependent');
        }
        
        // 4. Answer changes (hesitation)
        if (userState.answerChangeCount > 2) {
            score += 15;
            factors.push('multiple changes');
        }
        
        // 5. Performance drop from baseline
        if (userState.accuracyDrop > 20) {
            score += 15;
            factors.push('accuracy drop');
        }
        
        return {
            score: Math.min(100, score),
            factors,
            level: score > 70 ? 'high' : score > 40 ? 'medium' : 'low'
        };
    }
    
    // Calculate hesitation based on answer changes and time
    calculateHesitation(questionMetrics) {
        let score = 0;
        const events = [];
        
        // PRIMARY: Answer changes (YOU WERE RIGHT!)
        if (questionMetrics.answerChanged) {
            score += 40;
            events.push('changed answer');
            
            if (questionMetrics.changeCount >= 2) {
                score += 20;
                events.push('multiple changes');
            }
        }
        
        // Response time analysis
        const responseTime = questionMetrics.timeSpentMs / 1000;
        const baselineTime = 15; // seconds
        
        if (responseTime > baselineTime * 2) {
            score += 25;
            events.push('very slow');
        } else if (responseTime > baselineTime * 1.5) {
            score += 15;
            events.push('slow');
        }
        
        // Hint usage indicates uncertainty
        if (questionMetrics.hintUsed) {
            score += 15;
            events.push('used hint');
        }
        
        return {
            score: Math.min(100, score),
            events,
            level: score > 60 ? 'high' : score > 30 ? 'medium' : 'low'
        };
    }
    
    // Save to database
    async saveMetrics(userId, metrics) {
        try {
            await pool.query(
                `INSERT INTO user_metrics (
                    "userId", "frustrationScore", "hesitationScore", 
                    "answerChanges", "consecutiveWrong", "timestamp"
                ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                [userId, metrics.frustration, metrics.hesitation, 
                 metrics.answerChanges, metrics.consecutiveWrong]
            );
        } catch (err) {
            console.error('Error saving metrics:', err);
        }
    }
}

module.exports = new PsychologicalEngine();