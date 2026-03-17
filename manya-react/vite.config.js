import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/manya-ug/', // Uncomment this if deploying to GitHub Pages (sub-path)
  // Leave commented out for Vercel/Netlify/custom domain (serves from root)
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split vendor libs into a separate chunk for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
