import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite config for building the web (browser) SPA.
 *
 * Shares the same React components as the Electron renderer
 * but bootstraps with a web-specific entry point that:
 *   - shims window.api with fetch-based webApi
 *   - wraps the app in an auth gate (Google OAuth / bearer token)
 *
 * Output → dist-web/ (served by the Express server)
 */
export default defineConfig({
  root: path.join(__dirname, 'src/web'),
  build: {
    outDir: path.join(__dirname, 'dist-web'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(__dirname, 'src/web/index.html'),
    },
  },
  resolve: {
    alias: {
      '@electron': path.join(__dirname, 'electron/renderer/src'),
    },
  },
  plugins: [react()],
});
