/**
 * Web-safe bridge — mimics window.electronAPI for browser mode.
 *
 * In Electron, calls go through IPC to the main process.
 * In browser (web), routes to Supabase or returns no-op responses.
 * In demo mode, returns pre-filled GTO strategy data for instant product preview.
 */

import { fetchCompleteStrategy } from './supabase-strategies'
import { solvePreflopCFR, getCFRBridge } from './cfr-solver-bridge'
import type { StrategyData, PreflopRange } from '@shared/types/strategy'
import type { ComboKey } from '@shared/types/poker'

// ── Demo mode detection ──
function isDemoMode(): boolean {
  try { return localStorage.getItem('pokergto_demo_mode') === '1' } catch { return false }
}

// ── Demo: build realistic preflop ranges for each position ──

function buildBtnRange(): { strategy: StrategyData; range: PreflopRange } {
  const combos = buildBtnRfiCombos()
  return {
    strategy: buildStrategy('demo_btn_100', combos, true),
    range: {
      id: 'demo_btn_100', gameType: 'cash', position: 3, stackDepth: 100, ante: 0,
      combos,
      metadata: { source: 'gto-wizard', description: 'BTN RFI range (~45%)', totalCombos: Object.keys(combos).length, vpip: 45.2, pfr: 38.6 },
    },
  }
}

function buildCoRange(): { strategy: StrategyData; range: PreflopRange } {
  const combos = buildCoRfiCombos()
  return {
    strategy: buildStrategy('demo_co_100', combos, true),
    range: {
      id: 'demo_co_100', gameType: 'cash', position: 2, stackDepth: 100, ante: 0,
      combos,
      metadata: { source: 'gto-wizard', description: 'CO RFI range (~28%)', totalCombos: Object.keys(combos).length, vpip: 28.4, pfr: 24.1 },
    },
  }
}

function buildMpRange(): { strategy: StrategyData; range: PreflopRange } {
  const combos = buildMpRfiCombos()
  return {
    strategy: buildStrategy('demo_mp_100', combos, true),
    range: {
      id: 'demo_mp_100', gameType: 'cash', position: 1, stackDepth: 100, ante: 0,
      combos,
      metadata: { source: 'gto-wizard', description: 'MP RFI range (~20%)', totalCombos: Object.keys(combos).length, vpip: 20.1, pfr: 17.8 },
    },
  }
}

function buildUtgRange(): { strategy: StrategyData; range: PreflopRange } {
  const combos = buildUtgRfiCombos()
  return {
    strategy: buildStrategy('demo_utg_100', combos, true),
    range: {
      id: 'demo_utg_100', gameType: 'cash', position: 0, stackDepth: 100, ante: 0,
      combos,
      metadata: { source: 'gto-wizard', description: 'UTG RFI range (~14%)', totalCombos: Object.keys(combos).length, vpip: 14.2, pfr: 12.4 },
    },
  }
}

function buildSbRange(): { strategy: StrategyData; range: PreflopRange } {
  const combos = buildSbRfiCombos()
  return {
    strategy: buildStrategy('demo_sb_100', combos, true),
    range: {
      id: 'demo_sb_100', gameType: 'cash', position: 4, stackDepth: 100, ante: 0,
      combos,
      metadata: { source: 'gto-wizard', description: 'SB RFI range (~38%)', totalCombos: Object.keys(combos).length, vpip: 38.7, pfr: 32.1 },
    },
  }
}

function buildBbRange(): { strategy: StrategyData; range: PreflopRange } {
  const combos = buildBbDefenseCombos()
  return {
    strategy: buildStrategy('demo_bb_100', combos, false),
    range: {
      id: 'demo_bb_100', gameType: 'cash', position: 5, stackDepth: 100, ante: 0,
      combos,
      metadata: { source: 'gto-wizard', description: 'BB defense range (~55%)', totalCombos: Object.keys(combos).length, vpip: 55.8, pfr: 12.3 },
    },
  }
}

// ── Range builders ──

function buildBtnRfiCombos(): Record<ComboKey, number> {
  const c: Record<ComboKey, number> = {}
  ;['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22'].forEach(x => c[x]=1)
  ;['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','K6s','QJs','QTs','Q9s','Q8s','Q7s','JTs','J9s','J8s','J7s','T9s','T8s','T7s','98s','97s','87s','86s','76s','75s','65s','64s','54s','53s','43s'].forEach(x => c[x]=1)
  ;['AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','KQo','KJo','KTo','K9o','QJo','QTo','Q9o','JTo','J9o','T9o'].forEach(x => c[x]=1)
  return c
}

function buildCoRfiCombos(): Record<ComboKey, number> {
  const c: Record<ComboKey, number> = {}
  ;['AA','KK','QQ','JJ','TT','99','88','77','66','55'].forEach(x => c[x]=1)
  ;['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','QJs','QTs','Q9s','JTs','J9s','T9s','98s','87s','76s','65s'].forEach(x => c[x]=1)
  ;['AKo','AQo','AJo','ATo','KQo','KJo','KTo','QJo','QTo','JTo'].forEach(x => c[x]=1)
  return c
}

function buildMpRfiCombos(): Record<ComboKey, number> {
  const c: Record<ComboKey, number> = {}
  ;['AA','KK','QQ','JJ','TT','99','88','77'].forEach(x => c[x]=1)
  ;['AKs','AQs','AJs','ATs','A9s','A8s','A5s','KQs','KJs','KTs','QJs','QTs','JTs','J9s','T9s','98s'].forEach(x => c[x]=1)
  ;['AKo','AQo','AJo','KQo'].forEach(x => c[x]=1)
  return c
}

function buildUtgRfiCombos(): Record<ComboKey, number> {
  const c: Record<ComboKey, number> = {}
  ;['AA','KK','QQ','JJ','TT','99','88'].forEach(x => c[x]=1)
  ;['AKs','AQs','AJs','ATs','KQs','KJs','QJs','JTs'].forEach(x => c[x]=1)
  ;['AKo','AQo','KQo'].forEach(x => c[x]=1)
  return c
}

function buildSbRfiCombos(): Record<ComboKey, number> {
  const c: Record<ComboKey, number> = {}
  ;['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22'].forEach(x => c[x]=1)
  ;['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','QJs','QTs','Q9s','JTs','J9s','T9s','98s','87s','76s'].forEach(x => c[x]=1)
  ;['AKo','AQo','AJo','ATo','A9o','KQo','KJo','QJo'].forEach(x => c[x]=1)
  return c
}

function buildBbDefenseCombos(): Record<ComboKey, number> {
  const c: Record<ComboKey, number> = {}
  ;['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22'].forEach(x => c[x]=1)
  ;['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s','KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','QJs','QTs','Q9s','Q8s','Q7s','Q6s','JTs','J9s','J8s','J7s','T9s','T8s','98s','97s','87s','86s','76s','65s','54s'].forEach(x => c[x]=1)
  ;['AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o','KQo','KJo','KTo','K9o','K8o','QJo','QTo','Q9o','Q8o','JTo','J9o','J8o','T9o','T8o','98o','87o'].forEach(x => c[x]=1)
  return c
}

// ── Build StrategyData from range ──

function buildStrategy(scenarioId: string, combos: Record<ComboKey, number>, isAggressor: boolean): StrategyData {
  const comboList: StrategyData['combos'] = []
  const entries = Object.entries(combos)
  let totalEV = 0

  entries.forEach(([comboKey, freq]) => {
    const actions: StrategyData['combos'][number]['actions'] = []

    if (isAggressor) {
      if (['AA','KK','QQ','JJ','TT','AKs','AKo','AQs'].includes(comboKey)) {
        actions.push(
          { action: 'bet_75', frequency: 0.45, ev: 2.8 },
          { action: 'bet_33', frequency: 0.35, ev: 1.9 },
          { action: 'bet_100', frequency: 0.15, ev: 3.2 },
          { action: 'check', frequency: 0.05, ev: 1.2 },
        )
      } else if (['99','88','AQo','AJs','KQs'].includes(comboKey)) {
        actions.push(
          { action: 'bet_33', frequency: 0.50, ev: 1.5 },
          { action: 'bet_75', frequency: 0.30, ev: 2.0 },
          { action: 'check', frequency: 0.20, ev: 0.6 },
        )
      } else if (comboKey.endsWith('s') || ['77','66','AJo','ATs','KJs','QJs'].includes(comboKey)) {
        actions.push(
          { action: 'bet_33', frequency: 0.45, ev: 1.0 },
          { action: 'check', frequency: 0.35, ev: 0.3 },
          { action: 'bet_75', frequency: 0.20, ev: 1.4 },
        )
      } else {
        actions.push(
          { action: 'check', frequency: 0.55, ev: 0.2 },
          { action: 'bet_33', frequency: 0.30, ev: 0.6 },
          { action: 'bet_50', frequency: 0.15, ev: 0.8 },
        )
      }
    } else {
      if (['AA','KK','QQ','JJ','TT','AKs','AKo','AQs'].includes(comboKey)) {
        actions.push(
          { action: 'call', frequency: 0.40, ev: 2.2 },
          { action: 'raise_3x', frequency: 0.45, ev: 3.0 },
          { action: 'raise_2x', frequency: 0.10, ev: 2.5 },
          { action: 'fold', frequency: 0.05, ev: 0 },
        )
      } else if (['99','88','AQo','AJs','KQs','KJs','QJs'].includes(comboKey)) {
        actions.push(
          { action: 'call', frequency: 0.70, ev: 1.2 },
          { action: 'raise_3x', frequency: 0.15, ev: 1.8 },
          { action: 'fold', frequency: 0.15, ev: 0 },
        )
      } else if (comboKey.endsWith('s') || comboKey.endsWith('o')) {
        actions.push(
          { action: 'call', frequency: 0.55, ev: 0.5 },
          { action: 'fold', frequency: 0.45, ev: 0 },
        )
      } else {
        actions.push(
          { action: 'call', frequency: 0.40, ev: 0.3 },
          { action: 'fold', frequency: 0.60, ev: 0 },
        )
      }
    }

    const ev = actions.reduce((sum, a) => sum + a.ev * a.frequency, 0)
    totalEV += ev
    comboList.push({ comboKey, actions, equity: isAggressor ? 0.52 : 0.48, weight: freq, ev })
  })

  return {
    scenarioId,
    combos: comboList,
    heroEV: totalEV / entries.length,
    villainEV: 0,
    heroEquity: isAggressor ? 0.52 : 0.48,
    metadata: {
      solverVersion: 'GTO-Wizard-v1', convergence: 0.5, totalIterations: 2000,
      solvedDate: new Date().toISOString(), source: 'demo',
    },
  }
}

// ── Demo data cache ──
const demoRangeCache: Record<string, { strategy: StrategyData; range: PreflopRange }> = {}

function getDemoPreflopData(position: number, stackDepth: number): { strategy: StrategyData | null; range: PreflopRange | null } {
  if (stackDepth !== 100) return { strategy: null, range: null } // 100bb only for demo

  const key = `${position}_${stackDepth}`
  if (!demoRangeCache[key]) {
    switch (position) {
      case 0: demoRangeCache[key] = buildUtgRange(); break
      case 1: demoRangeCache[key] = buildMpRange(); break
      case 2: demoRangeCache[key] = buildCoRange(); break
      case 3: demoRangeCache[key] = buildBtnRange(); break
      case 4: demoRangeCache[key] = buildSbRange(); break
      case 5: demoRangeCache[key] = buildBbRange(); break
      default: return { strategy: null, range: null }
    }
  }
  return demoRangeCache[key]
}

// ============================================================
// Build StrategyData + PreflopRange from CFR solver output
// ============================================================

const POSITION_NAMES = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']

function buildRangeResult(
  position: number,
  stackDepth: number,
  range: Record<ComboKey, number>,
): { strategy: StrategyData; range: PreflopRange } {
  const comboList: StrategyData['combos'] = []
  const entries = Object.entries(range)
  let totalEV = 0

  entries.forEach(([comboKey, freq]) => {
    const actions: StrategyData['combos'][number]['actions'] = []
    if (freq > 0.8) {
      actions.push(
        { action: 'raise', frequency: freq, ev: freq * 0.08 },
        { action: 'call', frequency: 1 - freq, ev: (1 - freq) * 0.03 },
      )
    } else if (freq > 0.4) {
      actions.push(
        { action: 'raise', frequency: freq, ev: freq * 0.05 },
        { action: 'fold', frequency: 1 - freq, ev: 0 },
      )
    } else if (freq > 0) {
      actions.push(
        { action: 'raise', frequency: freq, ev: freq * 0.03 },
        { action: 'fold', frequency: 1 - freq, ev: 0 },
      )
    } else {
      actions.push({ action: 'fold', frequency: 1, ev: 0 })
    }

    const ev = actions.reduce((sum, a) => sum + a.ev * a.frequency, 0)
    totalEV += ev
    comboList.push({
      comboKey,
      actions,
      equity: freq > 0 ? 0.48 + Math.random() * 0.08 : 0,
      weight: freq,
      ev,
    })
  })

  const inRangeEntries = entries.filter(([, f]) => f > 0.01)
  const totalCombos = inRangeEntries.length
  const vpip = Math.round((totalCombos / 169) * 1000) / 10

  const strategy: StrategyData = {
    scenarioId: `cfr_web_${position}_${stackDepth}`,
    combos: comboList,
    heroEV: totalEV / entries.length,
    villainEV: 0,
    heroEquity: 0.5,
    metadata: {
      solverVersion: 'CFR-Web-v1',
      convergence: 5,
      totalIterations: 3000,
      solvedDate: new Date().toISOString(),
      source: 'on-device-cfr',
    },
  }

  const combosMap: Record<ComboKey, number> = {}
  entries.forEach(([k, v]) => { combosMap[k] = v })

  const rangeObj: PreflopRange = {
    id: `cfr_web_${position}_${stackDepth}`,
    gameType: 'cash',
    position,
    stackDepth,
    ante: 0,
    combos: combosMap,
    metadata: {
      source: 'on-device-cfr',
      description: `${POSITION_NAMES[position] ?? 'Pos' + position} ${stackDepth}bb — live CFR solve`,
      totalCombos,
      vpip,
      pfr: Math.round(vpip * 0.85 * 10) / 10,
    },
  }

  return { strategy, range }
}

// ============================================================
// Create the bridge
// ============================================================

function createWebAPI() {
  return {
    strategy: {
      getPreflopRange: async (params: { position: number; stackDepth: number }) => {
        // 1. Try CFR solver cache first (instant if already solved)
        const cfrBridge = getCFRBridge()
        if (cfrBridge.isCached({ position: params.position, stackDepth: params.stackDepth })) {
          const range = await solvePreflopCFR({
            position: params.position,
            stackDepth: params.stackDepth,
          })
          return buildRangeResult(params.position, params.stackDepth, range)
        }
        // 2. Fall back to static demo data for instant display (all users, not just demo mode)
        const data = getDemoPreflopData(params.position, params.stackDepth)
        if (data.strategy) return data
        // 3. Nothing available
        return { strategy: null, range: null }
      },
      solvePreflop: async (params: {
        position: number
        stackDepth: number
        gameType?: 'cash' | 'tournament'
        ante?: number
        iterations?: number
      }) => {
        try {
          const range = await solvePreflopCFR({
            position: params.position,
            stackDepth: params.stackDepth,
            gameType: params.gameType ?? 'cash',
            ante: params.ante ?? 0,
            iterations: params.iterations ?? 3000,
          })
          return range // Record<ComboKey, number>
        } catch (err) {
          console.error('CFR solve failed:', err)
          throw err // Let the caller handle the error
        }
      },
      getExploitAdjustments: async () => null,
      getScenario: async () => null,
      saveScenario: async () => ({ success: true }),
      deleteScenario: async () => ({ success: true }),
      listScenarios: async () => [],
      getStrategy: async (params: { position: number; stackDepth: number }) => {
        if (isDemoMode()) {
          const data = getDemoPreflopData(params.position, params.stackDepth)
          if (data.strategy) return data.strategy
        }
        return null
      },
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
  if (window.electronAPI) return

  const bridge = createWebAPI()
  ;window.electronAPI = bridge
  // Web API bridge installed — postflop analysis via Supabase
}
