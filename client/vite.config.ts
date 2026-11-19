import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: '/flowcraft/',
  plugins: [react()],
  server: {
    port: mode === 'content-test' ? 5179 : 5173,
    host: mode === 'content-test' ? '127.0.0.1' : undefined,
    proxy: {
      '/api': {
        target: mode === 'content-test' ? 'http://127.0.0.1:3801' : 'http://localhost:3800',
        changeOrigin: true,
      },
    },
  },
}));
