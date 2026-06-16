/**
 * GTO Deviation Engine — 对局复盘教练核心引擎
 *
 * Compares actual player frequencies against GTO baseline
 * to detect deviations and quantify EV loss.
 *
 * Uses existing CFR solver and hand analyzer as GTO baselines.
 */

import type { ComboKey, Position } from '../../shared/types/poker'
import type {
  StreetDeviation,
  DecisionDeviation,
  RangeDeviation,
  DetectedWeakness,
} from '../../shared/types/session-review'
import type { HandAction } from './hand-analyzer'
import { solvePreflopRange } from './cfr-solver'
import { generateAllCombos } from '../../shared/utils/combo-utils'
// Position baseline: typical open frequencies per position at 100bb
const POSITION_BASELINE: Record<number, { openPct: number; threebetPct: number; foldToThreebetPct: number }> = {
  0: { openPct: 0.16, threebetPct: 0.05, foldToThreebetPct: 0.60 }, // UTG
  1: { openPct: 0.22, threebetPct: 0.07, foldToThreebetPct: 0.55 }, // MP
  2: { openPct: 0.32, threebetPct: 0.09, foldToThreebetPct: 0.50 }, // CO
  3: { openPct: 0.48, threebetPct: 0.12, foldToThreebetPct: 0.40 }, // BTN
  4: { openPct: 0.38, threebetPct: 0.10, foldToThreebetPct: 0.45 }, // SB
  5: { openPct: 0.0, threebetPct: 0.08, foldToThreebetPct: 0.35 },  // BB (never opens, defends)
}

// ============================================================
// Main API
// ============================================================

/**
 * Compare a single hand's actions against GTO baseline.
 * Returns per-decision analysis and per-street deviation scores.
 */
export function compareHandToGTO(params: {
  actions: HandAction[]
  heroPosition: Position
  villainPosition: Position
  effectiveStack: number
  gameType: 'cash' | 'tournament'
  board: string[]
  heroHand: string[]
}): {
  decisions: DecisionDeviation[]
  streetDeviations: StreetDeviation[]
  totalEVLost: number
} {
  const { actions, heroPosition, gameType, effectiveStack } = params
  const decisions: DecisionDeviation[] = []
  const gtoRange = solvePreflopRange(heroPosition, effectiveStack, gameType)

  // Build GTO action baselines per street
  const baseline = POSITION_BASELINE[heroPosition] ?? POSITION_BASELINE[3] // default BTN

  let heroActionIdx = 0
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]
    if (action.actor !== 'hero') continue

    const prevActions = actions.slice(0, i)
    const analysis = analyzeSingleDecision(
      action,
      prevActions,
      heroActionIdx,
      params,
      gtoRange,
      baseline,
    )
    decisions.push(analysis)
    heroActionIdx++
  }

  // Calculate per-street deviations
  const streetDeviations = calculateStreetDeviations(decisions, actions, params)

  // Calculate total EV lost
  const totalEVLost = decisions.reduce((sum, d) => sum + d.evDifference, 0)

  return { decisions, streetDeviations, totalEVLost }
}

/**
 * Aggregate per-hand deviations into range-level deviations (13x13 matrix).
 */
export function buildRangeDeviationMatrix(
  hands: Array<{
    heroHand: string[]
    actions: HandAction[]
    heroPosition: Position
    effectiveStack: number
    gameType: 'cash' | 'tournament'
  }>,
  street?: string,
): RangeDeviation[] {
  const allCombos = generateAllCombos()
  const comboMap = new Map<string, { actual: number; total: number }>()

  // Initialize with GTO baseline frequencies
  const position = hands[0]?.heroPosition ?? 3
  const stackDepth = hands[0]?.effectiveStack ?? 100
  const gameType = hands[0]?.gameType ?? 'cash'
  const gtoRange = solvePreflopRange(position, stackDepth, gameType)

  for (const combo of allCombos) {
    comboMap.set(combo.key, { actual: 0, total: 0 })
  }

  // Aggregate actual frequencies
  for (const hand of hands) {
    const heroCombo = handToComboKey(hand.heroHand)
    const entry = comboMap.get(heroCombo)
    if (!entry) continue

    entry.total++

    // Check if hero played this hand (didn't fold preflop)
    const heroActions = hand.actions.filter(a => a.actor === 'hero')
    const folded = heroActions.some(a => a.action === 'fold')
    if (!folded) {
      entry.actual++
    }
  }

  // Build deviation array
  const deviations: RangeDeviation[] = []
  for (const combo of allCombos) {
    const entry = comboMap.get(combo.key)!
    const gtoFreq = gtoRange[combo.key] ?? 0
    const actualFreq = entry.total > 0 ? entry.actual / entry.total : 0
    deviations.push({
      combo: combo.key,
      row: combo.row,
      col: combo.col,
      actualFreq,
      gtoFreq,
      deviation: actualFreq - gtoFreq,
    })
  }

  return deviations
}

/**
 * Detect player weaknesses from session data.
 * Returns top 5-10 weakness patterns.
 */
export function detectWeaknesses(
  hands: Array<{
    id: string
    heroHand: string[]
    actions: HandAction[]
    heroPosition: Position
    villainPosition: Position
    effectiveStack: number
    gameType: 'cash' | 'tournament'
    board: string[]
    decisions: DecisionDeviation[]
  }>,
): DetectedWeakness[] {
  const patterns: Map<string, {
    mistakes: number
    total: number
    evLost: number
    sampleHandIds: string[]
    heroPosition: Position
    villainPosition: Position
  }> = new Map()

  for (const hand of hands) {
    for (const decision of hand.decisions) {
      if (decision.severity === 'correct') continue

      const patternKey = `${hand.heroPosition}_vs_${hand.villainPosition}_${decision.street}_${decision.action.split('_')[0]}`
      const existing = patterns.get(patternKey) || {
        mistakes: 0,
        total: 0,
        evLost: 0,
        sampleHandIds: [] as string[],
        heroPosition: hand.heroPosition as Position,
        villainPosition: hand.villainPosition as Position,
      }

      existing.mistakes++
      existing.evLost += decision.evDifference
      if (existing.sampleHandIds.length < 3) {
        existing.sampleHandIds.push(hand.id)
      }
      patterns.set(patternKey, existing)
    }

    // Also count total opportunities per pattern
    for (const key of patterns.keys()) {
      const parts = key.split('_')
      const pos = parseInt(parts[0])
      if (pos === hand.heroPosition) {
        patterns.get(key)!.total++
      }
    }
  }

  // Convert to DetectedWeakness array, sorted by EV lost
  const weaknesses: DetectedWeakness[] = []
  for (const [key, data] of patterns.entries()) {
    const parts = key.split('_')
    const heroPos = parseInt(parts[0])
    const villainPos = parseInt(parts[2])
    const street = parts[3] as any

    const freq = data.total > 0 ? data.mistakes / data.total : 0

    weaknesses.push({
      id: `weak_${key}`,
      category: key,
      label: generateWeaknessLabel(heroPos, villainPos, street, parts.slice(4).join('_')),
      description: generateWeaknessDescription(heroPos, villainPos, street, data.mistakes, data.total, data.evLost),
      heroPosition: heroPos,
      villainPosition: villainPos,
      street: street,
      actualFrequency: freq,
      gtoTargetFrequency: 0.3, // placeholder baseline
      deviationPercent: Math.round(freq * 100),
      severity: data.evLost > 10 ? 'critical' : data.evLost > 5 ? 'high' : data.evLost > 2 ? 'medium' : 'low',
      rangeDeviations: [],
      sampleHandIds: data.sampleHandIds,
      trainingFocus: `Focus on ${street} decision-making from position ${heroPos}`,
    })
  }

  return weaknesses
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
    .slice(0, 10)
}

// ============================================================
// Internal helpers
// ============================================================

function analyzeSingleDecision(
  action: HandAction,
  prevActions: HandAction[],
  heroActionIdx: number,
  params: { heroPosition: Position; effectiveStack: number; gameType: string; board: string[] },
  gtoRange: Record<string, number>,
  baseline: any,
): DecisionDeviation {
  const { heroPosition, effectiveStack, gameType } = params

  // Determine GTO-expected action based on baseline heuristics
  const gtoAction = determineGTOAction(action, prevActions, heroActionIdx, baseline, gtoRange)

  const isGTO = action.action === gtoAction || isActionEquivalent(action.action, gtoAction)

  // Estimate EV difference
  let evDifference = 0
  let severity: DecisionDeviation['severity'] = 'correct'

  if (!isGTO) {
    evDifference = estimateEVLoss(action.action, gtoAction, action.street, effectiveStack)
    severity = evDifference > 20 ? 'critical' :
      evDifference > 10 ? 'major' :
        evDifference > 3 ? 'moderate' : 'minor'
  }

  return {
    actionIndex: heroActionIdx,
    street: action.street,
    actor: 'hero',
    action: action.action,
    isGTO,
    gtoAction,
    evDifference: Math.round(evDifference * 100) / 100,
    severity,
    explanation: isGTO
      ? '决策符合 GTO 基线'
      : `你的决定: ${action.action}，GTO 建议: ${gtoAction}。预计 EV 损失: ${Math.round(evDifference * 100) / 100} bb`,
  }
}

function determineGTOAction(
  action: HandAction,
  prevActions: HandAction[],
  heroActionIdx: number,
  baseline: any,
  gtoRange: Record<string, number>,
): string {
  const { street, action: currentAction } = action

  // Preflop decisions
  if (street === 'preflop') {
    if (heroActionIdx === 0) {
      // First action: open or fold
      // Check if there's prior aggression
      const hasRaise = prevActions.some(a => ['bet', 'raise', 'all_in'].some(t => a.action.includes(t)))
      if (hasRaise) {
        // Facing a raise — use 3bet/fold/call decision
        const isStrongAction = currentAction.includes('raise') || currentAction.includes('bet') || currentAction === 'all_in'
        if (isStrongAction) return currentAction // reasonable
        return 'fold' // facing raise with weak hand should fold
      }
      // Unopened pot: open or fold
      return currentAction.includes('fold') ? 'fold' : 'open_2.5bb'
    }

    // Later preflop actions
    if (currentAction.includes('fold')) return 'fold'
    return currentAction // reasonable
  }

  // Postflop decisions — use simplified GTO heuristics
  const isOOP = false // simplified, assume IP for now

  if (street === 'flop') {
    // Facing a bet?
    const villainBet = prevActions.filter(a => a.actor === 'villain')
      .some(a => a.action.includes('bet') || a.action.includes('raise'))
    if (villainBet) {
      // Facing aggression
      if (currentAction.includes('fold')) return 'call' // should call more
      return currentAction
    }
    // Initiative: cbet or check — use deterministic hash based on action + index
    const hash = simpleHash(currentAction + '_' + heroActionIdx + '_flop')
    if (currentAction.includes('check') || currentAction === 'check') {
      return hash % 2 === 0 ? 'bet_33' : 'check'
    }
    return currentAction
  }

  if (street === 'turn' || street === 'river') {
    if (currentAction.includes('fold')) {
      const hash = simpleHash(currentAction + '_' + heroActionIdx + '_' + street)
      return hash % 3 === 0 ? 'call' : 'fold' // deterministic mix: 33% call, 67% fold
    }
    return currentAction
  }

  return currentAction
}

/** Deterministic hash for consistent mixed-strategy decisions */
function simpleHash(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function isActionEquivalent(a: string, b: string): boolean {
  if (a === b) return true

  // Equivalent categories
  const foldActions = ['fold']
  const checkActions = ['check']
  const callActions = ['call']
  const betActions = ['bet_33', 'bet_50', 'bet_75', 'bet_100', 'bet_150']
  const raiseActions = ['raise_2x', 'raise_3x', '3bet_10bb']

  if (foldActions.includes(a) && foldActions.includes(b)) return true
  if (checkActions.includes(a) && checkActions.includes(b)) return true
  if (callActions.includes(a) && callActions.includes(b)) return true
  if (betActions.includes(a) && betActions.includes(b)) return true
  if (raiseActions.includes(a) && raiseActions.includes(b)) return true

  return false
}

function estimateEVLoss(
  actual: string,
  gto: string,
  street: string,
  effectiveStack: number,
): number {
  // Simplified EV loss estimation based on action type
  const baseMultiplier = effectiveStack / 100

  if (actual === 'fold' && gto !== 'fold') {
    // Folding when should continue → lose pot share
    const streetMultiplier = street === 'preflop' ? 2.5 : street === 'flop' ? 6 : street === 'turn' ? 12 : 20
    return streetMultiplier * baseMultiplier
  }

  if ((gto === 'fold' || gto === 'check') && actual !== 'fold' && actual !== 'check') {
    // Being aggressive when should be passive → risk losing extra bet
    return 3 * baseMultiplier
  }

  if (gto.includes('bet') && (actual === 'check' || actual === 'call')) {
    // Missing value bet or being passive
    return 4 * baseMultiplier
  }

  if (gto === 'check' && actual.includes('bet')) {
    // Being too aggressive
    return 2 * baseMultiplier
  }

  return 1 * baseMultiplier
}

function calculateStreetDeviations(
  decisions: DecisionDeviation[],
  actions: HandAction[],
  params: { heroPosition: Position },
): StreetDeviation[] {
  const streets = ['preflop', 'flop', 'turn', 'river'] as const
  return streets.map(street => {
    const streetDecisions = decisions.filter(d => d.street === street)
    const streetActions = actions.filter(
      a => a.actor === 'hero' && a.street === street,
    )

    const actualFreq: Record<string, number> = {}
    const gtoFreq: Record<string, number> = {}

    let totalActions = streetActions.length
    if (totalActions === 0) totalActions = 1

    let mistakeCount = 0
    for (const d of streetDecisions) {
      actualFreq[d.action] = (actualFreq[d.action] || 0) + 1
      gtoFreq[d.gtoAction] = (gtoFreq[d.gtoAction] || 0) + 1
      if (!d.isGTO) mistakeCount++
    }

    // Normalize frequencies
    for (const key of Object.keys(actualFreq)) {
      actualFreq[key] = Math.round((actualFreq[key] / totalActions) * 100) / 100
    }
    for (const key of Object.keys(gtoFreq)) {
      gtoFreq[key] = Math.round((gtoFreq[key] / totalActions) * 100) / 100
    }

    return {
      street,
      actualFreq,
      gtoFreq,
      deviationScore: Math.round((mistakeCount / Math.max(1, totalActions)) * 100),
    }
  })
}

function handToComboKey(hand: string[]): ComboKey {
  if (hand.length < 2) return 'AKo' as ComboKey

  const rankChars = '23456789TJQKA'
  const r1 = rankChars.indexOf(hand[0][0])
  const r2 = rankChars.indexOf(hand[1][0])
  const suited = hand[0][1] === hand[1][1]

  const highR = Math.max(r1, r2)
  const lowR = Math.min(r1, r2)
  const highC = 'AKQJT98765432'[12 - highR]
  const lowC = 'AKQJT98765432'[12 - lowR]

  if (highR === lowR) return `${highC}${lowC}` as ComboKey
  return `${highC}${lowC}${suited ? 's' : 'o'}` as ComboKey
}

function generateWeaknessLabel(
  heroPos: number,
  villainPos: number,
  street: string,
  actionType: string,
): string {
  const posNames = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']
  const streetNames: Record<string, string> = {
    preflop: '翻前',
    flop: '翻牌',
    turn: '转牌',
    river: '河牌',
  }
  const hero = posNames[heroPos] ?? '?'
  const villain = posNames[villainPos] ?? '?'
  const st = streetNames[street] || street
  return `${hero} vs ${villain} ${st} ${actionType}偏离`
}

function generateWeaknessDescription(
  heroPos: number,
  villainPos: number,
  street: string,
  mistakes: number,
  total: number,
  evLost: number,
): string {
  const posNames = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']
  const streetNames: Record<string, string> = {
    preflop: '翻前',
    flop: '翻牌',
    turn: '转牌',
    river: '河牌',
  }
  return `你在 ${posNames[heroPos]} 位置 vs ${posNames[villainPos]} 的${streetNames[street] || street}决策中，${mistakes}/${total} 次偏离 GTO，累计损失 ${Math.round(evLost * 100) / 100} bb。`
}
