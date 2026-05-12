import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Read @bigtwo/shared from its TS source rather than dist/ in dev so HMR
    // tracks engine changes without needing a separate shared rebuild.
    conditions: ['source', 'browser', 'module', 'import', 'default'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
