import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub 仓库名，部署时需要修改为你的仓库名
const repoName = 'video-attachment-preview'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署时需要设置 base 路径
  base: process.env.NODE_ENV === 'production' ? `/${repoName}/` : '/',
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist'
  }
})
