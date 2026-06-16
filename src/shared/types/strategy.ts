import type { ComboKey, ActionType } from './poker'

// ============================================================
// GTO Strategy Data Types
// ============================================================

/** Frequency and EV for a specific action on a specific combo */
export interface ActionStrategy {
  action: string // "fold", "check", "call", "bet_33", "bet_50", "bet_75", etc.
  frequency: number // 0.0 - 1.0
  ev: number // expected value in big blinds
}

/** GTO strategy for a single combo */
export interface ComboStrategy {
  comboKey: ComboKey
  actions: ActionStrategy[]
  equity: number // raw equity vs opponent range (0-1)
  weight: number // how much this combo is in range (0-1)
  ev: number // overall EV for this combo
}

/** The complete strategy for a scenario (hero's perspective) */
export interface StrategyData {
  scenarioId: string
  combos: ComboStrategy[]
  heroEV: number // overall hero EV
  villainEV: number // overall villain EV
  heroEquity: number // hero's raw equity
  metadata: StrategyMetadata
}

/** Additional info about the strategy solve */
export interface StrategyMetadata {
  solverVersion: string
  convergence: number // exploitability in mbb/hand
  totalIterations: number
  solvedDate: string
  source: string // "precomputed", "community", "custom"
}

/** Preflop range data — which combos are in range with what frequency */
export interface PreflopRange {
  id: string
  gameType: 'cash' | 'tournament'
  position: number
  stackDepth: number // in bb
  ante: number // in bb
  combos: Record<ComboKey, number> // combo -> frequency (0-1)
  metadata: {
    source: string
    description: string
    totalCombos: number
    vpip: number // voluntarily put money in pot %
    pfr: number // preflop raise %
  }
}

/** A user's custom range */
export interface UserRange {
  id: string
  name: string
  position: number
  stackDepth: number
  gameType: 'cash' | 'tournament'
  combos: Record<ComboKey, number> // combo -> frequency (0-1)
  createdAt: string
  updatedAt: string
}

/** Display mode for the range matrix */
export type MatrixDisplayMode = 'hero' | 'villain' | 'diff' | 'merged'

/** Action label with display info */
export interface ActionLabel {
  id: string
  shortLabel: string // "B33", "B50", "C", "X"
  fullLabel: string // "Bet 33%", "Bet 50%", "Call", "Check"
  type: ActionType
  color: string // hex color for charts
}
