import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import ViteFonts from 'unplugin-fonts/vite';
import { VitePWA } from 'vite-plugin-pwa';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: { labs: true } }),
    ViteFonts({
      fontsource: {
        families: [
          {
            name: 'Roboto',
            weights: [400, 700],
            styles: ['normal', 'italic'],
          },
        ],
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ledger.js - Online Plain Text Accounting',
        short_name: 'Ledger.js',
        theme_color: '#FFFFFF',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,wasm,ttf,eot,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ledger': fileURLToPath(new URL('./ledger/build', import.meta.url)),
    },
  },
});
