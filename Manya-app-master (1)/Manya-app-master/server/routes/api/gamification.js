// server/routes/api/gamification.js
const express = require('express');
const router = express.Router();
const gamificationService = require('../../services/gamificationService');

// Get user's gems
router.get('/gems/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const subjects = ['math', 'english', 'social', 'science'];
        const subjectGems = {};
        
        for (const subject of subjects) {
            subjectGems[subject] = await gamificationService.getSubjectGems(userId, subject);
        }
        
        const overallGems = await gamificationService.getOverallGems(userId);
        const streak = await gamificationService.getStreak(userId);
        
        res.json({
            userId,
            overallGems,
            subjectGems,
            streak
        });
    } catch (err) {
        console.error('Error getting gems:', err);
        res.status(500).json({ error: err.message });
    }
});

// Award gems (called when answering questions)
// Award gems (called when answering questions)
router.post('/award', async (req, res) => {
    const { userId, subject, isCorrect, hintUsed, context } = req.body;
    
    try {
        // Get streak info
        const streak = await gamificationService.getStreak(userId);
        const streakMultiplier = gamificationService.getStreakMultiplier(streak.current_streak || 0);
        
        // Calculate gems
        const gems = gamificationService.calculateGems(isCorrect, hintUsed, subject, streakMultiplier);
        
        // Award gems
        const result = await gamificationService.awardGems(
            userId, 
            subject, 
            gems.subjectGems, 
            gems.overallGems, 
            context
        );
        
        res.json({
            success: true,
            awarded: gems,
            newTotals: result,
            streak: {
                current: streak.current_streak || 0,
                multiplier: streakMultiplier
            }
        });
    } catch (err) {
        console.error('Error awarding gems:', err);
        res.status(500).json({ error: err.message });
    }
});

// Track emotion
// Track emotion
router.post('/emotion', async (req, res) => {
    const { userId, emotion, intensity, context, responseTime } = req.body;
    
    try {
        // Ensure responseTime is an integer
        const responseTimeMs = Math.floor(parseInt(responseTime) || 0);
        
        await gamificationService.trackEmotion(
            userId, 
            emotion, 
            intensity, 
            context, 
            responseTimeMs
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error tracking emotion:', err);
        res.status(500).json({ error: err.message });
    }
});

// Check challenge unlock
router.post('/challenge/unlock-check', async (req, res) => {
    const { userId, challengeLevel, subject, previousMastery } = req.body;
    
    try {
        const result = await gamificationService.canUnlockChallenge(
            userId, 
            challengeLevel, 
            subject, 
            previousMastery
        );
        res.json(result);
    } catch (err) {
        console.error('Error checking unlock:', err);
        res.status(500).json({ error: err.message });
    }
});
// Add after other routes

// Update streak
router.post('/streak/update', async (req, res) => {
    const { userId, isCorrect } = req.body;
    
    try {
        const result = await gamificationService.updateUserStreak(userId, isCorrect);
        res.json(result);
    } catch (err) {
        console.error('Error updating streak:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get streak info
router.get('/streak/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const streak = await gamificationService.getStreak(userId);
        res.json(streak);
    } catch (err) {
        console.error('Error getting streak:', err);
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;