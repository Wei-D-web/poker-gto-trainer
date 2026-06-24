import { ALL_RANKS, RANK_CHARS, type ComboInfo, type ComboKey, type Rank } from '../types/poker'

// ============================================================
// Combo Utilities — generate, parse, and manipulate hand combos
// ============================================================

/** Generate all 169 possible 13x13 hand combos */
export function generateAllCombos(): ComboInfo[] {
  const combos: ComboInfo[] = []
  const ranks = ALL_RANKS

  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const rank1 = ranks[row]
      const rank2 = ranks[col]
      const pair = rank1 === rank2

      let key: ComboKey
      let suited: boolean

      if (pair) {
        key = `${RANK_CHARS[rank1]}${RANK_CHARS[rank2]}`
        suited = false
      } else if (row < col) {
        // Suited (upper right triangle of the grid)
        key = `${RANK_CHARS[rank1]}${RANK_CHARS[rank2]}s`
        suited = true
      } else {
        // Offsuit (lower left triangle of the grid)
        key = `${RANK_CHARS[rank2]}${RANK_CHARS[rank1]}o`
        suited = false
      }

      combos.push({
        key,
        rank1: row < col ? rank1 : rank2,
        rank2: row < col ? rank2 : rank1,
        suited,
        pair,
        row,
        col,
      })
    }
  }

  return combos
}

/** All 169 combos, pre-computed */
export const ALL_COMBOS: ComboInfo[] = generateAllCombos()

/** Map from combo key to ComboInfo for O(1) lookup */
export const COMBO_MAP: Record<ComboKey, ComboInfo> = {}
for (const c of ALL_COMBOS) {
  COMBO_MAP[c.key] = c
}

/** Get combo display label */
export function comboLabel(key: ComboKey): string {
  const info = COMBO_MAP[key]
  if (!info) return key

  if (info.pair) return key // "AA", "KK", etc.

  const r1 = RANK_CHARS[info.rank1]
  const r2 = RANK_CHARS[info.rank2]

  if (info.suited) {
    return `${r1}${r2}s`
  } else {
    return `${r1}${r2}o`
  }
}

/** Get the 13x13 grid position for a combo */
export function comboGridPosition(key: ComboKey): { row: number; col: number } | null {
  const info = COMBO_MAP[key]
  if (!info) return null
  return { row: info.row, col: info.col }
}

/** Parse a card string like "Ah", "Kd", "Ts" into rank and suit */
export function parseCard(card: string): { rank: Rank; suit: string } | null {
  if (card.length < 2) return null
  const rankChar = card[0].toUpperCase()
  const suitChar = card[card.length - 1].toLowerCase()

  const rankMap: Record<string, Rank> = {
    A: 14, K: 13, Q: 12, J: 11, T: 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
  }

  if (!rankMap[rankChar]) return null
  if (!['c', 'd', 'h', 's'].includes(suitChar)) return null

  return { rank: rankMap[rankChar], suit: suitChar }
}

/** Format board cards for display */
export function formatBoard(board: string[]): string {
  if (board.length === 0) return 'Preflop'
  return board.join(' ')
}

/** Get common board texture description */
export function getBoardTexture(board: string[]): string {
  if (board.length < 3) return 'preflop'

  const cards = board.map(parseCard).filter(Boolean) as { rank: Rank; suit: string }[]
  if (cards.length < 3) return 'unknown'

  const ranks = cards.map(c => c.rank)
  const suits = cards.map(c => c.suit)

  // Paired board?
  const rankCounts = new Map<number, number>()
  ranks.forEach(r => rankCounts.set(r, (rankCounts.get(r) || 0) + 1))
  const isPaired = [...rankCounts.values()].some(c => c >= 2)
  const isTrips = [...rankCounts.values()].some(c => c >= 3)

  // Monotone?
  const isMonotone = suits.every(s => s === suits[0])

  // Two-tone?
  const uniqueSuits = new Set(suits)
  const isTwoTone = uniqueSuits.size === 2

  // Rainbow?
  const isRainbow = uniqueSuits.size === 3

  // Connected?
  const sortedRanks = [...ranks].sort((a, b) => b - a)
  const gaps = sortedRanks.slice(0, -1).map((r, i) => r - sortedRanks[i + 1])
  const isConnected = gaps.every(g => g <= 2)
  const isHighlyConnected = gaps.every(g => g <= 1)

  // High cards?
  const highCards = sortedRanks.filter(r => r >= 10).length

  if (isTrips) return 'trips'
  if (isPaired && isMonotone) return 'paired monotone'
  if (isPaired) return 'paired'
  if (isMonotone && isHighlyConnected) return 'monotone connected'
  if (isMonotone) return 'monotone'
  if (isTwoTone && isHighlyConnected) return 'two-tone connected'
  if (isTwoTone) return 'two-tone'
  if (isRainbow && highCards >= 2) return 'rainbow high'
  if (isRainbow && isConnected) return 'rainbow connected'
  if (isRainbow) return 'rainbow dry'

  return 'mixed'
}
