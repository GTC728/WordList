import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg'],
      manifest: {
        name: 'WordList',
        short_name: 'WordList',
        description: '學術英文單字：Academic Word List',
        theme_color: '#0e1612',
        background_color: '#0e1612',
        display: 'standalone',
        lang: 'zh-Hant',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,ico,txt,woff2}'],
        navigateFallback: `${base}index.html`.replace(/\/{2,}/g, '/'),
      },
    }),
  ],
})
