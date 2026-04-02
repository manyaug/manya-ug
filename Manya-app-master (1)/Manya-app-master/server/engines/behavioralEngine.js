// Tracks patterns, streaks, habits

async function updateStreak(userId, pool) {
    try {
        const result = await pool.query(
            `SELECT "lastActiveDate", "currentStreak", "longestStreak" 
             FROM user_stats WHERE "userId" = $1`,
            [userId]
        );
        
        const today = new Date().toDateString();
        let currentStreak = 1;
        let longestStreak = 1;
        
        if (result.rows.length > 0) {
            const lastActive = result.rows[0].lastActiveDate;
            currentStreak = result.rows[0].currentStreak || 0;
            longestStreak = result.rows[0].longestStreak || 0;
            
            if (lastActive) {
                const lastDate = new Date(lastActive).toDateString();
                if (lastDate === today) {
                    // Already active today, no change
                    return { currentStreak, longestStreak };
                }
                
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastDate === yesterday.toDateString()) {
                    // Consecutive day
                    currentStreak += 1;
                } else {
                    // Streak broken
                    currentStreak = 1;
                }
            }
            
            longestStreak = Math.max(longestStreak, currentStreak);
            
            await pool.query(
                `UPDATE user_stats SET 
                    "currentStreak" = $1, 
                    "longestStreak" = $2,
                    "lastActiveDate" = $3,
                    "updatedAt" = NOW()
                 WHERE "userId" = $4`,
                [currentStreak, longestStreak, new Date(), userId]
            );
        } else {
            // First time user
            await pool.query(
                `INSERT INTO user_stats ("userId", "currentStreak", "longestStreak", "lastActiveDate")
                 VALUES ($1, $2, $3, $4)`,
                [userId, 1, 1, new Date()]
            );
        }
        
        return { currentStreak, longestStreak };
    } catch (err) {
        console.error('Error updating streak:', err);
        return { currentStreak: 0, longestStreak: 0 };
    }
}

function analyzeAnswerPattern(userAnswers) {
    const patterns = {
        guessingRate: 0,
        deepThinkingRate: 0,
        hintDependency: 0,
        averageTime: 0,
        consistency: 0
    };
    
    if (!userAnswers || userAnswers.length === 0) return patterns;
    
    const total = userAnswers.length;
    let fastGuesses = 0;
    let slowThoughtful = 0;
    let hints = 0;
    let totalTime = 0;
    
    userAnswers.forEach(a => {
        if (a.timeSpentMs < 5000) fastGuesses++;
        if (a.timeSpentMs > 30000) slowThoughtful++;
        if (a.hintUsed) hints++;
        totalTime += a.timeSpentMs || 0;
    });
    
    patterns.guessingRate = Math.round((fastGuesses / total) * 100);
    patterns.deepThinkingRate = Math.round((slowThoughtful / total) * 100);
    patterns.hintDependency = Math.round((hints / total) * 100);
    patterns.averageTime = Math.round(totalTime / total / 1000);
    
    return patterns;
}

function predictOptimalSessionTime(userHistory) {
    if (!userHistory || userHistory.length === 0) {
        return { recommended: 15, reason: 'New user - start with 15 min' };
    }
    
    // Analyze when user performs best
    const performanceByHour = {};
    userHistory.forEach(s => {
        const hour = new Date(s.answeredAt).getHours();
        if (!performanceByHour[hour]) {
            performanceByHour[hour] = { correct: 0, total: 0 };
        }
        performanceByHour[hour].total++;
        if (s.isCorrect) performanceByHour[hour].correct++;
    });
    
    let bestHour = 8; // Default
    let bestAccuracy = 0;
    
    Object.entries(performanceByHour).forEach(([hour, data]) => {
        const accuracy = data.correct / data.total;
        if (accuracy > bestAccuracy && data.total >= 5) {
            bestAccuracy = accuracy;
            bestHour = parseInt(hour);
        }
    });
    
    return {
        recommended: 20,
        bestTime: bestHour,
        reason: `You learn best around ${bestHour}:00`
    };
}

module.exports = {
    updateStreak,
    analyzeAnswerPattern,
    predictOptimalSessionTime
};