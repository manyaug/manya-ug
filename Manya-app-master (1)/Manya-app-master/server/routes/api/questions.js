const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const personalization = require('../../engines/personalizationEngine');
const pleManager = require('../../managers/pleManager');
const QuestManager = require('../../managers/questManager');

const ple = new pleManager();

router.get('/next-question/:userId', async (req, res) => {
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
            `SELECT COUNT(*) as "totalAnswered",
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
        
        // Calculate PLE ratio
        const ratioInfo = ple.calculateOptimalRatio({
            totalAnswered: parseInt(userStats.totalAnswered) || 0,
            totalCorrect: parseInt(userStats.totalCorrect) || 0
        });
        const poolSelection = ple.selectNextPool(questionHistory, ratioInfo.ratio);
        
        // Get all questions
        const allQuestionsResult = await pool.query('SELECT * FROM qbrss');
        const allQuestions = allQuestionsResult.rows;
        
        if (!allQuestions || allQuestions.length === 0) {
            return res.json({ error: 'No questions' });
        }
        
        // Score each question
        const scoredQuestions = [];
        
        for (const question of allQuestions) {
            const parsed = personalization.parseQuestionId(question.Q_ID);
            const recommendation = personalization.getRecommendedVariant(userAnswers || [], parsed.baseId);
            
            if (recommendation.variant !== parsed.variant) continue;
            
            // Get concept mastery
            const conceptResult = await pool.query(
                `SELECT * FROM concept_mastery WHERE "userId" = $1 AND "baseId" = $2`,
                [userId, parsed.baseId]
            );
            const concept = conceptResult.rows[0];
            
            let priority = 50;
            const factors = [];
            
            // Variant priority
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
            
            // Spaced repetition
            if (concept) {
                const reviewPriority = personalization.getReviewPriority(concept);
                if (reviewPriority > 0) {
                    priority += reviewPriority;
                    factors.push('due_for_review');
                }
            }
            
            // PLE Ratio
            const questionMark = question.mark || 'yes';
            if (poolSelection.pool === 'yes' && questionMark === 'yes') {
                priority += 20;
                factors.push('ple_priority');
            } else if (poolSelection.pool === 'no' && questionMark === 'no') {
                priority += 15;
                factors.push('practice_needed');
            }
            
            scoredQuestions.push({
                ...question,
                priority,
                factors,
                reason: recommendation.reason,
                variant: parsed.variant
            });
        }
        
        // Sort and select
        scoredQuestions.sort((a, b) => b.priority - a.priority);
        const topCandidates = scoredQuestions.slice(0, 3);
        
        if (topCandidates.length === 0) {
            const fallback = await pool.query('SELECT * FROM qbrss ORDER BY RANDOM() LIMIT 1');
            return res.json(fallback.rows[0]);
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
            poolSelection
        };
        
        res.json(selected);
        
    } catch (err) {
        console.error('Error:', err);
        const fallback = await pool.query('SELECT * FROM qbrss ORDER BY RANDOM() LIMIT 1');
        res.json(fallback.rows[0] || { error: err.message });
    }
});

module.exports = router;