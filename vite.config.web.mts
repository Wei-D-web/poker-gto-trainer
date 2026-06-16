import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/renderer/index-web.html',
    },
  },
  resolve: {
    alias: {
      '@shared': '/src/shared',
      '@': '/src/renderer',
    },
  },
})
