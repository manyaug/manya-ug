// Handles quests, XP, badges

const pool = require('../config/database');
const QuestManager = require('../managers/questManager');
const questManager = new QuestManager();

async function awardXP(userId, xpAmount, reason) {
    try {
        await pool.query(
            `UPDATE user_stats SET "totalPoints" = "totalPoints" + $1 WHERE "userId" = $2`,
            [xpAmount, userId]
        );
        
        return { success: true, xpEarned: xpAmount, reason };
    } catch (err) {
        console.error('Error awarding XP:', err);
        return { success: false, error: err.message };
    }
}

async function checkAchievements(userId, pool) {
    const achievements = [];
    
    // Check total questions
    const questionCount = await pool.query(
        `SELECT COUNT(*) as count FROM user_answer WHERE "userId" = $1`,
        [userId]
    );
    
    if (parseInt(questionCount.rows[0].count) >= 100) {
        achievements.push({ type: 'milestone', name: 'Century Club', icon: '🏆' });
    }
    
    // Check streak
    const streakResult = await pool.query(
        `SELECT "currentStreak" FROM user_stats WHERE "userId" = $1`,
        [userId]
    );
    
    if (streakResult.rows.length > 0) {
        const streak = streakResult.rows[0].currentStreak || 0;
        if (streak >= 7) achievements.push({ type: 'streak', name: 'Week Warrior', icon: '🔥' });
        if (streak >= 30) achievements.push({ type: 'streak', name: 'Monthly Master', icon: '⭐' });
    }
    
    return achievements;
}

async function getQuestProgress(userId) {
    try {
        const quests = await questManager.getQuestsWithStatus(userId, pool);
        const currentQuest = await questManager.getCurrentQuest(userId, pool);
        
        return {
            quests,
            currentQuest: currentQuest ? {
                questId: currentQuest.questId,
                progress: currentQuest.progress || 0,
                total: currentQuest.totalQuestions || 0,
                status: currentQuest.status
            } : null
        };
    } catch (err) {
        console.error('Error getting quest progress:', err);
        return { quests: [], currentQuest: null };
    }
}

module.exports = {
    awardXP,
    checkAchievements,
    getQuestProgress
};