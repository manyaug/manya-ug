// server/services/coinService.js
const pool = require('../config/database');

class CoinService {
    
    // Initialize user's coin balance
    async initializeUser(userId) {
        await pool.query(
            `INSERT INTO user_coins (user_id, coin_balance) 
             VALUES ($1, 0) 
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );
    }
    
    // Get user's coin balance
    async getCoinBalance(userId) {
        const result = await pool.query(
            `SELECT coin_balance FROM user_coins WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0]?.coin_balance || 0;
    }
    
    // Update coins based on answer
    async updateCoins(userId, isCorrect, hintUsed) {
        let coinChange = 0;
        
        if (isCorrect) {
            coinChange = hintUsed ? 20 : 30;
        } else {
            coinChange = -10;
        }
        
        const result = await pool.query(
            `UPDATE user_coins 
             SET coin_balance = coin_balance + $2, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1
             RETURNING coin_balance`,
            [userId, coinChange]
        );
        
        return {
            coinChange,
            newBalance: result.rows[0]?.coin_balance || 0
        };
    }
    
    // Exchange coins for gems
    async exchangeCoinsForGems(userId, subject, coinAmount) {
        const COIN_TO_GEM_RATE = 500; // 500 coins = 1 gem
        
        const gemsToAward = Math.floor(coinAmount / COIN_TO_GEM_RATE);
        if (gemsToAward === 0) {
            return { success: false, message: 'Not enough coins' };
        }
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Deduct coins
            const coinResult = await client.query(
                `UPDATE user_coins 
                 SET coin_balance = coin_balance - $2
                 WHERE user_id = $1 AND coin_balance >= $2
                 RETURNING coin_balance`,
                [userId, gemsToAward * COIN_TO_GEM_RATE]
            );
            
            if (coinResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, message: 'Insufficient coins' };
            }
            
            // Award gems
            await client.query(
                `INSERT INTO subject_gems (user_id, subject, gem_count) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (user_id, subject) 
                 DO UPDATE SET gem_count = subject_gems.gem_count + $3`,
                [userId, subject, gemsToAward]
            );
            
            await client.query('COMMIT');
            
            return {
                success: true,
                gemsAwarded: gemsToAward,
                newCoinBalance: coinResult.rows[0].coin_balance,
                rate: COIN_TO_GEM_RATE
            };
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = new CoinService();