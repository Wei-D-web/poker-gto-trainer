/**
 * useDemoData — Pre-fills stores with demo data so users see product value
 * within 30 seconds of entering demo mode.
 *
 * Detects demo mode via localStorage key 'pokergto_demo_mode'.
 * Injects correctly-structured StrategyData + PreflopRange into Zustand stores.
 */
import { useEffect, useRef } from 'react'
import { useStrategyStore } from '../stores/strategyStore'
import { useScenarioStore } from '../stores/scenarioStore'
import type { StrategyData, PreflopRange } from '@shared/types/strategy'
import type { ComboKey } from '@shared/types/poker'

const DEMO_KEY = 'pokergto_demo_mode'

function isDemoMode(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === '1' } catch { return false }
}

// ── BTN RFI combos (~45% VPIP) with GTO frequencies ──
function buildBtnRfiCombos(): Record<ComboKey, number> {
  const combos: Record<ComboKey, number> = {}
  // Pairs
  const pairs = ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22']
  pairs.forEach(c => { combos[c] = 1.0 })
  // Suited
  const suited = ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','K8s','K7s','K6s',
    'QJs','QTs','Q9s','Q8s','Q7s',
    'JTs','J9s','J8s','J7s',
    'T9s','T8s','T7s',
    '98s','97s',
    '87s','86s',
    '76s','75s',
    '65s','64s',
    '54s','53s',
    '43s']
  suited.forEach(c => { combos[c] = 1.0 })
  // Offsuit
  const offsuit = ['AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
    'KQo','KJo','KTo','K9o',
    'QJo','QTo','Q9o',
    'JTo','J9o',
    'T9o']
  offsuit.forEach(c => { combos[c] = 1.0 })
  return combos
}

// ── BB defense combos vs BTN open (~50% call + 3bet) ──
function buildBbDefenseCombos(): Record<ComboKey, number> {
  const combos: Record<ComboKey, number> = {}
  const pairs = ['AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22']
  pairs.forEach(c => { combos[c] = 1.0 })
  const suited = ['AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s',
    'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
    'JTs','J9s','J8s','J7s',
    'T9s','T8s',
    '98s','97s',
    '87s','86s',
    '76s','65s','54s']
  suited.forEach(c => { combos[c] = 1.0 })
  const offsuit = ['AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
    'KQo','KJo','KTo','K9o','K8o',
    'QJo','QTo','Q9o','Q8o',
    'JTo','J9o','J8o',
    'T9o','T8o',
    '98o','87o']
  offsuit.forEach(c => { combos[c] = 1.0 })
  return combos
}

// ── Build StrategyData (combo → actions) for a range ──
function buildStrategy(scenarioId: string, combos: Record<ComboKey, number>, isAggressor: boolean): StrategyData {
  const comboList: StrategyData['combos'] = []
  let totalEV = 0
  const entries = Object.entries(combos)

  entries.forEach(([comboKey, freq]) => {
    const actions: StrategyData['combos'][number]['actions'] = []

    if (isAggressor) {
      // Aggressor: weighted mix of bet sizes
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
      // Defender: mostly call/fold decisions
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

    comboList.push({
      comboKey,
      actions,
      equity: isAggressor ? 0.52 : 0.48,
      weight: freq,
      ev,
    })
  })

  return {
    scenarioId,
    combos: comboList,
    heroEV: totalEV / entries.length,
    villainEV: 0,
    heroEquity: isAggressor ? 0.52 : 0.48,
    metadata: {
      solverVersion: 'GTO-Wizard-v1',
      convergence: 0.5,
      totalIterations: 2000,
      solvedDate: new Date().toISOString(),
      source: 'demo',
    },
  }
}

// ── Build PreflopRange objects ──
const heroCombos = buildBtnRfiCombos()
const villainCombos = buildBbDefenseCombos()

const DEMO_HERO_RANGE: PreflopRange = {
  id: 'demo_hero_btn_100',
  gameType: 'cash',
  position: 3,
  stackDepth: 100,
  ante: 0,
  combos: heroCombos,
  metadata: {
    source: 'gto-wizard',
    description: 'BTN RFI range (GTO baseline, ~45% VPIP)',
    totalCombos: Object.keys(heroCombos).length,
    vpip: 45.2,
    pfr: 38.6,
  },
}

const DEMO_VILLAIN_RANGE: PreflopRange = {
  id: 'demo_villain_bb_100',
  gameType: 'cash',
  position: 5,
  stackDepth: 100,
  ante: 0,
  combos: villainCombos,
  metadata: {
    source: 'gto-wizard',
    description: 'BB defense range vs BTN open',
    totalCombos: Object.keys(villainCombos).length,
    vpip: 55.8,
    pfr: 12.3,
  },
}

/**
 * Hook: injects demo data into stores when in demo mode.
 * Only runs once per session. Call near root of App tree (in App.tsx).
 */
export function useDemoData() {
  const hasInjected = useRef(false)
  const setHeroRange = useStrategyStore((s) => s.setHeroRange)
  const setVillainRange = useStrategyStore((s) => s.setVillainRange)
  const setHeroStrategy = useStrategyStore((s) => s.setHeroStrategy)
  const setVillainStrategy = useStrategyStore((s) => s.setVillainStrategy)
  const setHeroPosition = useScenarioStore((s) => s.setHeroPosition)
  const setVillainPosition = useScenarioStore((s) => s.setVillainPosition)
  const setStackDepth = useScenarioStore((s) => s.setStackDepth)

  useEffect(() => {
    if (!isDemoMode() || hasInjected.current) return
    hasInjected.current = true

    // Delay slightly so stores and components are ready
    const timer = setTimeout(() => {
      // Set scenario: BTN vs BB, 100bb
      setHeroPosition(3)   // BTN
      setVillainPosition(5) // BB
      setStackDepth(100)

      // Set ranges (must match PreflopRange type)
      setHeroRange(DEMO_HERO_RANGE)
      setVillainRange(DEMO_VILLAIN_RANGE)

      // Set strategies (must match StrategyData type with combos array)
      setHeroStrategy(buildStrategy('demo_hero_btn_100', heroCombos, true))
      setVillainStrategy(buildStrategy('demo_villain_bb_100', villainCombos, false))

      console.log('🎯 Demo data injected — BTN vs BB, 100bb,', Object.keys(heroCombos).length, 'combos')
    }, 500)

    return () => clearTimeout(timer)
  }, [])
}
