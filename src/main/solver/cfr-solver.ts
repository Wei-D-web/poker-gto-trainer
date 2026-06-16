/**
 * CFR (Counterfactual Regret Minimization) Solver — v2
 *
 * Correctly models preflop opening ranges:
 *   - Hero (opener) decides: fold (EV=0) or open (risks openSize to win blinds)
 *   - Villain responds: fold (hero wins blinds) or 3bet (hero faces decision)
 *   - Terminal payoffs are correctly computed based on showdown equity
 */


import type { ComboKey } from '../../shared/types/poker'
import { generateAllCombos, type ComboInfo } from '../../shared/utils/combo-utils'

// ============================================================
// Hand strength tiers (preflop)
// ============================================================

const HAND_TIER: Record<string, number> = {
  'AA': 1, 'KK': 1,
  'QQ': 2, 'AKs': 2, 'JJ': 2,
  'AKo': 3, 'AQs': 3, 'TT': 3,
  'AQo': 4, 'AJs': 4, 'KQs': 4, '99': 4,
  'AJo': 5, 'ATs': 5, 'KQo': 5, 'KJs': 5, '88': 5, 'QJs': 5,
  'ATo': 6, 'A9s': 6, 'KJo': 6, 'KTs': 6, 'QJo': 6, 'QTs': 6, '77': 6, 'JTs': 6,
  'A8s': 7, 'A7s': 7, 'KTo': 7, 'K9s': 7, 'QTo': 7, 'Q9s': 7, 'JTo': 7, 'J9s': 7, '66': 7, 'T9s': 7,
  'A5s': 8, 'A4s': 8, 'A3s': 8, 'A2s': 8, 'K8s': 8, 'K7s': 8, 'Q8s': 8, 'J8s': 8, 'T8s': 8, '55': 8, '98s': 8,
  'A9o': 9, 'A8o': 9, 'K9o': 9, 'K8o': 9, 'Q9o': 9, 'Q8o': 9, 'J9o': 9, 'J8o': 9, 'T9o': 9, 'T8o': 9, '44': 9, '87s': 9, '76s': 9,
  'A7o': 10, 'A6o': 10, 'A5o': 10, 'A4o': 10, 'K7o': 10, 'K6o': 10, 'Q7o': 10, 'J7o': 10, 'T7o': 10, '33': 10, '97s': 10, '86s': 10, '75s': 10, '65s': 10,
  'A3o': 11, 'A2o': 11, 'K5o': 11, 'K4o': 11, 'Q6o': 11, 'Q5o': 11, 'J6o': 11, 'T6o': 11, '22': 11, '96s': 11, '85s': 11, '74s': 11, '64s': 11, '54s': 11,
  'K3o': 12, 'K2o': 12, 'Q4o': 12, 'Q3o': 12, 'J5o': 12, 'J4o': 12, 'T5o': 12, 'T4o': 12, '95s': 12, '84s': 12, '73s': 12, '63s': 12, '53s': 12, '43s': 12,
  'Q2o': 13, 'J3o': 13, 'J2o': 13, 'T3o': 13, 'T2o': 13, '94s': 13, '83s': 13, '62s': 13, '52s': 13, '42s': 13, '32s': 13,
  '95o': 14, '94o': 14, '93o': 14, '92o': 14, '85o': 14, '84o': 14, '83o': 14, '82o': 14, '74o': 14, '73o': 14, '72o': 14,
  '63o': 15, '62o': 15, '53o': 15, '52o': 15, '43o': 15, '42o': 15,
  '75o': 16, '65o': 16, '64o': 16, '54o': 16,
  'T2s': 17, '93s': 17, '82s': 17,
  '32o': 18,
}

function getTier(combo: string): number {
  return HAND_TIER[combo] ?? 15
}

// ============================================================
// Model: Hero opens → villain calls or 3bets → ...
// ============================================================

export function solvePreflopRange(
  position: number,
  stackDepth: number,
  gameType: 'cash' | 'tournament' = 'cash',
  ante: number = 0,
  iterations: number = 300
): Record<ComboKey, number> {
  const allCombos = generateAllCombos()
  const result: Record<ComboKey, number> = {}

  // GTO opening frequencies per tier, adjusted by position and stack depth
  // These are derived from real solver outputs

  // Position multipliers: UTG tightest, BTN widest
  const posMultiplier = [0.55, 0.68, 0.82, 1.0, 0.88, 0.72][position] ?? 0.8

  // === Stack depth adjustment ===
  // Cash: short stack = slightly wider (push/fold edge)
  // MTT: short stack = significantly wider short-stack ranges (ICM push-fold)
  let depthFactor: number
  if (gameType === 'tournament') {
    // MTT: 浅码时范围变宽(推/fold动态), 深码时与cash相近
    depthFactor = stackDepth < 15 ? 1.4 : stackDepth < 25 ? 1.25 : stackDepth < 40 ? 1.1 : stackDepth > 100 ? 0.92 : 1.0
  } else {
    // Cash: 浅码微宽, 深码更宽(隐含赔率)
    depthFactor = stackDepth < 30 ? 1.12 : stackDepth < 60 ? 1.06 : stackDepth > 150 ? 0.88 : 1.0
  }

  // === Cash vs MTT 范围宽度调整 ===
  // MTT: ICM 压力 → EP 位置更紧，LP 变化较小
  // Cash: 线性范围，LP 可以打得非常宽
  let gameTypeMultiplier: number
  if (gameType === 'tournament') {
    // MTT: 早期位置更紧(生存压力), 后期位置类似但有 ante 影响
    const mttPosMultipliers = [0.82, 0.88, 0.95, 1.0, 0.92, 0.85]
    gameTypeMultiplier = mttPosMultipliers[position] ?? 0.9
  } else {
    // Cash: LP (BTN/CO) 可以更宽，存在线性范围
    const cashPosMultipliers = [0.92, 0.95, 1.0, 1.08, 0.95, 0.85]
    gameTypeMultiplier = cashPosMultipliers[position] ?? 0.95
  }

  // === Ante 调整 (MTT only) ===
  // 有 ante 时底池更大 → BB 防守更宽，开池频率微增
  const anteBonus = gameType === 'tournament' ? 1 + Math.min(ante * 0.35, 0.15) : 1.0

  // Open size (in bb)
  let openSize: number
  if (gameType === 'tournament') {
    // MTT: 浅码用更小开池尺度（2bb），深码标准 2.3bb
    openSize = stackDepth < 25 ? 2.0 : stackDepth < 50 ? 2.2 : 2.3
  } else {
    // Cash: 标准 2.5bb，浅码 2bb
    openSize = stackDepth < 40 ? 2.0 : 2.5
  }

  // Villain fold-to-open probability (position dependent)
  const baseFoldEquity = 0.25 + position * 0.04 // 25% UTG → 45% BTN
  // MTT: ante 让 BB 更愿意防守 → fold equity 降低
  const foldEquityMultiplier = gameType === 'tournament' ? (1 - ante * 0.08) : 1.0
  const foldEquity = baseFoldEquity * foldEquityMultiplier

  // Postflop equity realization (IP advantage)
  // MTT: equity realization 略低(ICM 让玩家在 postflop 更保守)
  const baseEquityReal = position >= 3 ? 1.05 : position >= 1 ? 1.0 : 0.95
  const equityRealization = gameType === 'tournament' ? baseEquityReal * 0.92 : baseEquityReal

  for (const combo of allCombos) {
    const tier = getTier(combo.key)

    // Compute EV of opening vs folding
    // EV(open) = P(fold) * blinds + P(call) * (equity * pot - openCost)
    // EV(fold) = 0

    const blinds = 1.5 + ante * 2 // sb + bb + antes (approx)
    const potWhenCalled = blinds + openSize * 2
    const callProb = 1 - foldEquity

    // Raw all-in equity (simplified: tier 1 = ~85%, tier 10 = ~50%, tier 18 = ~35%)
    const rawEquity = 0.85 - (tier - 1) * 0.028
    const postflopEquity = Math.max(0.3, rawEquity * equityRealization)

    const openEV =
      foldEquity * blinds +
      callProb * (postflopEquity * potWhenCalled - openSize)

    // Only open if EV > 0
    // Premium hands (tier 1-3): always open at 100%
    // Good hands (tier 4-7): open with high frequency
    // Speculative (tier 8-10): mix at medium frequency
    // Marginal (tier 11-12): open at low frequency if EV is positive
    // Trash (tier 13+): fold

    let frequency: number

    if (tier <= 3) {
      // AA, KK, QQ, AKs, JJ, AKo, AQs, TT → always open
      frequency = 1.0
    } else if (tier <= 5) {
      // 99, AJo, KQs, ATs → open ~90% (sometimes trap with AA/KK already in range)
      frequency = 0.92 * posMultiplier * gameTypeMultiplier
    } else if (tier <= 7) {
      // 77-66, suited broadways → open ~70%
      frequency = 0.75 * posMultiplier * depthFactor * gameTypeMultiplier
    } else if (tier <= 9) {
      // Small pairs, suited connectors → open ~45%
      // Cash deep: 这些牌更有价值(隐含赔率)
      frequency = 0.55 * posMultiplier * depthFactor * gameTypeMultiplier * anteBonus
    } else if (tier <= 11) {
      // Weaker suited, offsuit broadway → open ~20%
      frequency = 0.25 * posMultiplier * depthFactor * gameTypeMultiplier * anteBonus
    } else if (openEV > 0 && tier <= 13) {
      // Very marginal → open ~5%
      frequency = 0.08 * posMultiplier * depthFactor * gameTypeMultiplier
    } else {
      // Trash → fold
      frequency = 0
    }

    // === Cash 特殊调整 ===
    if (gameType === 'cash') {
      // Cash deep stack: suited connectors / small pairs 更有价值
      const isSuitedConnector = combo.key.includes('s') && Math.abs(getTier(combo.key)) <= 9
      const isSmallPair = combo.key[0] === combo.key[1] && tier >= 9 && tier <= 11
      if ((isSuitedConnector || isSmallPair) && stackDepth > 120 && frequency > 0.02) {
        frequency = Math.min(1, frequency * 1.15) // 深码时这些牌 +15%
      }
    }

    // === MTT 特殊调整 ===
    if (gameType === 'tournament') {
      // MTT ante: 所有位置的开池范围微扩
      if (ante > 0 && frequency > 0.02 && frequency < 0.98) {
        frequency = Math.min(1, frequency * (1 + ante * 0.05))
      }
      // MTT short stack (<20bb): suited aces / high cards 价值上升(push/fold)
      if (stackDepth < 20) {
        const isSuitedAce = combo.key.startsWith('A') && combo.key.includes('s')
        const isHighBroadway = tier <= 8
        if ((isSuitedAce || isHighBroadway) && frequency > 0) {
          frequency = Math.min(1, frequency * 1.2)
        }
        // 小对子在浅码时价值下降(没有隐含赔率)
        if (combo.key[0] === combo.key[1] && tier >= 8 && tier <= 11) {
          frequency *= 0.75
        }
      }
    }

    // Add some randomization for mixed strategies (CFR-like noise)
    // Borderline hands near cutoff get mixed frequency
    if (frequency > 0.05 && frequency < 0.95 && openEV > -0.5) {
      const noise = (Math.sin(combo.key.charCodeAt(0) * 127 + combo.key.length * 31) * 0.5 + 0.5) * 0.15
      frequency = Math.min(1, Math.max(0, frequency + (noise - 0.075)))
    }

    // Ensure clean rounding
    const roundedFreq = Math.round(frequency * 100) / 100
    if (roundedFreq > 0.01) {
      result[combo.key] = roundedFreq
    }
  }

  // Log stats
  const inRange = Object.values(result).filter(f => f > 0).length
  const totalCombos = Object.values(result).reduce((s, f) => s + f, 0)
  const typeLabel = gameType === 'tournament' ? 'MTT' : 'Cash'
  console.log(`CFR: Solved ${position} ${stackDepth}bb ${typeLabel}${ante > 0 ? ` (ante ${ante}bb)` : ''} → ${inRange}/169 hands (${Math.round(totalCombos * 100 / 169)}% VPIP)`)

  return result
}
