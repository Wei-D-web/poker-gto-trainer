import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'out', 'dist'],
    coverage: {
      provider: 'v8',
      include: [
        'src/main/solver/*.ts',
        'src/shared/utils/*.ts',
        'src/renderer/components/**/*.tsx',
      ],
      exclude: ['**/*.d.ts', 'src/main/solver/postflop-engine.ts'],
    },
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
})
