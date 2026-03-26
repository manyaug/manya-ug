// server/routes/api/userProfile.js
const express = require('express');
const router = express.Router();
const userProfileEngine = require('../../engines/userProfileEngine');

// GET /api/profile/:userId
router.get('/:userId', async (req, res) => {
    const userId = req.params.userId;
    console.log('👤 Profile requested for user:', userId);
    
    try {
        const profile = await userProfileEngine.getUserProfile(userId);
        if (!profile) {
            return res.status(404).json({ error: 'User profile not found' });
        }
        console.log('✅ Profile loaded');
        res.json(profile);
    } catch (err) {
        console.error('❌ Error getting user profile:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/profile/:userId/recommendations
router.get('/:userId/recommendations', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const profile = await userProfileEngine.getUserProfile(userId);
        res.json(profile?.recommendations || []);
    } catch (err) {
        console.error('Error getting recommendations:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;