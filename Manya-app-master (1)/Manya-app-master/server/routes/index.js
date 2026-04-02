// server/routes/index.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Import route modules
const hintRoutes = require('./api/hint');
const solutionRoutes = require('./api/solution');
const questionsRoutes = require('./api/questions');
const answersRoutes = require('./api/answers');
const statsRoutes = require('./api/stats');
const questsRoutes = require('./api/quests');
const challengesRoutes = require('./api/challenges');
const psychologicalRoutes = require('./api/psychological');
const userProfileRoutes = require('./api/userProfile');
const rewardsRoutes = require('./api/rewards');
const simulationRoutes = require('./api/simulation');
const gamificationRoutes = require('./api/gamification');
const badgeRoutes = require('./api/badges');
const coinRoutes = require('./api/coins');

// ========== AUDIO ENDPOINTS - MUST COME FIRST ==========
// Audio list endpoint for different folders
router.get('/audio/:folder/list', async (req, res) => {
    const { folder } = req.params;
    console.log(`🔍 Audio request for folder: ${folder}`);
    
    // Validate folder name
    const allowedFolders = ['correct', 'wrong', 'quest_complete'];
    if (!allowedFolders.includes(folder)) {
        console.log(`❌ Invalid folder: ${folder}`);
        return res.status(400).json({ error: 'Invalid folder name' });
    }
    
    const audioDir = path.join(__dirname, `../../multimedia_assets/audios/${folder}`);
    console.log(`📁 Looking for audio in: ${audioDir}`);
    
    try {
        // Check if directory exists
        if (!fs.existsSync(audioDir)) {
            console.log(`❌ Audio directory not found: ${audioDir}`);
            return res.json({ files: [] });
        }
        
        // READ ACTUAL FILES FROM FOLDER
        const files = fs.readdirSync(audioDir);
        
        // Filter only .mp3 files
        const mp3Files = files.filter(f => f.endsWith('.mp3'));
        
        console.log(`📁 Found ${mp3Files.length} audio files in ${folder}:`, mp3Files);
        res.json({ files: mp3Files });
        
    } catch (err) {
        console.error(`Error reading ${folder} audio directory:`, err);
        res.json({ files: [] });
    }
});

// Debug middleware for API routes
router.use((req, res, next) => {
    console.log(`📡 API Route: ${req.method} ${req.url}`);
    next();
});

// ========== REGISTER ALL API ROUTES ==========
router.use('/hint', hintRoutes);
router.use('/solution', solutionRoutes);
router.use('/questions', questionsRoutes);
router.use('/answers', answersRoutes);
router.use('/stats', statsRoutes);
router.use('/quests', questsRoutes);
router.use('/challenges', challengesRoutes);
router.use('/psychological', psychologicalRoutes);
router.use('/profile', userProfileRoutes);
router.use('/quests/rewards', rewardsRoutes);
router.use('/simulation', simulationRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/badges', badgeRoutes);
router.use('/coins', coinRoutes);

// ========== TEST ENDPOINTS ==========
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

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
            hint: '/api/hint/:id',
            solution: '/api/solution/:id',
            stats: '/api/stats/user-stats/:userId',
            audio: '/api/audio/:folder/list',
            test: '/api/test'
        }
    });
});

module.exports = router;