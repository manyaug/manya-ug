// server/routes/api/badges.js
const express = require('express');
const router = express.Router();
const badgeService = require('../../services/badgeService');

// Get user's badges
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const badges = await badgeService.getUserBadges(userId);
        res.json({ badges });
    } catch (err) {
        console.error('Error getting badges:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check and award badges (called after events)
router.post('/check', async (req, res) => {
    const { userId, event, data } = req.body;
    
    try {
        const awardedBadges = await badgeService.checkAndAwardBadges(userId, event, data);
        res.json({ awardedBadges });
    } catch (err) {
        console.error('Error checking badges:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all available badges
router.get('/available/all', async (req, res) => {
    try {
        const allBadges = Object.entries(badgeService.badges).map(([key, value]) => ({
            type: key,
            ...value
        }));
        res.json({ badges: allBadges });
    } catch (err) {
        console.error('Error getting available badges:', err);
        res.status(500).json({ error: err.message });
    }
});

// IMPORTANT: Export the router, not the service
module.exports = router;