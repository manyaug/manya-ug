const CACHE_NAME = 'manya-p7-master-v1';
const DYNAMIC_CACHE = 'manya-content-v1';

// 1. THE APP SHELL 
// These files are downloaded immediately when the app is installed.
// The app cannot function without them.
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    
    // --- CSS ---
    './app-shell/css/main.css',
    './app-shell/css/sim_global.css',
    
    // --- MAIN JS ---
    './app-shell/js/app.js',
    './app-shell/js/db.js',
    './app-shell/js/model-viewer-engine.js',
    
    // --- LIBRARIES (Offline 3D & Maps support) ---
    './app-shell/js/lib/model-viewer.min.js',
    './app-shell/js/lib/d3.v7.min.js',
    './app-shell/js/lib/topojson.min.js',
    './shared/draco/draco_decoder.js',
    './shared/draco/draco_wasm_wrapper.js',
    
    // --- ALL ENGINES (Critical for functionality) ---
    // Science
    './app-shell/js/engines/3D-skeleton-engine.js',
    './app-shell/js/engines/antagonistic-muscles-engine.js',
    './app-shell/js/engines/gallery-study-engine.js',
    './app-shell/js/engines/image-hotspots-engine.js',
    './app-shell/js/engines/procedural-canvas-engine.js',
    
    // Math
    './app-shell/js/engines/math-engines/binary-generator-engine.js',
    './app-shell/js/engines/math-engines/pizza-game-engine.js',
    './app-shell/js/engines/math-engines/set-classifier-engine.js',
    './app-shell/js/engines/math-engines/set-theory-engine.js',
    './app-shell/js/engines/math-engines/subset-game-engine.js',
    './app-shell/js/engines/math-engines/venn-prob-engine.js',
    './app-shell/js/engines/math-engines/venn-spotlight-engine.js',
    
    // SST
    './app-shell/js/engines/sst-engines/universal-globe-engine.js',

    // --- CURRICULUM DATA ---
    './content/curriclum.json'
];

// --- INSTALL EVENT ---
// Runs once when the user opens the app for the first time.
self.addEventListener('install', (evt) => {
    // Force this SW to become the active one immediately
    self.skipWaiting();
    
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 [Service Worker] Caching App Shell...');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

// --- ACTIVATE EVENT ---
// Clean up old versions of the cache.
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
                    console.log('🗑️ [Service Worker] Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// --- FETCH EVENT ---
// Intercepts every network request.
self.addEventListener('fetch', (evt) => {
    
    // 1. Handle Navigation requests (HTML pages)
    // Always try network first to get updates, fallback to cache
    if (evt.request.mode === 'navigate') {
        evt.respondWith(
            fetch(evt.request)
                .catch(() => {
                    return caches.match('./index.html');
                })
        );
        return;
    }

    // 2. Handle Dynamic Content (JSON, Images, 3D Models, Fonts)
    evt.respondWith(
        caches.match(evt.request).then((cacheRes) => {
            // A. If the file is in the cache, return it (Offline Mode).
            if (cacheRes) {
                return cacheRes;
            }

            // B. If not in cache, fetch from internet.
            return fetch(evt.request).then((fetchRes) => {
                // C. Save the new file to the Dynamic Cache for next time.
                return caches.open(DYNAMIC_CACHE).then((cache) => {
                    // Only cache valid responses (http/https)
                    if (evt.request.url.startsWith('http')) {
                        cache.put(evt.request.url, fetchRes.clone());
                    }
                    return fetchRes;
                });
            }).catch((err) => {
                // D. Network failed and not in cache?
                // Return a fallback or specific error json if needed.
                console.warn('Network unavailable and resource not cached:', evt.request.url);
            });
        })
    );
});