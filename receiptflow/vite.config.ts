
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// npm run dev:mock swaps the Supabase client for an in-memory sandbox.
const useMock = process.env.RECEIPTFLOW_MOCK === '1';

export default defineConfig(() => ({
  // Default to "/" so local dev, preview, and root-hosted deploys work.
  // Set GITHUB_PAGES=true when building for https://<user>.github.io/Receiptflow.github.io/.
  base: process.env.GITHUB_PAGES === 'true' ? '/Receiptflow.github.io/' : '/',

  plugins: [react(), tailwindcss()],

  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      ...(useMock
        ? {
            '@supabase/supabase-js': fileURLToPath(
              new URL('./tests/mocks/supabase-js.ts', import.meta.url)
            ),
            'tesseract.js': fileURLToPath(
              new URL('./tests/mocks/tesseract.ts', import.meta.url)
            ),
          }
        : {}),
    },
  },

  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          supabase: ['@supabase/supabase-js'],
          charts: ['chart.js'],
        },
      },
    },
  },

  test: {
    alias: {
      '@supabase/supabase-js': fileURLToPath(
        new URL('./tests/mocks/supabase-js.ts', import.meta.url)
      ),
      'tesseract.js': fileURLToPath(
        new URL('./tests/mocks/tesseract.ts', import.meta.url)
      ),
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{ts,tsx}'],
    css: false,
  },
}));
