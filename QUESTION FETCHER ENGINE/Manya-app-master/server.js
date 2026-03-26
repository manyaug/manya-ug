// server.js - Add initialization
const express = require('express');
const path = require('path');
const cors = require('cors');
const QuestionFetcher = require('./question-fetcher');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize fetcher
let fetcher;

async function startServer() {
    try {
        fetcher = new QuestionFetcher();
        await fetcher.db.init(); // Initialize database
        console.log('✅ Database initialized');
        
        // Session state storage
        const sessionStates = new Map();

        // ... rest of your endpoints ...

        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
            console.log(`📝 Test: http://localhost:${PORT}/api/test`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

// ... rest of your server.js code ...