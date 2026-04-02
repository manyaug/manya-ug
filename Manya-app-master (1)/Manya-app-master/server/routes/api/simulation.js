// server/routes/api/simulation.js - SIMPLIFIED VERSION

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const path = require('path');
const fs = require('fs').promises;

router.get('/data/:questionId', async (req, res) => {
    const questionId = req.params.questionId;
    console.log(`📡 Fetching simulation data for: ${questionId}`);
    
    try {
        // Get the simulation record from database
        const result = await pool.query(
            `SELECT "File_Path_Sim", "Engine_Type_Sim", "Mode_Sim" 
             FROM qbrss WHERE "Q_ID" = $1`,
            [questionId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Simulation not found' });
        }
        
        const sim = result.rows[0];
        const filePath = sim.File_Path_Sim;
        
        // Read the JSON file
        const cleanPath = filePath.replace(/^\/content/, '');
        const fullPath = path.join(__dirname, '../../../public/js/simulations/content', cleanPath);
        
        console.log(`   Reading file: ${fullPath}`);
        const fileContent = await fs.readFile(fullPath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Add metadata
        jsonData._questionId = questionId;
        jsonData._engineType = sim.Engine_Type_Sim || '3D_SKELETON';
        jsonData._mode = sim.Mode_Sim || 'study';
        
        // SIMPLE FIX: Just prepend /js/simulations/ to the modelUrl
        if (jsonData.modelUrl) {
            console.log(`   Original modelUrl: ${jsonData.modelUrl}`);
            jsonData.modelUrl = `/js/simulations/${jsonData.modelUrl}`;
            console.log(`   Fixed modelUrl: ${jsonData.modelUrl}`);
        }
        
        // Also handle 'glb' field if it exists instead of modelUrl
        if (jsonData.glb) {
            console.log(`   Original glb: ${jsonData.glb}`);
            jsonData.glb = `/js/simulations/${jsonData.glb}`;
            console.log(`   Fixed glb: ${jsonData.glb}`);
        }
        
        res.json(jsonData);
        
    } catch (err) {
        console.error('❌ Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;