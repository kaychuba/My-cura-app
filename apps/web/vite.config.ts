import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@my-cura/shared-types': resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@my-cura/shared-utils': resolve(__dirname, '../../packages/shared-utils/src/browser.ts'),
      '@my-cura/ui-web': resolve(__dirname, '../../packages/ui-web/src/index.ts'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
  },
});
