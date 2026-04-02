// server/routes/api/psychological.js
const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/psychological/state/:userId
router.get('/state/:userId', async (req, res) => {
    const userId = req.params.userId;
    console.log('📊 Psychological state requested for user:', userId);
    
    try {
        // Get current session data
        const session = await pool.query(
            `SELECT "frustrationLevel", "confidenceRating", "engagementLevel", "cognitiveLoad"
             FROM user_sessions 
             WHERE "userId" = $1 AND "endedAt" IS NULL
             ORDER BY "lastActive" DESC LIMIT 1`,
            [userId]
        );
        
        // Get recent answers for trends
        const answers = await pool.query(
            `SELECT "timeSpentMs", "isCorrect", "hintUsed", "answerChanged"
             FROM user_answer 
             WHERE "userId" = $1 
             ORDER BY "answeredAt" DESC 
             LIMIT 20`,
            [userId]
        );

        const recentAnswers = answers.rows || [];
        const hesitationCount = recentAnswers.filter(a => (a.timeSpentMs || 0) > 5000).length;
        const changeCount = recentAnswers.filter(a => a.answerChanged).length;
        const hintCount = recentAnswers.filter(a => a.hintUsed).length;

        const avgTime = recentAnswers.length ? 
            Math.round(recentAnswers.reduce((sum, a) => sum + (a.timeSpentMs || 0), 0) / recentAnswers.length / 1000) : 0;

        const state = {
            frustration: session.rows[0]?.frustrationLevel || 0,
            confidence: session.rows[0]?.confidenceRating || 70,
            engagement: session.rows[0]?.engagementLevel || 50,
            cognitiveLoad: session.rows[0]?.cognitiveLoad || 30,
            hesitations: hesitationCount,
            answerChanges: changeCount,
            hintsUsed: hintCount,
            avgTime: avgTime
        };

        console.log('✅ Psychological state:', state);
        res.json(state);
        
    } catch (err) {
        console.error('❌ Error getting psychological state:', err);
        res.status(500).json({ 
            error: err.message,
            frustration: 0,
            confidence: 70,
            engagement: 50,
            cognitiveLoad: 30,
            hesitations: 0,
            answerChanges: 0,
            hintsUsed: 0,
            avgTime: 0
        });
    }
});

// POST /api/psychological/track
// Add this to your existing file
router.post('/track', async (req, res) => {
    const { userId, frustration, hesitation, answerChanges, consecutiveWrong } = req.body;
    
    try {
        await pool.query(
            `UPDATE user_sessions 
             SET "frustrationLevel" = $1, "hesitationScore" = $2,
                 "answerChangeCount" = $3, "consecutiveWrong" = $4,
                 "lastActive" = NOW()
             WHERE "userId" = $5 AND "endedAt" IS NULL`,
            [frustration, hesitation, answerChanges, consecutiveWrong, userId]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error tracking metrics:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;