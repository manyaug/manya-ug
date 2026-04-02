// server/routes/api/coins.js
const express = require('express');
const router = express.Router();
const coinService = require('../../services/coinService');

// Get coin balance
router.get('/balance/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const balance = await coinService.getCoinBalance(userId);
        res.json({ userId, balance });
    } catch (err) {
        console.error('Error getting coin balance:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update coins (called when answering)
router.post('/update', async (req, res) => {
    const { userId, isCorrect, hintUsed } = req.body;
    
    try {
        const result = await coinService.updateCoins(userId, isCorrect, hintUsed);
        res.json(result);
    } catch (err) {
        console.error('Error updating coins:', err);
        res.status(500).json({ error: err.message });
    }
});

// Exchange coins for gems
router.post('/exchange', async (req, res) => {
    const { userId, subject, coinAmount } = req.body;
    
    try {
        const result = await coinService.exchangeCoinsForGems(userId, subject, coinAmount);
        res.json(result);
    } catch (err) {
        console.error('Error exchanging coins:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;