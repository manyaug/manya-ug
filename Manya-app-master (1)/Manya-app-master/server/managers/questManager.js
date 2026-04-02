// server/managers/questManager.js
const pool = require('../config/database');

class QuestManager {
    constructor() {
        this.quests = [
            { 
                questId: 1, 
                name: "Foundation Builder", 
                description: "Build your basic understanding of core concepts",
                baseQuestions: 6,
                minQuestions: 5,
                maxQuestions: 8,
                difficulty: "easy",
                focus: "core_concepts",
                unlockQuestId: null,
                unlockMastery: 0,
                xpReward: 100,
                badgeIcon: "🌱",
                orderNum: 1
            },
            { 
                questId: 2, 
                name: "Concept Mastery", 
                description: "Deepen your understanding with application questions",
                baseQuestions: 8,
                minQuestions: 6,
                maxQuestions: 10,
                difficulty: "easy",
                focus: "application",
                unlockQuestId: 1,
                unlockMastery: 60,
                xpReward: 150,
                badgeIcon: "🌿",
                orderNum: 2
            },
            { 
                questId: 3, 
                name: "Application Challenge", 
                description: "Apply what you've learned to new situations",
                baseQuestions: 8,
                minQuestions: 6,
                maxQuestions: 10,
                difficulty: "medium",
                focus: "analysis",
                unlockQuestId: 2,
                unlockMastery: 65,
                xpReward: 200,
                badgeIcon: "🌳",
                orderNum: 3
            },
            { 
                questId: 4, 
                name: "Problem Solver", 
                description: "Solve real PLE-style problems",
                baseQuestions: 8,
                minQuestions: 7,
                maxQuestions: 10,
                difficulty: "medium",
                focus: "evaluation",
                unlockQuestId: 3,
                unlockMastery: 70,
                xpReward: 250,
                badgeIcon: "⚡",
                orderNum: 4
            },
            { 
                questId: 5, 
                name: "Speed Master", 
                description: "Build exam timing skills",
                baseQuestions: 9,
                minQuestions: 7,
                maxQuestions: 11,
                difficulty: "medium",
                focus: "speed",
                unlockQuestId: 4,
                unlockMastery: 70,
                xpReward: 300,
                badgeIcon: "⏱️",
                orderNum: 5
            },
            { 
                questId: 6, 
                name: "Deep Dive", 
                description: "Master complex topics",
                baseQuestions: 8,
                minQuestions: 6,
                maxQuestions: 9,
                difficulty: "hard",
                focus: "complex_topics",
                unlockQuestId: 5,
                unlockMastery: 75,
                xpReward: 350,
                badgeIcon: "🏊",
                orderNum: 6
            },
            { 
                questId: 7, 
                name: "Challenge Mode", 
                description: "Tackle difficult questions",
                baseQuestions: 9,
                minQuestions: 7,
                maxQuestions: 10,
                difficulty: "hard",
                focus: "hard_questions",
                unlockQuestId: 6,
                unlockMastery: 75,
                xpReward: 400,
                badgeIcon: "🏔️",
                orderNum: 7
            },
            { 
                questId: 8, 
                name: "Critical Thinking", 
                description: "Develop analytical skills",
                baseQuestions: 8,
                minQuestions: 6,
                maxQuestions: 9,
                difficulty: "hard",
                focus: "critical_thinking",
                unlockQuestId: 7,
                unlockMastery: 80,
                xpReward: 450,
                badgeIcon: "🧠",
                orderNum: 8
            },
            { 
                questId: 9, 
                name: "Integration", 
                description: "Connect multiple topics",
                baseQuestions: 9,
                minQuestions: 7,
                maxQuestions: 10,
                difficulty: "hard",
                focus: "topic_integration",
                unlockQuestId: 8,
                unlockMastery: 80,
                xpReward: 500,
                badgeIcon: "🔗",
                orderNum: 9
            },
            { 
                questId: 10, 
                name: "PLE Simulation", 
                description: "Full exam practice",
                baseQuestions: 12,
                minQuestions: 10,
                maxQuestions: 15,
                difficulty: "exam",
                focus: "exam_simulation",
                unlockQuestId: 9,
                unlockMastery: 85,
                xpReward: 1000,
                badgeIcon: "🎓",
                orderNum: 10
            }
        ];
    }

    /**
     * Calculate dynamic question count for a quest based on user state
     */
    calculateQuestionCount(quest, userState) {
        let count = quest.baseQuestions;
        
        if (userState.masteryLevel === 'struggling') {
            count = Math.max(quest.minQuestions, count - 2);
        } else if (userState.masteryLevel === 'mastered') {
            count = Math.min(quest.maxQuestions, count + 2);
        }
        
        if (userState.frustration > 70) {
            count = Math.max(quest.minQuestions, count - 2);
        } else if (userState.frustration < 20 && userState.masteryLevel !== 'struggling') {
            count = Math.min(quest.maxQuestions, count + 1);
        }
        
        if (userState.topicComplexity === 'high') {
            count = Math.max(quest.minQuestions, count - 1);
        }
        
        if (quest.focus === 'exam_simulation') {
            count = quest.maxQuestions;
        }
        
        return Math.min(quest.maxQuestions, Math.max(quest.minQuestions, count));
    }

    /**
     * Check if a quest is unlocked for a user
     */
    async isQuestUnlocked(questId, userId) {
        const quest = this.getQuest(questId);
        if (!quest) return false;
        
        if (!quest.unlockQuestId) return true;
        
        try {
            const result = await pool.query(
                `SELECT mastery FROM user_quests 
                 WHERE "userId" = $1 AND "questId" = $2`,
                [userId, quest.unlockQuestId]
            );
            
            if (result.rows.length === 0) return false;
            
            const prevQuestMastery = result.rows[0].mastery || 0;
            return prevQuestMastery >= quest.unlockMastery;
            
        } catch (err) {
            console.error('Error checking quest unlock:', err);
            return false;
        }
    }

    /**
     * Get quest by ID
     */
    getQuest(questId) {
        return this.quests.find(q => q.questId === questId);
    }

    /**
     * Get all quests with status for a user
     */
    async getQuestsWithStatus(userId) {
        try {
            const progressResult = await pool.query(
                `SELECT * FROM user_quests WHERE "userId" = $1 ORDER BY "questId"`,
                [userId]
            );
            const userProgress = progressResult.rows;
            
            const questsWithStatus = [];
            
            for (const quest of this.quests) {
                const progress = userProgress.find(p => p.questId === quest.questId);
                const isUnlocked = await this.isQuestUnlocked(quest.questId, userId);
                
                let status = 'locked';
                let mastery = 0;
                let progress_count = 0;
                let totalQuestions = quest.baseQuestions;
                
                if (progress) {
                    status = progress.status;
                    mastery = progress.mastery || 0;
                    progress_count = progress.progress || 0;
                    totalQuestions = progress.totalQuestions || quest.baseQuestions;
                } else if (isUnlocked) {
                    status = 'available';
                }
                
                questsWithStatus.push({
                    ...quest,
                    status,
                    mastery,
                    progress: progress_count,
                    totalQuestions,
                    isUnlocked,
                    isLocked: status === 'locked',
                    isAvailable: status === 'available' || status === 'in_progress',
                    isCompleted: status === 'completed'
                });
            }
            
            return questsWithStatus;
            
        } catch (err) {
            console.error('Error getting quests with status:', err);
            return this.quests.map(q => ({ ...q, status: 'locked', mastery: 0 }));
        }
    }

    /**
     * Start a quest for a user
     */
    async startQuest(userId, questId, totalQuestions) {
        try {
            await pool.query(
                `INSERT INTO user_quests (
                    "userId", "questId", "status", "progress", "totalQuestions", 
                    "mastery", "startedAt", "lastQuestionAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, questId, 'in_progress', 0, totalQuestions, 0, new Date(), new Date()]
            );
            return true;
        } catch (err) {
            console.error('Error starting quest:', err);
            return false;
        }
    }

    /**
     * Update quest progress
     */
    async updateQuestProgress(userId, questId, isCorrect, points) {
        try {
            const questResult = await pool.query(
                `SELECT * FROM user_quests WHERE "userId" = $1 AND "questId" = $2`,
                [userId, questId]
            );
            
            if (questResult.rows.length === 0) {
                const quest = this.getQuest(questId);
                const totalQuestions = quest.baseQuestions;
                await this.startQuest(userId, questId, totalQuestions);
            }
            
            await pool.query(
                `UPDATE user_quests SET 
                    "progress" = "progress" + 1,
                    "lastQuestionAt" = $3
                 WHERE "userId" = $1 AND "questId" = $2`,
                [userId, questId, new Date()]
            );
            
            const updatedResult = await pool.query(
                `SELECT * FROM user_quests WHERE "userId" = $1 AND "questId" = $2`,
                [userId, questId]
            );
            
            const questProgress = updatedResult.rows[0];
            const quest = this.getQuest(questId);
            
            if (questProgress && questProgress.progress >= questProgress.totalQuestions) {
                const mastery = Math.min(100, Math.round((points / (questProgress.totalQuestions * 3)) * 100));
                
                await pool.query(
                    `UPDATE user_quests SET 
                        "status" = 'completed',
                        "mastery" = $3,
                        "completedAt" = $4
                     WHERE "userId" = $1 AND "questId" = $2`,
                    [userId, questId, mastery, new Date()]
                );
                
                await pool.query(
                    `INSERT INTO quest_rewards (
                        "userId", "questId", "rewardType", "rewardValue", "badgeEarned"
                    ) VALUES ($1, $2, $3, $4, $5)`,
                    [userId, questId, 'xp', quest.xpReward, quest.badgeIcon]
                );
                
                return { completed: true, mastery, xpEarned: quest.xpReward, badge: quest.badgeIcon };
            }
            
            return { completed: false, progress: questProgress?.progress };
            
        } catch (err) {
            console.error('Error updating quest progress:', err);
            return { completed: false, error: err.message };
        }
    }

    /**
     * Get current quest for user
     */
    async getCurrentQuest(userId) {
        try {
            const result = await pool.query(
                `SELECT * FROM user_quests 
                 WHERE "userId" = $1 AND "status" = 'in_progress'
                 ORDER BY "startedAt" DESC LIMIT 1`,
                [userId]
            );
            
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            
            const questsWithStatus = await this.getQuestsWithStatus(userId);
            const availableQuest = questsWithStatus.find(q => q.status === 'available');
            
            if (availableQuest) {
                return { questId: availableQuest.questId, status: 'available' };
            }
            
            return null;
            
        } catch (err) {
            console.error('Error getting current quest:', err);
            return null;
        }
    }

    /**
     * Get next recommended quest
     */
    async getNextQuest(currentQuestId, userId) {
        const currentIndex = this.quests.findIndex(q => q.questId === currentQuestId);
        
        for (let i = currentIndex + 1; i < this.quests.length; i++) {
            const isUnlocked = await this.isQuestUnlocked(this.quests[i].questId, userId);
            if (isUnlocked) {
                return this.quests[i].questId;
            }
        }
        
        return null;
    }
}

module.exports = QuestManager;