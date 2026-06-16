import type { HandAction } from '../../../src/main/solver/hand-analyzer'

export interface ParsedHand {
  id: string
  source: 'pokerstars' | 'ggpoker' | 'wpk'
  gameType: 'cash' | 'tournament'
  stakes: string
  tableName: string
  maxPlayers: number
  heroName: string
  heroHand: string[]
  board: string[]
  heroPosition: number
  villainName: string
  villainPosition: number
  stackSizes: Record<string, number>
  effectiveStack: number
  potSize: number
  actions: HandAction[]
  showdown: boolean
  heroWon: boolean | null
  amountWon: number
  date: string
  rawText: string
}

export interface HandHistorySummary {
  id: string
  source: 'pokerstars' | 'ggpoker' | 'wpk'
  gameType: string
  heroPosition: number
  heroHand: string[]
  board: string[]
  potSize: number
  heroWon: boolean | null
  totalMistakes: number
  totalEVLost: number
  grade: string
  createdAt: string
  analyzed: boolean
}

export interface BatchAnalysisResult {
  handId: string
  success: boolean
  grade?: string
  totalEVLost?: number
  mistakes?: number
  error?: string
}

export interface HandHistoryStats {
  totalHands: number
  analyzedCount: number
  unanalyzedCount: number
  totalEVLost: number
  averageGrade: string
  winRate: number
}
