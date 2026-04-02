// server/engines/userProfileEngine.js
const pool = require('../config/database');

class UserProfileEngine {
    /**
     * Generate complete user profile with all tracked data
     */
    async getUserProfile(userId) {
        try {
            const [
                basicStats,
                topicMastery,
                psychologicalState,
                questProgress,
                behavioralPatterns,
                learningVelocity
            ] = await Promise.all([
                this.getBasicStats(userId),
                this.getTopicMastery(userId),
                this.getPsychologicalState(userId),
                this.getQuestProgress(userId),
                this.getBehavioralPatterns(userId),
                this.calculateLearningVelocity(userId)
            ]);

            return {
                userId,
                profile: {
                    type: this.determineUserType(basicStats, psychologicalState),
                    confidence: this.getConfidenceLevel(psychologicalState),
                    addiction: this.calculateAddictionScore(basicStats, behavioralPatterns),
                    frustration: psychologicalState.currentFrustration,
                    learningStyle: this.determineLearningStyle(behavioralPatterns)
                },
                stats: basicStats,
                topics: topicMastery,
                psychology: psychologicalState,
                quests: questProgress,
                behavior: behavioralPatterns,
                velocity: learningVelocity,
                recommendations: this.generateRecommendations({
                    basicStats,
                    topicMastery,
                    psychologicalState,
                    behavioralPatterns
                })
            };
        } catch (err) {
            console.error('Error generating user profile:', err);
            return null;
        }
    }

    async getBasicStats(userId) {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_questions,
                SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END) as total_correct,
                SUM("pointsEarned") as total_points,
                AVG("timeSpentMs") as avg_time_ms,
                COUNT(DISTINCT DATE("answeredAt")) as active_days,
                MAX("answeredAt") as last_active
             FROM user_answer 
             WHERE "userId" = $1`,
            [userId]
        );
        
        const stats = result.rows[0] || {};
        const total = parseInt(stats.total_questions) || 0;
        
        return {
            totalQuestions: total,
            totalCorrect: parseInt(stats.total_correct) || 0,
            accuracy: total > 0 ? Math.round((stats.total_correct / total) * 100) : 0,
            totalPoints: parseInt(stats.total_points) || 0,
            avgTimeSeconds: Math.round((parseFloat(stats.avg_time_ms) || 0) / 1000),
            activeDays: parseInt(stats.active_days) || 0,
            lastActive: stats.last_active,
            questionsPerDay: total > 0 ? Math.round(total / (parseInt(stats.active_days) || 1)) : 0
        };
    }

    async getTopicMastery(userId) {
        const result = await pool.query(
            `SELECT 
                q."Topic" as topic,
                COUNT(ua.id) as attempts,
                SUM(CASE WHEN ua."isCorrect" THEN 1 ELSE 0 END) as correct,
                AVG(ua."timeSpentMs") as avg_time,
                MAX(ua."answeredAt") as last_seen
             FROM user_answer ua
             JOIN qbrss q ON ua."questionId" = q."Q_ID"
             WHERE ua."userId" = $1
             GROUP BY q."Topic"
             ORDER BY 
                CASE 
                    WHEN COUNT(ua.id) >= 5 THEN (SUM(CASE WHEN ua."isCorrect" THEN 1 ELSE 0 END)::float / COUNT(ua.id))
                    ELSE 0 
                END ASC`,
            [userId]
        );

        return result.rows.map(t => {
            const accuracy = t.attempts > 0 ? (t.correct / t.attempts) * 100 : 0;
            let masteryLevel = 'untouched';
            let status = '🔴 Not Started';
            
            if (t.attempts >= 5) {
                if (accuracy >= 80) {
                    masteryLevel = 'mastered';
                    status = '✅ Mastered';
                } else if (accuracy >= 60) {
                    masteryLevel = 'progressing';
                    status = '🟡 In Progress';
                } else {
                    masteryLevel = 'struggling';
                    status = '🔴 Needs Work';
                }
            } else if (t.attempts > 0) {
                masteryLevel = 'learning';
                status = '🟢 Learning';
            }
            
            return {
                topic: t.topic,
                attempts: parseInt(t.attempts) || 0,
                correct: parseInt(t.correct) || 0,
                accuracy: Math.round(accuracy),
                masteryLevel,
                status,
                avgTimeSeconds: Math.round((parseFloat(t.avg_time) || 0) / 1000),
                lastSeen: t.last_seen,
                confidence: this.calculateTopicConfidence(t)
            };
        });
    }

async getPsychologicalState(userId) {
    try {
        const session = await pool.query(
            `SELECT "frustrationLevel", "confidenceRating", "masteryLevel"
             FROM user_sessions 
             WHERE "userId" = $1 AND "endedAt" IS NULL
             ORDER BY "lastActive" DESC LIMIT 1`,
            [userId]
        );

        const recentAnswers = await pool.query(
            `SELECT "timeSpentMs", "isCorrect", "hintUsed", "answerChanged"
             FROM user_answer 
             WHERE "userId" = $1 
             ORDER BY "answeredAt" DESC 
             LIMIT 20`,
            [userId]
        );

        const answers = recentAnswers.rows || [];
        const hesitationCount = answers.filter(a => (a.timeSpentMs || 0) > 5000).length;
        const changeCount = answers.filter(a => a.answerChanged).length;
        const hintCount = answers.filter(a => a.hintUsed).length;
        
        let trend = 'stable';
        if (answers.length >= 10) {
            const recent5 = answers.slice(0, 5);
            const previous5 = answers.slice(5, 10);
            
            const recentCorrect = recent5.filter(a => a.isCorrect).length / 5;
            const previousCorrect = previous5.filter(a => a.isCorrect).length / 5;
            
            if (recentCorrect > previousCorrect + 0.2) trend = 'improving';
            else if (recentCorrect < previousCorrect - 0.2) trend = 'declining';
        }

        return {
            currentFrustration: session.rows[0]?.frustrationLevel || 0,
            currentConfidence: session.rows[0]?.confidenceRating || 70,
            trend,
            hesitationRate: answers.length ? Math.round((hesitationCount / answers.length) * 100) : 0,
            changeRate: answers.length ? Math.round((changeCount / answers.length) * 100) : 0,
            hintRate: answers.length ? Math.round((hintCount / answers.length) * 100) : 0,
            recentAccuracy: answers.length ? 
                Math.round((answers.filter(a => a.isCorrect).length / answers.length) * 100) : 0
        };
    } catch (err) {
        console.error('Error getting psychological state:', err);
        // Return default values if query fails
        return {
            currentFrustration: 0,
            currentConfidence: 70,
            trend: 'stable',
            hesitationRate: 0,
            changeRate: 0,
            hintRate: 0,
            recentAccuracy: 0
        };
    }
}

    async getQuestProgress(userId) {
        const result = await pool.query(
            `SELECT 
                COUNT(*) as total_quests,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                AVG(mastery) as avg_mastery
             FROM user_quests 
             WHERE "userId" = $1`,
            [userId]
        );

        const progress = result.rows[0] || {};
        const total = parseInt(progress.total_quests) || 0;
        const completed = parseInt(progress.completed) || 0;

        return {
            totalQuests: total,
            completedQuests: completed,
            inProgressQuests: parseInt(progress.in_progress) || 0,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            averageMastery: Math.round(parseFloat(progress.avg_mastery) || 0),
            currentQuest: await this.getCurrentQuestDetails(userId)
        };
    }

    async getCurrentQuestDetails(userId) {
        const result = await pool.query(
            `SELECT q.*, uq."progress", uq."totalQuestions"
             FROM user_quests uq
             JOIN quests q ON uq."questId" = q."questId"
             WHERE uq."userId" = $1 AND uq."status" = 'in_progress'
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) return null;

        const quest = result.rows[0];
        return {
            name: quest.name,
            progress: quest.progress,
            total: quest.totalQuestions,
            percent: Math.round((quest.progress / quest.totalQuestions) * 100),
            difficulty: quest.difficulty,
            xpReward: quest.xpReward
        };
    }

    async getBehavioralPatterns(userId) {
        const answers = await pool.query(
            `SELECT 
                EXTRACT(HOUR FROM "answeredAt") as hour,
                "isCorrect",
                "timeSpentMs",
                "hintUsed"
             FROM user_answer 
             WHERE "userId" = $1
             ORDER BY "answeredAt" DESC`,
            [userId]
        );

        const rows = answers.rows;
        
        // Peak performance time
        const hourlyStats = {};
        rows.forEach(r => {
            const hour = r.hour;
            if (!hourlyStats[hour]) {
                hourlyStats[hour] = { total: 0, correct: 0 };
            }
            hourlyStats[hour].total++;
            if (r.isCorrect) hourlyStats[hour].correct++;
        });

        let bestHour = 8;
        let bestAccuracy = 0;
        Object.entries(hourlyStats).forEach(([hour, stats]) => {
            const accuracy = stats.correct / stats.total;
            if (accuracy > bestAccuracy && stats.total >= 3) {
                bestAccuracy = accuracy;
                bestHour = parseInt(hour);
            }
        });

        // Session patterns
        const sessions = await pool.query(
            `SELECT "sessionStart", "lastActive"
             FROM user_sessions 
             WHERE "userId" = $1
             ORDER BY "sessionStart" DESC`,
            [userId]
        );

        let avgSessionLength = 0;
        if (sessions.rows.length > 0) {
            const lengths = sessions.rows.map(s => {
                const start = new Date(s.sessionStart);
                const end = s.lastActive ? new Date(s.lastActive) : new Date();
                return (end - start) / (1000 * 60); // minutes
            });
            avgSessionLength = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
        }

        return {
            peakPerformanceHour: bestHour,
            peakPerformanceAccuracy: Math.round(bestAccuracy * 100),
            averageSessionMinutes: avgSessionLength,
            totalSessions: sessions.rows.length,
            hintDependency: rows.length ? 
                Math.round((rows.filter(r => r.hintUsed).length / rows.length) * 100) : 0,
            averagePace: rows.length ? 
                Math.round(rows.reduce((sum, r) => sum + (r.timeSpentMs || 0), 0) / rows.length / 1000) : 0
        };
    }

    async calculateLearningVelocity(userId) {
        const weekly = await pool.query(
            `SELECT 
                DATE_TRUNC('week', "answeredAt") as week,
                COUNT(*) as questions,
                SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END) as correct
             FROM user_answer 
             WHERE "userId" = $1
             GROUP BY DATE_TRUNC('week', "answeredAt")
             ORDER BY week DESC
             LIMIT 4`,
            [userId]
        );

        const weeks = weekly.rows;
        let velocity = 0;
        let trend = 'stable';

        if (weeks.length >= 2) {
            const currentWeek = weeks[0];
            const prevWeek = weeks[1];
            
            const currentRate = (parseInt(currentWeek.correct) || 0) / (parseInt(currentWeek.questions) || 1) * 100;
            const prevRate = (parseInt(prevWeek.correct) || 0) / (parseInt(prevWeek.questions) || 1) * 100;
            
            velocity = Math.round(currentRate - prevRate);
            if (velocity > 5) trend = 'accelerating';
            else if (velocity < -5) trend = 'decelerating';
        }

        return {
            weeklyProgress: weeks.map(w => ({
                week: w.week,
                questions: parseInt(w.questions) || 0,
                accuracy: w.questions > 0 ? 
                    Math.round((parseInt(w.correct) / parseInt(w.questions)) * 100) : 0
            })),
            velocity,
            trend
        };
    }

    determineUserType(stats, psychology) {
        if (stats.totalQuestions < 10) return 'new_learner';
        
        const accuracy = stats.accuracy;
        const frustration = psychology.currentFrustration;
        
        if (accuracy >= 80 && frustration < 30) return 'advanced_learner';
        if (accuracy >= 60 && frustration < 50) return 'consistent_learner';
        if (accuracy < 40 && frustration > 60) return 'struggling_learner';
        if (frustration > 70) return 'frustrated_learner';
        
        return 'active_learner';
    }

    getConfidenceLevel(psychology) {
        const confidence = psychology.currentConfidence;
        const trend = psychology.trend;
        
        if (confidence >= 80) return 'high';
        if (confidence >= 60) return 'moderate';
        if (confidence >= 40) return 'low';
        return 'very_low';
    }

    calculateAddictionScore(stats, behavior) {
        // Calculate how "addicted" the user is (healthy engagement)
        let score = 0;
        
        // Daily activity
        if (stats.questionsPerDay >= 10) score += 30;
        else if (stats.questionsPerDay >= 5) score += 20;
        else if (stats.questionsPerDay >= 2) score += 10;
        
        // Streak
        if (stats.activeDays >= 30) score += 30;
        else if (stats.activeDays >= 14) score += 20;
        else if (stats.activeDays >= 7) score += 10;
        
        // Session length
        if (behavior.averageSessionMinutes >= 20) score += 20;
        else if (behavior.averageSessionMinutes >= 10) score += 10;
        
        // Consistency
        if (behavior.totalSessions >= 20) score += 20;
        else if (behavior.totalSessions >= 10) score += 10;
        
        return {
            score: Math.min(100, score),
            level: score >= 70 ? 'highly_engaged' : 
                   score >= 40 ? 'regular_user' : 
                   score >= 20 ? 'casual_user' : 'new_user'
        };
    }

    determineLearningStyle(behavior) {
        const hintRate = behavior.hintDependency;
        const pace = behavior.averagePace;
        
        if (hintRate > 30) return 'support_seeking';
        if (pace > 45) return 'careful_thinker';
        if (pace < 15) return 'rapid_responder';
        return 'balanced_learner';
    }

    calculateTopicConfidence(topic) {
        if (topic.attempts < 3) return 'insufficient_data';
        if (topic.accuracy >= 80) return 'high';
        if (topic.accuracy >= 60) return 'moderate';
        return 'low';
    }

    generateRecommendations(data) {
        const recommendations = [];
        const { topicMastery, psychologicalState, behavioralPatterns } = data;
        
        // Topic-based recommendations
        const weakTopics = topicMastery.filter(t => t.masteryLevel === 'struggling');
        if (weakTopics.length > 0) {
            recommendations.push({
                type: 'topic',
                priority: 'high',
                message: `Focus on ${weakTopics[0].topic} (${weakTopics[0].accuracy}% accuracy)`,
                action: 'practice'
            });
        }
        
        // Psychological recommendations
        if (psychologicalState.currentFrustration > 70) {
            recommendations.push({
                type: 'psychological',
                priority: 'high',
                message: 'Frustration is high. Take a break or try easier questions.',
                action: 'break'
            });
        }
        
        // Behavioral recommendations
        if (behavioralPatterns.hintDependency > 40) {
            recommendations.push({
                type: 'behavioral',
                priority: 'medium',
                message: 'You rely heavily on hints. Try reviewing concepts before answering.',
                action: 'review'
            });
        }
        
        return recommendations;
    }
}

module.exports = new UserProfileEngine();