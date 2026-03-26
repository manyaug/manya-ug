// server/services/badgeService.js
const pool = require('../config/database');

class BadgeService {
    // Badge definitions
    badges = {
        first_correct: {
            name: 'First Steps',
            icon: '🌟',
            description: 'Get your first question correct',
            rarity: 'common'
        },
        perfect_quest: {
            name: 'Perfect Score',
            icon: '💯',
            description: 'Complete a quest with 100% accuracy',
            rarity: 'rare'
        },
        streak_3: {
            name: 'Getting Started',
            icon: '🔥',
            description: 'Achieve a 3-day learning streak',
            rarity: 'common'
        },
        streak_7: {
            name: 'On Fire!',
            icon: '🔥🔥',
            description: 'Achieve a 7-day learning streak',
            rarity: 'rare'
        },
        streak_30: {
            name: 'Legendary Learner',
            icon: '💎',
            description: 'Achieve a 30-day learning streak',
            rarity: 'epic'
        },
        math_master: {
            name: 'Math Master',
            icon: '🔢',
            description: 'Earn 500 math gems',
            rarity: 'rare'
        },
        science_explorer: {
            name: 'Science Explorer',
            icon: '🔬',
            description: 'Earn 500 science gems',
            rarity: 'rare'
        },
        social_scholar: {
            name: 'Social Scholar',
            icon: '🌍',
            description: 'Earn 500 social studies gems',
            rarity: 'rare'
        },
        english_ace: {
            name: 'English Ace',
            icon: '📖',
            description: 'Earn 500 English gems',
            rarity: 'rare'
        },
        challenge_champion: {
            name: 'Challenge Champion',
            icon: '🏆',
            description: 'Complete 5 challenges',
            rarity: 'epic'
        },
        simulation_collector: {
            name: 'Simulation Collector',
            icon: '🎨',
            description: 'Unlock 10 simulations',
            rarity: 'rare'
        },
        perfect_week: {
            name: 'Perfect Week',
            icon: '📅',
            description: 'Complete quests for 7 consecutive days',
            rarity: 'epic'
        },
        no_hint_hero: {
            name: 'No Hint Hero',
            icon: '🦸',
            description: 'Complete a quest without using any hints',
            rarity: 'rare'
        }
    };
    
    // Check and award badges
    async checkAndAwardBadges(userId, event, data) {
        const earnedBadges = [];
        
        switch(event) {
            case 'answer_correct':
                if (data.correctCount === 1) {
                    const badge = await this.awardBadge(userId, 'first_correct');
                    if (badge) earnedBadges.push(badge);
                }
                break;
                
            case 'quest_complete':
                // Perfect quest badge
                if (data.isPerfect) {
                    const badge = await this.awardBadge(userId, 'perfect_quest');
                    if (badge) earnedBadges.push(badge);
                }
                
                // No hint hero badge
                if (data.noHintsUsed) {
                    const badge = await this.awardBadge(userId, 'no_hint_hero');
                    if (badge) earnedBadges.push(badge);
                }
                break;
                
            case 'streak_update':
                if (data.streak >= 3) {
                    const badge = await this.awardBadge(userId, 'streak_3');
                    if (badge) earnedBadges.push(badge);
                }
                if (data.streak >= 7) {
                    const badge = await this.awardBadge(userId, 'streak_7');
                    if (badge) earnedBadges.push(badge);
                }
                if (data.streak >= 30) {
                    const badge = await this.awardBadge(userId, 'streak_30');
                    if (badge) earnedBadges.push(badge);
                }
                break;
                
            case 'gems_earned':
                // Check subject-specific badges
                const subjects = ['math', 'english', 'social', 'science'];
                for (const subject of subjects) {
                    const gems = await this.getSubjectGems(userId, subject);
                    if (gems >= 500) {
                        const badgeKey = `${subject}_master`;
                        const badge = await this.awardBadge(userId, badgeKey);
                        if (badge) earnedBadges.push(badge);
                    }
                }
                break;
                
            case 'challenge_complete':
                const completedChallenges = await this.getCompletedChallengesCount(userId);
                if (completedChallenges >= 5) {
                    const badge = await this.awardBadge(userId, 'challenge_champion');
                    if (badge) earnedBadges.push(badge);
                }
                break;
                
            case 'simulation_unlocked':
                const simulations = await this.getSimulationsCount(userId);
                if (simulations >= 10) {
                    const badge = await this.awardBadge(userId, 'simulation_collector');
                    if (badge) earnedBadges.push(badge);
                }
                break;
        }
        
        return earnedBadges;
    }
    
    // Award a specific badge
    async awardBadge(userId, badgeKey) {
        const badge = this.badges[badgeKey];
        if (!badge) return null;
        
        // Check if already earned
        const existing = await pool.query(
            `SELECT id FROM badges 
             WHERE user_id = $1 AND badge_type = $2`,
            [userId, badgeKey]
        );
        
        if (existing.rows.length > 0) return null;
        
        // Award badge
        await pool.query(
            `INSERT INTO badges (user_id, badge_type, badge_name, badge_icon, rarity)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, badgeKey, badge.name, badge.icon, badge.rarity]
        );
        
        console.log(`🏆 Badge awarded: ${badge.name} to ${userId}`);
        
        return {
            type: badgeKey,
            name: badge.name,
            icon: badge.icon,
            description: badge.description,
            rarity: badge.rarity
        };
    }
    
    // Get user's badges
    async getUserBadges(userId) {
        const result = await pool.query(
            `SELECT badge_type, badge_name, badge_icon, rarity, earned_at
             FROM badges 
             WHERE user_id = $1
             ORDER BY earned_at DESC`,
            [userId]
        );
        
        return result.rows.map(row => ({
            type: row.badge_type,
            name: row.badge_name,
            icon: row.badge_icon,
            rarity: row.rarity,
            earnedAt: row.earned_at
        }));
    }
    
    // Helper methods
    async getSubjectGems(userId, subject) {
        const result = await pool.query(
            `SELECT gem_count FROM subject_gems WHERE user_id = $1 AND subject = $2`,
            [userId, subject]
        );
        return result.rows[0]?.gem_count || 0;
    }
    
    async getCompletedChallengesCount(userId) {
        const result = await pool.query(
            `SELECT COUNT(DISTINCT challenge_id) as count 
             FROM quest_completions 
             WHERE user_id = $1 AND mastery_score >= 75`,
            [userId]
        );
        return parseInt(result.rows[0]?.count || 0);
    }
    
    async getSimulationsCount(userId) {
        const result = await pool.query(
            `SELECT COUNT(*) as count 
             FROM unlocked_simulations 
             WHERE user_id = $1`,
            [userId]
        );
        return parseInt(result.rows[0]?.count || 0);
    }
}

module.exports = new BadgeService();