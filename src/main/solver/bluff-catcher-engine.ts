/**
 * River Bluff Catcher Engine
 *
 * Generates and evaluates river bluff-catching scenarios for the training module.
 * Models GTO river decision-making with MDF (Minimum Defense Frequency),
 * blocker effects, and combo-level reasoning.
 */

import type { CardString, ComboKey } from '../../shared/types/poker'
import { evaluateHand, compareHands } from './hand-evaluator'
import { analyzeRiver } from './turn-river-engine'

/** Expand a ComboKey into two individual card strings */
function expandCombo(combo: ComboKey): CardString[] {
  const ranks = combo.slice(0, 2).split('')
  if (ranks.length !== 2) {
    // Single-character ranks like 'AKo' → ['A', 'K']
    const r1 = combo[0]
    const r2 = combo[1]
    const off = combo.length === 3 ? combo[2] : 'o'
    // For suited, pick spades; for offsuit, use different suits
    if (off === 's') {
      return [`${r1}s`, `${r2}s`] as CardString[]
    } else if (r1 === r2) {
      // Pairs: use different suits
      return [`${r1}h`, `${r2}d`] as CardString[]
    } else {
      // Offsuit: use different suits
      return [`${r1}h`, `${r2}c`] as CardString[]
    }
  }
  return combo as unknown as CardString[]
}

// ============================================================
// Types
// ============================================================

export interface BluffCatchScenario {
  id: string
  /** Hole cards for hero */
  heroHand: ComboKey
  /** Full board (5 cards: flop + turn + river) */
  board: CardString[]
  /** Position index (0=UTG, 3=BTN, 5=BB) */
  heroPosition: number
  /** Villain position */
  villainPosition: number
  /** Effective stack in BB */
  effectiveStack: number
  /** Pot size before river action */
  potSize: number
  /** Villain's river bet size (in BB) */
  betSize: number
  /** As fraction of pot: 0.33 | 0.50 | 0.66 | 0.75 | 1.0 | 1.5 */
  betSizing: number
  /** River action description */
  description: string
  /** The street */
  street: 'river'

  // Solution data
  solution: BluffCatchSolution
}

export interface BluffCatchSolution {
  /** Correct action */
  correctAction: 'call' | 'fold'
  /** MDF given bet sizing */
  mdf: number
  /** Hero's hand absolute strength (rank) */
  handStrength: string
  /** Whether hero blocks villain's value range */
  blockersValue: string[]
  /** Whether hero blocks villain's bluff range */
  blockersBluff: string[]
  /** Board textures that matter */
  boardTexture: string
  /** Completed draws on river */
  completedDraws: string[]
  /** Explanation */
  explanation: string
  /** EV of calling (approximate in BB) */
  evCall: number
  /** BB call price / required equity */
  requiredEquity: number
  /** Whether this is a pure call, pure fold, or mixed */
  decisionType: 'pure_call' | 'pure_fold' | 'mixed'
  /** For mixed decisions, the GTO call frequency */
  mixedFreq?: number
}

export interface GeneratedScenario {
  scenario: BluffCatchScenario
  options: {
    label: string
    action: 'call' | 'fold'
    isCorrect: boolean
  }[]
}

// ============================================================
// Board pool — curated river boards with diverse textures
// ============================================================

interface BoardTemplate {
  board: CardString[]
  riverCard: CardString
  label: string
  texture: string
  completedDraws: string[]
}

const RIVER_BOARDS: BoardTemplate[] = [
  // A-high dry — missed draws, good for bluff catching
  { board: ['As', '7d', '2c', 'Th', '3s'], riverCard: '3s', label: 'A-high dry rainbow', texture: 'rainbow', completedDraws: [] },
  { board: ['Ah', '9d', '3c', '2s', '5h'], riverCard: '5h', label: 'A-high brick river', texture: 'rainbow', completedDraws: [] },
  { board: ['Ad', '8s', '4c', 'Jh', '2d'], riverCard: '2d', label: 'A-high brick river', texture: 'rainbow', completedDraws: [] },

  // K-high — missed draws
  { board: ['Ks', '7h', '2d', '9c', '4s'], riverCard: '4s', label: 'K-high dry', texture: 'rainbow', completedDraws: [] },
  { board: ['Kh', 'Td', '5c', '3s', '8h'], riverCard: '8h', label: 'K-high brick', texture: 'rainbow', completedDraws: [] },

  // Paired board — missed draws, but boats possible
  { board: ['Qs', 'Qd', '7c', '4h', '2s'], riverCard: '2s', label: 'Q-high paired dry', texture: 'paired_dry', completedDraws: [] },
  { board: ['Jh', 'Jc', '5d', '9s', '3h'], riverCard: '3h', label: 'J-high paired dry', texture: 'paired_dry', completedDraws: [] },
  { board: ['8s', '8d', '4c', 'Kh', '2c'], riverCard: '2c', label: 'mid paired brick', texture: 'paired_dry', completedDraws: [] },

  // Flush completed — villain reps flush, hero needs to decide
  { board: ['Kh', 'Th', '7h', '4c', '2h'], riverCard: '2h', label: 'FD completes (river)', texture: 'flush_completed', completedDraws: ['前门同花'] },
  { board: ['As', '9s', '3c', '8s', 'Qs'], riverCard: 'Qs', label: 'FD completes (river)', texture: 'flush_completed', completedDraws: ['后门同花'] },
  { board: ['Jd', '8d', '4h', '2d', 'Ad'], riverCard: 'Ad', label: 'FD completes (river)', texture: 'flush_completed', completedDraws: ['前门同花'] },

  // Straight completed — villain reps straight
  { board: ['Jh', 'Td', '9s', '4c', '8h'], riverCard: '8h', label: 'Straight completes (OESD)', texture: 'straight_completed', completedDraws: ['顺子'] },
  { board: ['Qd', 'Jc', '8h', '5s', '9d'], riverCard: '9d', label: 'Straight completes', texture: 'straight_completed', completedDraws: ['顺子'] },
  { board: ['7s', '6d', '4h', 'Kc', '5s'], riverCard: '5s', label: 'Straight completes', texture: 'straight_completed', completedDraws: ['顺子'] },

  // Wet flop, river bricks — classic bluff catcher spot
  { board: ['Jh', 'Ts', '7h', '4c', '2s'], riverCard: '2s', label: 'Wet flop, river bricks', texture: 'brick_after_wet', completedDraws: [] },
  { board: ['Qs', '9d', '6h', '2c', '3s'], riverCard: '3s', label: 'Wet flop, river bricks', texture: 'brick_after_wet', completedDraws: [] },
  { board: ['Kh', 'Jd', '8h', '2c', '5s'], riverCard: '5s', label: 'Medium wet, brick river', texture: 'brick_after_wet', completedDraws: [] },
]

// ============================================================
// Hand pools for hero
// ============================================================

/** Bluff catchers — hands that beat bluffs but lose to value */
const BLUFF_CATCHER_POOL: ComboKey[] = [
  'AKo', 'AKs', 'AQo', 'AQs', 'AJo', 'AJs', 'ATs',
  'KQo', 'KQs', 'KJs', 'KTs',
  'QJo', 'QJs', 'QTs',
  'JTs', 'J9s', 'T9s',
  '99', '88', '77', '66', '55', '44',
  'A5s', 'A4s', 'A3s', 'A2s',
  'K9s', 'K8s', 'Q9s', 'J8s',
]

/** Premium hands that should clearly call */
const VALUE_CALL_POOL: ComboKey[] = [
  'AA', 'KK', 'QQ', 'JJ', 'TT',
  'AKs', 'AQs', 'KQs',
]

/** Trash hands that should clearly fold */
const TRASH_POOL: ComboKey[] = [
  '72o', '83o', '94o', 'T2o', 'J3o',
  '62o', '73o', '32o',
]

// ============================================================
// Blocker analysis
// ============================================================

/**
 * Analyze whether hero's hand blocks villain's value range.
 * Returns list of value hands blocked.
 */
function analyzeBlockers(
  heroHand: ComboKey,
  board: CardString[],
  villainValueRange: string[]
): { blocksValue: string[]; blocksBluff: string[] } {
  const blocksValue: string[] = []
  const blocksBluff: string[] = []

  // Extract hero's ranks and suits
  const heroRank1 = heroHand[0]
  const heroRank2 = heroHand[1]
  const heroSuited = heroHand.length === 3 && heroHand[2] === 's'

  // Simple heuristic: block broadway cards (value range) vs block low cards (bluff range)
  const broadway = ['A', 'K', 'Q', 'J', 'T']
  const boardSuits = board.map(c => c[1])

  // Hero holds broadway cards → blocks value
  if (broadway.includes(heroRank1)) blocksValue.push(heroRank1)
  if (broadway.includes(heroRank2) && heroRank2 !== heroRank1) blocksValue.push(heroRank2)

  // Block flush draws
  if (heroSuited) {
    const suit = heroHand[2] === 's' ? heroHand[1] : heroHand[2]
    // suited hand shares suit with flush draw board → blocks bluffs
    const flushSuit = boardSuits.find(s => boardSuits.filter(x => x === s).length >= 2)
    if (flushSuit && suit === flushSuit) {
      blocksBluff.push(`${suit}-blocker`)
    }
  }

  // Hero holds low cards → blocks some bluff combos
  const lowCards = ['2', '3', '4', '5', '6', '7']
  if (lowCards.includes(heroRank1)) blocksBluff.push(heroRank1)
  if (lowCards.includes(heroRank2) && heroRank2 !== heroRank1) blocksBluff.push(heroRank2)

  return { blocksValue, blocksBluff }
}

// ============================================================
// Scenario generator
// ============================================================

/**
 * Determine correct river decision for a given scenario.
 * Uses GTO heuristics: MDF, blocker effects, hand strength, board texture.
 */
function evaluateScenario(
  heroHand: ComboKey,
  board: CardString[],
  betSizeBB: number,
  potSize: number,
  heroPos: number,
  villainPos: number
): BluffCatchSolution {
  const riverAnalysis = analyzeRiver(board.slice(0, 4), board[4])

  // Calculate MDF: 1 / (1 + bet_size_as_pot_fraction)
  const betAsFraction = betSizeBB / (potSize || 1)
  const mdf = Math.min(1, Math.max(0.1, 1 / (1 + betAsFraction)))

  // Hand strength evaluation
  const heroCards = expandCombo(heroHand)
  const heroEval = evaluateHand([...heroCards, ...board])
  const handStr = heroEval.description

  // Simplify: is hero's hand top pair or better? Two pair? Just a bluff catcher?
  const isStrong = ['straight_flush', 'royal_flush', 'quads', 'full_house', 'flush', 'straight', 'trips', 'two_pair'].includes(heroEval.rank)
  const isTopPair = heroEval.rank === 'pair' && highCardInHand(heroHand, board)
  const isMidPair = heroEval.rank === 'pair' && !highCardInHand(heroHand, board)
  const isBluffCatcher = heroEval.rank === 'pair' && !isTopPair || heroEval.rank === 'high_card'

  // Blocker analysis
  const { blocksValue, blocksBluff } = analyzeBlockers(heroHand, board, [])

  // Bet sizing categorization
  const sizingLabel = betAsFraction <= 0.4 ? 'small' : betAsFraction <= 0.7 ? 'medium' : betAsFraction <= 1.0 ? 'large' : 'overbet'

  // Decision logic
  let correctAction: 'call' | 'fold' = 'fold'
  let decisionType: 'pure_call' | 'pure_fold' | 'mixed' = 'pure_fold'
  let explanation = ''
  let evCall = -(betSizeBB)
  let mixedFreq: number | undefined

  if (isStrong || isTopPair) {
    // Strong hands → easy call
    correctAction = 'call'
    decisionType = 'pure_call'
    evCall = potSize * 0.5
    explanation = `持有${handStr}，这是一手纯粹的value call。你的牌力超出bluff catcher范围。`
  } else if (isBluffCatcher) {
    // True bluff catcher territory
    const hasGoodBlockers = blocksValue.length > 0
    const hasBadBlockers = blocksBluff.length > 0 && blocksValue.length === 0

    if (betAsFraction <= 0.5) {
      // Small sizing → wider defense, many bluff catchers should call
      if (hasGoodBlockers) {
        correctAction = 'call'
        decisionType = 'pure_call'
        evCall = (potSize * 0.15) - (betSizeBB * 0.1)
        explanation = `小尺度下注(33-50% pot) + 阻断了对手价值牌(${blocksValue.join(',')}) → 必须防守。你的手牌在MDF要求之内。`
      } else {
        correctAction = 'call'
        decisionType = 'mixed'
        mixedFreq = 0.6
        evCall = -betSizeBB * 0.2
        explanation = `小尺度下注要求高频防守(MDF=${(mdf*100).toFixed(0)}%)。即使没有好阻断牌，你的手牌也应该以一定频率call。`
      }
    } else if (betAsFraction <= 0.75) {
      // Medium sizing → selective defense
      if (hasGoodBlockers && !hasBadBlockers) {
        correctAction = 'call'
        decisionType = 'pure_call'
        evCall = 0
        explanation = `中等尺度(66-75% pot) + 好阻断牌(${blocksValue.join(',')}) → call。你block了对手的价值组合。`
      } else if (hasBadBlockers && !hasGoodBlockers) {
        correctAction = 'fold'
        decisionType = 'pure_fold'
        evCall = -(betSizeBB * 0.8)
        explanation = `中等尺度 + 坏阻断牌(${blocksBluff.join(',')}) → fold。你block了对手的bluff范围，降低了bluff概率。`
      } else if (riverAnalysis.completedDraws.length > 0) {
        correctAction = 'fold'
        decisionType = 'pure_fold'
        evCall = -(betSizeBB * 0.7)
        explanation = `听牌已完成(${riverAnalysis.completedDraws.join(',')})，对手的bluff频率低于正常水平。Fold是更安全的选择。`
      } else {
        correctAction = 'call'
        decisionType = 'mixed'
        mixedFreq = 0.5
        evCall = -betSizeBB * 0.15
        explanation = `中等尺度，no clear blocker signal → GTO混合策略。约50% call。`
      }
    } else {
      // Large sizing / overbet → narrow defense
      const reqEquity = betAsFraction / (1 + 2 * betAsFraction)
      if (hasGoodBlockers && !hasBadBlockers) {
        correctAction = 'call'
        decisionType = 'mixed'
        mixedFreq = 0.35
        evCall = -betSizeBB * 0.3
        explanation = `大尺度(>75% pot) + 好阻断牌 → 低频call。即使有blocker，面对overbet也只有顶尖范围应该防守。`
      } else {
        correctAction = 'fold'
        decisionType = 'pure_fold'
        evCall = -(betSizeBB * 0.9)
        explanation = `大尺度overbet → 你的手牌不属于顶尖防守范围。Fold。${hasBadBlockers ? `(你block了bluff范围: ${blocksBluff.join(',')})` : ''}`
      }
    }
  } else {
    // Just air / no pair → fold
    correctAction = 'fold'
    decisionType = 'pure_fold'
    evCall = -betSizeBB
    explanation = `没有对子，纯空气。即使对手在bluff，你也赢不了很多bluff组合。果断fold。`
  }

  // Correct: if we say fold is correct but MDF is very high and we have some showdown value → reconsider
  // But for training purposes, stick with the heuristic above — it's directionally correct

  return {
    correctAction,
    mdf: Math.round(mdf * 100) / 100,
    handStrength: handStr,
    blockersValue: blocksValue,
    blockersBluff: blocksBluff,
    boardTexture: riverAnalysis.completedDraws.length > 0 ? 'draw_completed' : 'draw_missed',
    completedDraws: riverAnalysis.completedDraws,
    explanation,
    evCall: Math.round(evCall * 100) / 100,
    requiredEquity: Math.round((betSizeBB / (potSize + 2 * betSizeBB)) * 100),
    decisionType,
    mixedFreq,
  }
}

/** Check if hero's hand contains the board's top pair */
function highCardInHand(hand: string, board: string[]): boolean {
  const rankMap: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const boardRanks = board.map(c => rankMap[c[0]] || 0)
  const topBoardRank = Math.max(...boardRanks)
  const handRank1 = rankMap[hand[0]] || 0
  const handRank2 = rankMap[hand[1]] || 0
  return handRank1 === topBoardRank || handRank2 === topBoardRank
}

// ============================================================
// Public API: generate a set of scenarios
// ============================================================

export function generateBluffCatchScenarios(
  count: number,
  options?: {
    includePaired?: boolean
    includeFlushBoards?: boolean
    includeStraightBoards?: boolean
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  }
): GeneratedScenario[] {
  const scenarios: GeneratedScenario[] = []
  const usedCombos = new Set<string>()
  const idxBump = Math.floor(42 / count)

  for (let i = 0; i < Math.min(count, 42); i++) {
    const boardIndex = (i * idxBump + i * 7) % RIVER_BOARDS.length
    const tmpl = RIVER_BOARDS[boardIndex]

    // Skip boards based on options
    if (options?.includeFlushBoards === false && tmpl.completedDraws.includes('前门同花')) continue
    if (options?.includeStraightBoards === false && tmpl.completedDraws.includes('顺子')) continue
    if (options?.includePaired === false && tmpl.texture.includes('paired')) continue

    // Pick hero hand
    let heroHand: ComboKey
    let attempts = 0

    // Distribute: ~40% clear calls, ~40% clear folds, ~20% true bluffcatchers (mixed)
    const roll = (i * 17) % 10
    if (roll < 3) {
      heroHand = VALUE_CALL_POOL[i % VALUE_CALL_POOL.length]
    } else if (roll < 7) {
      heroHand = BLUFF_CATCHER_POOL[(i * 3) % BLUFF_CATCHER_POOL.length]
    } else {
      heroHand = TRASH_POOL[i % TRASH_POOL.length]
    }

    // Avoid duplicates
    const comboKey = `${tmpl.board.join('')}_${heroHand}`
    if (usedCombos.has(comboKey)) {
      heroHand = BLUFF_CATCHER_POOL[(i * 7 + 3) % BLUFF_CATCHER_POOL.length]
      const comboKey2 = `${tmpl.board.join('')}_${heroHand}`
      if (usedCombos.has(comboKey2)) continue
      usedCombos.add(comboKey2)
    } else {
      usedCombos.add(comboKey)
    }

    const heroPos = 3 // BTN
    const villainPos = 5 // BB
    const potSize = 16 // typical river pot
    const sizings = [
      { bb: 5.5, frac: 0.33, label: '1/3 pot' },
      { bb: 8, frac: 0.5, label: '1/2 pot' },
      { bb: 11, frac: 0.66, label: '2/3 pot' },
      { bb: 12, frac: 0.75, label: '3/4 pot' },
      { bb: 16, frac: 1.0, label: 'pot' },
      { bb: 24, frac: 1.5, label: '1.5x pot' },
    ]
    const sizingIdx = (i * 5 + 3) % sizings.length
    const sizing = sizings[sizingIdx]

    const sol = evaluateScenario(heroHand, tmpl.board, sizing.bb, potSize, heroPos, villainPos)

    const boardDisplay = tmpl.board.map(c => {
      const suit = c[c.length - 1]
      const suitSymbol: Record<string, string> = { s: '♤', h: '♥', d: '♦', c: '♧' }
      return c[0] + (suitSymbol[suit] || suit)
    }).join(' ')

    const desc = `BTN vs BB, ${boardDisplay}。\nVillain bets ${sizing.label} (${sizing.bb}BB into ${potSize}BB)。\n你持 ${heroHand.toUpperCase()}，call 还是 fold？`

    scenarios.push({
      scenario: {
        id: `bc_${i}`,
        heroHand,
        board: tmpl.board,
        heroPosition: heroPos,
        villainPosition: villainPos,
        effectiveStack: 100,
        potSize,
        betSize: sizing.bb,
        betSizing: sizing.frac,
        description: desc,
        street: 'river',
        solution: sol,
      },
      options: [
        { label: 'Call', action: 'call', isCorrect: sol.correctAction === 'call' },
        { label: 'Fold', action: 'fold', isCorrect: sol.correctAction === 'fold' },
      ],
    })
  }

  return scenarios
}

/**
 * Quick single scenario generation for the training flow.
 * Returns a generated scenario ready for quiz display.
 */
export function generateSingleBluffCatchScenario(seed?: number): GeneratedScenario {
  const s = seed ?? Math.floor(Math.random() * 10000)
  return generateBluffCatchScenarios(1)[0] || generateBluffCatchScenarios(1)[0] // fallback
}
