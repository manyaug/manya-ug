const CACHE_NAME = 'manya-p7-v2';
const DYNAMIC_CACHE = 'manya-dynamic-v2';

// 1. CRITICAL FILES (Must download on first install)
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // Local Dependencies
    './assets/vendor/model-viewer.min.js',
    './assets/fonts/fonts.css',
    // Add your font files here (examples)
    './assets/fonts/plus-jakarta-sans-v8-latin-regular.woff2',
    './assets/fonts/plus-jakarta-sans-v8-latin-700.woff2',
    // Core Engines (Add all you have)
    './app-shell/js/engines/set-theory-engine.js',
    './app-shell/js/engines/3D-skeleton-engine.js',
    './app-shell/js/engines/math-engines/subset-game-engine.js',
    './app-shell/js/engines/math-engines/pizza-game-engine.js',
    './app-shell/js/engines/math-engines/venn-prob-engine.js'
];

// INSTALL: Download Core Assets
self.addEventListener('install', (evt) => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ Service Worker: Caching Core Assets');
            return cache.addAll(CORE_ASSETS);
        })
    );
});

// ACTIVATE: Clean up old versions
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

// FETCH: The "Smart" Offline Logic
self.addEventListener('fetch', (evt) => {
    // 1. Handle Navigation (HTML) - Network First, fallback to Cache
    if (evt.request.mode === 'navigate') {
        evt.respondWith(
            fetch(evt.request).catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 2. Handle Assets (JS, JSON, Images, GLB)
    evt.respondWith(
        caches.match(evt.request).then((cacheRes) => {
            // A. If in cache, return it (Fast!)
            if (cacheRes) {
                return cacheRes;
            }

            // B. If not in cache, fetch it from network
            return fetch(evt.request).then((fetchRes) => {
                // C. Save it to Dynamic Cache for next time
                return caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(evt.request.url, fetchRes.clone());
                    return fetchRes;
                });
            }).catch(() => {
                // D. If offline and not in cache...
                // (Optional: Return a generic "offline.png" or "offline.json" here)
                if (evt.request.url.indexOf('.json') > -1) {
                    // Return empty quest fallback if needed
                    return new Response(JSON.stringify({ error: "offline" }), { 
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            });
        })
    );
});