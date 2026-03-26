// server/services/chestService.js
const pool = require('../config/database');

class ChestService {
    
    // Determine chest type based on performance
    determineChestType(correctCount, totalQuestions, isPerfect, isChallengeComplete) {
        if (isChallengeComplete) return 'golden';
        if (isPerfect) return 'silver';
        if (correctCount >= 5) return 'stone';
        if (correctCount >= 3) return 'wooden';
        return null;
    }
    
    // Generate chest contents
    generateContents(chestType, subject) {
        const contents = {
            gems: {},
            items: [],
            simulations: []
        };
        
        switch(chestType) {
            case 'wooden':
                contents.gems.subject = Math.floor(Math.random() * 6) + 5; // 5-10
                contents.gems.overall = 2;
                break;
                
            case 'stone':
                contents.gems.subject = Math.floor(Math.random() * 11) + 15; // 15-25
                contents.gems.overall = 5;
                contents.items.push('hint');
                break;
                
            case 'silver':
                contents.gems.subject = Math.floor(Math.random() * 21) + 30; // 30-50
                contents.gems.overall = 10;
                contents.items.push('streak_freeze', 'hint', 'hint');
                break;
                
            case 'golden':
                contents.gems.subject = Math.floor(Math.random() * 26) + 75; // 75-100
                contents.gems.overall = 25;
                contents.items.push('double_points', 'streak_freeze', 'hint', 'hint', 'hint');
                break;
                
            case 'diamond':
                contents.gems.subject = Math.floor(Math.random() * 51) + 200; // 200-250
                contents.gems.overall = 50;
                contents.items.push('double_points', 'double_points', 'streak_freeze', 'streak_freeze', 'hint_boost');
                break;
        }
        
        return contents;
    }
    
    // Create a chest for user
    async createChest(userId, chestType, subject, context) {
        const contents = this.generateContents(chestType, subject);
        
        const result = await pool.query(
            `INSERT INTO chests (user_id, chest_type, contents, unlocked_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             RETURNING id`,
            [userId, chestType, JSON.stringify(contents)]
        );
        
        return {
            chestId: result.rows[0].id,
            chestType,
            contents
        };
    }
    
    // Open chest and claim rewards
    async openChest(chestId, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const chestResult = await client.query(
                `SELECT chest_type, contents, opened 
                 FROM chests 
                 WHERE id = $1 AND user_id = $2 AND opened = false`,
                [chestId, userId]
            );
            
            if (chestResult.rows.length === 0) {
                throw new Error('Chest not found or already opened');
            }
            
            const chest = chestResult.rows[0];
            const contents = chest.contents;
            
            // Award gems
            await client.query(
                `UPDATE subject_gems 
                 SET gem_count = gem_count + $2 
                 WHERE user_id = $1 AND subject = $3`,
                [userId, contents.gems.subject, contents.subject]
            );
            
            await client.query(
                `UPDATE user_gems 
                 SET overall_gems = overall_gems + $2 
                 WHERE user_id = $1`,
                [userId, contents.gems.overall]
            );
            
            // Award items (power-ups)
            for (const item of contents.items) {
                await client.query(
                    `INSERT INTO power_ups (user_id, power_up_type, quantity)
                     VALUES ($1, $2, 1)
                     ON CONFLICT (user_id, power_up_type)
                     DO UPDATE SET quantity = power_ups.quantity + 1`,
                    [userId, item]
                );
            }
            
            // Mark chest as opened
            await client.query(
                `UPDATE chests 
                 SET opened = true, opened_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [chestId]
            );
            
            await client.query('COMMIT');
            
            return {
                success: true,
                chestType: chest.chest_type,
                rewards: contents
            };
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
    
    // Get unopened chests for user
    async getUserChests(userId) {
        const result = await pool.query(
            `SELECT id, chest_type, unlocked_at, contents
             FROM chests 
             WHERE user_id = $1 AND opened = false
             ORDER BY unlocked_at DESC`,
            [userId]
        );
        
        return result.rows;
    }
    // Add to ChestService class

// Create chest with simulation unlock
async createChestWithSimulation(userId, chestType, subject, context, simulationId = null) {
    const contents = this.generateContents(chestType, subject);
    
    // If simulation is provided, add to contents
    if (simulationId) {
        contents.simulations = [{
            id: simulationId,
            type: context === 'quest_complete' ? 'study' : 'labeling',
            unlockedAt: new Date().toISOString()
        }];
    }
    
    const result = await pool.query(
        `INSERT INTO chests (user_id, chest_type, contents, unlocked_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, chestType, JSON.stringify(contents)]
    );
    
    // If simulation was unlocked, add to unlocked_simulations table
    if (simulationId) {
        await pool.query(
            `INSERT INTO unlocked_simulations (user_id, simulation_id, simulation_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, simulation_id) DO NOTHING`,
            [userId, simulationId, context === 'quest_complete' ? 'study' : 'labeling']
        );
    }
    
    return {
        chestId: result.rows[0].id,
        chestType,
        contents,
        hasSimulation: !!simulationId
    };
}

// Get user's unlocked simulations
async getUserSimulations(userId) {
    const result = await pool.query(
        `SELECT simulation_id, simulation_type, unlocked_at, viewed, viewed_count
         FROM unlocked_simulations 
         WHERE user_id = $1
         ORDER BY unlocked_at DESC`,
        [userId]
    );
    
    return result.rows;
}

// Mark simulation as viewed
async markSimulationViewed(userId, simulationId) {
    await pool.query(
        `UPDATE unlocked_simulations 
         SET viewed = true, viewed_count = viewed_count + 1
         WHERE user_id = $1 AND simulation_id = $2`,
        [userId, simulationId]
    );
}
}

module.exports = new ChestService();