/**
 * CFR Solver Browser — Minimal Poker Types
 * Drop-in module, no external dependencies.
 */

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
export type ComboKey = string

export interface ComboInfo {
  key: ComboKey
  rank1: Rank
  rank2: Rank
  suited: boolean
  pair: boolean
  row: number
  col: number
}

export const RANK_CHARS: Record<Rank, string> = {
  14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T',
  9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2',
}

export const ALL_RANKS: Rank[] = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
