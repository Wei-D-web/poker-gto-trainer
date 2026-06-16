import type { GameType, Position, CardString, Street } from './poker'

/** A range of stack depths for filtering */
export interface StackRange {
  min: number
  max: number
  label: string
}

// ============================================================
// Scenario — the lookup key for strategy data
// ============================================================

/** A fully-specified scenario that identifies a unique strategy spot */
export interface Scenario {
  id: string
  gameType: GameType
  heroPosition: Position
  villainPosition: Position
  effectiveStack: number // bb
  ante: number // bb (0 for cash games)
  board: CardString[]
  street: Street
  potSize: number // bb
  actions: string // JSON-serialized action history
  sizingSchemaId: string
  icmPayouts: number[] | null // null for cash, prize distribution for tournament
  metadata: ScenarioMetadata
}

export interface ScenarioMetadata {
  label: string // "BTN vs BB, 100bb, Cash, SRP"
  potType: string // "SRP", "3BP", "4BP", "5BP"
  solverVersion?: string
  solvedDate?: string
}

/** Result of querying for a scenario */
export interface ScenarioResult {
  scenario: Scenario
  strategy: import('./strategy').StrategyData | null
}

/** Search/filter parameters for browsing scenarios */
export interface ScenarioFilter {
  gameType?: GameType
  heroPosition?: Position
  villainPosition?: Position
  effectiveStackMin?: number
  effectiveStackMax?: number
  street?: Street
  potType?: string
  boardTexture?: string
  searchQuery?: string
}

/** Breadcrumb item for action path navigation */
export interface BreadcrumbItem {
  label: string
  actionIndex: number // index into the action history
  isActive: boolean
}
