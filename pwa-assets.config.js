import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  head: true,
  preset: minimalPreset,
  images: [
    'assets/icons/manya_master.png',
  ],
})