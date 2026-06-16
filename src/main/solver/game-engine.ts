/**
 * Live Poker Simulator — Game Engine v2
 * Proper deck management, street advancement, poker hand evaluation.
 */
import type { CardString, ComboKey, Position } from '../../shared/types/poker'
import { generateDeck } from '../../shared/utils/poker-math'
import { handStrengthScore } from './equity-calculator'
import { analyzeBoard } from '../../shared/utils/poker-math'
import { compareHands } from './hand-evaluator'

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

function shuffle(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function createGame(heroPos: Position, villainPos: Position, stackDepth: number): GameState {
  const deck = shuffle(generateDeck())
  const heroCards = [deck.pop()!, deck.pop()!]
  const villainCards = [deck.pop()!, deck.pop()!]

  // In heads-up format: BTN = SB (posts 0.5bb), BB posts 1bb
  // In multi-way contexts, we still post blinds even if the blind players aren't in the hand
  // For simplicity: the lower position between the two players posts the SB-equivalent
  const heroIsBtn = heroPos === 3
  const villainIsBtn = villainPos === 3

  // Determine who acts as SB and BB in this HU pot
  // HU rule: dealer/BTN is SB, other is BB. If neither is BTN, use lower position as "earlier"
  let sb = 0, bb = 0
  if (heroIsBtn) {
    sb = 0.5  // hero is BTN = SB in HU
    bb = 0    // villain posts BB
  } else if (villainIsBtn) {
    sb = 0    // hero posts nothing
    bb = 1    // villain is BTN = SB, hero is BB
  } else {
    // Neither is BTN — use relative position: lower index = earlier = posts more
    if (heroPos < villainPos) {
      bb = 1   // hero in earlier position posts BB
      sb = 0
    } else {
      sb = 0.5
    }
  }

  // Hero's blind contribution
  const heroBlindContribution = heroIsBtn ? sb : (heroPos < villainPos && !villainIsBtn ? bb : 0)
  // Villain's blind contribution
  const villainBlindContribution = villainIsBtn ? sb : (!heroIsBtn && villainPos < heroPos ? bb : 0)
  // If neither is BTN and villain is later position, hero pays more
  const totalBlinds = sb + bb

  return {
    handId: `sim_${Date.now() % 100000}`,
    heroPosition: heroPos, villainPosition: villainPos, stackDepth,
    board: [], pot: totalBlinds, street: 'preflop',
    currentActor: heroIsBtn ? 'hero' : 'villain', // BTN/SB acts first preflop
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

  ns.actions.push({ player: action.player, type: action.type, amount: action.amount || 0, street: action.street })

  const potBeforeAction = ns.pot + ns.hero.currentBet + ns.villain.currentBet
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
    ns.villain.holeCardsDisplay = ns.villain.holeCards // reveal AI cards
    return ns
  }

  // Advance street or switch actor
  const betsEqual = ns.hero.currentBet === ns.villain.currentBet
  const bothActed = ns.hero.actedThisStreet && ns.villain.actedThisStreet
  const bothAllIn = ns.hero.isAllIn && ns.villain.isAllIn

  if (betsEqual && bothActed && ns.street !== 'river') {
    // Advance street
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
    ns.hero.currentBet = 0; ns.villain.currentBet = 0
    ns.hero.actedThisStreet = false; ns.villain.actedThisStreet = false
    ns.currentActor = 'hero' // Hero acts first postflop
  } else if (betsEqual && bothActed && ns.street === 'river') {
    ns.phase = 'showdown'
    ns.result = resolveHand(ns)
    ns.villain.holeCardsDisplay = ns.villain.holeCards
  } else if (betsEqual && bothAllIn) {
    // Run out the board
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
    // Switch actor
    ns.currentActor = action.player === 'hero' ? 'villain' : 'hero'
    // Reset acted flags on new street first action
    if (!betsEqual) {
      // Someone still needs to act
    }
  }

  if (ns.phase === 'showdown' && !ns.result) {
    ns.result = resolveHand(ns)
    ns.villain.holeCardsDisplay = ns.villain.holeCards
  }

  return ns
}

/** AI decision using GTO-inspired logic + board texture analysis */
export function getAIDecision(state: GameState): GameAction {
  const v = state.villain
  const h = state.hero
  const pot = state.pot + h.currentBet + v.currentBet
  const toCall = h.currentBet - v.currentBet
  const comboKey = (v.holeCards.join('') || 'AKo') as ComboKey
  const strength = handStrengthScore(comboKey) || 50
  const r = Math.random()

  if (state.street === 'preflop') {
    if (toCall === 0) {
      // Open or check
      if (strength >= 60) return { player: 'villain', type: 'bet', amount: Math.round(pot * 0.5 * 100) / 100, sizing: '50%', street: 'preflop' }
      if (strength >= 40) return { player: 'villain', type: 'bet', amount: Math.round(pot * 0.3 * 100) / 100, sizing: '33%', street: 'preflop' }
      return { player: 'villain', type: 'check', amount: 0, street: 'preflop' }
    }
    if (toCall <= 2.5) {
      // Facing open
      if (strength >= 75 && r < 0.3) return { player: 'villain', type: 'raise', amount: Math.round(pot * 0.8 * 100) / 100, sizing: '75%', street: 'preflop' }
      if (strength >= 30) return { player: 'villain', type: 'call', amount: toCall, street: 'preflop' }
      return { player: 'villain', type: 'fold', amount: 0, street: 'preflop' }
    }
    // Facing 3bet+
    if (strength >= 70) return { player: 'villain', type: 'call', amount: toCall, street: 'preflop' }
    if (strength >= 85) return { player: 'villain', type: 'raise', amount: Math.round(pot * 1.0 * 100) / 100, street: 'preflop' }
    return { player: 'villain', type: 'fold', amount: 0, street: 'preflop' }
  }

  // Postflop decisions
  if (state.board.length >= 3) {
    const texture = analyzeBoard(state.board)
    const isWet = texture.connectivity === 'connected' || texture.connectivity === 'highly-connected'

    if (toCall === 0) {
      // Can check or bet
      if (strength >= 65) {
        const sizing = isWet ? 0.75 : 0.50
        return { player: 'villain', type: 'bet', amount: Math.round(pot * sizing * 100) / 100, sizing: `${Math.round(sizing * 100)}%`, street: state.street }
      }
      if (strength >= 40 && r < 0.35) {
        return { player: 'villain', type: 'bet', amount: Math.round(pot * 0.33 * 100) / 100, sizing: '33%', street: state.street }
      }
      return { player: 'villain', type: 'check', amount: 0, street: state.street }
    }

    // Facing bet
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

/** Simple poker hand ranker for showdown */
function resolveHand(state: GameState): HandResult {
  const h = state.hero; const v = state.villain
  if (h.folded) return { winner: 'villain', heroNetWon: -h.totalBet, villainNetWon: state.pot - v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: false, winReason: 'Hero folded' }
  if (v.folded) return { winner: 'hero', heroNetWon: state.pot - h.totalBet, villainNetWon: -v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: false, winReason: 'AI folded' }

  // Use real poker hand evaluator
  const result = compareHands(h.holeCards, v.holeCards, state.board)
  if (result === 0) return { winner: 'tie', heroNetWon: state.pot / 2 - h.totalBet, villainNetWon: state.pot / 2 - v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: true, winReason: 'Split pot — same hand' }

  return result === 1
    ? { winner: 'hero', heroNetWon: state.pot - h.totalBet, villainNetWon: -v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: true, winReason: 'Best hand wins' }
    : { winner: 'villain', heroNetWon: -h.totalBet, villainNetWon: state.pot - v.totalBet, heroHand: h.holeCards.join(''), villainHand: v.holeCards.join(''), board: state.board, showdown: true, winReason: 'AI had better hand' }
}
