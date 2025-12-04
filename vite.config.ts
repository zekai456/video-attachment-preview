import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { semiTheming } from 'vite-plugin-semi-theming';

const repoName = 'video-attachment-preview';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : './',
  plugins: [
    react(),
    semiTheming({
      theme: '@semi-bot/semi-theme-feishu-dashboard',
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});
