/**
 * Hand History Analyzer — GTO Wizard Style
 *
 * Analyzes each decision point against GTO mixed-strategy principles.
 * Returns frequency-based action distributions (not binary correct/wrong).
 * Modeled after GTO Wizard: each hand has a mix of actions at different frequencies.
 */

import type { CardString, Position } from '../../shared/types/poker'
import { analyzeBoard } from '../../shared/utils/poker-math'

// ============================================================
// Types
// ============================================================

export interface HandInput {
  heroHand: CardString[]
  villainHand?: CardString[]
  board: CardString[]
  heroPosition: Position
  villainPosition: Position
  stackDepth: number
  gameType: 'cash' | 'tournament'
  potSize: number
  actions: HandAction[]
}

export interface HandAction {
  street: 'preflop' | 'flop' | 'turn' | 'river'
  actor: 'hero' | 'villain'
  action: string   // "open_2.5bb", "call", "3bet_10bb", "fold", "check", "bet_33", "bet_50", "bet_75", "bet_150", "raise_3x", "all_in"
  amount?: number
}

/** A single option in a GTO mixed strategy */
export interface GTOActionOption {
  action: string       // e.g. "bet 33%", "check", "bet 75%"
  frequency: number    // 0-100 (percentage)
  ev: number          // expected value (bb)
  category: 'value' | 'bluff' | 'protection' | 'pot_control'  // why GTO takes this action
}

export interface DecisionAnalysis {
  actionIndex: number
  street: string
  actor: string
  action: string
  isGTO: boolean
  gtoAction: string
  evDifference: number    // bb lost compared to highest-EV option
  severity: 'correct' | 'minor' | 'moderate' | 'major' | 'critical'
  explanation: string
  gtoReasoning: string
  gtoDistribution: GTOActionOption[]   // GTO mixed strategy frequencies
  heroFrequency: number                // how often GTO takes your exact action (0-100)
}

export interface HandAnalysisResult {
  summary: {
    totalActions: number
    mistakes: number
    totalEVLost: number
    grade: string           // A+ through F
    biggestMistake: string
    overallAssessment: string
  }
  decisions: DecisionAnalysis[]
  streetBreakdown: Record<string, { mistakes: number; evLost: number }>
}

// ============================================================
// Analyzer
// ============================================================

export function analyzeHand(input: HandInput): HandAnalysisResult {
  const decisions: DecisionAnalysis[] = []
  // Postflop IP determination: BTN(3) always IP, otherwise higher position index acts last
  // SB(4) is always OOP vs BB(5) in heads-up pots
  const isIP = input.heroPosition === 3
    || (input.heroPosition > input.villainPosition && input.villainPosition !== 3)

  for (let i = 0; i < input.actions.length; i++) {
    const action = input.actions[i]
    if (action.actor !== 'hero') continue

    const prevActions = input.actions.slice(0, i)
    const currentBoard = getBoardAtAction(input.board, action.street)
    const analysis = analyzeDecision(action, prevActions, currentBoard, input, isIP)
    decisions.push(analysis)
  }

  // Summary
  const mistakes = decisions.filter(d => !d.isGTO)
  const totalEVLost = mistakes.reduce((s, d) => s + d.evDifference, 0)

  // Grade
  let grade: string
  if (totalEVLost < 1) grade = 'A+'
  else if (totalEVLost < 3) grade = 'A'
  else if (totalEVLost < 6) grade = 'B'
  else if (totalEVLost < 10) grade = 'C'
  else if (totalEVLost < 20) grade = 'D'
  else grade = 'F'

  // Biggest mistake
  const biggest = mistakes.sort((a, b) => b.evDifference - a.evDifference)[0]

  // Street breakdown
  const streetBD: Record<string, { mistakes: number; evLost: number }> = {}
  for (const d of decisions) {
    if (!streetBD[d.street]) streetBD[d.street] = { mistakes: 0, evLost: 0 }
    if (!d.isGTO) {
      streetBD[d.street].mistakes++
      streetBD[d.street].evLost += d.evDifference
    }
  }

  // Overall assessment
  let overall = ''
  if (totalEVLost < 2) overall = '非常接近 GTO！只有微量偏差，整体策略非常扎实。'
  else if (totalEVLost < 5) overall = '整体不错，有几个小错误需要注意。重点关注分析中指出的偏差。'
  else if (totalEVLost < 10) overall = '有中等程度的 GTO 偏差。建议重点练习分析中提到的场景。'
  else if (totalEVLost < 20) overall = '偏差较大，有几处显著 -EV 的决策。建议重新学习相关场景的 GTO 策略。'
  else overall = '策略与 GTO 差距很大，有多处严重错误。建议系统学习相关位置和牌面的标准打法。'

  return {
    summary: {
      totalActions: decisions.length,
      mistakes: mistakes.length,
      totalEVLost: Math.round(totalEVLost * 100) / 100,
      grade,
      biggestMistake: biggest ? `${biggest.street}: ${biggest.action} → 应 ${biggest.gtoAction} (-${biggest.evDifference.toFixed(1)}bb)` : '无',
      overallAssessment: overall,
    },
    decisions,
    streetBreakdown: streetBD,
  }
}

// ============================================================
// Decision analysis
// ============================================================

function getBoardAtAction(fullBoard: CardString[], street: string): CardString[] {
  const counts: Record<string, number> = { preflop: 0, flop: 3, turn: 4, river: 5 }
  return fullBoard.slice(0, counts[street] || 0)
}

function analyzeDecision(
  action: HandAction,
  prevActions: HandAction[],
  board: CardString[],
  input: HandInput,
  isIP: boolean
): DecisionAnalysis {
  const { heroHand, stackDepth } = input
  const street = action.street
  const boardAnalysis = board.length >= 3 ? analyzeBoard(board) : null

  // Determine the correct GTO action based on context
  const gtoResult = determineGTOAction(action, prevActions, board, input, isIP, boardAnalysis)

  return {
    actionIndex: prevActions.filter(a => a.actor === 'hero').length,
    street: street,
    actor: 'hero',
    action: formatAction(action),
    isGTO: gtoResult.isCorrect,
    gtoAction: gtoResult.gtoAction,
    evDifference: gtoResult.evLost,
    severity: gtoResult.evLost < 0.5 ? 'correct' : gtoResult.evLost < 2 ? 'minor' : gtoResult.evLost < 5 ? 'moderate' : gtoResult.evLost < 12 ? 'major' : 'critical',
    explanation: gtoResult.explanation,
    gtoReasoning: gtoResult.reasoning,
    gtoDistribution: gtoResult.gtoDistribution,
    heroFrequency: gtoResult.heroFrequency,
  }
}

// ============================================================
// GTO Decision Logic
// ============================================================

interface GTOResult {
  isCorrect: boolean
  gtoAction: string
  evLost: number
  explanation: string
  reasoning: string
  gtoDistribution: GTOActionOption[]   // mixed strategy frequencies
  heroFrequency: number                // how often GTO takes this action (0-100)
}

/** Helper: create a distribution where user's action has targetFreq% */
function dist(
  primaryAction: string, primaryFreq: number, primaryEV: number, primaryCat: GTOActionOption['category'],
  altAction: string, altFreq: number, altEV: number, altCat: GTOActionOption['category'],
  heroAction: string,
): { gtoDistribution: GTOActionOption[]; heroFrequency: number } {
  const freq1 = Math.round(primaryFreq)
  const freq2 = Math.round(altFreq)
  return {
    gtoDistribution: [
      { action: primaryAction, frequency: freq1, ev: primaryEV, category: primaryCat },
      { action: altAction, frequency: freq2, ev: altEV, category: altCat },
    ],
    heroFrequency: heroAction === primaryAction ? freq1 : heroAction === altAction ? freq2 : 0,
  }
}

/** Helper: single-action distribution (GTO always takes this action) */
function distSingle(action: string, ev: number, cat: GTOActionOption['category']): { gtoDistribution: GTOActionOption[]; heroFrequency: number } {
  return {
    gtoDistribution: [{ action, frequency: 100, ev, category: cat }],
    heroFrequency: 100,
  }
}

/** Helper: three-action distribution */
function dist3(
  a1: string, f1: number, ev1: number, c1: GTOActionOption['category'],
  a2: string, f2: number, ev2: number, c2: GTOActionOption['category'],
  a3: string, f3: number, ev3: number, c3: GTOActionOption['category'],
  heroAction: string,
): { gtoDistribution: GTOActionOption[]; heroFrequency: number } {
  const dist = [
    { action: a1, frequency: Math.round(f1), ev: ev1, category: c1 },
    { action: a2, frequency: Math.round(f2), ev: ev2, category: c2 },
    { action: a3, frequency: Math.round(f3), ev: ev3, category: c3 },
  ]
  const match = dist.find(d => d.action === heroAction)
  return { gtoDistribution: dist, heroFrequency: match ? match.frequency : 0 }
}

function determineGTOAction(
  action: HandAction,
  prevActions: HandAction[],
  board: CardString[],
  input: HandInput,
  isIP: boolean,
  boardAnalysis: ReturnType<typeof analyzeBoard> | null
): GTOResult {
  const heroAction = action.action
  const street = action.street

  // Parse hero hand strength
  const handStrength = evaluateHoleCards(input.heroHand, board)

  if (street === 'preflop') {
    return analyzePreflop(heroAction, prevActions, input, handStrength, isIP)
  }

  if (street === 'flop' && board.length >= 3) {
    return analyzeFlop(heroAction, prevActions, board, input, handStrength, isIP, boardAnalysis!)
  }

  if (street === 'turn' && board.length >= 4) {
    return analyzeTurn(heroAction, prevActions, board, input, handStrength, isIP, boardAnalysis!)
  }

  if (street === 'river' && board.length >= 5) {
    return analyzeRiver(heroAction, prevActions, board, input, handStrength, isIP, boardAnalysis!)
  }

  return { isCorrect: true, gtoAction: heroAction, evLost: 0, explanation: '', reasoning: '', gtoDistribution: [{ action: heroAction, frequency: 100, ev: 0, category: 'pot_control' }], heroFrequency: 100 }
}

// ============================================================
// Preflop Analysis
// ============================================================

function analyzePreflop(
  heroAction: string, prevActions: HandAction[], input: HandInput,
  handStrength: HandStrength, isIP: boolean
): GTOResult {
  const { heroPosition, stackDepth, gameType } = input
  const posLabel = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'][heroPosition]
  const isTournament = gameType === 'tournament'
  const isShortStack = stackDepth < 30
  const openSizing = isTournament ? 'open 2.3bb' : 'open 2.5bb'

  const openCutoff = isTournament ? (isShortStack ? 6 : 8) : 10
  const marginalCutoff = isTournament ? (isShortStack ? 8 : 10) : 12
  const isOpener = prevActions.filter(a => a.action !== 'fold').length === 0

  if (isOpener) {
    if (heroAction.startsWith('open') || heroAction === 'raise') {
      if (handStrength.tier <= openCutoff - 1) {
        const openFreq = handStrength.tier <= 4 ? 100 : handStrength.tier <= 6 ? 85 : 60
        return { isCorrect: true, gtoAction: openSizing, evLost: 0,
          ...dist(openSizing, openFreq, 0.3, 'value', 'fold', 100 - openFreq, 0, 'pot_control', heroAction),
          explanation: `${posLabel} GTO 开池范围包含此手牌（频率 ${openFreq}%）。`,
          reasoning: `Tier ${handStrength.tier}，${posLabel} 标准开池。` }
      } else if (handStrength.tier <= marginalCutoff) {
        const openFreq = heroPosition >= 3 ? 40 : 20
        return { isCorrect: true, gtoAction: openSizing, evLost: 0.2,
          ...dist(openSizing, openFreq, 0.1, 'value', 'fold', 100 - openFreq, 0, 'pot_control', heroAction),
          explanation: `${posLabel} 边界手牌，GTO 混合开池 ${openFreq}% / 弃牌 ${100 - openFreq}%。` }
      } else {
        const evPenalty = isTournament ? 1.5 + handStrength.tier * 0.25 : 1.5 + handStrength.tier * 0.2
        return { isCorrect: false, gtoAction: 'fold', evLost: evPenalty,
          ...dist('fold', 100, 0, 'pot_control', openSizing, 0, -evPenalty, 'bluff', heroAction),
          explanation: `${posLabel} 此手牌太弱，不应开池。` }
      }
    } else if (heroAction === 'fold') {
      if (handStrength.tier <= 5 && !(isTournament && heroPosition <= 1)) {
        const evLoss = 3 + (5 - handStrength.tier) * 2
        return { isCorrect: false, gtoAction: openSizing, evLost: evLoss,
          ...dist(openSizing, 90, evLoss / 3, 'value', 'fold', 10, 0, 'pot_control', heroAction),
          explanation: `强牌不应弃牌！${posLabel} 应开池。` }
      } else {
        return { isCorrect: true, gtoAction: 'fold', evLost: 0,
          ...distSingle('fold', 0, 'pot_control'), explanation: '弃牌正确。' }
      }
    }
  } else {
    const callCutoff = isTournament ? (isIP ? 9 : 7) : (isIP ? 11 : 8)
    const threebetCutoff = isTournament ? 4 : 5

    if (heroAction === 'call') {
      if (handStrength.tier <= callCutoff - 2) {
        return { isCorrect: true, gtoAction: 'call', evLost: 0,
          ...dist('call', 70, 0.2, 'value', '3-bet', 30, 0.4, 'value', heroAction),
          explanation: '有足够隐含赔率，跟注正确。GTO 混合 70% call / 30% 3-bet。' }
      } else if (handStrength.tier <= callCutoff && isIP) {
        return { isCorrect: true, gtoAction: 'call', evLost: 0,
          ...dist('call', 55, 0.05, 'pot_control', 'fold', 45, 0, 'pot_control', heroAction),
          explanation: '有位置，边界手牌可跟注防守（55% call / 45% fold）。' }
      } else {
        return { isCorrect: false, gtoAction: 'fold', evLost: 0.8 + handStrength.tier * 0.15,
          ...dist('fold', 100, 0, 'pot_control', 'call', 0, -0.5, 'bluff', heroAction),
          explanation: '手牌太弱应弃牌。' }
      }
    }

    if (heroAction.includes('3bet') || heroAction.includes('raise')) {
      if (handStrength.tier <= threebetCutoff - 1) {
        return { isCorrect: true, gtoAction: '3-bet', evLost: 0,
          ...dist('3-bet', 75, 0.6, 'value', 'call', 25, 0.3, 'value', heroAction),
          explanation: '顶级手牌，GTO 75% 3-bet / 25% call。' }
      } else if (handStrength.tier <= threebetCutoff) {
        if (isTournament && !isIP) {
          return { isCorrect: false, gtoAction: 'call 或 fold', evLost: 3 + handStrength.tier * 0.5,
            ...dist('call', 60, 0.1, 'pot_control', 'fold', 40, 0, 'pot_control', heroAction),
            explanation: 'MTT OOP 不应 3-bet 此手牌。' }
        }
        return { isCorrect: true, gtoAction: '3-bet', evLost: 0,
          ...dist3('3-bet', 35, 0.3, 'bluff', 'call', 50, 0.15, 'pot_control', 'fold', 15, 0, 'pot_control', heroAction),
          explanation: '混合策略：35% 3-bet / 50% call / 15% fold。' }
      } else {
        return { isCorrect: false, gtoAction: 'call 或 fold', evLost: 3 + handStrength.tier * 0.5,
          ...dist('call', 40, 0.05, 'pot_control', 'fold', 60, 0, 'pot_control', heroAction),
          explanation: '不够强，不应 3-bet。' }
      }
    }

    if (heroAction === 'fold') {
      if (handStrength.tier <= 6 && isIP && !(isTournament && heroPosition <= 1)) {
        const evLoss = 2 + (6 - handStrength.tier) * 1.5
        return { isCorrect: false, gtoAction: 'call', evLost: evLoss,
          ...dist('call', 80, evLoss / 3, 'value', '3-bet', 20, evLoss / 2, 'value', heroAction),
          explanation: '有位置的强牌，弃牌损失太大。80% call / 20% 3-bet。' }
      } else if (handStrength.tier <= 4) {
        return { isCorrect: false, gtoAction: '3-bet 或 call', evLost: 5,
          ...dist('3-bet', 60, 1.5, 'value', 'call', 40, 0.8, 'value', heroAction),
          explanation: '顶级手牌绝对不该弃牌！' }
      }
    }
  }

  return { isCorrect: true, gtoAction: heroAction, evLost: 0, explanation: '', reasoning: '', gtoDistribution: [{ action: heroAction, frequency: 100, ev: 0, category: 'pot_control' }], heroFrequency: 100 }
}

// ============================================================
// Flop Analysis
// ============================================================

function analyzeFlop(
  heroAction: string, prevActions: HandAction[], board: CardString[],
  input: HandInput, hand: HandStrength, isIP: boolean,
  boardAnalysis: ReturnType<typeof analyzeBoard>
): GTOResult {
  const texture = boardAnalysis.texture
  const isTournament = input.gameType === 'tournament'
  const isAggressor = prevActions.filter(a => a.actor === 'hero' && (a.action.includes('open') || a.action.includes('raise') || a.action.includes('bet') || a.action.includes('3bet'))).length > 0
  const cbetEvLossMultiplier = isTournament ? 1.15 : 1.0
  const isWet = texture.includes('connected') || texture.includes('monotone')
  const isDry = texture.includes('dry') || (texture.includes('rainbow') && !texture.includes('connected')) || (texture.includes('high') && !texture.includes('wet'))
  const isPairedFlop = texture.includes('paired')

  // Facing action context
  const villainLastAction = prevActions.filter(a => a.actor === 'villain').pop()
  const isFacingBet = villainLastAction?.action.startsWith('bet') || villainLastAction?.action.includes('raise')
  const isFacingCheck = villainLastAction?.action === 'check'

  if (heroAction.startsWith('bet')) {
    // Donk bet
    if (!isAggressor && !isIP) {
      return { isCorrect: false, gtoAction: 'check', evLost: isTournament ? 3.0 : 2.5,
        ...distSingle('check', 0, 'pot_control'),
        explanation: '翻前不是进攻方，OOP donk bet 不符合 GTO。应 check 全部范围。' }
    }

    // Marginal hand on wet board with large sizing — mistake
    if (hand.type === 'marginal' && isWet) {
      if (heroAction.includes('75') || heroAction.includes('100') || heroAction.includes('150')) {
        return { isCorrect: false, gtoAction: 'check (或 bet 33%)', evLost: 3 * cbetEvLossMultiplier,
          ...dist('check', 70, 0, 'pot_control', 'bet 33%', 30, 0.1, 'protection', heroAction),
          explanation: `湿润面用中等牌力大尺度 cbet → 错误。GTO：70% check / 30% 小额 bet。` }
      }
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.3,
        ...dist('check', 55, 0.05, 'pot_control', 'bet 33%', 45, 0.08, 'protection', heroAction),
        explanation: `湿润面边缘牌小额 cbet → GTO 混合 45% bet / 55% check。` }
    }

    // Paired board cbet — GTO bets very high frequency
    if (isPairedFlop) {
      if (hand.type === 'value' || hand.type === 'premium' || hand.hitBoard) {
        return { isCorrect: true, gtoAction: heroAction, evLost: 0,
          ...dist(heroAction, 90, 0.7, 'value', 'check', 10, 0.1, 'pot_control', heroAction),
          explanation: `公对面 + 击中牌面，极高频率 cbet（90%）是 GTO 标准。` }
      }
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.3,
        ...dist(heroAction, 65, 0.15, 'bluff', 'check', 35, 0, 'pot_control', heroAction),
        explanation: '公对面翻前加注者有范围+坚果优势，高频 cbet。' }
    }

    // Dry board cbet
    if (isDry) {
      if (heroAction.includes('33') || heroAction.includes('50')) {
        if (hand.hitBoard) {
          return { isCorrect: true, gtoAction: heroAction, evLost: 0,
            ...dist(heroAction, 85, 0.5, 'value', 'check', 15, 0.1, 'pot_control', heroAction),
            explanation: `击中牌面 + 干燥面，高频 cbet（85%）是 GTO 标准。` }
        } else if (hand.hasDraw) {
          return { isCorrect: true, gtoAction: heroAction, evLost: 0,
            ...dist(heroAction, 65, 0.15, 'bluff', 'check', 35, 0, 'pot_control', heroAction),
            explanation: '听牌半诈唬 cbet（65% bet / 35% check）。' }
        } else if (hand.type === 'air') {
          return { isCorrect: true, gtoAction: heroAction, evLost: isTournament ? 0.5 : 0.3,
            ...dist(heroAction, 25, -0.1, 'bluff', 'check', 75, 0, 'pot_control', heroAction),
            explanation: '空气牌 GTO 仅 25% cbet / 75% check。' }
        }
      }
      return { isCorrect: true, gtoAction: heroAction, evLost: 0,
        ...distSingle(heroAction, 0.3, 'value') }
    }

    // Wet board — large sizing only with strong value
    if (isWet) {
      if (heroAction.includes('75') || heroAction.includes('100') || heroAction.includes('150')) {
        if (hand.type === 'value' || hand.type === 'premium') {
          return { isCorrect: true, gtoAction: heroAction, evLost: 0,
            ...dist(heroAction, 60, 0.6, 'value', 'bet 50%', 40, 0.4, 'value', heroAction),
            explanation: '湿润面价值牌大尺度 cbet（60% 大注 / 40% 中注）。' }
        } else {
          return { isCorrect: false, gtoAction: 'check', evLost: isTournament ? 5 : 4,
            ...dist('check', 80, 0, 'pot_control', 'bet 33%', 20, -0.5, 'bluff', heroAction),
            explanation: '湿润面非价值牌大尺度 → 严重错误。80% check。' }
        }
      }
    }
  }

  // === Check ===
  if (heroAction === 'check') {
    if (isAggressor && isDry && (hand.type === 'value' || hand.type === 'premium')) {
      return { isCorrect: false, gtoAction: 'bet 33%', evLost: isTournament ? 2.0 : 2.5,
        ...dist('bet 33%', 85, 0.5, 'value', 'check', 15, 0.1, 'pot_control', heroAction),
        explanation: '干燥面价值牌应 cbet（85%）。' }
    }
    if (hand.type === 'marginal' && isWet) {
      return { isCorrect: true, gtoAction: 'check', evLost: 0,
        ...dist('check', 70, 0.05, 'pot_control', 'bet 33%', 30, 0.03, 'protection', heroAction),
        explanation: '湿润面中等牌 check 控池正确（GTO 70% check）。' }
    }
    if (hand.type === 'marginal') {
      return { isCorrect: true, gtoAction: 'check', evLost: 0,
        ...dist('check', 60, 0.03, 'pot_control', 'bet 33%', 40, 0.05, 'protection', heroAction),
        explanation: '中等牌力 check 合理（GTO 混合 60% check / 40% bet）。' }
    }
  }

  // === Call ===
  if (heroAction === 'call') {
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: true, gtoAction: 'call (或 raise)', evLost: 0,
        ...dist('call', 60, 0.5, 'value', 'raise', 40, 0.8, 'value', heroAction),
        explanation: '强牌面对下注，GTO 60% call / 40% raise。' }
    }
    if (hand.type === 'draw' && hand.hasDraw) {
      return { isCorrect: true, gtoAction: 'call', evLost: 0,
        ...dist('call', 70, 0.15, 'bluff', 'raise', 30, 0.25, 'bluff', heroAction),
        explanation: '听牌跟注（70%）或加注半诈唬（30%）。' }
    }
  }

  // === Raise ===
  if (heroAction.includes('raise')) {
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0,
        ...dist('raise', 30, 0.8, 'value', 'call', 70, 0.5, 'value', heroAction),
        explanation: '强牌加注获取价值（GTO 30% raise / 70% call）。' }
    }
    if (hand.type === 'draw' && hand.hasDraw) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.5,
        ...dist('raise', 25, 0.2, 'bluff', 'call', 75, 0.1, 'bluff', heroAction),
        explanation: '听牌加注半诈唬（GTO 25% raise / 75% call）。' }
    }
    if (hand.type === 'marginal' || hand.type === 'air') {
      return { isCorrect: false, gtoAction: 'call 或 fold', evLost: 3 * cbetEvLossMultiplier,
        ...dist('call', 60, 0.05, 'pot_control', 'fold', 40, 0, 'pot_control', heroAction),
        explanation: '非价值牌加注 → 错误。只会被更好的牌跟注。' }
    }
  }

  // === Fold ===
  if (heroAction === 'fold') {
    if (hand.type === 'value' || hand.type === 'premium' || (hand.type === 'draw' && hand.hasDraw)) {
      return { isCorrect: false, gtoAction: '至少 call', evLost: 5 * cbetEvLossMultiplier,
        ...dist('call', 80, 0.3, 'value', 'raise', 20, 0.5, 'value', heroAction),
        explanation: '价值牌/强听牌不该弃牌！80% call / 20% raise。' }
    }
    if (hand.type === 'air' && isFacingBet) {
      return { isCorrect: true, gtoAction: 'fold', evLost: 0,
        ...distSingle('fold', 0, 'pot_control'),
        explanation: '空气牌面对下注弃牌正确。' }
    }
  }

  return { isCorrect: true, gtoAction: heroAction, evLost: 0, explanation: '', reasoning: '',
    gtoDistribution: [{ action: heroAction, frequency: 100, ev: 0, category: 'pot_control' }], heroFrequency: 100 }
}

// ============================================================
// Turn & River Analysis
// ============================================================

function analyzeTurn(
  heroAction: string, prevActions: HandAction[], board: CardString[],
  input: HandInput, hand: HandStrength, isIP: boolean,
  boardAnalysis: ReturnType<typeof analyzeBoard>
): GTOResult {
  const isTournament = input.gameType === 'tournament'
  const mttMultiplier = isTournament ? 1.2 : 1.0
  const isBoardPaired = boardAnalysis.isPaired
  const isWet = boardAnalysis.connectivity !== 'disconnected'

  // Turn effects
  const boardSuits = board.map(c => c[1])
  const suitCounts: Record<string, number> = {}
  for (const s of boardSuits) { suitCounts[s] = (suitCounts[s] || 0) + 1 }
  const flushCompleted = Object.values(suitCounts).some(c => c >= 3)

  if (heroAction.startsWith('bet')) {
    const sizing = heroAction.includes('150') ? 'large' : heroAction.includes('100') ? 'large' : heroAction.includes('75') ? 'medium' : 'small'

    // Air/marginal on paired or flush-completing turns → error
    if ((hand.type === 'air' || hand.type === 'marginal') && (isBoardPaired || flushCompleted)) {
      return { isCorrect: false, gtoAction: 'check', evLost: (hand.type === 'air' ? 5 : 3.5) * mttMultiplier,
        ...dist('check', 85, 0, 'pot_control', 'bet 33%', 15, -0.5, 'bluff', heroAction),
        explanation: `${isBoardPaired ? '公对面' : '同花完成面'}非价值牌 double barrel → 错误。85% check。` }
    }

    // Marginal big sizing → error
    if (hand.type === 'marginal' && sizing === 'large' && isWet) {
      return { isCorrect: false, gtoAction: 'check (或 bet 33%)', evLost: 3 * mttMultiplier,
        ...dist('check', 70, 0, 'pot_control', 'bet 33%', 30, 0.05, 'protection', heroAction),
        explanation: '转牌中等牌力大尺度 → 错误。70% check / 30% 小额 bet。' }
    }

    // Value/premium → correct double barrel
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0,
        ...dist(heroAction, 80, 0.8, 'value', 'check', 20, 0.2, 'pot_control', heroAction),
        explanation: `转牌价值牌 double barrel（80% bet / 20% check trap）。` }
    }

    // Draw semi-bluff on dry turns
    if (hand.type === 'draw' && !flushCompleted && !isWet) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0,
        ...dist(heroAction, 55, 0.1, 'bluff', 'check', 45, 0, 'pot_control', heroAction),
        explanation: '听牌半诈唬（55% bet / 45% check）。' }
    }

    // Marginal on dry turns → mixed
    if (hand.type === 'marginal' && !isWet) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.5,
        ...dist(heroAction, 40, 0.1, 'protection', 'check', 60, 0.05, 'pot_control', heroAction),
        explanation: '边缘牌 GTO 混合 40% bet / 60% check。' }
    }
  }

  // === Check ===
  if (heroAction === 'check') {
    if ((hand.type === 'value' || hand.type === 'premium') && isIP) {
      return { isCorrect: false, gtoAction: isBoardPaired ? 'bet 75%' : 'bet 50-75%', evLost: 4 * mttMultiplier,
        ...dist(isBoardPaired ? 'bet 75%' : 'bet 50%', 80, 0.8, 'value', 'check', 20, 0.2, 'pot_control', heroAction),
        explanation: `价值牌应 double barrel（80% bet）。` }
    }
    if (hand.type === 'marginal') {
      return { isCorrect: true, gtoAction: 'check', evLost: 0,
        ...dist('check', 70, 0.05, 'pot_control', 'bet 33%', 30, 0.03, 'protection', heroAction),
        explanation: '中等牌 check 控池正确。' }
    }
    if (hand.type === 'air') {
      return { isCorrect: true, gtoAction: 'check', evLost: 0,
        ...distSingle('check', 0, 'pot_control'),
        explanation: '空气牌放弃是正确的。' }
    }
  }

  // === Call ===
  if (heroAction === 'call') {
    if (hand.type === 'draw' && !flushCompleted) {
      return { isCorrect: true, gtoAction: 'call', evLost: 0,
        ...dist('call', 75, 0.2, 'bluff', 'raise', 25, 0.35, 'bluff', heroAction),
        explanation: '听牌跟注（75% call / 25% raise 半诈唬）。' }
    }
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: true, gtoAction: 'call (或 raise)', evLost: 0,
        ...dist('call', 55, 0.6, 'value', 'raise', 45, 0.9, 'value', heroAction),
        explanation: '强牌 GTO 55% call / 45% raise。' }
    }
    if (hand.type === 'air') {
      return { isCorrect: false, gtoAction: 'fold', evLost: 4 * mttMultiplier,
        ...dist('fold', 95, 0, 'pot_control', 'call', 5, -2, 'bluff', heroAction),
        explanation: '空气牌面对转牌下注应弃牌（95% fold）。' }
    }
  }

  // === Fold ===
  if (heroAction === 'fold') {
    if (hand.type === 'draw' && !flushCompleted) {
      return { isCorrect: false, gtoAction: 'call', evLost: 3 * mttMultiplier,
        ...dist('call', 75, 0.2, 'bluff', 'fold', 25, 0, 'pot_control', heroAction),
        explanation: '听牌不应弃牌（75% call）。' }
    }
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: false, gtoAction: '至少 call', evLost: 8 * mttMultiplier,
        ...dist('call', 90, 0.8, 'value', 'raise', 10, 1.2, 'value', heroAction),
        explanation: '价值牌绝对不该弃牌！90% call。' }
    }
    if (hand.type === 'air') {
      return { isCorrect: true, gtoAction: 'fold', evLost: 0,
        ...distSingle('fold', 0, 'pot_control'),
        explanation: '空气牌弃牌正确。' }
    }
  }

  // === Raise ===
  if (heroAction.includes('raise')) {
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0,
        ...dist('raise', 35, 1.2, 'value', 'call', 65, 0.7, 'value', heroAction),
        explanation: '强牌转牌加注（35% raise / 65% call）。' }
    }
    if (hand.type === 'draw' && !flushCompleted) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.5,
        ...dist('raise', 20, 0.3, 'bluff', 'call', 80, 0.15, 'bluff', heroAction),
        explanation: '听牌加注半诈唬（20% raise / 80% call）。' }
    }
    return { isCorrect: false, gtoAction: 'call 或 fold', evLost: 4 * mttMultiplier,
      ...dist('call', 50, 0, 'pot_control', 'fold', 50, 0, 'pot_control', heroAction),
      explanation: '非价值牌转牌加注 → 错误。' }
  }

  return { isCorrect: true, gtoAction: heroAction, evLost: 0, explanation: '', reasoning: '',
    gtoDistribution: [{ action: heroAction, frequency: 100, ev: 0, category: 'pot_control' }], heroFrequency: 100 }
}

function analyzeRiver(
  heroAction: string, prevActions: HandAction[], board: CardString[],
  input: HandInput, hand: HandStrength, isIP: boolean,
  boardAnalysis: ReturnType<typeof analyzeBoard>
): GTOResult {
  const isTournament = input.gameType === 'tournament'
  const mttMultiplier = isTournament ? 1.25 : 1.0

  // Draw completion detection
  const boardSuits = board.map(c => c[1])
  const suitCounts: Record<string, number> = {}
  for (const s of boardSuits) { suitCounts[s] = (suitCounts[s] || 0) + 1 }
  const flushCompleted = Object.values(suitCounts).some(c => c >= 3)

  const rankMap: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const boardRanks = Array.from(new Set(board.map(c => rankMap[c[0]] || 0))).sort((a, b) => a - b)
  let straightCompleted = false
  if (boardRanks.length >= 5) {
    for (let i = 0; i <= boardRanks.length - 5; i++) {
      if (boardRanks[i + 4] - boardRanks[i] === 4) { straightCompleted = true; break }
    }
  }
  const drawCompleted = flushCompleted || straightCompleted
  const drawType = flushCompleted && straightCompleted ? '同花+顺子' : flushCompleted ? '同花' : straightCompleted ? '顺子' : ''

  // === Bet ===
  if (heroAction.startsWith('bet')) {
    // Marginal → check behind
    if (hand.type === 'marginal') {
      return { isCorrect: false, gtoAction: 'check', evLost: 6 * mttMultiplier,
        ...dist('check', 85, 0.05, 'pot_control', 'bet 33%', 15, -0.5, 'bluff', heroAction),
        explanation: '河牌中等牌力应 check 摊牌（GTO 85% check）。下注只会被更好的牌跟注。' }
    }

    // Air/draw betting on completed draws → CRITICAL
    if ((hand.type === 'air' || hand.type === 'draw') && drawCompleted) {
      return { isCorrect: false, gtoAction: 'check', evLost: 10 * mttMultiplier,
        ...dist('check', 95, 0, 'pot_control', 'bet 33%', 5, -5, 'bluff', heroAction),
        explanation: `${drawType}已完成，你没有${drawType}却下注 → 严重错误！95% 应 check。` }
    }

    // Value betting when draws missed
    if ((hand.type === 'value' || hand.type === 'premium') && !drawCompleted) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0,
        ...dist(heroAction, 75, 1.2, 'value', 'check', 25, 0.3, 'pot_control', heroAction),
        explanation: `听牌未完成，价值下注（75% bet / 25% check trap）。` }
    }

    // Value when draws completed — still bet but smaller
    if ((hand.type === 'value' || hand.type === 'premium') && drawCompleted) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.5,
        ...dist('bet 50%', 50, 0.8, 'value', 'check', 50, 0.4, 'pot_control', heroAction),
        explanation: `${drawType}已完成，价值牌 GTO 混合 50% bet / 50% check。没有同花时切勿大注。` }
    }

    // Missed draw bluff
    if (hand.type === 'draw' && !drawCompleted) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.3,
        ...dist(heroAction, 35, 0.05, 'bluff', 'check', 65, 0, 'pot_control', heroAction),
        explanation: '听牌未完成，河牌可适度诈唬（GTO 35% bluff / 65% give up）。' }
    }
  }

  // === Check ===
  if (heroAction === 'check') {
    if ((hand.type === 'value' || hand.type === 'premium') && isIP && !drawCompleted) {
      return { isCorrect: false, gtoAction: 'bet 50-75%', evLost: 8 * mttMultiplier,
        ...dist('bet 75%', 70, 1.2, 'value', 'check', 30, 0.3, 'pot_control', heroAction),
        explanation: '河牌价值牌必须下注！70% bet。' }
    }
    if (hand.type === 'marginal') {
      return { isCorrect: true, gtoAction: 'check', evLost: 0,
        ...dist('check', 80, 0.05, 'pot_control', 'bet 33%', 20, -0.2, 'bluff', heroAction),
        explanation: '中等牌力 check 摊牌正确（80% check）。' }
    }
    if ((hand.type === 'air' || hand.type === 'draw') && drawCompleted) {
      return { isCorrect: true, gtoAction: 'check', evLost: 0,
        ...distSingle('check', 0, 'pot_control'),
        explanation: `听牌完成，你没有${drawType}，check/fold 正确。` }
    }
  }

  // === Call (bluff catch) ===
  if (heroAction === 'call') {
    if (hand.type === 'air' && drawCompleted) {
      return { isCorrect: false, gtoAction: 'fold', evLost: 6 * mttMultiplier,
        ...dist('fold', 90, 0, 'pot_control', 'call', 10, -1.5, 'bluff', heroAction),
        explanation: `${drawType}已完成，空气牌不应 hero call。90% fold。` }
    }
    if (hand.type === 'air') {
      return { isCorrect: false, gtoAction: 'fold', evLost: 5 * mttMultiplier,
        ...dist('fold', 85, 0, 'pot_control', 'call', 15, -1, 'bluff', heroAction),
        explanation: '空气牌 hero call → 错误。85% fold。' }
    }
    if (hand.type === 'marginal') {
      return { isCorrect: true, gtoAction: 'call (bluff catch)', evLost: 0,
        ...dist('call', 55, 0.1, 'pot_control', 'fold', 45, 0, 'pot_control', heroAction),
        explanation: '中等牌力抓诈（GTO 55% call / 45% fold）。' }
    }
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: true, gtoAction: 'call', evLost: 0,
        ...dist('call', 80, 1.0, 'value', 'raise', 20, 1.5, 'value', heroAction),
        explanation: '强牌跟注（80% call / 20% raise）。' }
    }
  }

  // === Raise ===
  if (heroAction.includes('raise')) {
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0,
        ...dist('raise', 25, 2.0, 'value', 'call', 75, 1.2, 'value', heroAction),
        explanation: '强牌河牌加注获取极限价值（25% raise / 75% call）。' }
    }
    if (hand.type === 'draw' && !drawCompleted) {
      return { isCorrect: true, gtoAction: heroAction, evLost: 0.8,
        ...dist('raise', 10, 0.2, 'bluff', 'fold', 90, 0, 'pot_control', heroAction),
        explanation: '听牌未完成河牌 raise 诈唬 → 高风险（10% 频率）。' }
    }
    return { isCorrect: false, gtoAction: 'call 或 fold', evLost: 8 * mttMultiplier,
      ...dist('fold', 80, 0, 'pot_control', 'call', 20, -2, 'pot_control', heroAction),
      explanation: '非价值牌河牌加注 → 严重错误。' }
  }

  // === Fold ===
  if (heroAction === 'fold') {
    if (hand.type === 'value' || hand.type === 'premium') {
      return { isCorrect: false, gtoAction: '至少 call', evLost: 12 * mttMultiplier,
        ...dist('call', 95, 1.5, 'value', 'raise', 5, 2.5, 'value', heroAction),
        explanation: '价值牌河牌弃牌 → 最严重的错误！95% 至少 call。' }
    }
    if (hand.type === 'marginal') {
      return { isCorrect: true, gtoAction: 'fold (或 call bluff catch)', evLost: 0,
        ...dist('fold', 60, 0, 'pot_control', 'call', 40, 0.1, 'pot_control', heroAction),
        explanation: '中等牌力面对河牌大注 → 60% fold / 40% bluff catch。' }
    }
    if (hand.type === 'air') {
      return { isCorrect: true, gtoAction: 'fold', evLost: 0,
        ...distSingle('fold', 0, 'pot_control'),
        explanation: '空气牌弃牌正确。' }
    }
  }

  return { isCorrect: true, gtoAction: heroAction, evLost: 0, explanation: '', reasoning: '',
    gtoDistribution: [{ action: heroAction, frequency: 100, ev: 0, category: 'pot_control' }], heroFrequency: 100 }
}

// ============================================================
// Hand Strength Evaluator
// ============================================================

export interface HandStrength {
  tier: number
  type: 'premium' | 'value' | 'draw' | 'marginal' | 'air'
  hitBoard: boolean
  hasDraw: boolean
  description: string
}

export function evaluateHoleCards(heroHand: CardString[], board: CardString[]): HandStrength {
  const rankMap: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const card1 = heroHand[0] || ''
  const card2 = heroHand[1] || ''
  const r1 = rankMap[card1[0]] || 7
  const r2 = rankMap[card2[0]] || 7
  const isPair = r1 === r2
  const isSuited = card1[1] === card2[1] && !isPair

  // Base preflop tier
  let tier = 12
  if (isPair) {
    if (r1 >= 14) tier = 1; else if (r1 >= 13) tier = 2; else if (r1 >= 12) tier = 3
    else if (r1 >= 11) tier = 4; else if (r1 >= 10) tier = 5; else if (r1 >= 9) tier = 6
    else if (r1 >= 8) tier = 7; else if (r1 >= 7) tier = 8; else if (r1 >= 6) tier = 9
    else if (r1 >= 4) tier = 10; else tier = 11
  } else {
    const high = Math.max(r1, r2), low = Math.min(r1, r2)
    if (high >= 14 && low >= 13) tier = isSuited ? 3 : 4
    else if (high >= 14 && low >= 12) tier = isSuited ? 4 : 5
    else if (high >= 14 && low >= 11) tier = isSuited ? 5 : 6
    else if (high >= 14 && low >= 10) tier = isSuited ? 6 : 7
    else if (high >= 13 && low >= 12) tier = isSuited ? 6 : 7
    else if (high >= 14 && low >= 9) tier = isSuited ? 7 : 8
    else if (high >= 13 && low >= 11) tier = isSuited ? 7 : 8
    else if (high >= 14 && low >= 5) tier = isSuited ? 8 : 10
    else if (high >= 13 && low >= 10) tier = isSuited ? 8 : 9
    else if (high >= 12 && low >= 11) tier = isSuited ? 8 : 9
    else if (high >= 11 && low >= 10) tier = isSuited ? 8 : 9
    else tier = isSuited ? 9 + Math.max(0, 13 - high) : 11 + Math.max(0, 13 - high)
    tier = Math.min(15, tier)
  }

  // Default preflop classification
  let type: HandStrength['type'] = 'air'
  let hitBoard = false
  let hasDraw = false

  // ============================================================
  // BOARD-AWARE POSTFLOP EVALUATION
  // ============================================================
  if (board.length >= 3) {
    const boardRanks = board.map(c => rankMap[c[0]] || 0).filter(Boolean)
    const boardSuits = board.map(c => c[1])
    const maxBoardRank = Math.max(...boardRanks)
    const uniqueBoardRanks = Array.from(new Set(boardRanks))
    const isBoardPaired = uniqueBoardRanks.length < boardRanks.length

    if (isPair) {
      // === POCKET PAIR EVALUATION ===
      const isSet = boardRanks.includes(r1)
      const isOverpair = r1 > maxBoardRank

      if (isSet) {
        type = 'premium'
        hitBoard = true
        hasDraw = false
        tier = Math.min(tier, 1)
      } else if (isOverpair) {
        type = 'value'
        hitBoard = true
        hasDraw = false
        tier = Math.min(tier, 3)
      } else {
        // Underpair — marginal at best, can be air on connected/wet boards
        // Check for gutshot (e.g. TT on QJ9 = OESD with 8/K)
        type = 'marginal'
        hitBoard = false
        hasDraw = false
        tier = Math.max(tier + 2, 8)
      }
    } else {
      // === NON-PAIR HAND EVALUATION ===
      const highCard = Math.max(r1, r2)
      const lowCard = Math.min(r1, r2)
      const hitRank1 = boardRanks.includes(r1)
      const hitRank2 = boardRanks.includes(r2)
      const hitAny = hitRank1 || hitRank2
      const hitBoth = hitRank1 && hitRank2

      // Top pair detection
      const sortedBoardRanks = [...uniqueBoardRanks].sort((a, b) => b - a)
      const topPairRank = sortedBoardRanks[0]
      const secondPairRank = sortedBoardRanks.length >= 2 ? sortedBoardRanks[1] : 0

      if (hitBoth) {
        // Two pair
        type = tier <= 4 ? 'premium' : 'value'
        hitBoard = true
      } else if (hitRank1 && r1 >= topPairRank || hitRank2 && r2 >= topPairRank) {
        // Top pair — kicker determines strength
        const kicker = hitRank1 ? r2 : r1
        type = kicker >= 11 ? 'value' : 'marginal'
        hitBoard = true
      } else if (hitAny && secondPairRank > 0) {
        // Middle or bottom pair
        const hitRank = hitRank1 ? r1 : r2
        if (hitRank >= secondPairRank) {
          type = 'marginal'
          hitBoard = true
        } else {
          type = 'marginal'
          hitBoard = true
          tier = Math.min(tier + 1, 13)
        }
      }

      // === DRAW DETECTION ===
      const heroSuits = [card1[1], card2[1]]

      // Flush draw detection
      let flushDraw = false
      if (isSuited) {
        const heroSuit = heroSuits[0]
        const matchingOnBoard = boardSuits.filter(s => s === heroSuit).length
        flushDraw = matchingOnBoard >= 2 // 4 to a flush
      }

      // Straight draw detection (OESD / gutshot)
      let oesd = false, gutshot = false
      // Combined ranks including wheel ace
      const combinedRanks = new Set([r1, r2, ...boardRanks])
      if (combinedRanks.has(14)) combinedRanks.add(1) // Ace can be low

      // Check each 5-card straight window: [1-5], [2-6], ..., [10-14]
      for (let start = 1; start <= 10; start++) {
        const windowRanks = [start, start + 1, start + 2, start + 3, start + 4]
        // Need 4 of 5 ranks present, with at least 1 hero card
        const presentCount = windowRanks.filter(r => combinedRanks.has(r)).length
        const heroInWindow = windowRanks.filter(r => r === r1 || r === r2 || (r === 1 && r1 === 14) || (r === 1 && r2 === 14)).length

        if (presentCount === 4 && heroInWindow >= 1) {
          const missing = windowRanks.find(r => !combinedRanks.has(r))!
          const missingIdx = windowRanks.indexOf(missing)
          if (missingIdx === 0 || missingIdx === 4) {
            oesd = true
          } else {
            gutshot = true
          }
        }
        // Made straight (no pair) — all 5 connected ranks present with hero card
        if (presentCount === 5 && heroInWindow >= 1) {
          oesd = false // it's not a draw, it's a made hand
          gutshot = false
          // Set via handType classification below; bypass draw detection
        }
      }

      // Detect if draws COMPLETED (hero actually made the hand)
      let drawCompleted_hero = false
      if (flushDraw && board.length >= 4) {
        const heroSuit = heroSuits[0]
        const matchingOnBoard = boardSuits.filter(s => s === heroSuit).length
        if (matchingOnBoard >= 3) drawCompleted_hero = true // hero has flush!
      }
      // Straight completion
      if (!drawCompleted_hero && board.length >= 5) {
        const allRanksWithHero = Array.from(new Set([r1, r2, ...boardRanks])).sort((a, b) => a - b)
        for (let i = 0; i <= allRanksWithHero.length - 5; i++) {
          if (allRanksWithHero[i + 4] - allRanksWithHero[i] === 4) {
            const straightRanks = allRanksWithHero.slice(i, i + 5)
            if (straightRanks.includes(r1) || straightRanks.includes(r2)) {
              drawCompleted_hero = true; break
            }
          }
        }
      }

      // Classify draws
      hasDraw = flushDraw || oesd || (gutshot && highCard >= 10)

      if (!hitAny) {
        if (drawCompleted_hero) {
          // Made flush or straight! Upgrade to premium/value
          type = 'premium'
          hitBoard = true
          hasDraw = false
          tier = Math.min(tier, 2)
        } else if (hasDraw) {
          type = 'draw'
          hitBoard = false
          tier = Math.min(tier + 1, 12)
        } else if (highCard > maxBoardRank) {
          type = 'marginal'
          tier = Math.min(tier + 1, 12)
        } else if (highCard >= 10) {
          type = 'marginal'
          tier = Math.min(tier + 2, 13)
        } else {
          type = 'air'
          tier = Math.min(tier + 3, 15)
        }
      }
    }

    // Board-paired downgrade: top pair on paired board = weaker
    if (isBoardPaired && type === 'value' && !(isPair && r1 > maxBoardRank)) {
      type = 'marginal'
    }
  } else {
    // === PREFLOP CLASSIFICATION (no board) ===
    if (tier <= 3) type = 'premium'
    else if (tier <= 6) type = 'value'
    else if (tier <= 9) type = 'marginal'
    else type = 'air'
  }

  return {
    tier,
    type,
    hitBoard,
    hasDraw,
    description: `${type} (Tier ${tier})`,
  }
}

// ============================================================
// Helpers
// ============================================================

function formatAction(action: HandAction): string {
  if (action.action === 'fold') return 'Fold'
  if (action.action === 'check') return 'Check'
  if (action.action === 'call') return 'Call'
  if (action.action === 'all_in') return 'All-in'
  if (action.action.startsWith('open')) return `Open ${action.action.replace('open_', '')}`
  if (action.action.startsWith('bet')) return `Bet ${action.action.replace('bet_', '')}`
  if (action.action.startsWith('3bet')) return `3-bet ${action.action.replace('3bet_', '')}`
  if (action.action.startsWith('raise')) return `Raise ${action.action.replace('raise_', '')}`
  return action.action
}
