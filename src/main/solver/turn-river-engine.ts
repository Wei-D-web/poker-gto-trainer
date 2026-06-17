/**
 * Turn & River Strategy Engine
 *
 * Extends postflop analysis to later streets.
 * Generates turn -> river strategy shifts based on card textures.
 */

import type { CardString } from '../../shared/types/poker'
import { analyzeBoard } from '../../shared/utils/poker-math'
import type { PostflopComboStrategy, PostflopAction, PostflopResult } from './postflop-engine'

export interface TurnAnalysis {
  flopBoard: CardString[]
  turnCard: CardString
  fullBoard: CardString[]
  turnTexture: string
  isScareCard: boolean       // completes flush/straight
  isBrick: boolean            // changes nothing
  isOvercard: boolean         // overcard to flop
  strategyShift: StrategyShift
  recommendations: TurnRecommendation[]
}

interface StrategyShift {
  doubleBarrelFreq: number    // how often to fire second barrel
  checkBackFreq: number
  sizingPreference: string    // 'small' | 'medium' | 'large' | 'polarized'
  description: string
}

interface TurnRecommendation {
  handType: string
  action: string
  frequency: number
  reasoning: string
}

export function analyzeTurn(
  flopBoard: CardString[],
  turnCard: CardString
): TurnAnalysis {
  const fullBoard = [...flopBoard, turnCard]
  const flopAnalysis = analyzeBoard(flopBoard)
  const turnAnalysis = analyzeBoard(fullBoard)

  // Card classification
  const turnRank = turnCard[0]
  const flopRanks = flopBoard.map(c => c[0])
  const flopSuits = flopBoard.map(c => c[1])
  const turnSuit = turnCard[1]

  const isOvercard = !flopRanks.includes(turnRank) && ['A','K','Q','J','T'].includes(turnRank)
  // Use proper rank mapping instead of charCode (which breaks for T/J/Q/K/A vs numbers)
  const rankMap: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const turnRankVal = rankMap[turnRank] || 0
  const flopRankVals = flopRanks.map(r => rankMap[r] || 0)
  const maxFlopRank = Math.max(...flopRankVals, 0)
  const isScareCard = (
    flopSuits.filter(s => s === turnSuit).length >= 2 || // completes flush draw
    Math.abs(turnRankVal - maxFlopRank) <= 2 // close to top flop card → possible straight completion
  )
  const isBrick = !isOvercard && !isScareCard && !flopRanks.includes(turnRank)

  // Strategy shift based on turn card
  let doubleBarrelFreq = 0.55
  let checkBackFreq = 0.25
  let sizingPreference = 'medium'
  let description = ''

  if (isBrick) {
    doubleBarrelFreq = 0.65
    checkBackFreq = 0.20
    sizingPreference = 'medium'
    description = '空白转牌 — 继续高频 double barrel。翻前进攻方保持范围优势。'
  } else if (isOvercard) {
    if (turnRank === 'A' || turnRank === 'K') {
      doubleBarrelFreq = 0.50
      checkBackFreq = 0.30
      sizingPreference = 'large'
      description = '高张转牌 — 降低频率但增大尺度。用价值牌大注，中等牌过牌控池。'
    } else {
      doubleBarrelFreq = 0.55
      checkBackFreq = 0.25
      sizingPreference = 'medium'
      description = '中等超张 — 频率略降，继续施压。对手范围也被削弱。'
    }
  } else if (isScareCard) {
    doubleBarrelFreq = 0.35
    checkBackFreq = 0.40
    sizingPreference = 'polarized'
    description = '危险转牌 — 大幅降低频率。仅用强价值牌和强听牌继续。过牌频率显著增加。'
  } else if (flopRanks.includes(turnRank)) {
    doubleBarrelFreq = 0.70
    checkBackFreq = 0.15
    sizingPreference = 'large'
    description = '成对转牌 — 高频 double barrel。对手更难击中，可以频繁施压。'
  }

  const recommendations: TurnRecommendation[] = [
    {
      handType: '顶对+',
      action: `bet ${sizingPreference === 'large' ? '75%' : sizingPreference === 'small' ? '33%' : '50%'}`,
      frequency: 0.85,
      reasoning: '价值手牌继续下注，转牌是获取价值的关键街段。',
    },
    {
      handType: '强听牌',
      action: doubleBarrelFreq > 0.45 ? 'bet 50%' : 'check',
      frequency: doubleBarrelFreq > 0.45 ? 0.6 : 0.35,
      reasoning: isScareCard ? '危险转牌降低半诈唬频率。' : '继续半诈唬施压。',
    },
    {
      handType: '中对/底对',
      action: 'check',
      frequency: 0.80,
      reasoning: '中等牌力在转牌应该控池，保护摊牌价值。',
    },
    {
      handType: '空气',
      action: isBrick ? 'bet 50% (部分)' : 'check',
      frequency: isBrick ? 0.30 : 0.10,
      reasoning: isBrick ? '空白转牌可以偶尔继续诈唬。' : '放弃，转牌不适合纯诈唬。',
    },
  ]

  return {
    flopBoard,
    turnCard,
    fullBoard,
    turnTexture: turnAnalysis.texture,
    isScareCard,
    isBrick,
    isOvercard,
    strategyShift: { doubleBarrelFreq, checkBackFreq, sizingPreference, description },
    recommendations,
  }
}

export interface RiverAnalysis {
  turnBoard: CardString[]
  riverCard: CardString
  fullBoard: CardString[]
  completedDraws: string[]
  strategy: RiverStrategy
}

interface RiverStrategy {
  valueBetFreq: number
  bluffFreq: number
  checkBackFreq: number
  sizingPreference: string
  description: string
}

export function analyzeRiver(
  turnBoard: CardString[],
  riverCard: CardString
): RiverAnalysis {
  const fullBoard = [...turnBoard, riverCard]
  const analysis = analyzeBoard(fullBoard)
  const riverSuit = riverCard[1]
  const turnSuits = turnBoard.map(c => c[1])
  const frontDoorFlushPossible = turnSuits.filter(s => s === riverSuit).length >= 2
  const backdoorFlush = !frontDoorFlushPossible

  const completedDraws: string[] = []
  // Front-door flush: 2+ of the river suit were already on the turn board
  // (3+ of that suit total on board after river → flush now possible)
  if (turnSuits.filter(s => s === riverSuit).length >= 2) completedDraws.push('前门同花')
  // Backdoor flush: exactly 1 of the river suit was on the turn board
  // (only 2 of that suit total after river → backdoor flush completed)
  else if (turnSuits.filter(s => s === riverSuit).length === 1) completedDraws.push('后门同花')
  // Simplified straight detection
  const allRanks = fullBoard.map(c => c[0])
  if (new Set(allRanks).size <= 4) completedDraws.push('可能顺子')

  const drawCompleted = completedDraws.length > 0

  const strategy: RiverStrategy = {
    valueBetFreq: drawCompleted ? 0.70 : 0.55,
    bluffFreq: drawCompleted ? 0.20 : 0.30,
    checkBackFreq: drawCompleted ? 0.10 : 0.15,
    sizingPreference: drawCompleted ? 'large' : 'medium',
    description: drawCompleted
      ? `听牌完成 (${completedDraws.join(', ')}) — 增加价值下注，减少诈唬。大尺度。`
      : '听牌未完成 — 正常河牌策略。中等尺度，适度诈唬。',
  }

  return { turnBoard, riverCard, fullBoard, completedDraws, strategy }
}
