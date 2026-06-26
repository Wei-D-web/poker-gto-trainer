/**
 * Vite config for the GitHub Pages build (docs/app/).
 *
 * Entry: web/index.html → src/renderer/web-main.tsx
 * Output: docs/app/
 * Base: /poker-gto-trainer/app/
 *
 * Unlike the Vercel build, this does NOT empty the output directory
 * because docs/app/ contains companion files (payment/, privacy.html, terms.html).
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
    outDir: resolve(__dirname, 'docs/app'),
    emptyOutDir: false,
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
