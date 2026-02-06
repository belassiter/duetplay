/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = env.VITE_BASE_URL || '/duetplay/';
  const publicDir = env.CONTENT_DIR ? path.resolve(env.CONTENT_DIR) : 'public';

  return {
    base: baseUrl,
    publicDir: publicDir,
    plugins: [react()],
    build: {
      rollupOptions: {
      output: {
        // Organize assets into subfolders
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
 }
})
