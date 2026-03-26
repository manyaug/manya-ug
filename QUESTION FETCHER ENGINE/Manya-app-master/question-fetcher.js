// question-fetcher.js - Complete version with quest system integration

const Database = require('./database');
const QuestionParser = require('./question-parser');
const MasteryCalculator = require('./mastery-calculator');
const PriorityScorer = require('./priority-scorer');
const QuestManager = require('./quest-manager');
const SessionManager = require('./session-manager');

class QuestionFetcher {
    constructor(dbPath = './manya.db') {
        this.db = new Database(dbPath);
        this.scorer = new PriorityScorer();
        this.questManager = new QuestManager();
        this.sessionManager = new SessionManager(this.db.db);
    }

    /**
     * Main method to get next question for user
     */
    async getNextQuestion(userId, sessionState = {}) {
        try {
            console.log('🎯 Getting next question for:', userId);
            
            // Get or create session
            const session = await this.sessionManager.getSession(userId);
            
            // Get user stats and progress
            const userStats = await this.db.getUserStats(userId).catch(err => {
                console.error('Error getting user stats:', err);
                return [];
            });
            
            // Get topics in order with error handling
            let topicsInOrder = [];
            try {
                topicsInOrder = await this.db.getTopicsInOrder();
            } catch (err) {
                console.error('Error getting topics order:', err);
                topicsInOrder = ['Introduction to the World', 'Continents of the World'];
            }
            
            // Get quests with status
            const questsWithStatus = await this.questManager.getQuestsWithStatus(userId, this.db.db);
            
            // Get current quest
            const currentQuestId = session.currentQuestId || 1;
            const currentQuest = this.questManager.getQuest(currentQuestId);
            
            // Check if user can access this quest
            if (!this.questManager.canAccessQuest(currentQuestId, questsWithStatus)) {
                // Find first available quest
                const availableQuest = questsWithStatus.find(q => q.status === 'available');
                if (availableQuest) {
                    session.currentQuestId = availableQuest.id;
                    await this.sessionManager.updateSession(session.sessionId, {
                        currentQuestId: availableQuest.id,
                        questQuestions: [],
                        questResults: []
                    });
                }
            }
            
            // Get concepts with error handling
            let concepts = [];
            try {
                concepts = await this.db.getConceptsInOrder();
            } catch (err) {
                console.error('Error getting concepts:', err);
                concepts = await this.getFallbackConcepts();
            }
            
            // Calculate current topic
            const currentTopic = MasteryCalculator.calculateCurrentTopic(
                userStats, 
                topicsInOrder
            );
            
            // Calculate topic complexity
            const topicComplexity = this.getTopicComplexity(currentTopic);
            
            // Calculate question count for this quest
            const questionCount = this.questManager.calculateQuestionCount(
                currentQuest,
                {
                    masteryLevel: session.masteryLevel || 'learning',
                    frustration: session.frustrationLevel || 0,
                    topicComplexity
                }
            );
            
            // Check if quest is complete
            const questQuestions = session.questQuestions || [];
            if (questQuestions.length >= questionCount) {
                // Calculate quest mastery
                const questResults = session.questResults || [];
                const mastery = this.questManager.calculateQuestMastery(questResults);
                
                // Save quest progress
                await this.saveQuestProgress(userId, currentQuestId, mastery, currentQuest.xpReward);
                
                // Award XP to user
                await this.awardXP(userId, currentQuest.xpReward);
                
                // Check for achievements
                await this.checkAchievements(userId, currentQuestId, mastery);
                
                // Get next quest
                const nextQuestId = this.questManager.getNextQuestId(currentQuestId, questsWithStatus);
                
                if (nextQuestId) {
                    // Move to next quest
                    await this.sessionManager.updateSession(session.sessionId, {
                        currentQuestId: nextQuestId,
                        questQuestions: [],
                        questResults: []
                    });
                    
                    console.log(`🎯 Advanced to Quest ${nextQuestId}`);
                } else {
                    console.log('🏆 All quests completed!');
                }
                
                // Return next question from new quest
                return this.getNextQuestion(userId, sessionState);
            }
            
            // Check if needs warmup
            const needsWarmup = MasteryCalculator.needsWarmup(
                userStats, 
                sessionState.questionCount || 0
            );
            
            if (needsWarmup) {
                console.log('🌅 Using warmup for:', currentTopic);
                const warmupQuestion = await this.getWarmupQuestion(currentTopic, sessionState);
                if (warmupQuestion) {
                    await this.sessionManager.addQuestQuestion(session.sessionId, warmupQuestion.Q_ID);
                }
                return warmupQuestion;
            }
            
            // Select pool based on PLE ratio (2:1 default)
            const pool = this.scorer.selectPool({
                totalAnswers: userStats.length,
                recentQuestions: sessionState.recentQuestions || []
            }, 2);
            
            console.log('📊 Selected pool:', pool);
            
            // Analyze each concept
            const conceptScores = [];
            
            for (const concept of concepts) {
                // Get all variants of this concept
                const variants = await this.db.getConceptVariants(concept.baseId, userId);
                
                // Calculate mastery
                const mastery = MasteryCalculator.calculateConceptMastery(variants);
                
                // Get next variant recommendation
                const { variant, reason } = MasteryCalculator.getNextVariant(
                    variants, 
                    mastery,
                    sessionState.questionHistory || []
                );
                
                // Check if this concept has questions in the selected pool
                const hasMarkYes = variants.some(v => v.mark === 'yes');
                const hasMarkNo = variants.some(v => v.mark === 'no');
                
                if ((pool === 'yes' && !hasMarkYes) || (pool === 'no' && !hasMarkNo)) {
                    continue; // Skip if no questions in this pool
                }
                
                // Calculate priority score
                const { score, factors } = this.scorer.scoreConcept(
                    concept.baseId,
                    variants,
                    mastery,
                    { currentTopic },
                    pool
                );
                
                conceptScores.push({
                    baseId: concept.baseId,
                    topic: concept.Topic,
                    mastery,
                    score,
                    factors,
                    recommendedVariant: variant,
                    reason,
                    mark: pool,
                    variants
                });
            }
            
            // Sort by score and take top 5
            conceptScores.sort((a, b) => b.score - a.score);
            const topConcepts = conceptScores.slice(0, 5);
            
            // Filter out concepts seen too recently
            const validConcepts = topConcepts.filter(c => 
                this.scorer.validateVariantSpacing(
                    { Q_ID: `${c.baseId}-${c.recommendedVariant}` },
                    sessionState.questionHistory || [],
                    3
                )
            );
            
            let selectedConcept;
            if (validConcepts.length === 0) {
                // Fallback to any concept from top concepts
                selectedConcept = topConcepts[0] || conceptScores[0];
                console.log('⚠️ Using top concept due to spacing issues');
            } else {
                // Randomly select from valid concepts
                selectedConcept = validConcepts[
                    Math.floor(Math.random() * validConcepts.length)
                ];
            }
            
            if (!selectedConcept) {
                console.log('❌ No concept selected, using fallback');
                return this.getFallbackQuestion(pool);
            }
            
            console.log('✅ Selected concept:', selectedConcept.baseId, selectedConcept.recommendedVariant);
            
            // Get the specific question
            const question = await this.db.getRandomQuestion(
                selectedConcept.baseId,
                selectedConcept.recommendedVariant,
                pool
            );
            
            if (!question) {
                console.log('❌ No question found, using fallback');
                return this.getFallbackQuestion(pool);
            }
            
            // Add to quest questions
            await this.sessionManager.addQuestQuestion(session.sessionId, question.Q_ID);
            
            // Add debug info
            question.debug = {
                conceptId: selectedConcept.baseId,
                topic: selectedConcept.topic,
                mastery: selectedConcept.mastery,
                score: selectedConcept.score,
                factors: selectedConcept.factors,
                recommendedVariant: selectedConcept.recommendedVariant,
                reason: selectedConcept.reason,
                pool: pool,
                needsWarmup: needsWarmup,
                validConceptsCount: validConcepts.length,
                questId: currentQuestId,
                questProgress: `${questQuestions.length + 1}/${questionCount}`
            };
            
            return question;
            
        } catch (error) {
            console.error('💥 Error in getNextQuestion:', error);
            return this.getFallbackQuestion();
        }
    }

    /**
     * Submit answer and update stats
     */
    async submitAnswer(answerData) {
        try {
            // Get session
            const session = await this.sessionManager.getSession(answerData.userId);
            
            // Add contextual data
            const now = new Date();
            const hour = now.getHours();
            
            answerData.timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
            answerData.dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
            
            // Get correct answer from database
            const question = await new Promise((resolve, reject) => {
                this.db.db.get(`SELECT Correct_Answer FROM qbrss WHERE Q_ID = ?`, [answerData.questionId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!question) {
                throw new Error('Question not found');
            }
            
            // Parse correct answer
            let correctAnswer = 'A';
            const correctAnswerText = question.Correct_Answer || '';
            
            if (correctAnswerText.startsWith('Option_')) {
                correctAnswer = correctAnswerText.replace('Option_', '');
            } else if (correctAnswerText.length === 1 && ['A','B','C','D'].includes(correctAnswerText)) {
                correctAnswer = correctAnswerText;
            }
            
            const isCorrect = (answerData.selectedAnswer === correctAnswer);
            const pointsEarned = isCorrect ? (answerData.hintUsed ? 5 : 10) : 0;
            
            // Prepare result for quest tracking
            const questResult = {
                questionId: answerData.questionId,
                correct: isCorrect,
                timeSpent: answerData.timeSpentMs,
                hintUsed: answerData.hintUsed || false,
                answerChanged: answerData.answerChanged || false,
                timestamp: now.toISOString()
            };
            
            // Add to quest results
            await this.sessionManager.addQuestResult(session.sessionId, questResult);
            
            // Add to question history
            await this.sessionManager.addQuestionToHistory(session.sessionId, answerData.questionId, questResult);
            
            // Update frustration level
            let frustration = session.frustrationLevel || 0;
            if (!isCorrect) {
                frustration += 15;
            } else {
                frustration = Math.max(0, frustration - 5);
            }
            frustration = Math.min(100, frustration);
            await this.sessionManager.updateFrustration(session.sessionId, frustration);
            
            // Save to database
            answerData.correctAnswer = correctAnswer;
            answerData.pointsEarned = pointsEarned;
            
            const result = await this.db.submitAnswer(answerData);
            
            return result;
            
        } catch (error) {
            console.error('Error in submitAnswer:', error);
            throw error;
        }
    }

    /**
     * Save quest progress
     */
    async saveQuestProgress(userId, questId, mastery, xpEarned) {
        return new Promise((resolve, reject) => {
            this.db.db.run(
                `INSERT OR REPLACE INTO quest_progress (userId, questId, mastery, completedAt, xpEarned)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, questId, mastery, new Date().toISOString(), xpEarned],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Award XP to user
     */
    async awardXP(userId, xp) {
        console.log(`Awarded ${xp} XP to user ${userId}`);
        // You can implement XP tracking in user_stats table
    }

    /**
     * Check and award achievements
     */
    async checkAchievements(userId, questId, mastery) {
        const achievements = [];
        
        // First quest completed
        if (questId === 1 && mastery >= 60) {
            achievements.push({
                type: 'first_quest',
                name: 'First Steps',
                questId: 1
            });
        }
        
        // Perfect quest
        if (mastery >= 90) {
            achievements.push({
                type: 'perfect_quest',
                name: 'Quest Master',
                questId
            });
        }
        
        // Halfway there
        if (questId === 5) {
            achievements.push({
                type: 'halfway',
                name: 'Halfway Hero',
                questId: 5
            });
        }
        
        // All quests completed
        if (questId === 10 && mastery >= 85) {
            achievements.push({
                type: 'grand_master',
                name: 'PLE Champion',
                questId: 10
            });
        }
        
        // Save achievements
        for (const achievement of achievements) {
            await this.saveAchievement(userId, achievement);
        }
    }

    /**
     * Save achievement
     */
    async saveAchievement(userId, achievement) {
        return new Promise((resolve, reject) => {
            this.db.db.run(
                `INSERT OR IGNORE INTO achievements (userId, achievementType, achievementName, questId, earnedAt)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, achievement.type, achievement.name, achievement.questId, new Date().toISOString()],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Get topic complexity
     */
    getTopicComplexity(topic) {
        const complexTopics = [
            'Musculo-Skeletal System',
            'The Great Rift Valley',
            'Mountains - Volcanic',
            'Climate & Vegetation'
        ];
        
        return complexTopics.includes(topic) ? 'high' : 'normal';
    }

    /**
     * Get warmup question
     */
    async getWarmupQuestion(topic, sessionState) {
        try {
            const warmups = await this.db.getWarmupQuestions(topic, 3);
            
            if (warmups.length === 0) {
                return this.getFallbackQuestion();
            }
            
            const recentIds = sessionState.questionHistory || [];
            const available = warmups.filter(q => !recentIds.includes(q.Q_ID));
            
            if (available.length === 0) {
                return this.getFallbackQuestion();
            }
            
            const question = available[Math.floor(Math.random() * available.length)];
            
            question.debug = {
                type: 'warmup',
                topic: topic,
                reason: 'Starting new session with warmup',
                availableWarmups: warmups.length,
                score: 100,
                mastery: 'warmup',
                pool: 'warmup',
                needsWarmup: true,
                factors: ['warmup_question', 'new_session']
            };
            
            return question;
            
        } catch (error) {
            console.error('Error in getWarmupQuestion:', error);
            return this.getFallbackQuestion();
        }
    }

    /**
     * Fallback question selector
     */
    async getFallbackQuestion(pool = 'yes') {
        try {
            console.log('🔄 Using fallback question selector');
            
            // Try multiple times to get a question
            for (let attempt = 0; attempt < 3; attempt++) {
                const question = await new Promise((resolve) => {
                    this.db.db.get(`SELECT * FROM qbrss ORDER BY RANDOM() LIMIT 1`, [], (err, row) => {
                        if (err) {
                            console.error('Fallback query error:', err);
                            resolve(null);
                        } else {
                            resolve(row);
                        }
                    });
                });
                
                if (question) {
                    question.debug = {
                        type: 'fallback',
                        reason: 'Using fallback selector',
                        pool: pool,
                        attempt: attempt + 1
                    };
                    console.log('✅ Fallback question found:', question.Q_ID);
                    return question;
                }
            }
            
            console.log('⚠️ No questions in database, returning null');
            return null;
            
        } catch (error) {
            console.error('Critical error in fallback question:', error);
            return null;
        }
    }

    /**
     * Get fallback concepts
     */
    async getFallbackConcepts() {
        return new Promise((resolve, reject) => {
            this.db.db.all(`
                SELECT DISTINCT 
                    CASE 
                        WHEN Q_ID LIKE '%-V%' THEN substr(Q_ID, 1, length(Q_ID)-3)
                        ELSE Q_ID
                    END as baseId,
                    Topic
                FROM qbrss
            `, [], (err, rows) => {
                if (err) {
                    console.error('Fallback concepts error:', err);
                    resolve([]);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

module.exports = QuestionFetcher;