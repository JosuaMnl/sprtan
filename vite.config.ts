/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['lambda.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Sprtan — Catatan Angkat Beban',
        short_name: 'Sprtan',
        description:
          'Catat progress angkat beban. Offline-first, disiplin ala Spartan.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#211f1c',
        theme_color: '#211f1c',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precaching the built app shell only makes sense for production
        // builds. In dev the SW is generated against dev-dist (which holds no
        // precacheable assets), so an empty pattern there avoids Workbox's
        // "glob pattern doesn't match any files" warning.
        globPatterns: command === 'build' ? ['**/*.{js,css,html,svg,png,woff2}'] : [],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Google Fonts stylesheets — revalidate in background.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            // Google Fonts webfont files — cache for a year.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // OpenStreetMap tiles — cache viewed areas so they render offline.
            // Tiles are requested with CORS (crossOrigin) so the share-card
            // canvas can reuse them without tainting; only cache CORS-clean 200
            // responses (not opaque 0) so those cached tiles stay canvas-safe.
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-v2',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['node_modules', 'dist'],
  },
}))
