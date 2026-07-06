/**
 * useDemoData — Pre-fills stores with demo data so users see product value
 * within 30 seconds of entering demo mode.
 *
 * Detects demo mode via localStorage key 'pokergto_demo_mode'.
 * Injects real-looking scenario + strategy data into Zustand stores.
 */
import { useEffect, useRef } from 'react'
import { useScenarioStore } from '../stores/scenarioStore'
import { useStrategyStore } from '../stores/strategyStore'
import type { StrategyData, PreflopRange } from '@shared/types/strategy'
import type { ComboKey } from '@shared/types/poker'

const DEMO_KEY = 'pokergto_demo_mode'

function isDemoMode(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === '1' } catch { return false }
}

// ── Demo: BTN vs BB, 100bb, preflop ──
const DEMO_HERO_RANGE: PreflopRange = {
  gameType: 'cash',
  position: 3, // BTN
  stackDepth: 100,
  ante: 0,
  rangeData: JSON.stringify({
    // ~45% RFI range for BTN
    includes: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
      'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o',
      'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s',
      'KQo', 'KJo', 'KTo', 'K9o',
      'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s',
      'QJo', 'QTo', 'Q9o',
      'JTs', 'J9s', 'J8s', 'J7s',
      'JTo', 'J9o',
      'T9s', 'T8s', 'T7s',
      'T9o',
      '98s', '97s',
      '87s', '86s',
      '76s', '75s',
      '65s', '64s',
      '54s', '53s',
      '43s',
    ],
  }),
  description: 'BTN RFI range (GTO baseline, ~45%)',
  source: 'gto-wizard',
}

const DEMO_VILLAIN_RANGE: PreflopRange = {
  gameType: 'cash',
  position: 5, // BB
  stackDepth: 100,
  ante: 0,
  rangeData: JSON.stringify({
    // BB defense range vs BTN open
    includes: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
      'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
      'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
      'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s',
      'KQo', 'KJo', 'KTo', 'K9o', 'K8o',
      'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s',
      'QJo', 'QTo', 'Q9o', 'Q8o',
      'JTs', 'J9s', 'J8s', 'J7s',
      'JTo', 'J9o', 'J8o',
      'T9s', 'T8s', 'T7s',
      'T9o', 'T8o',
      '98s', '97s',
      '98o',
      '87s', '86s',
      '87o',
      '76s',
      '65s',
      '54s',
    ],
  }),
  description: 'BB defense range vs BTN (GTO baseline)',
  source: 'gto-wizard',
}

/**
 * Generate a minimal demo strategy for a given position.
 * Returns strategy frequencies for all combos in the range.
 */
function generateDemoStrategy(range: PreflopRange, isAggressor: boolean): StrategyData {
  const frequencies: Record<ComboKey, number[]> = {}
  const combos = JSON.parse(range.rangeData).includes as string[]

  combos.forEach((combo: string) => {
    // Premium hands → high frequency
    if (['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs'].includes(combo)) {
      frequencies[combo] = isAggressor ? [0.05, 0.15, 0.60, 0.15, 0.05] : [0.02, 0.08, 0.50, 0.25, 0.15]
    }
    // Strong hands
    else if (['99', '88', 'AQo', 'AJs', 'KQs'].includes(combo)) {
      frequencies[combo] = isAggressor ? [0.10, 0.20, 0.45, 0.15, 0.10] : [0.05, 0.10, 0.45, 0.25, 0.15]
    }
    // Medium hands
    else if (['77', '66', 'AJo', 'ATs', 'KJs', 'QJs'].includes(combo)) {
      frequencies[combo] = isAggressor ? [0.15, 0.25, 0.40, 0.10, 0.10] : [0.10, 0.15, 0.40, 0.20, 0.15]
    }
    // Speculative hands
    else if (combo.endsWith('s') || ['55', '44'].includes(combo)) {
      frequencies[combo] = isAggressor ? [0.20, 0.30, 0.35, 0.10, 0.05] : [0.15, 0.20, 0.35, 0.20, 0.10]
    }
    // Weak hands
    else {
      frequencies[combo] = isAggressor ? [0.30, 0.35, 0.25, 0.05, 0.05] : [0.25, 0.25, 0.30, 0.10, 0.10]
    }
  })

  return {
    actionNames: ['Fold', 'Call', 'Raise 33%', 'Raise 66%', 'Raise 100%'],
    frequencies,
    ev: {},
  }
}

/**
 * Hook: injects demo data into stores when in demo mode.
 * Only runs once per session. Call near root of App tree (in App.tsx or WebApp.tsx).
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

    // Small delay to let stores initialize
    const timer = setTimeout(() => {
      // Set scenario: BTN vs BB, 100bb
      setHeroPosition(3)  // BTN
      setVillainPosition(5)  // BB
      setStackDepth(100)

      // Set ranges
      setHeroRange(DEMO_HERO_RANGE)
      setVillainRange(DEMO_VILLAIN_RANGE)

      // Set demo strategies
      setHeroStrategy(generateDemoStrategy(DEMO_HERO_RANGE, true))
      setVillainStrategy(generateDemoStrategy(DEMO_VILLAIN_RANGE, false))

      console.log('🎯 Demo data injected — BTN vs BB, 100bb preflop ranges loaded')
    }, 300)

    return () => clearTimeout(timer)
  }, [])
}
