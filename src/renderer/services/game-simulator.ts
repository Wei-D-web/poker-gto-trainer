/**
 * Browser-side Poker Game Simulator
 *
 * Pure JS/TS game engine for AI-vs-Hero heads-up poker.
 * No Node.js or Electron dependencies — runs directly in the browser.
 *
 * Adapted from src/main/solver/game-engine.ts for renderer use.
 */
import type { CardString, ComboKey, Position } from '../../shared/types/poker'
import { generateDeck, analyzeBoard } from '../../shared/utils/poker-math'

// ─── Card / Hand Types ─────────────────────────────────────

export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type PlayerSlot = 'hero' | 'villain'

export interface GameAction {
  player: PlayerSlot
  type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in'
  amount: number
  sizing?: string
  street: Street
}

interface InternalPlayer {
  name: string; position: Position; stack: number
  holeCards: CardString[]; currentBet: number; totalBet: number
  folded: boolean; isAllIn: boolean; actedThisStreet: boolean
}

export interface GameState {
  handId: string
  heroPosition: Position; villainPosition: Position
  stackDepth: number
  board: CardString[]
  pot: number; street: Street; currentActor: PlayerSlot
  hero: {
    name: string; position: Position; stack: number; holeCards: CardString[]
    currentBet: number; folded: boolean; isAllIn: boolean
    holeCardsDisplay: CardString[]
  }
  villain: {
    name: string; position: Position; stack: number; holeCards: CardString[]
    currentBet: number; folded: boolean; isAllIn: boolean
    holeCardsDisplay: CardString[]
  }
  actions: { player: string; type: string; amount: number; street: Street }[]
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
  result: HandResult | null
  deck: CardString[]
  lastAction?: string // human-readable description of last action
}

export interface HandResult {
  winner: PlayerSlot | 'tie'
  heroNetWon: number
  villainNetWon: number
  heroHand: string; villainHand: string
  board: CardString[]
  showdown: boolean
  winReason: string
}

export interface SessionStats {
  handsPlayed: number; heroWins: number; villainWins: number; ties: number
  netProfit: number; biggestWin: number; biggestLoss: number
}

// ─── Hand Strength Lookup ──────────────────────────────────

const HAND_STRENGTH_SCORES: Record<string, number> = {
  'AA': 100, 'KK': 92, 'QQ': 85, 'JJ': 78, 'TT': 72, 'AKs': 70,
  'AKo': 65, 'AQs': 63, '99': 62, '88': 56, 'AQo': 55, 'AJs': 54, 'KQs': 53,
  '77': 50, 'ATs': 48, 'AJo': 47, 'KJs': 45, '66': 44, 'A9s': 42, 'KQo': 42,
  'QJs': 41, 'ATo': 41, 'KTs': 40, 'A8s': 39, '55': 38, 'A5s': 37, 'A4s': 36,
  'QJo': 36, 'KTo': 35, 'A7s': 35, 'A3s': 34, 'A2s': 33, 'QTs': 34, 'A6s': 33,
  'K9s': 33, 'JTs': 33, '44': 30, 'A9o': 30, 'QTo': 29, 'K8s': 28, 'JTo': 28,
  'A8o': 28, 'K7s': 27, 'T9s': 27, '33': 26, 'A5o': 26, 'Q9s': 26, 'J9s': 25,
  'K6s': 25, 'A4o': 25, 'A7o': 24, 'T8s': 24, 'K5s': 23, '22': 22, 'Q8s': 22,
  '98s': 22, 'A3o': 22, 'A2o': 22, 'J8s': 21, 'K4s': 21, 'A6o': 21, 'T7s': 20,
  'K9o': 19, 'Q7s': 19, '87s': 19, 'K3s': 18, 'J7s': 18, 'T6s': 18, '97s': 17,
  'Q6s': 17, 'K2s': 16, '86s': 16, '76s': 16, 'J6s': 15, 'T9o': 15, 'Q5s': 15,
  'T5s': 14, '98o': 14, '65s': 14, '75s': 14, 'J5s': 13, 'Q4s': 13, 'T4s': 13,
  '54s': 13, '96s': 12, 'J4s': 12, 'T8o': 12, '87o': 12, '85s': 12, 'Q3s': 11,
  '95s': 11, 'J9o': 11, '64s': 11, 'T3s': 10, 'J3s': 10, 'Q2s': 10, '74s': 10,
  'T7o': 10, 'Q9o': 10, 'J8o': 10, '97o': 10, '53s': 9, '84s': 9, 'J2s': 9,
  'T2s': 9, '94s': 8, '86o': 8, '76o': 8, 'Q8o': 8, 'J7o': 8, '43s': 8,
  '93s': 7, '75o': 7, '65o': 7, 'T6o': 7, '83s': 7, '92s': 7, '73s': 7,
  'Q7o': 7, 'J6o': 7, '63s': 7, '82s': 6, '54o': 6, '52s': 6, '72s': 5,
  '85o': 5, 'T5o': 5, 'Q6o': 5, 'J5o': 5, '64o': 5, 'T4o': 5, '84o': 5,
  '96o': 5, '95o': 5, '74o': 5, 'T3o': 4, 'J4o': 4, '94o': 4, '53o': 4,
  'Q5o': 4, 'J3o': 4, '93o': 4, '83o': 4, '73o': 4, '63o': 4, '43o': 4,
  'T2o': 3, 'J2o': 3, '92o': 3, '82o': 3, '52o': 3, '62o': 2, '72o': 1,
  '42o': 2, '32o': 2, 'Q4o': 3, 'Q2o': 3, 'K2o': 3, 'K3o': 3, 'K4o': 3,
}

function handStrengthScore(comboKey: ComboKey): number {
  return HAND_STRENGTH_SCORES[comboKey] ?? 10
}

// ─── Hand Evaluator (simplified for showdown) ──────────────

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
}

type HandRankType = 'high_card' | 'pair' | 'two_pair' | 'trips' | 'straight' | 'flush' | 'full_house' | 'quads' | 'straight_flush'

function evaluateHand(holeCards: CardString[], board: CardString[]): { rank: HandRankType; score: number; desc: string } {
  const allCards = [...holeCards, ...board]
  const ranks = allCards.map(c => RANK_VALUES[c[0]] || 0).sort((a, b) => b - a)
  const suits = allCards.map(c => c[1])

  // Count rank frequencies
  const freq: Record<number, number> = {}
  ranks.forEach(r => { freq[r] = (freq[r] || 0) + 1 })
  const groups = Object.entries(freq).map(([r, c]) => ({ rank: +r, count: c })).sort((a, b) => b.count - a.count || b.rank - a.rank)

  // Flush check
  const suitCounts: Record<string, number> = {}
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1 })
  const flushSuit = Object.entries(suitCounts).find(([, c]) => c >= 5)?.[0]
  const flushCards = flushSuit ? allCards.filter(c => c[1] === flushSuit).map(c => RANK_VALUES[c[0]] || 0).sort((a, b) => b - a) : null

  // Straight check
  function findStraight(rks: number[]): number[] | null {
    const unique = [...new Set(rks)].sort((a, b) => b - a)
    // Wheel: A-2-3-4-5
    if (unique.includes(14)) unique.push(1)
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) return unique.slice(i, i + 5)
    }
    return null
  }

  const straight = findStraight(ranks)
  const flushStraight = flushCards ? findStraight(flushCards) : null

  // Score calculation
  let score = 0
  let rank: HandRankType = 'high_card'
  let desc = ''

  if (flushStraight) {
    const isRoyal = flushStraight[0] === 14
    rank = 'straight_flush'
    score = 9_00_00_00_00 + flushStraight[0]
    desc = isRoyal ? 'Royal Flush' : `${flushStraight[0]} high Straight Flush`
  } else if (groups[0].count === 4) {
    rank = 'quads'
    score = 8_00_00_00_00 + groups[0].rank * 10000 + (groups[1]?.rank || 0)
    desc = `Quads of ${groups[0].rank}`
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    rank = 'full_house'
    score = 7_00_00_00_00 + groups[0].rank * 10000 + groups[1].rank
    desc = `Full House`
  } else if (flushCards) {
    rank = 'flush'
    score = 6_00_00_00_00 + flushCards.slice(0, 5).reduce((s, r, i) => s + r * 100 ** (4 - i), 0) / 10000
    desc = 'Flush'
  } else if (straight) {
    rank = 'straight'
    score = 5_00_00_00_00 + straight[0]
    desc = `${straight[0]} high Straight`
  } else if (groups[0].count === 3) {
    rank = 'trips'
    score = 4_00_00_00_00 + groups[0].rank * 10000 + groups[1].rank * 100 + (groups[2]?.rank || 0)
    desc = `Three of a Kind`
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    rank = 'two_pair'
    score = 3_00_00_00_00 + groups[0].rank * 10000 + groups[1].rank * 100 + (groups[2]?.rank || 0)
    desc = 'Two Pair'
  } else if (groups[0].count === 2) {
    rank = 'pair'
    score = 2_00_00_00_00 + groups[0].rank * 10000 + ranks.filter(r => r !== groups[0].rank).slice(0, 3).reduce((s, r, i) => s + r * 100 ** (2 - i), 0) / 100
    desc = `Pair of ${groups[0].rank}`
  } else {
    rank = 'high_card'
    score = 1_00_00_00_00 + ranks.slice(0, 5).reduce((s, r, i) => s + r * 100 ** (4 - i), 0) / 10000
    desc = `${ranks[0]} High`
  }

  return { rank, score: Math.round(score), desc }
}

/** Returns 1 if hero wins, -1 if villain wins, 0 if tie */
function compareHands(heroHole: CardString[], villainHole: CardString[], board: CardString[]): number {
  const hero = evaluateHand(heroHole, board)
  const villain = evaluateHand(villainHole, board)
  if (hero.score > villain.score) return 1
  if (hero.score < villain.score) return -1
  return 0
}

// ─── Helpers ───────────────────────────────────────────────

const RANK_ORDER = '23456789TJQKA'

function cardsToComboKey(cards: CardString[]): ComboKey {
  const [c1, c2] = cards
  const rank1 = c1[0], rank2 = c2[0]
  const high = RANK_ORDER.indexOf(rank1) >= RANK_ORDER.indexOf(rank2) ? rank1 : rank2
  const low = high === rank1 ? rank2 : rank1
  if (high === low) return `${high}${low}` as ComboKey
  const suited = c1[1] === c2[1]
  return `${high}${low}${suited ? 's' : 'o'}` as ComboKey
}

function shuffle(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Game Engine ───────────────────────────────────────────

export function createGame(heroPos: Position, villainPos: Position, stackDepth: number): GameState {
  const deck = shuffle(generateDeck())
  const heroCards = [deck.pop()!, deck.pop()!]
  const villainCards = [deck.pop()!, deck.pop()!]

  const heroIsBtn = heroPos === 3
  const villainIsBtn = villainPos === 3

  const SB_AMOUNT = 0.5
  const BB_AMOUNT = 1.0

  const heroIsSB = heroIsBtn || (!villainIsBtn && heroPos < villainPos)
  const heroBlindContribution = heroIsSB ? SB_AMOUNT : BB_AMOUNT
  const villainBlindContribution = heroIsSB ? BB_AMOUNT : SB_AMOUNT
  const totalBlinds = SB_AMOUNT + BB_AMOUNT

  return {
    handId: `sim_${Date.now() % 100000}`,
    heroPosition: heroPos, villainPosition: villainPos, stackDepth,
    board: [], pot: totalBlinds, street: 'preflop',
    currentActor: heroIsSB ? 'hero' : 'villain', // BTN/SB acts first preflop
    hero: {
      name: 'Hero', position: heroPos, stack: stackDepth - heroBlindContribution,
      holeCards: heroCards, holeCardsDisplay: heroCards,
      currentBet: heroBlindContribution, totalBet: heroBlindContribution,
      folded: false, isAllIn: false,
    },
    villain: {
      name: 'AI', position: villainPos, stack: stackDepth - villainBlindContribution,
      holeCards: villainCards, holeCardsDisplay: ['?', '?'],
      currentBet: villainBlindContribution, totalBet: villainBlindContribution,
      folded: false, isAllIn: false,
    },
    actions: [], phase: 'preflop', result: null, deck,
  }
}

export function applyAction(state: GameState, action: GameAction): GameState {
  const ns = structuredClone(state) as GameState
  const p = action.player === 'hero' ? ns.hero : ns.villain
  const o = action.player === 'hero' ? ns.villain : ns.hero

  const actionDesc = formatAction(action, ns)
  ns.lastAction = actionDesc
  ns.actions.push({ player: action.player, type: action.type, amount: action.amount || 0, street: action.street })

  const potBeforeAction = ns.pot
  const toCall = o.currentBet - p.currentBet

  switch (action.type) {
    case 'fold':
      p.folded = true; ns.phase = 'showdown'; break
    case 'check':
      p.actedThisStreet = true; break
    case 'call': {
      const cost = Math.min(toCall, p.stack)
      p.stack -= cost; p.currentBet += cost; p.totalBet += cost; ns.pot += cost
      if (p.stack === 0) p.isAllIn = true
      p.actedThisStreet = true
      break
    }
    case 'bet': {
      const size = action.amount || Math.round(potBeforeAction * 0.5 * 100) / 100
      const actual = Math.min(size, p.stack)
      p.stack -= actual; p.currentBet += actual; p.totalBet += actual; ns.pot += actual
      if (p.stack === 0) p.isAllIn = true
      p.actedThisStreet = true
      break
    }
    case 'raise': {
      const total = Math.min(action.amount || potBeforeAction, p.stack + p.currentBet)
      const added = total - p.currentBet
      p.stack -= added; p.currentBet = total; p.totalBet += added; ns.pot += added
      if (p.stack === 0) p.isAllIn = true
      p.actedThisStreet = true
      break
    }
    case 'all_in': {
      const all = p.stack
      p.currentBet += all; p.totalBet += all; ns.pot += all; p.stack = 0; p.isAllIn = true
      p.actedThisStreet = true
      break
    }
  }

  // Check game over
  if (o.folded) { ns.phase = 'showdown' }
  if (ns.phase === 'showdown') {
    ns.result = resolveHand(ns)
    ns.villain.holeCardsDisplay = ns.villain.holeCards
    return ns
  }

  // Advance street or switch actor
  const betsEqual = ns.hero.currentBet === ns.villain.currentBet
  const bothActed = ns.hero.actedThisStreet && ns.villain.actedThisStreet
  const bothAllIn = ns.hero.isAllIn && ns.villain.isAllIn

  if (betsEqual && bothActed && ns.street !== 'river') {
    const cardsNeeded = ns.street === 'preflop' ? 3 : 1
    for (let i = 0; i < cardsNeeded; i++) {
      while (ns.deck.length > 0) {
        const c = ns.deck.pop()!
        if (!ns.hero.holeCards.includes(c) && !ns.villain.holeCards.includes(c) && !ns.board.includes(c)) {
          ns.board.push(c); break
        }
      }
    }
    ns.street = ns.street === 'preflop' ? 'flop' : ns.street === 'flop' ? 'turn' : 'river'
    ns.phase = ns.street
    ns.hero.currentBet = 0; ns.villain.currentBet = 0
    ns.hero.actedThisStreet = false; ns.villain.actedThisStreet = false
    ns.currentActor = ns.hero.folded || ns.hero.isAllIn ? 'villain' : 'hero'
  } else if (betsEqual && bothActed && ns.street === 'river') {
    ns.phase = 'showdown'
    ns.result = resolveHand(ns)
    ns.villain.holeCardsDisplay = ns.villain.holeCards
  } else if (betsEqual && bothAllIn) {
    while (ns.board.length < 5) {
      while (ns.deck.length > 0) {
        const c = ns.deck.pop()!
        if (!ns.hero.holeCards.includes(c) && !ns.villain.holeCards.includes(c) && !ns.board.includes(c)) {
          ns.board.push(c); break
        }
      }
    }
    ns.phase = 'showdown'
    ns.result = resolveHand(ns)
    ns.villain.holeCardsDisplay = ns.villain.holeCards
  } else {
    ns.currentActor = action.player === 'hero' ? 'villain' : 'hero'
  }

  if (ns.phase === 'showdown' && !ns.result) {
    ns.result = resolveHand(ns)
    ns.villain.holeCardsDisplay = ns.villain.holeCards
  }

  return ns
}

/** AI decision using GTO-inspired logic + board texture */
export function getAIDecision(state: GameState): GameAction {
  const v = state.villain
  const h = state.hero
  const pot = state.pot
  const toCall = h.currentBet - v.currentBet
  const comboKey = cardsToComboKey(v.holeCards)
  const strength = handStrengthScore(comboKey)
  const r = Math.random()

  if (state.street === 'preflop') {
    if (toCall === 0) {
      if (strength >= 60) return { player: 'villain', type: 'bet', amount: Math.round(pot * 0.5 * 100) / 100, sizing: '50%', street: 'preflop' }
      if (strength >= 40) return { player: 'villain', type: 'bet', amount: Math.round(pot * 0.3 * 100) / 100, sizing: '33%', street: 'preflop' }
      return { player: 'villain', type: 'check', amount: 0, street: 'preflop' }
    }
    if (toCall <= 2.5) {
      if (strength >= 75 && r < 0.3) return { player: 'villain', type: 'raise', amount: Math.round(pot * 0.8 * 100) / 100, sizing: '75%', street: 'preflop' }
      if (strength >= 30) return { player: 'villain', type: 'call', amount: toCall, street: 'preflop' }
      return { player: 'villain', type: 'fold', amount: 0, street: 'preflop' }
    }
    if (strength >= 85) return { player: 'villain', type: 'raise', amount: Math.round(pot * 1.0 * 100) / 100, street: 'preflop' }
    if (strength >= 70) return { player: 'villain', type: 'call', amount: toCall, street: 'preflop' }
    return { player: 'villain', type: 'fold', amount: 0, street: 'preflop' }
  }

  // Postflop decisions
  if (state.board.length >= 3) {
    const texture = analyzeBoard(state.board)
    const isWet = texture.connectivity === 'connected' || texture.connectivity === 'highly-connected'

    if (toCall === 0) {
      if (strength >= 65) {
        const sizing = isWet ? 0.75 : 0.50
        return { player: 'villain', type: 'bet', amount: Math.round(pot * sizing * 100) / 100, sizing: `${Math.round(sizing * 100)}%`, street: state.street }
      }
      if (strength >= 40 && r < 0.35) {
        return { player: 'villain', type: 'bet', amount: Math.round(pot * 0.33 * 100) / 100, sizing: '33%', street: state.street }
      }
      return { player: 'villain', type: 'check', amount: 0, street: state.street }
    }

    const potOdds = toCall / (pot + toCall)
    if (strength >= 60) {
      if (r < 0.25) return { player: 'villain', type: 'raise', amount: Math.round(pot * 0.75 * 100) / 100, street: state.street }
      return { player: 'villain', type: 'call', amount: toCall, street: state.street }
    }
    if (strength >= 35 && potOdds < 0.35) {
      return { player: 'villain', type: 'call', amount: toCall, street: state.street }
    }
    return { player: 'villain', type: 'fold', amount: 0, street: state.street }
  }

  return { player: 'villain', type: 'check', amount: 0, street: state.street }
}

function resolveHand(state: GameState): HandResult {
  const h = state.hero; const v = state.villain
  if (h.folded) return { winner: 'villain', heroNetWon: -h.totalBet, villainNetWon: state.pot - v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: false, winReason: 'Hero 弃牌' }
  if (v.folded) return { winner: 'hero', heroNetWon: state.pot - h.totalBet, villainNetWon: -v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: false, winReason: 'AI 弃牌' }

  const result = compareHands(h.holeCards, v.holeCards, state.board)
  if (result === 0) return { winner: 'tie', heroNetWon: state.pot / 2 - h.totalBet, villainNetWon: state.pot / 2 - v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: true, winReason: '平局 — 相同牌力' }

  return result === 1
    ? { winner: 'hero', heroNetWon: state.pot - h.totalBet, villainNetWon: -v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: true, winReason: '最佳牌获胜' }
    : { winner: 'villain', heroNetWon: -h.totalBet, villainNetWon: state.pot - v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: true, winReason: 'AI 牌更大' }
}

function formatAction(action: GameAction, state: GameState): string {
  const name = action.player === 'hero' ? 'Hero' : 'AI'
  const streetNames: Record<string, string> = { preflop: '翻前', flop: '翻牌', turn: '转牌', river: '河牌' }
  switch (action.type) {
    case 'fold': return `${name} 弃牌`
    case 'check': return `${name} 过牌`
    case 'call': return `${name} 跟注 $${action.amount.toFixed(1)}`
    case 'bet': return `${name} 下注 $${action.amount.toFixed(1)}`
    case 'raise': return `${name} 加注到 $${action.amount.toFixed(1)}`
    case 'all_in': return `${name} 全下！`
    default: return `${name} ${action.type}`
  }
}

/** Check if hero can take this action given current state */
export function canAct(state: GameState, type: GameAction['type']): boolean {
  const h = state.hero
  const v = state.villain
  if (state.currentActor !== 'hero') return false
  if (state.phase === 'showdown') return false
  if (h.folded || h.isAllIn) return false

  const toCall = v.currentBet - h.currentBet

  switch (type) {
    case 'fold': return true
    case 'check': return toCall === 0
    case 'call': return toCall > 0
    case 'bet': return toCall === 0 && h.stack > 0
    case 'raise': return h.stack > 0
    case 'all_in': return h.stack > 0
    default: return false
  }
}

/** Get available actions for the current actor */
export function getAvailableActions(state: GameState): { type: GameAction['type']; label: string; amount?: number; disabled?: boolean }[] {
  if (state.currentActor !== 'hero' || state.phase === 'showdown') return []

  const h = state.hero
  const v = state.villain
  const toCall = v.currentBet - h.currentBet
  const pot = state.pot

  const actions: { type: GameAction['type']; label: string; amount?: number; disabled?: boolean }[] = []

  actions.push({
    type: 'fold', label: toCall > 0 ? '弃牌' : '弃牌',
    disabled: toCall === 0,
  })

  if (toCall === 0) {
    actions.push({ type: 'check', label: '过牌' })
  } else {
    actions.push({ type: 'call', label: `跟注 $${toCall.toFixed(1)}`, amount: toCall })
  }

  if (h.stack > 0 && toCall === 0) {
    for (const size of [0.33, 0.5, 0.75, 1.0]) {
      const amt = Math.round(pot * size * 100) / 100
      if (amt > 0 && amt <= h.stack) {
        actions.push({ type: 'bet', label: `下注 ${Math.round(size * 100)}%`, amount: amt })
      }
    }
  }

  if (h.stack > toCall && toCall > 0) {
    for (const size of [0.5, 0.75, 1.0]) {
      const amt = Math.round((v.currentBet + pot * size) * 100) / 100
      if (amt > v.currentBet && amt <= h.stack + h.currentBet) {
        actions.push({ type: 'raise', label: `加注 ${Math.round(size * 100)}%`, amount: amt })
      }
    }
  }

  if (h.stack > 0) {
    actions.push({ type: 'all_in', label: 'All-in' })
  }

  return actions
}
