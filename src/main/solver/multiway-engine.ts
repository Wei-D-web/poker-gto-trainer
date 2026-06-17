/**
 * Multi-way Pot Analysis Engine
 *
 * 3+ player scenarios. Simplified GTO approximations.
 * NOTE: True multi-way GTO is an open research problem.
 * These are heuristics based on solver trends and poker theory.
 */

import type { CardString, Position } from '../../shared/types/poker'
import { analyzeBoard } from '../../shared/utils/poker-math'

export interface MultiWayResult {
  numPlayers: number
  positions: Position[]
  board: CardString[]
  adjustedCbetFreq: number       // dramatically lower than HU
  protectionValue: number         // how much more you need to protect
  rangeAdvantage: 'first' | 'middle' | 'last' | 'none'
  recommendations: MultiWayRecommendation[]
  warnings: string[]
}

interface MultiWayRecommendation {
  category: string
  headsUpAction: string
  multiWayAction: string
  adjustment: string
  reasoning: string
}

export function analyzeMultiWay(
  board: CardString[],
  positions: Position[],
  aggressorPosition: Position
): MultiWayResult {
  const n = positions.length
  const analysis = analyzeBoard(board)
  const posLabels = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']

  // Multi-way adjustments (rules of thumb from solver studies)
  const huBaseline = 0.65
  const multiWayMultiplier = Math.max(0.25, 1 - (n - 2) * 0.35)
  const adjustedCbetFreq = Math.round(huBaseline * multiWayMultiplier * 100) / 100

  // Who has range advantage?
  // Postflop: BTN(3) always acts last. If BTN is not in the pot,
  // the position closest to BTN (highest index among remaining) acts last.
  const btnInPot = positions.includes(3)
  const lastToAct = btnInPot ? 3 : Math.max(...positions)
  const others = positions.filter(p => p !== lastToAct)
  const secondLast = others.length > 0 ? Math.max(...others) : -1
  const rangeAdvantage = aggressorPosition === lastToAct ? 'last' :
    aggressorPosition === secondLast ? 'middle' : 'first'

  const warnings: string[] = [
    '⚠️ 多人底池GTO是开放研究问题，以下为基于求解器趋势的近似建议。',
    '⚠️ 真实多人底池策略需要海量计算，商业求解器也无法完美解决。',
    '⚠️ 建议用手动复盘验证关键决策。',
  ]

  const recommendations: MultiWayRecommendation[] = [
    {
      category: '整体cbet频率',
      headsUpAction: '约65-75%',
      multiWayAction: `约${Math.round(adjustedCbetFreq * 100)}%`,
      adjustment: `降低约${Math.round((huBaseline - adjustedCbetFreq) * 100)}%`,
      reasoning: '每多一个玩家，cbet频率应大幅降低。对手越多，有人击中牌面的概率指数级增长。',
    },
    {
      category: '价值下注门槛',
      headsUpAction: '顶对+',
      multiWayAction: '两对+或顶对顶踢+强听牌',
      adjustment: '提高约2级',
      reasoning: '多人底池需要更强的牌才能价值下注。中对在HU可以bet，在3人底池应check。',
    },
    {
      category: '诈唬频率',
      headsUpAction: '约30-45%',
      multiWayAction: '约10-20%',
      adjustment: '降低50-70%',
      reasoning: '纯诈唬在多人底池几乎总是-EV。应仅用强听牌半诈唬。',
    },
    {
      category: '下注尺度',
      headsUpAction: '33-75% pot',
      multiWayAction: '50-100% pot',
      adjustment: '增大尺度',
      reasoning: '多人底池应使用更大尺度（相对底池），因为需要给更多对手更差的赔率。',
    },
    {
      category: 'check-raise',
      headsUpAction: '常见',
      multiWayAction: '极少使用',
      adjustment: '大幅减少',
      reasoning: '多人底池check-raise风险极高。后面还有未行动的玩家。',
    },
  ]

  if (analysis.texture.includes('monotone')) {
    recommendations.push({
      category: '单色面特殊',
      headsUpAction: '低频cbet (~40%)',
      multiWayAction: '极低频 (~15-25%)',
      adjustment: '几乎只下注坚果同花',
      reasoning: '单色面多人底池极其危险。仅用A高同花或已成同花下注。',
    })
  }

  if (analysis.isPaired) {
    recommendations.push({
      category: '公对面',
      headsUpAction: '极高频率 (~80%)',
      multiWayAction: '高频 (~55-65%)',
      adjustment: '仍然相对高频',
      reasoning: '公对面即使多人也适合cbet。对手更不可能有 trips。',
    })
  }

  return {
    numPlayers: n,
    positions,
    board,
    adjustedCbetFreq,
    protectionValue: Math.round((1 - multiWayMultiplier) * 100),
    rangeAdvantage,
    recommendations,
    warnings,
  }
}
