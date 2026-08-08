import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/Watermark-Tool/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Safa Watermark Tool',
        short_name: 'Safa Watermark',
        description: 'Batch watermark your photos on any device',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        start_url: '/Watermark-Tool/',
        scope: '/Watermark-Tool/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
