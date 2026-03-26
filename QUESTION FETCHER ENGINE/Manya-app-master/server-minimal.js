const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Simple database connection
const db = new sqlite3.Database('./manya.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('✅ Connected to manya.db');
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    db.get("SELECT COUNT(*) as count FROM qbrss", [], (err, result) => {
        if (err) {
            res.json({ error: err.message, count: 0 });
        } else {
            res.json({ 
                message: 'Server is working!',
                questions: result.count,
                timestamp: new Date().toISOString()
            });
        }
    });
});

// Simple question endpoint
app.get('/api/next-question/:userId', (req, res) => {
    db.get("SELECT * FROM qbrss ORDER BY RANDOM() LIMIT 1", [], (err, question) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(question);
        }
    });
});

// Submit answer endpoint
app.post('/api/submit-answer', (req, res) => {
    const { userId, questionId, selectedAnswer, isCorrect, timeSpentMs } = req.body;
    
    db.run(
        `INSERT INTO user_answer (id, userId, questionId, isCorrect, selectedAnswer, timeSpentMs, answeredAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            'ans-' + Date.now(),
            userId,
            questionId,
            isCorrect ? 1 : 0,
            selectedAnswer,
            timeSpentMs,
            new Date().toISOString()
        ],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ 
                    success: true, 
                    isCorrect, 
                    pointsEarned: isCorrect ? 3 : 0,
                    message: isCorrect ? '✅ Correct!' : '❌ Not quite right'
                });
            }
        }
    );
});

// Simple stats endpoint
app.get('/api/user-stats/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.all(
        `SELECT 
            COUNT(*) as total,
            SUM(isCorrect) as correct
         FROM user_answer 
         WHERE userId = ?`,
        [userId],
        (err, result) => {
            if (err) {
                res.json({ topics: [], summary: { totalAnswered: 0, totalCorrect: 0 } });
            } else {
                const total = result[0]?.total || 0;
                const correct = result[0]?.correct || 0;
                res.json({
                    topics: [],
                    summary: {
                        totalAnswered: total,
                        totalCorrect: correct,
                        totalPoints: correct * 3
                    }
                });
            }
        }
    );
});

// Users endpoint
app.get('/api/users', (req, res) => {
    db.all("SELECT DISTINCT userId FROM user_answer", [], (err, users) => {
        const userList = ['student-001', 'student-002'];
        if (!err && users) {
            users.forEach(u => {
                if (!userList.includes(u.userId)) {
                    userList.push(u.userId);
                }
            });
        }
        res.json({ users: userList });
    });
});

// Register user
app.post('/api/register-user', (req, res) => {
    const { username } = req.body;
    const userId = username.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    res.json({ userId, username, isNew: true });
});
// Submit answer endpoint - Enhanced with correct answer parsing
app.post('/api/submit-answer', (req, res) => {
    const { userId, questionId, selectedAnswer, isCorrect, timeSpentMs, hintUsed } = req.body;
    
    // First, get the correct answer from the question
    db.get(`SELECT Correct_Answer FROM qbrss WHERE Q_ID = ?`, [questionId], (err, question) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!question) {
            res.status(404).json({ error: 'Question not found' });
            return;
        }
        
        // Parse correct answer (handles "Option_A" format)
        let correctAnswer = 'A';
        const correctAnswerText = question.Correct_Answer || '';
        
        if (correctAnswerText.startsWith('Option_')) {
            correctAnswer = correctAnswerText.replace('Option_', '');
        } else if (correctAnswerText.length === 1 && ['A','B','C','D'].includes(correctAnswerText)) {
            correctAnswer = correctAnswerText;
        }
        
        // Calculate points (3 for correct, 2 for correct with hint, 0 for wrong)
        const pointsEarned = isCorrect ? (hintUsed ? 2 : 3) : 0;
        
        db.run(
            `INSERT INTO user_answer (
                id, userId, questionId, isCorrect, selectedAnswer, correctAnswer,
                timeSpentMs, hintUsed, pointsEarned, answeredAt
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'ans-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
                userId,
                questionId,
                isCorrect ? 1 : 0,
                selectedAnswer,
                correctAnswer,
                timeSpentMs || 0,
                hintUsed ? 1 : 0,
                pointsEarned,
                new Date().toISOString()
            ],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ 
                        success: true, 
                        isCorrect, 
                        correctAnswer,
                        pointsEarned,
                        message: isCorrect ? '✅ Correct!' : '❌ Not quite right'
                    });
                }
            }
        );
    });
});
// Enhanced stats endpoint
app.get('/api/user-stats/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.all(
        `SELECT 
            q.Topic,
            COUNT(ua.id) as attempts,
            SUM(ua.isCorrect) as correct,
            SUM(ua.pointsEarned) as points
         FROM user_answer ua
         JOIN qbrss q ON ua.questionId = q.Q_ID
         WHERE ua.userId = ?
         GROUP BY q.Topic`,
        [userId],
        (err, topicStats) => {
            if (err) {
                console.error('Error getting topic stats:', err);
                res.json({ topics: [], summary: { totalAnswered: 0, totalCorrect: 0, totalPoints: 0 } });
                return;
            }
            
            // Calculate overall summary
            let totalAnswered = 0;
            let totalCorrect = 0;
            let totalPoints = 0;
            
            const topics = (topicStats || []).map(t => {
                totalAnswered += t.attempts || 0;
                totalCorrect += t.correct || 0;
                totalPoints += t.points || 0;
                
                return {
                    Topic: t.Topic,
                    attempts: t.attempts || 0,
                    correct: t.correct || 0,
                    accuracy: t.attempts > 0 ? Math.round((t.correct / t.attempts) * 100) : 0,
                    points: t.points || 0
                };
            });
            
            res.json({
                topics,
                summary: {
                    totalAnswered,
                    totalCorrect,
                    totalPoints
                }
            });
        }
    );
});
// Hint endpoint
app.get('/api/hint/:questionId', (req, res) => {
    db.get(`SELECT Hint FROM qbrss WHERE Q_ID = ?`, [req.params.questionId], (err, question) => {
        if (err || !question) {
            res.json({ hint: "Think carefully about what you've learned!" });
        } else {
            res.json({ hint: question.Hint || "No hint available for this question." });
        }
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
});