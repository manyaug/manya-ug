import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    legacy({
      // We set renderModernChunks to false to bypass modern CORS module restrictions
      // This is essential for opening the build directly via the file:// protocol.
      renderModernChunks: false,
      targets: ['defaults', 'not IE 11']
    }),
    {
      name: 'remove-crossorigin',
      enforce: 'post',
      transformIndexHtml(html) {
        // 1. Remove modulepreload links only if we are specifically targeting a non-module environment
        let processed = html;
        // 2. We NO LONGER remove all crossorigin attributes because it breaks <model-viewer> and external media.
        // If file:// protocol support is needed, it should be handled via a conditional build flag.
        return processed;
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Manya Prep Hub',
        short_name: 'Manya',
        description: 'Elite PLE Prep for Uganda Primary Leaving Examinations',
        theme_color: '#7c3aed',
        background_color: '#FDFBF7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'assets/icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'assets/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'assets/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // ⚠️ No .mp3/.wav in precache — they use Range requests which break CacheStorage
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
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

          // CDN - Quest JSON content
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/manyaug\/manya-react-assets@[^/]+\/content\/.*\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-content-json-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 1 week
              cacheableResponse: { statuses: [0, 200] }
            }
          },

          // CDN - Remote Images & Models
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/manyaug\/manya-react-assets@[^/]+\/(?:assets|images|shared)\/.*\.(?:png|jpg|jpeg|svg|webp|gif|glb)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-static-assets-cache',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Terser is required for legacy plugin
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'react-core';
          if (id.includes('framer-motion')) return 'framer';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('d3') || id.includes('topojson')) return 'd3';
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  }
})