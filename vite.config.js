import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DEV_');

  return {
    plugins: [react()],

    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,

      proxy: {
        '/api': {
          target: process.env.DEV_API_TARGET || env.DEV_API_TARGET || 'http://127.0.0.1:8081',
          changeOrigin: true,
        },
      },

      watch: {
        usePolling: true,
        interval: 500,
      },

      hmr: {
        overlay: true,
      },
    },
  };
});
