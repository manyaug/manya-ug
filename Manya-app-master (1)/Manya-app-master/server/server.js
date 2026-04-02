const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== 1. ESSENTIAL MIDDLEWARE (Order matters!) ==========
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ========== 2. STATIC FILE SERVING ==========
// Serve static files from public directory - this MUST come before routes
app.use(express.static(path.join(__dirname, '../public')));

// Serve simulation assets specifically
app.use('/js/simulations/assets', express.static(path.join(__dirname, '../public/js/simulations/assets')));

// Serve model-viewer and other third-party assets
app.use('/js/simulations/app-shell/js/engines', express.static(path.join(__dirname, '../public/js/simulations/app-shell/js/engines')));

// ========== 3. DEBUGGING MIDDLEWARE ==========
app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.url}`);
    next();
});

// ========== 4. API ROUTES ==========
// Mount all API routes under /api
app.use('/api', routes);

// ========== 5. SPA FALLBACK - This is CRITICAL for client-side routing ==========
// For any non-API GET request, serve the index.html (let client-side routing handle it)
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.url.startsWith('/api/')) {
        return next();
    }
    // Serve index.html for all other routes (for SPA routing)
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ========== 6. 404 HANDLER FOR API ROUTES ==========
app.use('/api/*', (req, res) => {
    console.log(`❌ 404 API Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'API route not found', 
        path: req.url,
        method: req.method
    });
});

// ========== 7. ERROR HANDLING MIDDLEWARE ==========
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});
// Add this line to server.js if not already present
app.use('/multimedia_assets', express.static(path.join(__dirname, '../multimedia_assets')));
// ========== 8. START SERVER ==========
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`✅ SERVER RUNNING AT: http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log(`📝 Test endpoint:      http://localhost:${PORT}/api/test`);
    console.log(`📝 Hint endpoint:      http://localhost:${PORT}/api/hint/1`);
    console.log(`📝 Solution endpoint:  http://localhost:${PORT}/api/solution/1`);
    console.log(`📝 Questions endpoint: http://localhost:${PORT}/api/questions/random`);
    console.log('='.repeat(50));
    console.log(`📂 Static files served from: ${path.join(__dirname, '../public')}`);
    console.log('='.repeat(50) + '\n');
});

// Export for testing if needed
module.exports = app;