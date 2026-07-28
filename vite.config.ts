/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
// `VITE_BASE_PATH` is set by the GitHub Pages workflow to `/<repository>/`.
// Local development and previews fall back to the domain root.
export default defineConfig({
  resolve: {
    alias: {
      '@clarity/i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)),
    },
  },
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
