/**
 * Web-safe bridge — mimics window.electronAPI for browser mode.
 *
 * In Electron, calls go through IPC to the main process.
 * In browser (web), routes to Supabase or returns no-op responses.
 */

import { fetchCompleteStrategy } from './supabase-strategies'

// ============================================================
// Create the bridge
// ============================================================

function createWebAPI() {
  return {
    strategy: {
      getPreflopRange: async () => ({ strategy: null, range: null }),
      solvePreflop: async () => null,
      getExploitAdjustments: async () => null,
      getScenario: async () => null,
      saveScenario: async () => ({ success: true }),
      deleteScenario: async () => ({ success: true }),
      listScenarios: async () => [],
      getStrategy: async () => null,
      saveStrategy: async () => ({ success: true }),
      getHands: async () => [],

      // This is the key method — routes to Supabase in web mode
      analyzePostflop: async (params: any) => {
        const { board, heroPosition, villainPosition, stackDepth } = params
        try {
          const boardStr = Array.isArray(board) ? board.join(' ') : board
          const result = await fetchCompleteStrategy(
            boardStr,
            heroPosition,
            villainPosition,
            stackDepth,
          )
          return result
        } catch (e) {
          console.error('Web bridge: analyzePostflop failed:', e)
          return null
        }
      },
    },
    auth: {
      getSession: async () => null,
      setSession: async () => {},
      clearSession: async () => {},
    },
    store: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => {},
    },
    app: {
      getVersion: async () => 'web',
      getPlatform: async () => 'browser',
      quit: () => {},
    },
  }
}

/**
 * Install the web bridge if electronAPI is missing.
 */
export function installWebBridge(): void {
  if ((window as any).electronAPI) return

  const bridge = createWebAPI()
  ;(window as any).electronAPI = bridge
  console.log('🌐 Web API bridge installed — postflop analysis goes through Supabase')
}
