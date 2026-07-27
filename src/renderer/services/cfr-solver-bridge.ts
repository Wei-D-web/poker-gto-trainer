/**
 * CFR Solver Bridge — Web Worker Manager
 *
 * Manages a Web Worker running the CFR solver off the main thread.
 * Provides a clean Promise-based API for use in the web API bridge.
 *
 * Usage:
 *   import { getCFRBridge } from './cfr-solver-bridge'
 *   const bridge = getCFRBridge()
 *   const range = await bridge.solvePreflop({ position: 3, stackDepth: 100 })
 */

import type { ComboKey } from '@shared/types/poker'

export interface CFRSolveParams {
  position: number // 0=UTG, 1=MP, 2=CO, 3=BTN, 4=SB
  stackDepth: number // effective stack in bb
  gameType?: 'cash' | 'tournament'
  ante?: number
  iterations?: number
}

export interface CFRSolveResult {
  result: Record<ComboKey, number>
  elapsed: number // milliseconds
}

interface WorkerMessage {
  type: 'result' | 'error' | 'progress' | 'done'
  result?: Record<ComboKey, number>
  elapsed?: number
  message?: string
  iteration?: number
  total?: number
}

// Cache key for deduplication
function cacheKey(params: CFRSolveParams): string {
  return `${params.position}_${params.stackDepth}_${params.gameType ?? 'cash'}_${params.ante ?? 0}`
}

class CFRBridge {
  private worker: Worker | null = null
  private pending = new Map<string, { resolve: (v: CFRSolveResult) => void; reject: (e: Error) => void }>()
  private resultCache = new Map<string, Record<ComboKey, number>>()

  private getWorker(): Worker {
    if (!this.worker) {
      try {
        // Vite bundles worker files when imported via new URL()
        this.worker = new Worker(
          new URL('./cfr-solver/cfr-worker.ts', import.meta.url),
          { type: 'module' },
        )

        this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          const msg = e.data
          // Find the first pending request (FIFO is fine since we process sequentially)
          const [firstKey] = this.pending.keys()
          const pending = firstKey ? this.pending.get(firstKey) : undefined

          if (msg.type === 'result' && msg.result) {
            // Cache the result
            if (firstKey) this.resultCache.set(firstKey, msg.result)
            if (pending) {
              pending.resolve({ result: msg.result, elapsed: msg.elapsed ?? 0 })
              this.pending.delete(firstKey)
            }
          } else if (msg.type === 'error') {
            if (pending) {
              pending.reject(new Error(msg.message ?? 'Unknown CFR solver error'))
              this.pending.delete(firstKey)
            }
          }
        }

        this.worker.onerror = (err) => {
          console.error('CFR Worker error:', err)
          // Reject all pending
          for (const [key, p] of this.pending) {
            p.reject(new Error('CFR Worker crashed'))
          }
          this.pending.clear()
          this.worker = null
        }
      } catch (err) {
        console.error('Failed to create CFR Worker:', err)
        throw new Error('CFR solver is not available in this browser')
      }
    }
    return this.worker
  }

  /**
   * Solve preflop range for given parameters.
   * Results are cached by (position, stackDepth, gameType, ante).
   */
  async solvePreflop(params: CFRSolveParams): Promise<CFRSolveResult> {
    const key = cacheKey(params)

    // Check cache first
    const cached = this.resultCache.get(key)
    if (cached) {
      return { result: cached, elapsed: 0 }
    }

    const worker = this.getWorker()

    return new Promise<CFRSolveResult>((resolve, reject) => {
      this.pending.set(key, { resolve, reject })

      worker.postMessage({
        position: params.position,
        stackDepth: params.stackDepth,
        gameType: params.gameType ?? 'cash',
        ante: params.ante ?? 0,
        iterations: params.iterations ?? 3000,
      })

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pending.has(key)) {
          this.pending.delete(key)
          reject(new Error('CFR solver timed out after 60s'))
        }
      }, 60000)
    })
  }

  /**
   * Clear the solver cache (e.g. when switching game types).
   */
  clearCache(): void {
    this.resultCache.clear()
    if (this.worker) {
      this.worker.postMessage({ type: 'clear' })
    }
  }

  /**
   * Check if a result is cached.
   */
  isCached(params: CFRSolveParams): boolean {
    return this.resultCache.has(cacheKey(params))
  }

  /**
   * Terminate the worker (cleanup).
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.pending.clear()
    this.resultCache.clear()
  }
}

// Singleton
let instance: CFRBridge | null = null

export function getCFRBridge(): CFRBridge {
  if (!instance) {
    instance = new CFRBridge()
  }
  return instance
}

/**
 * Convenience: directly solve a preflop range without managing the bridge.
 * Uses the singleton bridge internally.
 */
export async function solvePreflopCFR(params: CFRSolveParams): Promise<Record<ComboKey, number>> {
  const bridge = getCFRBridge()
  const { result } = await bridge.solvePreflop(params)
  return result
}
