// server/routes/api/chests.js
const express = require('express');
const router = express.Router();
const chestService = require('../../services/chestService');

// Get user's unopened chests
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const chests = await chestService.getUserChests(userId);
        res.json({ chests });
    } catch (err) {
        console.error('Error getting chests:', err);
        res.status(500).json({ error: err.message });
    }
});

// Open a chest
router.post('/open', async (req, res) => {
    const { chestId, userId } = req.body;
    
    try {
        const result = await chestService.openChest(chestId, userId);
        res.json(result);
    } catch (err) {
        console.error('Error opening chest:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create a chest (called when user completes quest)
router.post('/create', async (req, res) => {
    const { userId, chestType, subject, context } = req.body;
    
    try {
        const chest = await chestService.createChest(userId, chestType, subject, context);
        res.json(chest);
    } catch (err) {
        console.error('Error creating chest:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get user's unlocked simulations
router.get('/simulations/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const simulations = await chestService.getUserSimulations(userId);
        res.json({ simulations });
    } catch (err) {
        console.error('Error getting simulations:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark simulation as viewed
router.post('/simulations/view', async (req, res) => {
    const { userId, simulationId } = req.body;
    
    try {
        await chestService.markSimulationViewed(userId, simulationId);
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking simulation viewed:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create chest with simulation unlock (called when quest completed)
router.post('/create-with-simulation', async (req, res) => {
    const { userId, chestType, subject, context, simulationId } = req.body;
    
    try {
        const chest = await chestService.createChestWithSimulation(
            userId, chestType, subject, context, simulationId
        );
        res.json(chest);
    } catch (err) {
        console.error('Error creating chest with simulation:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;