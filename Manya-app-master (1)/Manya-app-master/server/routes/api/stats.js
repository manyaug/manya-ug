// server/routes/api/stats.js
const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

router.get('/user-stats/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const topicStatsResult = await pool.query(
            `SELECT q."Topic" as topic,
                    COUNT(ua.id) as attempts,
                    SUM(CASE WHEN ua."isCorrect" THEN 1 ELSE 0 END) as correct,
                    SUM(ua."pointsEarned") as points,
                    AVG(ua."timeSpentMs") as avg_time,
                    MAX(ua."answeredAt") as last_seen
             FROM user_answer ua
             JOIN qbrss q ON ua."questionId" = q."Q_ID"
             WHERE ua."userId" = $1
             GROUP BY q."Topic"`,
            [userId]
        );
        
        const topicStats = topicStatsResult.rows;
        let totalAnswered = 0, totalCorrect = 0, totalPoints = 0;
        
        const topics = (topicStats || []).map(t => {
            totalAnswered += parseInt(t.attempts) || 0;
            totalCorrect += parseInt(t.correct) || 0;
            totalPoints += parseInt(t.points) || 0;
            
            return {
                Topic: t.topic,
                attempts: parseInt(t.attempts) || 0,
                correct: parseInt(t.correct) || 0,
                accuracy: t.attempts > 0 ? Math.round((parseInt(t.correct) / parseInt(t.attempts)) * 100) : 0,
                points: parseInt(t.points) || 0,
                avgTime: Math.round((parseFloat(t.avg_time) || 0) / 1000),
                lastSeen: t.last_seen
            };
        });
        
        // Get streak info
        const streakResult = await pool.query(
            `SELECT "currentStreak", "longestStreak" FROM user_stats WHERE "userId" = $1`,
            [userId]
        );
        
        const streak = streakResult.rows[0] || { currentStreak: 0, longestStreak: 0 };
        
        res.json({
            topics,
            summary: {
                totalAnswered,
                totalCorrect,
                totalPoints,
                overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
                currentStreak: streak.currentStreak || 0,
                longestStreak: streak.longestStreak || 0
            }
        });
        
    } catch (err) {
        console.error('Error getting stats:', err);
        res.json({ 
            topics: [], 
            summary: { 
                totalAnswered: 0, 
                totalCorrect: 0, 
                totalPoints: 0, 
                overallAccuracy: 0,
                currentStreak: 0,
                longestStreak: 0
            } 
        });
    }
});

module.exports = router;