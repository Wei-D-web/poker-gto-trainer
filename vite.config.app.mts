/**
 * Vite config for the web-only build.
 * Entry: web/index.html → src/renderer/web-main.tsx
 * Output: dist/web/
 * Base: /poker-gto-trainer/app/
 *
 * Used by deploy-web.yml (GitHub Actions → GitHub Pages).
 * Landing page is deploy/index.html (static, on root).
 * SPA goes to /poker-gto-trainer/app/.
 */
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: resolve(__dirname, 'web'),
  base: '/poker-gto-trainer/app/',
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    open: '/',
  },
})
