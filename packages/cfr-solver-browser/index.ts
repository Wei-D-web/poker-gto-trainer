/**
 * CFR Solver Browser — Index
 *
 * Portable package. Drop into any React/Vite project.
 *
 * Main thread usage (for small/fast solves):
 *   import { solvePreflopRange } from './cfr-solver-browser'
 *   const range = solvePreflopRange(3, 100, 'cash') // BTN, 100bb
 *
 * Web Worker usage (recommended, non-blocking):
 *   const worker = new Worker(new URL('./cfr-solver-browser/cfr-worker.ts', import.meta.url), { type: 'module' })
 *   worker.postMessage({ position: 3, stackDepth: 100, gameType: 'cash' })
 *   worker.onmessage = (e) => setRange(e.data.result)
 */

export { solvePreflopRange, clearRangeCache } from './cfr-solver'
export type { ComboKey } from './types'
