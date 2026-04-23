// MANYA SERVICE WORKER v8
// Strategy:
//   - BYPASS: Media files (mp3, wav, ogg) — prevents ERR_CACHE_OPERATION_NOT_SUPPORTED
//   - CACHE FIRST: Static shell, icons, manifest
//   - STALE-WHILE-REVALIDATE: All app assets (images, JS chunks, CSS)
//   - NETWORK FIRST: Supabase API calls, navigation

const CACHE_NAME = 'manya-v9'

const STATIC_SHELL = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons.png',
]

// Media file extensions to ALWAYS bypass (they use Range requests the cache API can't handle)
const MEDIA_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.flac']

// Helper: check if a URL is a media file
function isMediaFile(url) {
  return MEDIA_EXTENSIONS.some(ext => url.pathname.endsWith(ext))
}

// Helper: check if request has a Range header (partial content streaming)
function isRangeRequest(request) {
  return request.headers.has('range')
}

// Helper: check if a URL is an app asset we should cache
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf')
  )
}

// ---- INSTALL: Cache static shell ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_SHELL))
  )
  self.skipWaiting()
})

// ---- ACTIVATE: Purge old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => {
        console.log('[SW] Purging old cache:', k)
        return caches.delete(k)
      }))
    )
  )
  self.clients.claim()
})

// ---- FETCH: Intelligent routing ----
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Only handle GET requests
  if (request.method !== 'GET') return

  // 2. BYPASS: Media files and Range requests — let browser handle natively
  //    This is the critical fix for ERR_CACHE_OPERATION_NOT_SUPPORTED
  if (isMediaFile(url) || isRangeRequest(request)) {
    return // Do NOT call event.respondWith. Browser handles it natively.
  }

  // 3. BYPASS: Cross-origin requests (Supabase API, DiceBear CDN, etc.)
  // EXCEPT for curriculum manifest which must be cached offline
  if (url.origin !== self.location.origin && !url.pathname.endsWith('curriculum-master.json')) {
    return
  }

  // 4. NETWORK FIRST: HTML navigation (always get fresh page shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    )
    return
  }

  // 5. STALE-WHILE-REVALIDATE: Static assets
  //    Serve from cache immediately for speed, then update cache silently
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        
        // Fetch fresh version in background
        const networkFetch = fetch(request).then((response) => {
          // Only cache valid, complete responses (NOT 206 Partial Content)
          if (response.ok && response.status === 200) {
            cache.put(request, response.clone())
          }
          return response
        }).catch(() => {
            // SILENT FAIL: If background fetch fails, just return cached if we have it
            return cached;
        })

        // Return cached version immediately if available, otherwise wait for network
        // EMERGENCY: If both fail, the browser will retry anyway
        return cached || networkFetch
      }).catch(() => fetch(request)) // FINAL BYPASS: If anything in the Cache API panics, go to network
    )
    return
  }

  // 6. NETWORK ONLY: Everything else (API calls, realtime)
  // Just let it pass through without intercepting
})
