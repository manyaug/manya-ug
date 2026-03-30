import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Manya Prep Hub',
        short_name: 'Manya',
        description: 'Elite PLE Prep for Uganda Primary Leaving Examinations',
        theme_color: '#7c3aed',
        background_color: '#FDFBF7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'assets/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'assets/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // ⚠️ No .mp3/.wav in precache — they use Range requests which break CacheStorage
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        globIgnores: ['**/assets/icons/**/*'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB cap per file
        runtimeCaching: [
          // DiceBear avatars
          {
            urlPattern: /^https:\/\/.*\.dicebear\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dicebear-avatars',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Supabase Storage (GLB, MP3 via CDN URL) — NetworkOnly with rangeRequests
          {
            urlPattern: /supabase\.co\/storage\/.*/i,
            handler: 'NetworkOnly',
            options: { rangeRequests: true }
          },
          // Audio files served locally — NetworkOnly (bypass cache for Range requests)
          {
            urlPattern: /\.(?:mp3|wav|ogg|m4a)$/i,
            handler: 'NetworkOnly',
            options: { rangeRequests: true }
          },
          // Images
          {
            urlPattern: /assets\/.*\.(?:png|jpg|jpeg|svg|webp|gif)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-images-cache',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Quest JSON content
          {
            urlPattern: /content\/.*\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'content-json-cache',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('framer-motion')) return 'framer'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('d3') || id.includes('topojson')) return 'd3'
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    }
  }
})