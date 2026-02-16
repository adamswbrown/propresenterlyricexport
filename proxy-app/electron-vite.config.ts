import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: path.join(__dirname, '..', 'dist-proxy', 'main'),
      rollupOptions: {
        input: path.join(__dirname, 'electron', 'main', 'index.ts'),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      outDir: path.join(__dirname, '..', 'dist-proxy', 'preload'),
      rollupOptions: {
        input: path.join(__dirname, 'electron', 'preload', 'index.ts'),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: path.join(__dirname, 'electron', 'renderer'),
    build: {
      outDir: path.join(__dirname, '..', 'dist-proxy', 'renderer'),
      rollupOptions: {
        input: path.join(__dirname, 'electron', 'renderer', 'index.html'),
      },
    },
    plugins: [react()],
  },
});
