/**
 * CFR Solver Web Worker
 *
 * Runs solvePreflopRange() off the main thread so the UI stays responsive.
 *
 * Usage in your React app:
 *   const worker = new Worker(new URL('./cfr-worker.ts', import.meta.url))
 *   worker.postMessage({ position: 3, stackDepth: 100, gameType: 'cash' })
 *   worker.onmessage = (e) => {
 *     const { result } = e.data  // Record<ComboKey, number>
 *   }
 */

import { solvePreflopRange, clearRangeCache } from './cfr-solver'

self.onmessage = (e: MessageEvent) => {
  const { type, position, stackDepth, gameType, ante, iterations } = e.data

  try {
    if (type === 'clear') {
      clearRangeCache()
      self.postMessage({ type: 'done' })
      return
    }

    const startTime = performance.now()

    const result = solvePreflopRange(
      position as number,
      stackDepth as number,
      (gameType as 'cash' | 'tournament') || 'cash',
      (ante as number) || 0,
      (iterations as number) || 3000,
    )

    const elapsed = Math.round(performance.now() - startTime)

    self.postMessage({
      type: 'result',
      position,
      stackDepth,
      gameType,
      result,
      elapsed,
    })
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      message: err.message || String(err),
    })
  }
}
