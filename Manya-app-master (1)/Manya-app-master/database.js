// database.js - Simplified version
const dbSingleton = require('./db-singleton');
const DatabaseQueue = require('./db-queue-simple');

class Database {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        const db = await dbSingleton.initialize();
        this.queue = new DatabaseQueue(db);
        this.initialized = true;
    }

    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
    }

    async getTopicsInOrder() {
        await this.ensureInit();
        const rows = await this.queue.all(`
            SELECT Topic, MIN(Q_ID) as firstQuestionId
            FROM qbrss 
            GROUP BY Topic
            ORDER BY firstQuestionId ASC
        `);
        return rows.map(r => r.Topic);
    }

    async getConceptsInOrder() {
        await this.ensureInit();
        return this.queue.all(`
            SELECT DISTINCT 
                CASE 
                    WHEN Q_ID LIKE '%-V%' THEN substr(Q_ID, 1, length(Q_ID)-3)
                    ELSE Q_ID
                END as baseId,
                Topic,
                MIN(Q_ID) as firstQuestionId
            FROM qbrss
            GROUP BY baseId, Topic
            ORDER BY firstQuestionId ASC
        `);
    }

    async getConceptVariants(baseId, userId) {
        await this.ensureInit();
        return this.queue.all(`
            SELECT 
                q.Q_ID,
                q.Difficulty,
                q.mark,
                COUNT(ua.id) as attempts,
                SUM(CASE WHEN ua.isCorrect THEN 1 ELSE 0 END) as correct,
                AVG(ua.timeSpentMs) as avgTime,
                MAX(ua.answeredAt) as lastSeen,
                SUM(CASE WHEN ua.hintUsed THEN 1 ELSE 0 END) as hintsUsed,
                julianday('now') - julianday(MAX(ua.answeredAt)) as daysSinceLast
            FROM qbrss q
            LEFT JOIN user_answer ua ON q.Q_ID = ua.questionId AND ua.userId = ?
            WHERE q.Q_ID LIKE ? || '%'
            GROUP BY q.Q_ID
            ORDER BY q.Q_ID
        `, [userId, baseId]);
    }

    async getRandomQuestion(baseId, variant, mark) {
        await this.ensureInit();
        let query = `SELECT * FROM qbrss WHERE 1=1`;
        const params = [];
        
        if (baseId && baseId !== '%') {
            query += ` AND Q_ID LIKE ?`;
            params.push(baseId + '%');
        }
        
        if (variant && variant !== '%') {
            query += ` AND Q_ID LIKE ?`;
            params.push('%' + variant);
        }
        
        if (mark && mark !== '%') {
            query += ` AND mark = ?`;
            params.push(mark);
        }
        
        query += ` ORDER BY RANDOM() LIMIT 1`;
        
        return this.queue.get(query, params);
    }

    async getWarmupQuestions(topic, limit = 3) {
        await this.ensureInit();
        return this.queue.all(`
            SELECT * FROM qbrss 
            WHERE Topic = ? 
            AND Difficulty = 'E'
            AND Q_ID LIKE '%-V1'
            ORDER BY RANDOM()
            LIMIT ?
        `, [topic, limit]);
    }

    async submitAnswer(answerData) {
        await this.ensureInit();
        await this.queue.run(`
            INSERT INTO user_answer (
                id, userId, questionId, isCorrect, selectedAnswer, correctAnswer,
                timeSpentMs, hintUsed, answerChanged, timeOfDay, dayOfWeek,
                pointsEarned, confidenceRating, hesitationCount, frustrationLevel, answeredAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'ans-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            answerData.userId,
            answerData.questionId,
            answerData.isCorrect ? 1 : 0,
            answerData.selectedAnswer,
            answerData.correctAnswer || 'A',
            answerData.timeSpentMs,
            answerData.hintUsed ? 1 : 0,
            answerData.answerChanged ? 1 : 0,
            answerData.timeOfDay,
            answerData.dayOfWeek,
            answerData.pointsEarned || 0,
            answerData.confidenceRating || 70,
            answerData.hesitationCount || 0,
            answerData.frustrationLevel || 0,
            new Date().toISOString()
        ]);
        
        return {
            success: true,
            isCorrect: answerData.isCorrect,
            correctAnswer: answerData.correctAnswer || 'A',
            pointsEarned: answerData.pointsEarned || 0,
            message: answerData.isCorrect ? '✅ Correct!' : '❌ Not quite right'
        };
    }

    async getUserStats(userId) {
        await this.ensureInit();
        return this.queue.all(`
            SELECT 
                q.Topic,
                q.Q_ID,
                COUNT(ua.id) as attempts,
                SUM(CASE WHEN ua.isCorrect THEN 1 ELSE 0 END) as correct,
                AVG(ua.timeSpentMs) as avgTime,
                MAX(ua.answeredAt) as lastSeen
            FROM qbrss q
            LEFT JOIN user_answer ua ON q.Q_ID = ua.questionId AND ua.userId = ?
            GROUP BY q.Q_ID
        `, [userId]);
    }

    async close() {
        await dbSingleton.close();
    }
}

module.exports = Database;