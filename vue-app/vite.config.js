import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Vite configuration for the I Heart Alyssa project.
 *
 * - Uses vue-router with HTML5 history mode, so we need the
 *   SPA fallback (404.html redirect trick for GitHub Pages).
 * - Build output goes to ../dist so it can be deployed from
 *   the repository root.
 */
export default defineConfig({
  plugins: [vue()],
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
