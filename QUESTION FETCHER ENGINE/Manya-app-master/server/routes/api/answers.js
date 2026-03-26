const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const personalization = require('../../engines/personalizationEngine');
const psychological = require('../../engines/psychologicalEngine');
const behavioral = require('../../engines/behavioralEngine');
const reward = require('../../engines/rewardEngine');

router.post('/submit-answer', async (req, res) => {
    const { userId, questionId, selectedAnswer, isCorrect, timeSpentMs, hintUsed } = req.body;
    
    try {
        // Get correct answer
        const questionResult = await pool.query(
            'SELECT "Correct_Answer" FROM qbrss WHERE "Q_ID" = $1',
            [questionId]
        );
        const question = questionResult.rows[0];
        
        if (!question) return res.status(404).json({ error: 'Question not found' });
        
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
        
        // Update concept mastery
        const parsed = personalization.parseQuestionId(questionId);
        const now = new Date();
        
        const conceptResult = await pool.query(
            `SELECT * FROM concept_mastery WHERE "userId" = $1 AND "baseId" = $2`,
            [userId, parsed.baseId]
        );
        
        let concept = conceptResult.rows[0];
        
        if (!concept) {
            const nextReview = personalization.calculateNextReview(now, 'learning', 0, wasCorrect);
            await pool.query(
                `INSERT INTO concept_mastery ("userId", "baseId", "masteryLevel", "reviewCount", 
                    "lastReviewedAt", "nextReviewAt", "correctStreak", "totalAttempts", "totalCorrect")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [userId, parsed.baseId, 'learning', 1, now, nextReview.nextReview,
                 wasCorrect ? 1 : 0, 1, wasCorrect ? 1 : 0]
            );
        } else {
            const newAttempts = concept.totalAttempts + 1;
            const newCorrect = concept.totalCorrect + (wasCorrect ? 1 : 0);
            const newStreak = wasCorrect ? concept.correctStreak + 1 : 0;
            const masteryLevel = personalization.calculateMasteryLevel({
                totalAttempts: newAttempts,
                totalCorrect: newCorrect,
                correctStreak: newStreak
            });
            const nextReview = personalization.calculateNextReview(now, masteryLevel, 
                concept.reviewCount + 1, wasCorrect);
            
            await pool.query(
                `UPDATE concept_mastery SET "masteryLevel" = $1, "reviewCount" = $2,
                    "lastReviewedAt" = $3, "nextReviewAt" = $4, "correctStreak" = $5,
                    "totalAttempts" = $6, "totalCorrect" = $7, "updatedAt" = $8
                 WHERE "userId" = $9 AND "baseId" = $10`,
                [masteryLevel, concept.reviewCount + 1, now, nextReview.nextReview,
                 newStreak, newAttempts, newCorrect, now, userId, parsed.baseId]
            );
        }
        
        // Update streak
        await behavioral.updateStreak(userId, pool);
        
        res.json({ 
            success: true, 
            isCorrect: wasCorrect, 
            correctAnswer,
            pointsEarned,
            message: wasCorrect ? '✅ Correct!' : '❌ Not quite right'
        });
        
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;