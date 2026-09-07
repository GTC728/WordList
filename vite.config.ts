import { VitePWA } from 'vite-plugin-pwa'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) {
            return 'react'
          }
          if (id.includes('node_modules/react-router')) return 'router'
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'WordList',
        short_name: 'WordList',
        description: '學術英文單字：Academic Word List',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        lang: 'zh-Hant',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,ico,txt}'],
        navigateFallback: `${base}index.html`.replace(/\/{2,}/g, '/'),
      },
    }),
  ],
})
