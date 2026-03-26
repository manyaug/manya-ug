// server/routes/api/challenges.js
const express = require('express');
const router = express.Router();
const challengeLoader = require('../../config/challengeLoader');
const pool = require('../../config/database');

// Helper functions (standalone, not attached to router)
function getQuestName(questId) {
    const names = ['Warm-up', 'Exploration', 'Practice', 'Reinforcement', 'Mastery'];
    return names[questId - 1];
}

function getQuestIcon(questId) {
    const icons = ['🟢', '🟡', '🟠', '🔴', '⚡'];
    return icons[questId - 1];
}

// GET /api/challenges/:topic
router.get('/:topic', async (req, res) => {
    const topic = decodeURIComponent(req.params.topic);
    const userId = req.query.userId || 'student-001';
    
    console.log(`📚 Loading challenges for topic: ${topic}, user: ${userId}`);
    
    try {
        // Get the topic structure
        const topicData = challengeLoader.getTopic(topic);
        if (!topicData) {
            console.error(`❌ Topic not found: ${topic}`);
            return res.status(404).json({ 
                error: 'Topic not found',
                availableTopics: challengeLoader.getAllTopics()
            });
        }
        
        // Get user progress for each challenge
        const progressResult = await pool.query(
            `SELECT * FROM user_challenge_progress WHERE "userId" = $1`,
            [userId]
        );
        const userProgress = progressResult.rows;
        
        // Merge structure with user progress
        const challenges = topicData.subtopics.map(subtopic => {
            const progress = userProgress.find(p => p.challengeId === subtopic.id);
            
            // Calculate which quests are unlocked
            const unlockedQuests = [1]; // Quest 1 always unlocked
            
            if (progress) {
                if (progress.quest1Mastery >= 75) unlockedQuests.push(2);
                if (progress.quest2Mastery >= 75) unlockedQuests.push(3);
                if (progress.quest3Mastery >= 75) unlockedQuests.push(4);
                if (progress.quest4Mastery >= 80) unlockedQuests.push(5);
            }
            
            // Calculate current quest (first locked or in progress)
            let currentQuest = 1;
            if (progress && progress.currentQuest) {
                currentQuest = progress.currentQuest;
            } else {
                // Find first unlocked quest not completed
                for (let q = 1; q <= 5; q++) {
                    if (unlockedQuests.includes(q) && 
                        (!progress || progress[`quest${q}Mastery`] < 75)) {
                        currentQuest = q;
                        break;
                    }
                }
            }
            
            // Create quests list
            const questsList = [1,2,3,4,5].map(q => ({
                id: q,
                name: getQuestName(q),
                icon: getQuestIcon(q),
                unlocked: unlockedQuests.includes(q),
                mastery: progress ? progress[`quest${q}Mastery`] || 0 : 0,
                isCurrent: q === currentQuest,
                isCompleted: progress ? progress[`quest${q}Mastery`] >= 75 : false
            }));
            
            return {
                id: subtopic.id,
                name: subtopic.name,
                icon: subtopic.icon || '📘',
                description: subtopic.description || `Master ${subtopic.name.toLowerCase()}`,
                simulationSuitability: subtopic.simulationSuitability || 'Medium',
                quests: 5,
                progress: progress ? {
                    quest1Mastery: progress.quest1Mastery || 0,
                    quest2Mastery: progress.quest2Mastery || 0,
                    quest3Mastery: progress.quest3Mastery || 0,
                    quest4Mastery: progress.quest4Mastery || 0,
                    quest5Mastery: progress.quest5Mastery || 0,
                    currentQuest: currentQuest,
                    completedAt: progress.completedAt
                } : {
                    quest1Mastery: 0,
                    quest2Mastery: 0,
                    quest3Mastery: 0,
                    quest4Mastery: 0,
                    quest5Mastery: 0,
                    currentQuest: 1,
                    completedAt: null
                },
                unlockedQuests,
                questsList
            };
        });
        
        // Calculate overall topic progress
        const completedQuests = challenges.reduce((sum, c) => {
            return sum + (c.progress ? [1,2,3,4,5].filter(q => c.progress[`quest${q}Mastery`] >= 75).length : 0);
        }, 0);
        const totalQuests = challenges.length * 5;
        
        res.json({
            topic: topicData.topicId,
            name: topic,
            totalChallenges: challenges.length,
            totalQuests,
            completedQuests,
            progressPercent: Math.round((completedQuests / totalQuests) * 100),
            challenges
        });
        
    } catch (err) {
        console.error('❌ Error loading challenges:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/challenges/:topic/:subtopicId
router.get('/:topic/:subtopicId', async (req, res) => {
    const topic = decodeURIComponent(req.params.topic);
    const subtopicId = parseInt(req.params.subtopicId);
    const userId = req.query.userId || 'student-001';
    
    try {
        const challenge = challengeLoader.getChallenge(topic, subtopicId);
        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }
        
        // Get user progress for this challenge
        const progressResult = await pool.query(
            `SELECT * FROM user_challenge_progress 
             WHERE "userId" = $1 AND "challengeId" = $2`,
            [userId, subtopicId]
        );
        
        const progress = progressResult.rows[0];
        
        // Calculate unlocked quests
        const unlockedQuests = [1];
        if (progress) {
            if (progress.quest1Mastery >= 75) unlockedQuests.push(2);
            if (progress.quest2Mastery >= 75) unlockedQuests.push(3);
            if (progress.quest3Mastery >= 75) unlockedQuests.push(4);
            if (progress.quest4Mastery >= 80) unlockedQuests.push(5);
        }
        
        // Create quests list
        const questsList = [1,2,3,4,5].map(q => ({
            id: q,
            name: getQuestName(q),
            icon: getQuestIcon(q),
            unlocked: unlockedQuests.includes(q),
            mastery: progress ? progress[`quest${q}Mastery`] || 0 : 0,
            isCurrent: q === (progress?.currentQuest || 1),
            isCompleted: progress ? progress[`quest${q}Mastery`] >= 75 : false
        }));
        
        res.json({
            ...challenge,
            progress: progress || null,
            unlockedQuests,
            currentQuest: progress?.currentQuest || 1,
            questsList
        });
        
    } catch (err) {
        console.error('Error loading challenge:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;