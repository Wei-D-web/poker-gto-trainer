/**
 * Real Texas Hold'em Hand Evaluator
 * Ranks any 7-card combination (2 hole + 5 board) using standard poker hand ranking.
 * Replaces the simplified handStrengthScore proxy for accurate showdowns.
 */

export type HandRank =
  | 'high_card' | 'pair' | 'two_pair' | 'trips' | 'straight'
  | 'flush' | 'full_house' | 'quads' | 'straight_flush' | 'royal_flush'

export interface RankedHand {
  rank: HandRank
  score: number         // numeric score for comparison (higher = better)
  bestFive: string[]    // the 5 cards that make the best hand
  description: string
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
}

const RANK_NAMES: Record<number, string> = {
  14: 'Ace', 13: 'King', 12: 'Queen', 11: 'Jack', 10: 'Ten',
  9: '9', 8: '8', 7: '7', 6: '6', 5: '5', 4: '4', 3: '3', 2: '2',
}

interface CardObj { rank: number; suit: string; str: string }

function parseCard(c: string): CardObj {
  const rank = RANK_VALUES[c[0]] || 2
  const suit = c[c.length - 1]
  return { rank, suit, str: c }
}

/** Evaluate the best 5-card poker hand from up to 7 cards. */
export function evaluateHand(cards: string[]): RankedHand {
  const parsed = cards.map(parseCard)
  const combos = get5CardCombinations(parsed)
  let best: RankedHand | null = null

  for (const combo of combos) {
    const ranked = rank5Cards(combo)
    if (!best || ranked.score > best.score) best = ranked
  }

  return best!
}

/** Compare two 7-card sets, return winner: 1=hero, -1=villain, 0=tie */
export function compareHands(heroCards: string[], villainCards: string[], board: string[]): 1 | -1 | 0 {
  const hero = evaluateHand([...heroCards, ...board])
  const villain = evaluateHand([...villainCards, ...board])
  if (hero.score > villain.score) return 1
  if (villain.score > hero.score) return -1
  return 0
}

function get5CardCombinations(cards: CardObj[]): CardObj[][] {
  const result: CardObj[][] = []
  const n = cards.length
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++)
            result.push([cards[a], cards[b], cards[c], cards[d], cards[e]])
  return result
}

function rank5Cards(cards: CardObj[]): RankedHand {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a)
  const suits = cards.map(c => c.suit)

  const isFlush = suits.every(s => s === suits[0])
  const straightResult = checkStraight(ranks)
  const isStraight = straightResult.isStraight
  // Wheel (A-2-3-4-5): the Ace acts as low, so the effective high card is 5
  const straightHigh = straightResult.highCard

  // Count rank frequencies
  const freq: Record<number, number> = {}
  ranks.forEach(r => freq[r] = (freq[r] || 0) + 1)
  const freqValues = Object.values(freq).sort((a, b) => b - a)
  const groups = Object.entries(freq).sort((a, b) => b[1] - a[1] || Number(b[0]) - Number(a[0]))

  let score = 0
  let rank: HandRank
  let desc = ''

  if (isFlush && isStraight && straightHigh === 14 && ranks[1] === 13 && !isWheel(ranks)) {
    rank = 'royal_flush'; score = 9000000; desc = 'Royal Flush'
  } else if (isFlush && isStraight) {
    rank = 'straight_flush'; score = 8000000 + straightHigh; desc = 'Straight Flush'
  } else if (freqValues[0] === 4) {
    rank = 'quads'
    const quad = Number(groups[0][0])
    const kicker = Number(groups[1]?.[0] || 0)
    score = 7000000 + quad * 15 + kicker
    desc = `Quad ${RANK_NAMES[quad]}s`
  } else if (freqValues[0] === 3 && freqValues[1] === 2) {
    rank = 'full_house'
    const trips = Number(groups[0][0])
    const pair = Number(groups[1][0])
    score = 6000000 + trips * 15 + pair
    desc = `Full House ${RANK_NAMES[trips]}s over ${RANK_NAMES[pair]}s`
  } else if (isFlush) {
    rank = 'flush'
    score = 5000000 + ranks[0] * 3375 + ranks[1] * 225 + ranks[2] * 15 + ranks[3]
    desc = 'Flush'
  } else if (isStraight) {
    rank = 'straight'
    score = 4000000 + straightHigh
    desc = 'Straight'
  } else if (freqValues[0] === 3) {
    rank = 'trips'
    const trip = Number(groups[0][0])
    const kickers = groups.slice(1).map(g => Number(g[0])).sort((a, b) => b - a)
    score = 3000000 + trip * 225 + (kickers[0] || 0) * 15 + (kickers[1] || 0)
    desc = `Three ${RANK_NAMES[trip]}s`
  } else if (freqValues[0] === 2 && freqValues[1] === 2) {
    rank = 'two_pair'
    const high = Math.max(Number(groups[0][0]), Number(groups[1][0]))
    const low = Math.min(Number(groups[0][0]), Number(groups[1][0]))
    const kicker = Number(groups[2]?.[0] || 0)
    score = 2000000 + high * 225 + low * 15 + kicker
    desc = `Two Pair`
  } else if (freqValues[0] === 2) {
    rank = 'pair'
    const pair = Number(groups[0][0])
    const kickers = groups.slice(1).map(g => Number(g[0])).sort((a, b) => b - a)
    score = 1000000 + pair * 3375 + (kickers[0] || 0) * 225 + (kickers[1] || 0) * 15 + (kickers[2] || 0)
    desc = `Pair of ${RANK_NAMES[pair]}s`
  } else {
    rank = 'high_card'
    score = ranks[0] * 50625 + ranks[1] * 3375 + ranks[2] * 225 + ranks[3] * 15 + ranks[4]
    desc = `${RANK_NAMES[ranks[0]]} High`
  }

  return { rank, score, bestFive: cards.map(c => c.str), description: desc }
}

function checkStraight(ranks: number[]): { isStraight: boolean; highCard: number } {
  const unique = [...new Set(ranks)].sort((a, b) => b - a)
  // Normal straight
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) return { isStraight: true, highCard: unique[i] }
  }
  // Wheel: A-2-3-4-5 (Ace acts as low, high card = 5)
  if (unique.includes(14) && unique.includes(2) && unique.includes(3) && unique.includes(4) && unique.includes(5)) {
    return { isStraight: true, highCard: 5 }
  }
  return { isStraight: false, highCard: 0 }
}

function isWheel(ranks: number[]): boolean {
  return ranks.includes(14) && ranks.includes(5) && ranks.includes(4) && ranks.includes(3) && ranks.includes(2)
}
