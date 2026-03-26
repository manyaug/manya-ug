const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ==================== POSTGRESQL CONNECTION ====================
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'manya_db',
    user: 'postgres',
    password: 'root',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err);
    } else {
        console.log('✅ Connected to PostgreSQL');
        release();
    }
});

// ==================== CONSTANTS & MANAGERS ====================
const REVIEW_INTERVALS = [1, 7, 30, 90];
const QuestManager = require('./quest-manager');
const questManager = new QuestManager();

// ==================== PLE RATIO MANAGER ====================
class PLERatioManager {
    constructor() {
        this.defaultRatio = 2;
        this.minRatio = 1;
        this.maxRatio = 3;
    }

    calculateOptimalRatio(userStats) {
        let ratio = this.defaultRatio;
        const factors = [];

        const totalAnswers = userStats.totalAnswered || 0;
        const totalCorrect = userStats.totalCorrect || 0;
        const accuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;

        if (accuracy < 50) {
            ratio = Math.max(this.minRatio, ratio - 0.5);
            factors.push('low_accuracy');
        } else if (accuracy > 80) {
            ratio = Math.min(this.maxRatio, ratio + 0.5);
            factors.push('high_accuracy');
        }

        ratio = Math.max(this.minRatio, Math.min(this.maxRatio, ratio));

        return {
            ratio: Math.round(ratio * 2) / 2,
            factors,
            plePercentage: Math.round((ratio / (ratio + 1)) * 100),
            practicePercentage: Math.round((1 / (ratio + 1)) * 100)
        };
    }

    selectNextPool(history = [], targetRatio = 2) {
        if (history.length < 5) {
            return { pool: 'yes', reason: 'Building history - starting with PLE' };
        }

        const recentPLE = history.filter(q => q.mark === 'yes').length;
        const recentPractice = history.filter(q => q.mark === 'no').length;
        
        const currentPLE = recentPLE / (recentPractice || 1);

        if (currentPLE < targetRatio) {
            return { pool: 'yes', reason: `Need more PLE (${recentPLE}/${recentPractice})` };
        } else if (currentPLE > targetRatio + 0.5) {
            return { pool: 'no', reason: `Balancing with practice (${recentPLE}/${recentPractice})` };
        }

        return { pool: Math.random() < 0.7 ? 'yes' : 'no', reason: 'Maintaining balance' };
    }
}

const pleManager = new PLERatioManager();

// ==================== HELPER FUNCTIONS ====================

function parseQuestionId(qId) {
    if (!qId) return { baseId: 'unknown', variant: 'V1', variantNum: 1 };
    
    const match = qId.match(/^(.+)-V(\d+)$/);
    if (match) {
        return {
            baseId: match[1],
            variant: 'V' + match[2],
            variantNum: parseInt(match[2])
        };
    }
    return {
        baseId: qId,
        variant: 'V1',
        variantNum: 1
    };
}

function getRecommendedVariant(userAnswers, baseId) {
    const conceptAnswers = (userAnswers || []).filter(a => {
        const parsed = parseQuestionId(a.q_id);
        return parsed.baseId === baseId;
    });
    
    if (conceptAnswers.length === 0) {
        return { variant: 'V1', reason: '🌱 New concept - start with V1' };
    }
    
    const v1Answers = conceptAnswers.filter(a => a.q_id.endsWith('-V1'));
    const v2Answers = conceptAnswers.filter(a => a.q_id.endsWith('-V2'));
    
    const v1Accuracy = v1Answers.length > 0 
        ? v1Answers.filter(a => a.is_correct).length / v1Answers.length 
        : 0;
    
    if (v1Answers.length < 3 || v1Accuracy < 0.7) {
        if (v1Answers.length < 3) {
            return { 
                variant: 'V1', 
                reason: `📝 Need ${3 - v1Answers.length} more V1 attempts to build foundation` 
            };
        } else {
            return { 
                variant: 'V1', 
                reason: `📝 V1 accuracy ${Math.round(v1Accuracy * 100)}% - need 70% to advance` 
            };
        }
    }
    
    if (!v2Answers.length) {
        return { variant: 'V2', reason: '🌿 V1 mastered! Ready for application level (V2)' };
    }
    
    const v2Accuracy = v2Answers.length > 0 
        ? v2Answers.filter(a => a.is_correct).length / v2Answers.length 
        : 0;
    
    if (v2Answers.length < 3 || v2Accuracy < 0.7) {
        if (v2Answers.length < 3) {
            return { 
                variant: 'V2', 
                reason: `📝 Need ${3 - v2Answers.length} more V2 attempts for application mastery` 
            };
        } else {
            return { 
                variant: 'V2', 
                reason: `📝 V2 accuracy ${Math.round(v2Accuracy * 100)}% - need 70% to advance` 
            };
        }
    }
    
    return { variant: 'V3', reason: '🌳 Ready for mastery level (V3)' };
}

// ==================== SPACED REPETITION FUNCTIONS ====================

function calculateNextReview(lastReviewDate, masteryLevel, reviewCount = 0, wasCorrect = true) {
    const lastDate = new Date(lastReviewDate);
    
    const intervalIndex = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
    let interval = REVIEW_INTERVALS[intervalIndex];
    
    if (!wasCorrect) {
        interval = Math.max(1, Math.floor(interval * 0.5));
    } else if (masteryLevel === 'mastered') {
        interval = Math.floor(interval * 1.5);
    }
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + interval);
    
    return {
        nextReview: nextDate,
        interval,
        reason: wasCorrect 
            ? `Next review in ${interval} days` 
            : `Missed - reviewing sooner in ${interval} days`
    };
}

function calculateMasteryLevel(conceptStats) {
    const { totalAttempts, totalCorrect, correctStreak } = conceptStats;
    
    if (totalAttempts === 0) return 'new';
    
    const accuracy = totalCorrect / totalAttempts;
    
    if (accuracy >= 0.9 && totalAttempts >= 10 && correctStreak >= 5) {
        return 'mastered';
    } else if (accuracy >= 0.8 && totalAttempts >= 5) {
        return 'progressing';
    } else if (accuracy >= 0.6) {
        return 'learning';
    } else {
        return 'struggling';
    }
}

function getReviewPriority(concept) {
    if (!concept || !concept.nextReviewAt) return 0;
    
    const now = new Date();
    const nextReview = new Date(concept.nextReviewAt);
    
    if (now < nextReview) return 0;
    
    const daysOverdue = Math.floor((now - nextReview) / (1000 * 60 * 60 * 24));
    
    let priority = 40;
    priority += Math.min(40, daysOverdue * 5);
    
    return priority;
}

// ==================== API ENDPOINTS ====================

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM qbrss');
        const answerCount = await pool.query('SELECT COUNT(*) as count FROM user_answer');
        
        res.json({ 
            message: '✅ Server is working with PostgreSQL!',
            questions: parseInt(result.rows[0].count) || 0,
            answers: parseInt(answerCount.rows[0].count) || 0,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Test endpoint error:', err);
        res.json({ error: err.message, count: 0 });
    }
});

// Get next question with variant awareness, spaced repetition, PLE ratio, and quests
app.get('/api/next-question/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        // Get user's answer history
        const userAnswersResult = await pool.query(
            `SELECT q."Q_ID" as q_id, ua."isCorrect" as is_correct 
             FROM user_answer ua
             JOIN qbrss q ON ua."questionId" = q."Q_ID"
             WHERE ua."userId" = $1
             ORDER BY ua."answeredAt" DESC`,
            [userId]
        );
        const userAnswers = userAnswersResult.rows;
        
        // Get user stats for PLE ratio
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as "totalAnswered",
                SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END) as "totalCorrect"
             FROM user_answer WHERE "userId" = $1`,
            [userId]
        );
        const userStats = statsResult.rows[0] || { totalAnswered: 0, totalCorrect: 0 };
        
        // Get question history for PLE ratio
        const historyResult = await pool.query(
            `SELECT "questionHistory" FROM user_sessions 
             WHERE "userId" = $1 ORDER BY "lastActive" DESC LIMIT 1`,
            [userId]
        );
        let questionHistory = [];
        if (historyResult.rows[0]?.questionHistory) {
            questionHistory = JSON.parse(historyResult.rows[0].questionHistory);
        }
        
        // Calculate PLE ratio and pool selection
        const ratioInfo = pleManager.calculateOptimalRatio({
            totalAnswered: parseInt(userStats.totalAnswered) || 0,
            totalCorrect: parseInt(userStats.totalCorrect) || 0
        });
        const poolSelection = pleManager.selectNextPool(questionHistory, ratioInfo.ratio);
        
        // Get current quest for user
        const currentQuest = await questManager.getCurrentQuest(userId, pool);
        let currentQuestId = 1;
        let questProgress = 0;
        let questTotal = 8;
        
        if (currentQuest) {
            if (currentQuest.questId) {
                currentQuestId = currentQuest.questId;
                questProgress = currentQuest.progress || 0;
                questTotal = currentQuest.totalQuestions || 8;
            } else {
                // Start first quest if none in progress
                const firstQuest = questManager.getQuest(1);
                questTotal = firstQuest.baseQuestions;
                await questManager.startQuest(userId, 1, questTotal, pool);
            }
        }
        
        // Get all questions
        const allQuestionsResult = await pool.query('SELECT * FROM qbrss');
        const allQuestions = allQuestionsResult.rows;
        
        if (!allQuestions || allQuestions.length === 0) {
            return res.json({ error: 'No questions in database' });
        }
        
        // Get recent questions (last 10)
        const recentQuestions = (userAnswers || []).slice(0, 10).map(a => a.q_id);
        
        // Score each question
        const scoredQuestions = [];
        
        for (const question of allQuestions) {
            const parsed = parseQuestionId(question.Q_ID);
            const recommendation = getRecommendedVariant(userAnswers || [], parsed.baseId);
            
            if (recommendation.variant !== parsed.variant) continue;
            
            // Get concept mastery for spaced repetition
            const conceptResult = await pool.query(
                `SELECT * FROM concept_mastery 
                 WHERE "userId" = $1 AND "baseId" = $2`,
                [userId, parsed.baseId]
            );
            const concept = conceptResult.rows[0];
            
            let priority = 50;
            const factors = [];
            
            // Variant-based priority
            if (recommendation.reason.includes('New concept')) {
                priority += 40;
                factors.push('new');
            } else if (recommendation.reason.includes('Need')) {
                priority += 30;
                factors.push('needs_practice');
            } else if (recommendation.reason.includes('Ready')) {
                priority += 20;
                factors.push('ready');
            }
            
            // Spaced repetition priority
            if (concept) {
                const reviewPriority = getReviewPriority(concept);
                if (reviewPriority > 0) {
                    priority += reviewPriority;
                    factors.push('due_for_review');
                    if (concept.masteryLevel === 'mastered') {
                        factors.push('mastered_review');
                    }
                }
            }
            
            // PLE Ratio priority
            const questionMark = question.mark || 'yes';
            if (poolSelection.pool === 'yes' && questionMark === 'yes') {
                priority += 20;
                factors.push('ple_priority');
            } else if (poolSelection.pool === 'no' && questionMark === 'no') {
                priority += 15;
                factors.push('practice_needed');
            } else if (questionMark !== poolSelection.pool) {
                priority -= 10;
                factors.push('wrong_pool');
            }
            
            // Recency penalty
            if (recentQuestions.includes(question.Q_ID)) {
                priority -= 20;
                factors.push('recent');
            } else {
                priority += 10;
                factors.push('fresh');
            }
            
            scoredQuestions.push({
                ...question,
                priority: Math.max(0, priority),
                factors,
                reason: recommendation.reason,
                variant: parsed.variant,
                mark: question.mark
            });
        }
        
        // Filter by selected pool to maintain ratio
        const poolFiltered = scoredQuestions.filter(q => 
            (poolSelection.pool === 'yes' && q.mark === 'yes') ||
            (poolSelection.pool === 'no' && q.mark === 'no')
        );
        
        // Use pool-filtered if available, otherwise use all
        const candidates = poolFiltered.length > 0 ? poolFiltered : scoredQuestions;
        
        candidates.sort((a, b) => b.priority - a.priority);
        const topCandidates = candidates.slice(0, 3);
        
        if (topCandidates.length === 0) {
            const fallbackResult = await pool.query('SELECT * FROM qbrss ORDER BY RANDOM() LIMIT 1');
            const fallback = fallbackResult.rows[0];
            fallback.debug = { 
                type: 'fallback',
                ratio: ratioInfo,
                poolSelection,
                quest: { id: currentQuestId, progress: questProgress, total: questTotal }
            };
            return res.json(fallback);
        }
        
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        
        // Parse correct answer
        const correctAnswer = selected.Correct_Answer || '';
        if (correctAnswer.startsWith('Option_')) {
            selected.parsed_correct_answer = correctAnswer.replace('Option_', '');
        } else if (correctAnswer.length === 1 && ['A','B','C','D'].includes(correctAnswer)) {
            selected.parsed_correct_answer = correctAnswer;
        } else {
            selected.parsed_correct_answer = 'A';
        }
        
        selected.debug = {
            priority: selected.priority,
            factors: selected.factors,
            reason: selected.reason,
            ratio: ratioInfo,
            poolSelection,
            quest: { id: currentQuestId, progress: questProgress, total: questTotal }
        };
        
        res.json(selected);
        
    } catch (err) {
        console.error('Error in next-question:', err);
        const fallbackResult = await pool.query('SELECT * FROM qbrss ORDER BY RANDOM() LIMIT 1');
        res.json(fallbackResult.rows[0] || { error: err.message });
    }
});

// Submit answer with spaced repetition, PLE ratio, and quest tracking
app.post('/api/submit-answer', async (req, res) => {
    const { userId, questionId, selectedAnswer, isCorrect, timeSpentMs, hintUsed } = req.body;
    
    console.log('📝 Submitting answer:', { userId, questionId, selectedAnswer, isCorrect });
    
    try {
        // Get correct answer
        const questionResult = await pool.query(
            'SELECT "Correct_Answer" FROM qbrss WHERE "Q_ID" = $1',
            [questionId]
        );
        const question = questionResult.rows[0];
        
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        
        // Parse correct answer
        let correctAnswer = 'A';
        const correctAnswerText = question.Correct_Answer || '';
        
        if (correctAnswerText.startsWith('Option_')) {
            correctAnswer = correctAnswerText.replace('Option_', '');
        } else if (correctAnswerText.length === 1 && ['A','B','C','D'].includes(correctAnswerText)) {
            correctAnswer = correctAnswerText;
        }
        
        const wasCorrect = (selectedAnswer === correctAnswer);
        const pointsEarned = wasCorrect ? (hintUsed ? 2 : 3) : 0;
        
        console.log('✅ Answer processed:', { wasCorrect, correctAnswer, pointsEarned });
        
        // Insert answer
        await pool.query(
            `INSERT INTO user_answer (
                id, "userId", "questionId", "isCorrect", "selectedAnswer", "correctAnswer",
                "timeSpentMs", "hintUsed", "pointsEarned", "answeredAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                'ans-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                userId,
                questionId,
                wasCorrect,
                selectedAnswer,
                correctAnswer,
                timeSpentMs || 0,
                hintUsed || false,
                pointsEarned,
                new Date().toISOString()
            ]
        );
        
        // Update question history for PLE ratio
        try {
            const markResult = await pool.query(
                'SELECT "mark" FROM qbrss WHERE "Q_ID" = $1',
                [questionId]
            );
            const questionMark = markResult.rows[0]?.mark || 'yes';
            
            const historyResult = await pool.query(
                `SELECT "questionHistory" FROM user_sessions 
                 WHERE "userId" = $1 ORDER BY "lastActive" DESC LIMIT 1`,
                [userId]
            );
            
            let history = [];
            if (historyResult.rows[0]?.questionHistory) {
                history = JSON.parse(historyResult.rows[0].questionHistory);
            }
            
            history.push({
                mark: questionMark,
                timestamp: new Date().toISOString()
            });
            
            if (history.length > 20) {
                history = history.slice(-20);
            }
            
            await pool.query(
                `UPDATE user_sessions SET "questionHistory" = $1, "lastActive" = NOW() 
                 WHERE "userId" = $2 AND "lastActive" = (
                     SELECT MAX("lastActive") FROM user_sessions WHERE "userId" = $2
                 )`,
                [JSON.stringify(history), userId]
            );
        } catch (err) {
            console.error('Error updating question history:', err);
        }
        
        // Update concept mastery for spaced repetition
        const parsed = parseQuestionId(questionId);
        const now = new Date();
        
        const conceptResult = await pool.query(
            `SELECT * FROM concept_mastery 
             WHERE "userId" = $1 AND "baseId" = $2`,
            [userId, parsed.baseId]
        );
        
        let concept = conceptResult.rows[0];
        
        if (!concept) {
            const nextReview = calculateNextReview(now, 'learning', 0, wasCorrect);
            
            await pool.query(
                `INSERT INTO concept_mastery (
                    "userId", "baseId", "masteryLevel", "reviewCount", 
                    "lastReviewedAt", "nextReviewAt", "correctStreak",
                    "totalAttempts", "totalCorrect"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    userId,
                    parsed.baseId,
                    'learning',
                    1,
                    now,
                    nextReview.nextReview,
                    wasCorrect ? 1 : 0,
                    1,
                    wasCorrect ? 1 : 0
                ]
            );
        } else {
            const newAttempts = concept.totalAttempts + 1;
            const newCorrect = concept.totalCorrect + (wasCorrect ? 1 : 0);
            const newStreak = wasCorrect ? concept.correctStreak + 1 : 0;
            
            const masteryLevel = calculateMasteryLevel({
                totalAttempts: newAttempts,
                totalCorrect: newCorrect,
                correctStreak: newStreak
            });
            
            const newReviewCount = concept.reviewCount + 1;
            const nextReview = calculateNextReview(
                now, 
                masteryLevel, 
                newReviewCount, 
                wasCorrect
            );
            
            await pool.query(
                `UPDATE concept_mastery SET
                    "masteryLevel" = $1,
                    "reviewCount" = $2,
                    "lastReviewedAt" = $3,
                    "nextReviewAt" = $4,
                    "correctStreak" = $5,
                    "totalAttempts" = $6,
                    "totalCorrect" = $7,
                    "updatedAt" = $8
                 WHERE "userId" = $9 AND "baseId" = $10`,
                [
                    masteryLevel,
                    newReviewCount,
                    now,
                    nextReview.nextReview,
                    newStreak,
                    newAttempts,
                    newCorrect,
                    now,
                    userId,
                    parsed.baseId
                ]
            );
        }
        
        // Update quest progress
        try {
            // Get current quest
            const currentQuest = await questManager.getCurrentQuest(userId, pool);
            if (currentQuest && currentQuest.questId) {
                await questManager.updateQuestProgress(
                    userId, 
                    currentQuest.questId, 
                    wasCorrect, 
                    pointsEarned, 
                    pool
                );
            }
        } catch (err) {
            console.error('Error updating quest progress:', err);
        }
        
        res.json({ 
            success: true, 
            isCorrect: wasCorrect, 
            correctAnswer: correctAnswer,
            pointsEarned: pointsEarned,
            message: wasCorrect ? '✅ Correct!' : '❌ Not quite right'
        });
        
    } catch (err) {
        console.error('❌ Error submitting answer:', err);
        res.status(500).json({ 
            error: err.message,
            details: err.stack 
        });
    }
});

// Get PLE ratio info for user
app.get('/api/ple-ratio/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const statsResult = await pool.query(
            `SELECT 
                COUNT(*) as "totalAnswered",
                SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END) as "totalCorrect"
             FROM user_answer WHERE "userId" = $1`,
            [userId]
        );
        const userStats = statsResult.rows[0] || { totalAnswered: 0, totalCorrect: 0 };
        
        const historyResult = await pool.query(
            `SELECT "questionHistory" FROM user_sessions 
             WHERE "userId" = $1 ORDER BY "lastActive" DESC LIMIT 1`,
            [userId]
        );
        
        let history = [];
        if (historyResult.rows[0]?.questionHistory) {
            history = JSON.parse(historyResult.rows[0].questionHistory);
        }
        
        const ratioInfo = pleManager.calculateOptimalRatio({
            totalAnswered: parseInt(userStats.totalAnswered) || 0,
            totalCorrect: parseInt(userStats.totalCorrect) || 0
        });
        
        const recentPLE = history.filter(q => q.mark === 'yes').length;
        const recentPractice = history.filter(q => q.mark === 'no').length;
        
        res.json({
            ...ratioInfo,
            currentPLE: recentPLE,
            currentPractice: recentPractice,
            history: history.slice(-10)
        });
        
    } catch (err) {
        console.error('Error getting PLE ratio:', err);
        res.json({ 
            ratio: 2, 
            plePercentage: 66, 
            practicePercentage: 34,
            factors: [],
            currentPLE: 0,
            currentPractice: 0
        });
    }
});

// Get quest progress for user
app.get('/api/quests/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const quests = await questManager.getQuestsWithStatus(userId, pool);
        const currentQuest = await questManager.getCurrentQuest(userId, pool);
        
        res.json({
            quests,
            currentQuest: currentQuest ? {
                questId: currentQuest.questId,
                progress: currentQuest.progress || 0,
                total: currentQuest.totalQuestions || 0,
                status: currentQuest.status
            } : null
        });
    } catch (err) {
        console.error('Error getting quests:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get quest rewards for user
app.get('/api/quest-rewards/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await pool.query(
            `SELECT * FROM quest_rewards WHERE "userId" = $1 ORDER BY "claimedAt" DESC`,
            [userId]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting quest rewards:', err);
        res.json([]);
    }
});

// Get hint
app.get('/api/hint/:questionId', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT "Hint" FROM qbrss WHERE "Q_ID" = $1',
            [req.params.questionId]
        );
        
        res.json({ 
            hint: result.rows[0]?.Hint || "Think carefully about what you've learned!" 
        });
    } catch (err) {
        res.json({ hint: "Think carefully about what you've learned!" });
    }
});

// Get user stats
app.get('/api/user-stats/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const topicStatsResult = await pool.query(
            `SELECT 
                q."Topic" as topic,
                COUNT(ua.id) as attempts,
                SUM(CASE WHEN ua."isCorrect" THEN 1 ELSE 0 END) as correct,
                SUM(ua."pointsEarned") as points,
                AVG(ua."timeSpentMs") as avg_time,
                MAX(ua."answeredAt") as last_seen
             FROM user_answer ua
             JOIN qbrss q ON ua."questionId" = q."Q_ID"
             WHERE ua."userId" = $1
             GROUP BY q."Topic"`,
            [userId]
        );
        
        const topicStats = topicStatsResult.rows;
        
        let totalAnswered = 0;
        let totalCorrect = 0;
        let totalPoints = 0;
        
        const topics = (topicStats || []).map(t => {
            totalAnswered += parseInt(t.attempts) || 0;
            totalCorrect += parseInt(t.correct) || 0;
            totalPoints += parseInt(t.points) || 0;
            
            return {
                Topic: t.topic,
                attempts: parseInt(t.attempts) || 0,
                correct: parseInt(t.correct) || 0,
                accuracy: t.attempts > 0 ? Math.round((parseInt(t.correct) / parseInt(t.attempts)) * 100) : 0,
                points: parseInt(t.points) || 0,
                avgTime: Math.round((parseFloat(t.avg_time) || 0) / 1000),
                lastSeen: t.last_seen
            };
        });
        
        res.json({
            topics,
            summary: {
                totalAnswered,
                totalCorrect,
                totalPoints,
                overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
            }
        });
        
    } catch (err) {
        console.error('Error getting stats:', err);
        res.json({ 
            topics: [], 
            summary: { totalAnswered: 0, totalCorrect: 0, totalPoints: 0, overallAccuracy: 0 } 
        });
    }
});

// Get upcoming reviews
app.get('/api/upcoming-reviews/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await pool.query(
            `SELECT * FROM concept_mastery 
             WHERE "userId" = $1 
               AND "nextReviewAt" IS NOT NULL
               AND "nextReviewAt" <= NOW() + INTERVAL '7 days'
             ORDER BY "nextReviewAt" ASC
             LIMIT 10`,
            [userId]
        );
        
        const reviews = result.rows.map(row => ({
            baseId: row.baseId,
            masteryLevel: row.masteryLevel,
            nextReviewAt: row.nextReviewAt,
            daysUntil: Math.ceil(
                (new Date(row.nextReviewAt) - new Date()) / (1000 * 60 * 60 * 24)
            )
        }));
        
        res.json(reviews);
    } catch (err) {
        console.error('Error getting upcoming reviews:', err);
        res.json([]);
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const usersResult = await pool.query('SELECT DISTINCT "userId" FROM user_answer ORDER BY "userId"');
        const userList = ['student-001', 'student-002'];
        
        usersResult.rows.forEach(u => {
            if (!userList.includes(u.userId)) {
                userList.push(u.userId);
            }
        });
        
        res.json({ users: userList });
    } catch (err) {
        console.error('Error getting users:', err);
        res.json({ users: ['student-001', 'student-002'] });
    }
});

// Register new user
app.post('/api/register-user', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }
    const userId = username.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    res.json({ userId, username, isNew: true, message: 'User created!' });
});

// Delete user
app.delete('/api/user/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    if (userId === 'student-001' || userId === 'student-002') {
        return res.status(403).json({ error: 'Cannot delete demo users' });
    }
    
    try {
        await pool.query('DELETE FROM user_answer WHERE "userId" = $1', [userId]);
        await pool.query('DELETE FROM concept_mastery WHERE "userId" = $1', [userId]);
        await pool.query('DELETE FROM user_sessions WHERE "userId" = $1', [userId]);
        await pool.query('DELETE FROM user_quests WHERE "userId" = $1', [userId]);
        await pool.query('DELETE FROM quest_rewards WHERE "userId" = $1', [userId]);
        
        res.json({ 
            success: true, 
            message: `User ${userId} deleted`
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`🎯 Variant-aware question selection active`);
    console.log(`📊 Points system: 3 for correct, 2 for correct with hint, 0 for wrong`);
    console.log(`🧠 Spaced repetition active with intervals: 1, 7, 30, 90 days`);
    console.log(`⚖️ PLE Ratio system active (2:1 default, adjusts based on performance)`);
    console.log(`🎮 Quest system active with 10 progressive quests`);
    console.log(`🐘 Using PostgreSQL for better concurrency`);
});