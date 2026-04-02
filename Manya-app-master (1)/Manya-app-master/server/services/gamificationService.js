// server/services/gamificationService.js
const pool = require('../config/database');

class GamificationService {
    
    // Initialize user's gamification data
    async initializeUser(userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Initialize subject gems
            const subjects = ['math', 'english', 'social', 'science'];
            for (const subject of subjects) {
                await client.query(
                    `INSERT INTO subject_gems (user_id, subject, gem_count) 
                     VALUES ($1, $2, 0) 
                     ON CONFLICT (user_id, subject) DO NOTHING`,
                    [userId, subject]
                );
            }
            
            // Initialize overall gems
            await client.query(
                `INSERT INTO user_gems (user_id, overall_gems) 
                 VALUES ($1, 0) 
                 ON CONFLICT (user_id) DO NOTHING`,
                [userId]
            );
            
            // Initialize streak
            await client.query(
                `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date) 
                 VALUES ($1, 0, 0, CURRENT_DATE) 
                 ON CONFLICT (user_id) DO NOTHING`,
                [userId]
            );
            
            await client.query('COMMIT');
            console.log(`✅ Gamification initialized for user: ${userId}`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error initializing gamification:', err);
            throw err;
        } finally {
            client.release();
        }
    }
    
    // Calculate gems earned from an answer
    calculateGems(isCorrect, hintUsed, subject, streakMultiplier = 1) {
        let baseGems = 0;
        
        if (isCorrect) {
            baseGems = hintUsed ? 1 : 3;
        }
        
        // Apply streak multiplier
        let subjectGems = Math.floor(baseGems * streakMultiplier);
        let overallGems = hintUsed ? 0.5 : 1;
        overallGems = Math.floor(overallGems * streakMultiplier);
        
        // Bonus for perfect answer (no hint, correct)
        if (isCorrect && !hintUsed) {
            subjectGems += 1;
            overallGems += 1;
        }
        
        return {
            subjectGems,
            overallGems,
            baseGems: isCorrect ? (hintUsed ? 1 : 3) : 0
        };
    }
    
    // Award gems to user
    async awardGems(userId, subject, subjectGems, overallGems, context = 'answer_correct') {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Update subject gems
            await client.query(
                `INSERT INTO subject_gems (user_id, subject, gem_count) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id, subject) 
                 DO UPDATE SET gem_count = subject_gems.gem_count + $3, updated_at = CURRENT_TIMESTAMP`,
                [userId, subject, subjectGems]
            );
            
            // Update overall gems
            await client.query(
                `UPDATE user_gems 
                 SET overall_gems = overall_gems + $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = $1`,
                [userId, overallGems]
            );
            
            await client.query('COMMIT');
            
            console.log(`✅ Awarded ${subjectGems} ${subject} gems + ${overallGems} overall to ${userId}`);
            
            return {
                subjectGems,
                overallGems,
                totalSubject: await this.getSubjectGems(userId, subject),
                totalOverall: await this.getOverallGems(userId)
            };
            
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error awarding gems:', err);
            throw err;
        } finally {
            client.release();
        }
    }
    
    // Get user's subject gems
    async getSubjectGems(userId, subject) {
        const result = await pool.query(
            `SELECT gem_count FROM subject_gems WHERE user_id = $1 AND subject = $2`,
            [userId, subject]
        );
        return result.rows[0]?.gem_count || 0;
    }
    
    // Get user's overall gems
    async getOverallGems(userId) {
        const result = await pool.query(
            `SELECT overall_gems FROM user_gems WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0]?.overall_gems || 0;
    }
    
    // Update streak
    async updateStreak(userId, isCorrect) {
        const client = await pool.connect();
        try {
            const streakResult = await client.query(
                `SELECT current_streak, longest_streak, last_activity_date 
                 FROM user_streaks WHERE user_id = $1`,
                [userId]
            );
            
            let streak = streakResult.rows[0] || { current_streak: 0, longest_streak: 0, last_activity_date: null };
            const today = new Date().toISOString().split('T')[0];
            const lastDate = streak.last_activity_date?.toISOString().split('T')[0];
            
            let newStreak = streak.current_streak;
            
            if (isCorrect) {
                if (lastDate === today) {
                    // Already played today, streak unchanged
                } else if (lastDate === this.getYesterday()) {
                    // Consecutive day, increment streak
                    newStreak = (streak.current_streak || 0) + 1;
                } else {
                    // New streak
                    newStreak = 1;
                }
            } else {
                // Wrong answer doesn't break streak, but doesn't advance it
                if (lastDate !== today && lastDate !== this.getYesterday()) {
                    newStreak = 0;
                }
            }
            
            const longestStreak = Math.max(streak.longest_streak || 0, newStreak);
            
            await client.query(
                `UPDATE user_streaks 
                 SET current_streak = $2, longest_streak = $3, last_activity_date = $4
                 WHERE user_id = $1`,
                [userId, newStreak, longestStreak, today]
            );
            
            await client.query('COMMIT');
            
            return {
                currentStreak: newStreak,
                longestStreak: longestStreak,
                streakBonus: this.getStreakMultiplier(newStreak)
            };
            
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error updating streak:', err);
            throw err;
        } finally {
            client.release();
        }
    }
    
    getYesterday() {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    }
    
    getStreakMultiplier(streak) {
        if (streak >= 7) return 2.0;
        if (streak >= 5) return 1.5;
        if (streak >= 3) return 1.2;
        return 1.0;
    }
    
    // Track emotional state
   // Track emotional state
async trackEmotion(userId, emotion, intensity, context, responseTime) {
    // Ensure responseTime is an integer
    const responseTimeMs = Math.floor(parseInt(responseTime) || 0);
    
    await pool.query(
        `INSERT INTO emotional_metrics (user_id, emotion, intensity, context, response_time_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, emotion, intensity, context, responseTimeMs]
    );
    
    console.log(`📊 Tracked emotion: ${emotion} (${intensity}%) for ${userId}`);
}
    
    // Get emotional modifiers for rewards
    async getEmotionalModifiers(userId) {
        const result = await pool.query(
            `SELECT emotion, AVG(intensity) as avg_intensity 
             FROM emotional_metrics 
             WHERE user_id = $1 
             AND recorded_at > NOW() - INTERVAL '1 hour'
             GROUP BY emotion
             ORDER BY recorded_at DESC
             LIMIT 5`,
            [userId]
        );
        
        let modifiers = {
            frustrationModifier: 1.0,
            confidenceModifier: 1.0,
            hesitationModifier: 1.0
        };
        
        for (const row of result.rows) {
            if (row.emotion === 'frustrated' && row.avg_intensity > 70) {
                modifiers.frustrationModifier = 0.75; // 25% less requirement for unlocks
            }
            if (row.emotion === 'confident' && row.avg_intensity > 80) {
                modifiers.confidenceModifier = 1.15; // 15% bonus rewards
            }
            if (row.emotion === 'hesitant' && row.avg_intensity > 60) {
                modifiers.hesitationModifier = 1.1; // 10% consolation
            }
        }
        
        return modifiers;
    }
    
    // Check if user can unlock challenge
    async canUnlockChallenge(userId, challengeLevel, subject, previousMastery) {
        const overallGems = await this.getOverallGems(userId);
        const subjectGems = await this.getSubjectGems(userId, subject);
        
        const required = this.getUnlockRequirements(challengeLevel);
        
        // Check mastery requirement (75% on previous)
        const hasMastery = previousMastery >= 75;
        
        // Check gem requirements with emotional adjustment
        const modifiers = await this.getEmotionalModifiers(userId);
        const adjustedOverallReq = Math.floor(required.overallGems * modifiers.frustrationModifier);
        const adjustedSubjectReq = Math.floor(required.subjectGems * modifiers.frustrationModifier);
        
        const hasGems = overallGems >= adjustedOverallReq && subjectGems >= adjustedSubjectReq;
        
        return {
            canUnlock: hasMastery && hasGems,
            required: required,
            adjusted: {
                overallGems: adjustedOverallReq,
                subjectGems: adjustedSubjectReq
            },
            current: {
                overallGems,
                subjectGems,
                mastery: previousMastery
            },
            modifiers: modifiers
        };
    }
    
    getUnlockRequirements(level) {
        const requirements = {
            1: { overallGems: 0, subjectGems: 0, masteryReq: 0 },
            2: { overallGems: 25, subjectGems: 10, masteryReq: 60 },
            3: { overallGems: 50, subjectGems: 20, masteryReq: 65 },
            4: { overallGems: 75, subjectGems: 30, masteryReq: 70 },
            5: { overallGems: 100, subjectGems: 40, masteryReq: 75 },
            6: { overallGems: 150, subjectGems: 60, masteryReq: 75 },
            7: { overallGems: 200, subjectGems: 80, masteryReq: 80 },
            8: { overallGems: 250, subjectGems: 100, masteryReq: 80 },
            9: { overallGems: 300, subjectGems: 120, masteryReq: 85 },
            10: { overallGems: 400, subjectGems: 150, masteryReq: 85 },
            11: { overallGems: 500, subjectGems: 180, masteryReq: 90 },
            12: { overallGems: 600, subjectGems: 200, masteryReq: 90 }
        };
        return requirements[level] || requirements[1];
    }
    // Add this method to GamificationService class (after getOverallGems)

// Get user's streak info
async getStreak(userId) {
    const result = await pool.query(
        `SELECT current_streak, longest_streak, last_activity_date, 
                streak_protection, streak_freeze_count
         FROM user_streaks 
         WHERE user_id = $1`,
        [userId]
    );
    
    if (result.rows.length === 0) {
        return {
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null,
            streak_protection: false,
            streak_freeze_count: 0
        };
    }
    
    return result.rows[0];
}
// Update user streak (called from quest completion)
async updateUserStreak(userId, isCorrect) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const streak = await this.getStreak(userId);
        const today = new Date().toISOString().split('T')[0];
        const lastDate = streak.last_activity_date?.toISOString().split('T')[0];
        
        let newStreak = streak.current_streak;
        
        if (isCorrect) {
            if (lastDate === today) {
                // Already played today, streak unchanged
            } else if (lastDate === this.getYesterday()) {
                // Consecutive day, increment streak
                newStreak = (streak.current_streak || 0) + 1;
            } else {
                // New streak
                newStreak = 1;
            }
        } else {
            // Wrong answer - check streak protection
            if (streak.streak_protection || streak.streak_freeze_count > 0) {
                // Use streak protection
                if (streak.streak_freeze_count > 0) {
                    await client.query(
                        `UPDATE user_streaks 
                         SET streak_freeze_count = streak_freeze_count - 1,
                             last_activity_date = $2
                         WHERE user_id = $1`,
                        [userId, today]
                    );
                } else {
                    await client.query(
                        `UPDATE user_streaks 
                         SET streak_protection = false,
                             last_activity_date = $2
                         WHERE user_id = $1`,
                        [userId, today]
                    );
                }
                // Keep streak, don't reset
            } else if (lastDate !== today && lastDate !== this.getYesterday()) {
                newStreak = 0;
            }
        }
        
        const longestStreak = Math.max(streak.longest_streak || 0, newStreak);
        
        await client.query(
            `UPDATE user_streaks 
             SET current_streak = $2, 
                 longest_streak = $3, 
                 last_activity_date = $4
             WHERE user_id = $1`,
            [userId, newStreak, longestStreak, today]
        );
        
        await client.query('COMMIT');
        
        return {
            currentStreak: newStreak,
            longestStreak: longestStreak,
            streakMultiplier: this.getStreakMultiplier(newStreak)
        };
        
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
}

module.exports = new GamificationService();