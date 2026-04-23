/**
 * MANYA HEADLESS BEHAVIORAL ENGINE
 * =================================
 * Ported from D:\manya_garage\manya_logic\manya-app\server\engines\behavioralEngine.js
 * Decoupled from PostgreSQL. Operates purely in memory so React and .MAUI use the same logic.
 */

export const BehavioralEngine = {
    /**
     * Calculates the new streak purely mathematically. Does NOT execute SQL.
     * The React/MAUI adapter will take this result and push it via syncService.
     * 
     * @param {string} lastActiveDateString - e.g. '2023-11-20'
     * @param {number} currentStreak - The current streak counter
     * @param {number} longestStreak - The historic max streak
     * @returns {{ newCurrentStreak: number, newLongestStreak: number, isNewStreakDay: boolean }}
     */
    calculateStreak: (lastActiveDateString, currentStreak = 0, longestStreak = 0) => {
        const today = new Date().toDateString();
        
        if (!lastActiveDateString) {
            // First time ever active
            return { newCurrentStreak: 1, newLongestStreak: 1, isNewStreakDay: true };
        }

        const lastDate = new Date(lastActiveDateString).toDateString();
        if (lastDate === today) {
            // Already active today, no change
            return { newCurrentStreak: currentStreak, newLongestStreak: longestStreak, isNewStreakDay: false };
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        let newCurrentStreak = currentStreak;
        if (lastDate === yesterday.toDateString()) {
            // Consecutive day
            newCurrentStreak += 1;
        } else {
            // Streak broken
            newCurrentStreak = 1;
        }

        const newLongestStreak = Math.max(longestStreak, newCurrentStreak);
        
        return { 
            newCurrentStreak, 
            newLongestStreak, 
            isNewStreakDay: true 
        };
    },

    /**
     * Analyze guessing vs thinking patterns based on time spent.
     * @param {Array} userAnswers - Array of previous formatted answer objects
     */
    analyzeAnswerPattern: (userAnswers) => {
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
    },

    /**
     * Predict the optimal hour of day for the user to study based on historic accuracy.
     * @param {Array} userHistory - Past answers containing 'answeredAt' and 'isCorrect'
     */
    predictOptimalSessionTime: (userHistory) => {
        if (!userHistory || userHistory.length === 0) {
            return { recommended: 15, bestTime: 16, reason: 'New user - start with 15 min at 4 PM' };
        }
        
        const performanceByHour = {};
        userHistory.forEach(s => {
            if (!s.answeredAt) return;
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
};
