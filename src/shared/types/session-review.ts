// ============================================================
// Session Review Types — 对局复盘教练模块
// ============================================================

import type { CardString, Position, GameType, Street, ComboKey } from './poker'
import type { HandAction } from '../../main/solver/hand-analyzer'

/** A session — one continuous playing period */
export interface PokerSession {
  id: string
  date: string // ISO date string
  gameType: GameType
  stakes: string // e.g. "$0.50/$1.00"
  tableName: string
  maxPlayers: number
  heroName: string
  heroPosition: Position
  totalHands: number
  durationMinutes: number
  profit: number // in big blinds
  gtoAlignmentScore: number // 0-100
  createdAt: number // unix timestamp
}

/** A hand within a session, with GTO deviation data */
export interface SessionHand {
  id: string
  sessionId: string
  handId: string
  heroHand: CardString[]
  board: CardString[]
  heroPosition: Position
  villainPosition: Position
  effectiveStack: number
  potSize: number
  actions: HandAction[]
  heroWon: boolean | null
  amountWon: number
  /** GTO deviation per street */
  deviations: StreetDeviation[]
  /** Per-decision GTO comparison */
  decisionAnalysis: DecisionDeviation[]
  /** Total EV lost in bb */
  totalEVLost: number
  /** Whether this is a "key hand" (high deviation) */
  isKeyHand: boolean
  /** Key hand reason (if applicable) */
  keyHandReason?: string
  createdAt: number
}

/** GTO deviation for a single street */
export interface StreetDeviation {
  street: Street
  /** Actual frequency of each action */
  actualFreq: Record<string, number>
  /** GTO-optimal frequency of each action */
  gtoFreq: Record<string, number>
  /** Deviation score for this street (0 = perfect, 100 = fully off) */
  deviationScore: number
}

/** Per-decision comparison against GTO */
export interface DecisionDeviation {
  actionIndex: number
  street: Street
  actor: string
  action: string
  isGTO: boolean
  gtoAction: string
  evDifference: number
  severity: 'correct' | 'minor' | 'moderate' | 'major' | 'critical'
  explanation: string
}

/** GTO deviation on the 13x13 range matrix */
export interface RangeDeviation {
  combo: ComboKey
  row: number
  col: number
  /** Actual play frequency (0-1) */
  actualFreq: number
  /** GTO-optimal frequency (0-1) */
  gtoFreq: number
  /** Deviation direction: positive = overplay, negative = underplay */
  deviation: number
}

/** A detected weakness pattern */
export interface DetectedWeakness {
  id: string
  category: string // e.g. "BTN_vs_BB_turn_cbet", "SB_3bet_defense"
  label: string // Human-readable: "BTN vs BB 转牌 C-bet 频率偏低"
  description: string // Detailed explanation
  /** The spot description */
  heroPosition: Position
  villainPosition: Position
  street: Street
  /** Quantified deviation */
  actualFrequency: number
  gtoTargetFrequency: number
  deviationPercent: number // How far off (signed)
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Combo-level deviation data */
  rangeDeviations: RangeDeviation[]
  /** Sample hands that demonstrate this weakness */
  sampleHandIds: string[]
  /** Auto-generated training focus */
  trainingFocus: string
}

/** Session review summary statistics */
export interface SessionReviewStats {
  totalSessions: number
  totalHands: number
  averageAlignment: number
  totalEVLost: number
  topWeakness: string
  alignmentTrend: { date: string; score: number }[]
  weeklyImprovement: number
}

/** Import result */
export interface SessionImportResult {
  success: boolean
  sessionId?: string
  handCount: number
  errors: string[]
}

/** The full session review page state */
export interface SessionReviewState {
  sessions: PokerSession[]
  selectedSessionId: string | null
  selectedHandId: string | null
  hands: SessionHand[]
  weaknesses: DetectedWeakness[]
  rangeDeviations: RangeDeviation[]
  stats: SessionReviewStats | null
  /** Active filter: street */
  streetFilter: Street | 'all'
  /** Active filter: severity */
  severityFilter: 'all' | 'minor' | 'moderate' | 'major' | 'critical'
  loading: boolean
}
