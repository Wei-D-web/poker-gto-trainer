import type { Rank, Suit, CardString } from '../types/poker'

// ============================================================
// Poker Math Utilities — equity, combos, board analysis
// ============================================================

/** All 52 cards as compact strings */
export function generateDeck(): CardString[] {
  const ranks: Rank[] = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
  const suits: Suit[] = ['s', 'h', 'd', 'c']
  const rankChars: Record<Rank, string> = { 14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T', 9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2' }
  const deck: CardString[] = []
  for (const rank of ranks) {
    for (const suit of suits) {
      deck.push(`${rankChars[rank]}${suit}`)
    }
  }
  return deck
}

/** Parse a card string to rank/suit */
export function parseCard(card: CardString): { rank: Rank; suit: Suit } | null {
  if (card.length < 2) return null
  const rankChar = card[0].toUpperCase()
  const suitChar = card[card.length - 1].toLowerCase() as Suit

  const rankMap: Record<string, Rank> = {
    A: 14, K: 13, Q: 12, J: 11, T: 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
  }
  if (!rankMap[rankChar] || !['s', 'h', 'd', 'c'].includes(suitChar)) return null
  return { rank: rankMap[rankChar], suit: suitChar }
}

/** Board texture type */
export type BoardTexture =
  | 'preflop'
  | 'paired'
  | 'trips'
  | 'monotone'
  | 'two-tone'
  | 'rainbow'
  | 'paired-monotone'
  | 'paired-two-tone'
  | 'monotone-connected'
  | 'two-tone-connected'
  | 'rainbow-connected'
  | 'rainbow-high'
  | 'rainbow-dry'
  | 'ace-high-dry'
  | 'ace-high-wet'
  | 'ace-high-monotone'
  | 'broadway-heavy'
  | 'broadway-connected'
  | 'mid-disconnected'
  | 'low-dry'
  | 'low-connected'
  | 'wheel'
  | 'double-broadway'
  | 'mixed'

/** Connectivity level */
export type Connectivity = 'disconnected' | 'semi-connected' | 'connected' | 'highly-connected'

/** Detailed board analysis */
export interface BoardAnalysis {
  board: CardString[]
  street: 'preflop' | 'flop' | 'turn' | 'river'
  texture: BoardTexture
  connectivity: Connectivity
  highCardRank: Rank
  middleCardRank: Rank | null
  lowCardRank: Rank | null
  isPaired: boolean
  isMonotone: boolean
  isTwoTone: boolean
  isRainbow: boolean
  flushDrawPossible: boolean
  straightDrawPossible: boolean
  highCards: number // count of T+
  broadwayCards: number // count of Broadway (A-T)
  clusterId: number // 0-99 bucket ID
}

/** Analyze board texture */
export function analyzeBoard(board: CardString[]): BoardAnalysis {
  if (board.length === 0) {
    return {
      board: [],
      street: 'preflop',
      texture: 'preflop',
      connectivity: 'disconnected',
      highCardRank: 14,
      middleCardRank: null,
      lowCardRank: null,
      isPaired: false,
      isMonotone: false,
      isTwoTone: false,
      isRainbow: false,
      flushDrawPossible: false,
      straightDrawPossible: false,
      highCards: 0,
      broadwayCards: 0,
      clusterId: -1,
    }
  }

  const cards = board.map(parseCard).filter(Boolean) as { rank: Rank; suit: Suit }[]
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)

  // Pair detection
  const rankCounts = new Map<number, number>()
  ranks.forEach(r => rankCounts.set(r, (rankCounts.get(r) || 0) + 1))
  const isPaired = [...rankCounts.values()].some(c => c >= 2)
  const isTrips = [...rankCounts.values()].some(c => c >= 3)

  // Suit analysis
  const uniqueSuits = new Set(suits)
  const isMonotone = uniqueSuits.size === 1 && board.length >= 3
  const isTwoTone = uniqueSuits.size === 2 && board.length >= 3
  const isRainbow = uniqueSuits.size >= 3

  // Flush draw possible
  const flushDrawPossible = uniqueSuits.size <= 2 && board.length >= 2

  // Connectivity
  const gaps = ranks.slice(0, -1).map((r, i) => r - ranks[i + 1])
  let connectivity: Connectivity = 'disconnected'
  const maxGap = Math.max(...gaps, 0)

  // Check for straight draws considering the board cards
  const allRanksSet = new Set(ranks)
  let straightDrawPossible = false

  // Check for gutshot or OESD potential
  for (let i = 14; i >= 4; i--) {
    const straightRanks = [i, i - 1, i - 2, i - 3, i - 4].map(r => r <= 0 ? r + 13 : r)
    const present = straightRanks.filter(r => allRanksSet.has(r as Rank))
    if (present.length >= 3 && board.length >= 3) {
      straightDrawPossible = true
      break
    }
    // Wheel straight (A-2-3-4-5)
    if (i === 5) break
  }

  if (maxGap <= 1) {
    connectivity = 'highly-connected'
  } else if (maxGap <= 2) {
    connectivity = 'connected'
  } else if (maxGap <= 4 && ranks.length >= 3) {
    connectivity = 'semi-connected'
  }

  // High cards
  const highCards = ranks.filter(r => r >= 10).length
  const broadwayCards = ranks.filter(r => r >= 10).length

  // Texture classification
  let texture: BoardTexture = 'mixed'
  const hasAce = ranks.some(r => r === 14)
  const hasKing = ranks.some(r => r === 13)
  const hasBroadway = broadwayCards >= 2

  if (isTrips) {
    texture = 'trips'
  } else if (isPaired && isMonotone) {
    texture = 'paired-monotone'
  } else if (isPaired && isTwoTone) {
    texture = 'paired-two-tone'
  } else if (isPaired) {
    texture = 'paired'
  } else if (isMonotone && connectivity !== 'disconnected') {
    texture = 'monotone-connected'
  } else if (isMonotone && hasAce) {
    texture = 'ace-high-monotone'
  } else if (isMonotone) {
    texture = 'monotone'
  } else if (isTwoTone && connectivity === 'highly-connected') {
    texture = 'two-tone-connected'
  } else if (isTwoTone && hasBroadway && connectivity !== 'disconnected') {
    texture = 'broadway-connected'
  } else if (isTwoTone && hasBroadway) {
    texture = 'broadway-heavy'
  } else if (isTwoTone && hasAce) {
    texture = 'ace-high-wet'
  } else if (isTwoTone) {
    texture = 'two-tone'
  } else if (isRainbow && connectivity !== 'disconnected') {
    texture = 'rainbow-connected'
  } else if (isRainbow && hasAce && hasBroadway) {
    texture = 'broadway-heavy'
  } else if (isRainbow && hasAce) {
    texture = 'ace-high-dry'
  } else if (isRainbow && hasKing) {
    texture = 'rainbow-high'
  } else if (isRainbow && highCards === 0 && connectivity === 'disconnected') {
    texture = 'low-dry'
  } else if (isRainbow) {
    texture = 'rainbow-dry'
  }

  // Check for wheel
  const wheelRanks = [14, 5, 4, 3, 2]
  const wheelMatch = wheelRanks.filter(r => ranks.includes(r as Rank)).length
  if (wheelMatch >= 3 && !isPaired) {
    texture = 'wheel'
  }
  // Check for double broadway
  if (broadwayCards >= 2 && !isPaired && !isMonotone && connectivity === 'disconnected') {
    texture = 'double-broadway'
  }
  // Low connected
  if (highCards === 0 && connectivity !== 'disconnected') {
    texture = 'low-connected'
  }

  // Cluster ID (simplified: assign based on texture + high card)
  const textureBase: Record<string, number> = {
    'paired': 0, 'paired-monotone': 8, 'paired-two-tone': 16, 'trips': 24,
    'monotone': 32, 'monotone-connected': 36, 'ace-high-monotone': 38,
    'ace-high-dry': 40, 'ace-high-wet': 44,
    'rainbow-high': 48, 'rainbow-dry': 52,
    'rainbow-connected': 56,
    'two-tone': 60, 'two-tone-connected': 64,
    'broadway-heavy': 68, 'broadway-connected': 72, 'double-broadway': 74,
    'low-dry': 76, 'low-connected': 80, 'wheel': 84,
    'mid-disconnected': 88, 'mixed': 92,
  }
  const clusterId = (textureBase[texture] || 90) + Math.min(highCards * 2, 9)

  return {
    board,
    street: board.length === 0 ? 'preflop' : board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river',
    texture,
    connectivity,
    highCardRank: ranks[0],
    middleCardRank: ranks.length >= 2 ? ranks[1] : null,
    lowCardRank: ranks.length >= 3 ? ranks[2] : null,
    isPaired,
    isMonotone,
    isTwoTone,
    isRainbow,
    flushDrawPossible,
    straightDrawPossible,
    highCards,
    broadwayCards,
    clusterId: Math.min(clusterId, 99),
  }
}

/** Generate representative flops for each bucket */
export function generateBucketFlops(): Map<number, CardString[]> {
  const buckets = new Map<number, CardString[]>()

  // Representative flops for each texture bucket
  const representatives: [BoardTexture, CardString[]][] = [
    ['paired', ['Ah', 'Ad', 'Ks']],
    ['paired-monotone', ['Kh', 'Kd', 'Qd']],
    ['paired-two-tone', ['Qs', 'Qc', 'Jh']],
    ['trips', ['Jh', 'Jd', 'Js']],
    ['monotone', ['Ah', 'Kh', 'Th']],
    ['monotone-connected', ['9h', '8h', '7h']],
    ['two-tone', ['Ah', 'Kh', 'Qd']],
    ['two-tone-connected', ['Td', '9d', '8s']],
    ['rainbow-high', ['Ah', 'Kd', 'Qs']],
    ['rainbow-connected', ['Jh', 'Td', '9c']],
    ['rainbow-dry', ['Ah', '7d', '3c']],
    ['mixed', ['Kh', '8d', '4s']],
  ]

  for (const [texture, flop] of representatives) {
    const analysis = analyzeBoard(flop)
    buckets.set(analysis.clusterId, flop)
  }

  return buckets
}

/** Calculate approximate preflop equity of a range vs another */
export function approximateRangeEquity(
  heroRangePercent: number,
  villainRangePercent: number
): number {
  // Simplified: tighter range has equity advantage
  const diff = villainRangePercent - heroRangePercent
  return 0.5 + diff * 0.08
}

/** Format a card for display with suit symbol */
export function formatCard(card: CardString): string {
  const parsed = parseCard(card)
  if (!parsed) return card

  const suitSymbols: Record<Suit, string> = {
    s: '♠', h: '♥', d: '♦', c: '♣',
  }

  const rankChars: Record<number, string> = {
    14: 'A', 13: 'K', 12: 'Q', 11: 'J', 10: 'T',
    9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2',
  }

  return `${rankChars[parsed.rank]}${suitSymbols[parsed.suit]}`
}
