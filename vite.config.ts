import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  // GitHub Pages hosts this repository under /ABALMA/, while local/Vercel previews use /.
  base: process.env.GITHUB_PAGES === 'true' ? '/ABALMA/' : '/',
})
