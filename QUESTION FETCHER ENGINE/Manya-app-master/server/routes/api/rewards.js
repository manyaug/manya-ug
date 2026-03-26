// server/routes/api/rewards.js
const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/quests/rewards/:userId
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await pool.query(
            `SELECT * FROM quest_rewards WHERE "userId" = $1 ORDER BY "claimedAt" DESC`,
            [userId]
        );
        
        // If no rewards, return empty array
        res.json(result.rows || []);
    } catch (err) {
        console.error('Error getting quest rewards:', err);
        res.json([]);
    }
});

module.exports = router;