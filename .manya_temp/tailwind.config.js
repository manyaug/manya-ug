/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
      colors: {
        // PROFESSIONAL DARK THEME (VS Code Style)
        slate: {
          900: '#0f172a', // Main Background (Deep Blue-Grey)
          800: '#1e293b', // Panels/Sidebars
          700: '#334155', // Borders
          600: '#475569', // Muted Text
          100: '#f1f5f9', // Primary Text
        },
        brand: {
          blue: '#3b82f6', // Primary Action
          purple: '#8b5cf6', // Accents
          green: '#10b981', // Success
          red: '#ef4444',   // Danger
        }
      }
    },
  },
  plugins: [],
}