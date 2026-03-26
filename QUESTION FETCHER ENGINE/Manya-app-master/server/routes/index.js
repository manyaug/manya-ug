// server/routes/index.js
const express = require('express');
const router = express.Router();

// Import route modules
const hintRoutes = require('./api/hint');
const solutionRoutes = require('./api/solution');
const questionsRoutes = require('./api/questions');
const answersRoutes = require('./api/answers');
const statsRoutes = require('./api/stats'); // This is your stats.js file
const questsRoutes = require('./api/quests');
const challengesRoutes = require('./api/challenges');
const psychologicalRoutes = require('./api/psychological');
const userProfileRoutes = require('./api/userProfile');
const rewardsRoutes = require('./api/rewards');
const simulationRoutes = require('./api/simulation');
// Add with other route imports
const gamificationRoutes = require('./api/gamification');
// Add with other imports
const badgeRoutes = require('./api/badges');
// Debug middleware for API routes
router.use((req, res, next) => {
    console.log(`📡 API Route: ${req.method} ${req.url}`);
    next();
});

// Register all API routes
router.use('/hint', hintRoutes);
router.use('/solution', solutionRoutes);
router.use('/questions', questionsRoutes);
router.use('/answers', answersRoutes);
router.use('/stats', statsRoutes); // This creates /api/stats/user-stats/:userId
router.use('/quests', questsRoutes);
router.use('/challenges', challengesRoutes);
router.use('/psychological', psychologicalRoutes);
router.use('/profile', userProfileRoutes);
router.use('/quests/rewards', rewardsRoutes);
router.use('/simulation', simulationRoutes);

// Test endpoint
router.get('/test', async (req, res) => {
    const pool = require('../config/database');
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM qbrss');
        const answerCount = await pool.query('SELECT COUNT(*) as count FROM user_answer');
        res.json({ 
            message: '✅ Server working!',
            questions: parseInt(result.rows[0].count) || 0,
            answers: parseInt(answerCount.rows[0].count) || 0,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Test endpoint error:', err);
        res.status(500).json({ error: err.message });
    }
});
// Add this to your routes/index.js
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
            hint: '/api/hint/:id',
            solution: '/api/solution/:id',
            stats: '/api/stats/user-stats/:userId',
            test: '/api/test'
        }
    });
});
// Add with other routes
router.use('/badges', badgeRoutes);
// Add with other route uses
router.use('/gamification', gamificationRoutes);
module.exports = router;