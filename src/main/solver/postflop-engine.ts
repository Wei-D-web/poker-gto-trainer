/**
 * Postflop GTO Strategy Engine
 *
 * Analyzes any flop board and generates per-combo cbet/check/raise
 * frequencies based on board texture, position, and hand strength.
 * Modeled after GTO Wizard output patterns.
 */

import type { ComboKey, CardString, Rank, Suit } from '../../shared/types/poker'
import { generateAllCombos } from '../../shared/utils/combo-utils'
import { analyzeBoard, parseCard } from '../../shared/utils/poker-math'
import type { BoardTexture } from '../../shared/utils/poker-math'

// ============================================================
// Action types
// ============================================================

export interface PostflopAction {
  action: string       // "check", "bet_33", "bet_50", "bet_75", "bet_100", "bet_150"
  frequency: number    // 0-1
  ev: number          // expected value in bb
}

export interface PostflopComboStrategy {
  comboKey: ComboKey
  handType: string    // "top_pair", "overpair", "set", "flush_draw", "air", etc.
  actions: PostflopAction[]
  weight: number      // how much in range (from preflop)
  equity: number      // estimated equity vs opponent range
}

export interface PostflopResult {
  board: CardString[]
  texture: BoardTexture
  description: string         // "A-high dry rainbow"
  heroPosition: number
  villainPosition: number
  isHeroIP: boolean
  recommendedSizing: string   // "33%", "50%", "75%"
  overallCbetFreq: number     // aggregate cbet frequency
  combos: PostflopComboStrategy[]
}

// ============================================================
// Hand strength evaluator on flop
// ============================================================

type HandType =
  | 'set' | 'two_pair' | 'overpair' | 'top_pair_top_kicker'
  | 'top_pair' | 'middle_pair' | 'bottom_pair' | 'pocket_pair_below'
  | 'flush_draw' | 'oesd' | 'gutshot' | 'straight' | 'two_overcards'
  | 'one_overcard' | 'backdoor_draws' | 'air'

export function evaluateHandOnFlop(
  comboKey: ComboKey,
  board: CardString[]
): { handType: HandType; equity: number; isValue: boolean; isBluff: boolean } {
  const boardCards = board.map(parseCard).filter(Boolean) as { rank: Rank; suit: Suit }[]
  if (boardCards.length < 3) return { handType: 'air', equity: 0.3, isValue: false, isBluff: false }

  // Parse combo
  const key = comboKey
  const isPair = key.length === 2 && !key.includes('s') && !key.includes('o')
  const isSuited = key.includes('s')
  const rankMap: Record<string, Rank> = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const rank1 = rankMap[key[0]] || 7
  const rank2 = rankMap[key[1]] || 7

  const boardRanks = boardCards.map(c => c.rank)
  const boardSuits = boardCards.map(c => c.suit)

  // Check for pairs/sets
  const pairedWithBoard = boardRanks.filter(r => r === rank1 || r === rank2)
  const hasPair = pairedWithBoard.length >= 1
  const hasSet = isPair && pairedWithBoard.length >= 1
  const hasTwoPair = !isPair && pairedWithBoard.length >= 2

  // Check for draws
  // Flush draw: suited hand with 2+ cards of the same suit on board
  // (We don't know hero's exact suit from comboKey alone, so we count max suit frequency)
  let flushDraw = false
  if (isSuited && !isPair) {
    const suitFreq: Record<string, number> = {}
    for (const s of boardSuits) { suitFreq[s] = (suitFreq[s] || 0) + 1 }
    // Note: per-combo analysis doesn't know the specific suit.
    // If any suit has 2+ on board, flag potential flush draw for suited combos.
    flushDraw = Object.values(suitFreq).some(c => c >= 2)
  }

  // Connectedness for straight draws
  const allRanks = [...boardRanks, rank1, rank2]
  // Include wheel ace (14 can act as 1)
  const extendedRanks = new Set(allRanks)
  if (extendedRanks.has(14)) extendedRanks.add(1)
  let hasOESD = false
  let hasGutshot = false

  let hasMadeStraight = false

  // Check each 5-consecutive-rank window: [1-5], [2-6], ..., [10-14]
  for (let start = 1; start <= 10; start++) {
    const windowRanks = [start, start + 1, start + 2, start + 3, start + 4]
    const presentCount = windowRanks.filter(r => extendedRanks.has(r)).length
    // Need at least one hero card in the window
    const heroInWindow = windowRanks.filter(r => r === rank1 || r === rank2 || (r === 1 && rank1 === 14) || (r === 1 && rank2 === 14)).length

    if (presentCount === 5 && heroInWindow >= 1) {
      // Made straight — mark separately, not as a draw
      hasMadeStraight = true
    } else if (presentCount === 4 && heroInWindow >= 1) {
      // 4 to a straight — determine OESD vs gutshot
      const missing = windowRanks.find(r => !extendedRanks.has(r))!
      const missingIdx = windowRanks.indexOf(missing)
      if (missingIdx === 0 || missingIdx === 4) {
        // Missing at one end → open-ended straight draw
        hasOESD = true
      } else {
        // Missing internal → gutshot
        hasGutshot = true
      }
    }
  }

  // Classify
  // Compute unique board ranks sorted descending (for middle/bottom pair detection)
  const uniqueBoardRanks = [...new Set(boardRanks)].sort((a, b) => b - a)
  const topBoardRank = uniqueBoardRanks[0]
  const secondBoardRank = uniqueBoardRanks.length >= 2 ? uniqueBoardRanks[1] : 0

  // Combo draw: both flush draw + OESD = premium semi-bluff
  const hasComboDraw = flushDraw && hasOESD

  let handType: HandType
  let equity = 0.5
  let isValue = false
  let isBluff = false

  if (hasMadeStraight) {
    handType = 'straight'
    equity = 0.82
    isValue = true
  } else if (hasSet) {
    handType = 'set'
    equity = 0.85
    isValue = true
  } else if (hasTwoPair) {
    handType = 'two_pair'
    equity = 0.72
    isValue = true
  } else if (isPair && rank1 > topBoardRank) {
    handType = 'overpair'
    equity = 0.68
    isValue = true
  } else if (hasPair && pairedWithBoard[0] === topBoardRank) {
    // Top pair — check kicker for TPTK classification
    const kicker = isPair ? rank1 : (pairedWithBoard[0] === rank1 ? rank2 : rank1)
    if (kicker >= 11) {
      handType = 'top_pair_top_kicker'
      equity = 0.62
    } else {
      handType = 'top_pair'
      equity = 0.50
    }
    isValue = true
  } else if (hasPair && secondBoardRank > 0 && pairedWithBoard[0] === secondBoardRank) {
    handType = 'middle_pair'
    equity = 0.45
    isValue = false
    isBluff = false
  } else if (hasPair) {
    handType = 'bottom_pair'
    equity = 0.38
    isBluff = true
  } else if (isPair && rank1 < Math.min(...boardRanks)) {
    handType = 'pocket_pair_below'
    equity = 0.15
    isBluff = false
  } else if (isPair && rank1 > Math.min(...boardRanks) && rank1 < Math.max(...boardRanks)) {
    // Pocket pair between board ranks (e.g., 99 on K72 — underpair to K, overpair to 7&2)
    handType = 'pocket_pair_below'
    equity = 0.18
    isBluff = false
  } else if (hasComboDraw) {
    handType = 'flush_draw'  // combo draw: flush + OESD
    equity = 0.48
    isBluff = true
  } else if (hasOESD) {
    handType = 'oesd'
    equity = 0.35
    isBluff = true
  } else if (hasGutshot) {
    handType = 'gutshot'
    equity = 0.28
    isBluff = true
  } else if (flushDraw) {
    handType = 'flush_draw'
    equity = 0.38
    isBluff = true
  } else if (rank1 >= 10 && rank2 >= 9) {
    handType = 'two_overcards'
    equity = 0.25
    isBluff = true
  } else if (rank1 >= 10 || rank2 >= 10) {
    handType = 'one_overcard'
    equity = 0.18
  } else {
    handType = 'air'
    equity = 0.08
  }

  return { handType, equity, isValue, isBluff }
}

// ============================================================
// Postflop strategy generator
// ============================================================

export function generatePostflopStrategy(
  board: CardString[],
  heroPosition: number,
  villainPosition: number,
  stackDepth: number,
  gameType: 'cash' | 'tournament' = 'cash',
  ante: number = 0
): PostflopResult {
  const analysis = analyzeBoard(board)
  // Postflop IP: BTN(3) always IP, otherwise higher position index acts last
  const isHeroIP = heroPosition === 3
    || (heroPosition > villainPosition && villainPosition !== 3)
  const allCombos = generateAllCombos()

  // Board texture → recommended sizing & base cbet frequency
  const baseConfig = getTextureConfig(analysis.texture, isHeroIP)
  // Apply game-type specific adjustments
  const textureConfig = applyGameTypeAdjustments(baseConfig, gameType, stackDepth, ante)

  const combos: PostflopComboStrategy[] = []

  // === Cash vs MTT 翻前范围宽度 ===
  // MTT: ante 使范围微宽，但位置更紧
  // Cash: LP 范围宽，深码 suited connectors 更多
  const baseRangeWidth = [0.16, 0.20, 0.26, 0.40, 0.35, 0.30][heroPosition] || 0.25
  const preflopRangeWidth =
    gameType === 'tournament'
      ? baseRangeWidth * (1 + (ante > 0 ? 0.08 : 0)) * [0.85, 0.90, 0.95, 1.0, 0.95, 0.92][heroPosition]
      : baseRangeWidth * (stackDepth > 150 ? 1.1 : 1.0) * [0.90, 0.95, 1.0, 1.05, 0.98, 0.88][heroPosition]

  for (const combo of allCombos) {
    const evaluation = evaluateHandOnFlop(combo.key, board)

    // Preflop range filtering (game-type aware)
    const tierScore = getTierScore(combo.key)
    const inPreflopRange = tierScore <= 8 ? 1.0 : tierScore <= 10 ? 0.6 * preflopRangeWidth * 2.5 : tierScore <= 12 ? 0.3 * preflopRangeWidth * 2.5 : 0

    if (inPreflopRange < 0.05) {
      combos.push({
        comboKey: combo.key,
        handType: 'air',
        actions: [{ action: 'fold', frequency: 1, ev: 0 }],
        weight: 0,
        equity: 0,
      })
      continue
    }

    // Determine postflop action frequencies
    const actions = getPostflopActions(
      evaluation,
      analysis.texture,
      isHeroIP,
      textureConfig,
      stackDepth,
      gameType
    )

    combos.push({
      comboKey: combo.key,
      handType: evaluation.handType,
      actions,
      weight: inPreflopRange,
      equity: evaluation.equity,
    })
  }

  // Compute aggregate stats
  const inRange = combos.filter(c => c.weight > 0.05)
  const betCombos = inRange.filter(c => c.actions.some(a => a.action.startsWith('bet') && a.frequency > 0.4))
  const overallCbetFreq = inRange.length > 0
    ? betCombos.reduce((s, c) => s + c.weight, 0) / inRange.reduce((s, c) => s + c.weight, 0)
    : 0

  const descriptions: Record<string, string> = {
    'preflop': '翻前', 'paired': '公对干燥', 'trips': '三条面', 'monotone': '单色面',
    'two-tone': '双色面', 'rainbow': '彩虹面', 'paired-monotone': '公对单色',
    'paired-two-tone': '公对双色', 'monotone-connected': '单色连接',
    'two-tone-connected': '双色连接', 'rainbow-connected': '彩虹连接',
    'rainbow-high': '高张彩虹', 'rainbow-dry': '彩虹干燥', 'mixed': '混合面',
    'ace-high-dry': 'A高干燥', 'ace-high-wet': 'A高双色', 'ace-high-monotone': 'A高单色',
    'broadway-heavy': '双高张', 'broadway-connected': 'Broadway连接',
    'mid-disconnected': '中张不连', 'low-dry': '低张干燥',
    'low-connected': '低张连接', 'wheel': 'Wheel面', 'double-broadway': '双Broadway',
  }
  const isAHigh = analysis.highCardRank >= 14
  const isKHigh = analysis.highCardRank === 13 && !isAHigh
  const prefix = isAHigh ? 'A高' : isKHigh ? 'K高' : ''

  const gameTypeSuffix = gameType === 'tournament' ? ' [MTT]' : ''

  return {
    board,
    texture: analysis.texture,
    description: prefix + (descriptions[analysis.texture] || `${analysis.texture}面${gameTypeSuffix}`),
    heroPosition,
    villainPosition,
    isHeroIP,
    recommendedSizing: textureConfig.recommendedSizing,
    overallCbetFreq: Math.round(overallCbetFreq * 100) / 100,
    combos,
  }
}

// ============================================================
// Board texture → cbet strategy config
// ============================================================

interface TextureConfig {
  recommendedSizing: string
  baseCbetFreq: number     // aggregate cbet frequency
  valueBetFreq: number     // how often value hands bet
  bluffFreq: number        // how often bluffs bet
  checkBackValue: number   // how often value hands check (trap)
  checkRaiseFreq: number   // how often to check-raise (vs cbet)
}

// ============================================================
// Game-type adjustments — Cash vs MTT 策略差异
// ============================================================

function applyGameTypeAdjustments(
  config: TextureConfig,
  gameType: 'cash' | 'tournament',
  stackDepth: number,
  ante: number
): TextureConfig {
  if (gameType === 'cash') {
    // === CASH 调整 ===
    // 线性 sizing：value 和 bluff 用相似尺度
    // 深码时更多 trapping，浅码时更多 direct value
    let deepBonus = stackDepth > 150 ? 1.0 : stackDepth > 100 ? 1.03 : 1.0

    return {
      ...config,
      // Cash: 整体 cbet 频率微高（无 ICM 压力）
      baseCbetFreq: Math.min(0.92, config.baseCbetFreq * 1.05),
      // Cash: trapping 更多（深码时有足够空间玩 tricky）
      checkBackValue: Math.min(0.45, config.checkBackValue * (1 + (stackDepth > 120 ? 0.12 : 0.05))),
      // Cash: bluff 频率微高（无生存压力）
      bluffFreq: Math.min(0.75, config.bluffFreq * 1.08 * deepBonus),
      // Cash: check-raise 频率正常偏低（线性范围，少极化）
      checkRaiseFreq: Math.min(0.40, config.checkRaiseFreq * 0.85),
    }
  } else {
    // === MTT 调整 ===
    // 极化 sizing：value = 大尺度, bluff = 小尺度
    // ICM 压力 → 整体更保守
    // Ante → 底池更大 → 更多保护性下注

    const antePressure = ante > 0 ? 1 + Math.min(ante * 0.08, 0.1) : 1.0
    const icmPressure = stackDepth < 30 ? 0.88 : stackDepth < 60 ? 0.93 : 0.97

    // MTT sizing 升级（极化）：小尺度 → 中大尺度
    let adjustedSizing = config.recommendedSizing
    if (config.recommendedSizing === '33%') adjustedSizing = '50%'
    else if (config.recommendedSizing === '50%') adjustedSizing = '75%'

    return {
      ...config,
      recommendedSizing: adjustedSizing,
      // MTT: cbet 频率降低（ICM 压力 → 更保守）
      baseCbetFreq: Math.min(0.85, config.baseCbetFreq * icmPressure * antePressure),
      // MTT: value 保护性下注更多（不想被 bad beat）
      valueBetFreq: Math.min(0.95, config.valueBetFreq * (1 + (ante > 0 ? 0.05 : 0))),
      // MTT: bluff 频率显著降低（ICM: 诈唬失败=生命值损失）
      bluffFreq: Math.min(0.55, config.bluffFreq * icmPressure * 0.85),
      // MTT: 更少 trapping（需要保护手牌，拒绝 equity）
      checkBackValue: Math.min(0.40, config.checkBackValue * 0.8),
      // MTT: check-raise 更多（极化范围，保护手牌）
      checkRaiseFreq: Math.min(0.50, config.checkRaiseFreq * 1.25 * (ante > 0 ? 1.1 : 1.0)),
    }
  }
}

function getTextureConfig(texture: BoardTexture, isIP: boolean): TextureConfig {
  const ipBonus = isIP ? 1.15 : 0.85

  switch (texture) {
    // === A-HIGH BOARDS ===
    case 'ace-high-dry':
      // A72r — 经典高频小额cbet，范围优势巨大
      return { recommendedSizing: '33%', baseCbetFreq: 0.72 * ipBonus, valueBetFreq: 0.88, bluffFreq: 0.55, checkBackValue: 0.12, checkRaiseFreq: 0.12 }
    case 'ace-high-wet':
      // AT3tt — A高双色，仍有范围优势但需选择性
      return { recommendedSizing: '33%', baseCbetFreq: 0.62 * ipBonus, valueBetFreq: 0.82, bluffFreq: 0.45, checkBackValue: 0.18, checkRaiseFreq: 0.15 }
    case 'ace-high-monotone':
      // A高单色面 — 极低频率，仅价值+强听牌
      return { recommendedSizing: '50%', baseCbetFreq: 0.35 * ipBonus, valueBetFreq: 0.68, bluffFreq: 0.18, checkBackValue: 0.32, checkRaiseFreq: 0.25 }

    // === BROADWAY BOARDS ===
    case 'broadway-heavy':
      // KQx — 两高张面，中等频率
      return { recommendedSizing: '50%', baseCbetFreq: 0.58 * ipBonus, valueBetFreq: 0.80, bluffFreq: 0.38, checkBackValue: 0.22, checkRaiseFreq: 0.18 }
    case 'broadway-connected':
      // KQJ — Broadway连接，对手范围强
      return { recommendedSizing: '75%', baseCbetFreq: 0.42 * ipBonus, valueBetFreq: 0.72, bluffFreq: 0.22, checkBackValue: 0.28, checkRaiseFreq: 0.30 }
    case 'double-broadway':
      // AJx, KTx — 含两张T+，小额中频
      return { recommendedSizing: '33%', baseCbetFreq: 0.65 * ipBonus, valueBetFreq: 0.85, bluffFreq: 0.48, checkBackValue: 0.15, checkRaiseFreq: 0.14 }

    // === PAIRED BOARDS ===
    case 'paired':
    case 'paired-two-tone':
      // QQ5 — 极高频率，范围+坚果优势
      return { recommendedSizing: '33%', baseCbetFreq: 0.82 * ipBonus, valueBetFreq: 0.92, bluffFreq: 0.65, checkBackValue: 0.08, checkRaiseFreq: 0.10 }
    case 'paired-monotone':
      // 公对单色 — 中等频率
      return { recommendedSizing: '50%', baseCbetFreq: 0.55 * ipBonus, valueBetFreq: 0.82, bluffFreq: 0.35, checkBackValue: 0.18, checkRaiseFreq: 0.18 }

    // === MONOTONE BOARDS ===
    case 'monotone':
      // 单色面 — 大幅降低频率
      return { recommendedSizing: '50%', baseCbetFreq: 0.38 * ipBonus, valueBetFreq: 0.68, bluffFreq: 0.18, checkBackValue: 0.32, checkRaiseFreq: 0.28 }
    case 'monotone-connected':
      // 单色连接 — 极低频率
      return { recommendedSizing: '50%', baseCbetFreq: 0.30 * ipBonus, valueBetFreq: 0.62, bluffFreq: 0.15, checkBackValue: 0.38, checkRaiseFreq: 0.32 }

    // === TWO-TONE BOARDS ===
    case 'two-tone':
      return { recommendedSizing: '50%', baseCbetFreq: 0.55 * ipBonus, valueBetFreq: 0.78, bluffFreq: 0.38, checkBackValue: 0.22, checkRaiseFreq: 0.22 }
    case 'two-tone-connected':
      // JT9tt — 极湿面，低频大尺度
      return { recommendedSizing: '75%', baseCbetFreq: 0.40 * ipBonus, valueBetFreq: 0.70, bluffFreq: 0.22, checkBackValue: 0.30, checkRaiseFreq: 0.35 }

    // === RAINBOW BOARDS ===
    case 'rainbow-high':
      // K83r — K高中频
      return { recommendedSizing: '33%', baseCbetFreq: 0.68 * ipBonus, valueBetFreq: 0.85, bluffFreq: 0.50, checkBackValue: 0.15, checkRaiseFreq: 0.15 }
    case 'rainbow-dry':
      // Q72r, J63r — 中高张干面
      return { recommendedSizing: '33%', baseCbetFreq: 0.62 * ipBonus, valueBetFreq: 0.82, bluffFreq: 0.45, checkBackValue: 0.18, checkRaiseFreq: 0.18 }
    case 'rainbow-connected':
      // 987r — 连接彩虹
      return { recommendedSizing: '50%', baseCbetFreq: 0.52 * ipBonus, valueBetFreq: 0.76, bluffFreq: 0.32, checkBackValue: 0.24, checkRaiseFreq: 0.25 }

    // === LOW/MID BOARDS ===
    case 'low-dry':
      // 742r — 低张干面，范围劣势
      return { recommendedSizing: '50%', baseCbetFreq: 0.48 * ipBonus, valueBetFreq: 0.72, bluffFreq: 0.30, checkBackValue: 0.28, checkRaiseFreq: 0.22 }
    case 'low-connected':
      // 654r — 低连接
      return { recommendedSizing: '75%', baseCbetFreq: 0.38 * ipBonus, valueBetFreq: 0.65, bluffFreq: 0.20, checkBackValue: 0.35, checkRaiseFreq: 0.28 }
    case 'mid-disconnected':
      // 962r — 中张不连
      return { recommendedSizing: '33%', baseCbetFreq: 0.58 * ipBonus, valueBetFreq: 0.80, bluffFreq: 0.42, checkBackValue: 0.20, checkRaiseFreq: 0.18 }

    // === WHEEL BOARDS ===
    case 'wheel':
      // A53r — 带A低张，类似A高干但连接性略高
      return { recommendedSizing: '33%', baseCbetFreq: 0.65 * ipBonus, valueBetFreq: 0.84, bluffFreq: 0.48, checkBackValue: 0.16, checkRaiseFreq: 0.16 }

    default:
      return { recommendedSizing: '50%', baseCbetFreq: 0.55 * ipBonus, valueBetFreq: 0.80, bluffFreq: 0.40, checkBackValue: 0.20, checkRaiseFreq: 0.20 }
  }
}

// ============================================================
// Per-combo action generation
// ============================================================

function getPostflopActions(
  eval_: ReturnType<typeof evaluateHandOnFlop>,
  texture: BoardTexture,
  isIP: boolean,
  config: TextureConfig,
  stackDepth: number,
  gameType: 'cash' | 'tournament' = 'cash'
): PostflopAction[] {
  const sizingPercentage = parseSizingPercent(config.recommendedSizing)
  // Cash: 额外混合不同尺度; MTT: 更极化
  const hasMultipleSizings = gameType === 'cash' && stackDepth > 60
  const mainSizingKey = `bet_${sizingPercentage}`
  // Cash: 有时用替代尺度（线性范围混合）
  const altPct = sizingPercentage <= 40 ? 75 : sizingPercentage >= 70 ? 40 : 50
  const altSizingKey = `bet_${altPct}`

  let betFreq: number
  let checkFreq: number
  let ev: number

  if (eval_.isValue) {
    // Value hands: mostly bet, occasionally check (trap)
    betFreq = config.valueBetFreq
    checkFreq = 1 - betFreq
    ev = eval_.equity * 5 * (stackDepth / 100)
  } else if (eval_.isBluff) {
    // Bluff candidates: bet at bluff frequency, check/fold rest
    betFreq = config.bluffFreq
    checkFreq = 1 - betFreq
    ev = eval_.equity * 2 - 1
  } else if (eval_.equity > 0.2) {
    // Marginal: mostly check
    betFreq = 0.15
    checkFreq = 0.85
    ev = eval_.equity * 1.5 - 0.5
  } else {
    // Air: give up
    betFreq = 0.03
    checkFreq = 0.97
    ev = -0.5
  }

  // Adjust for monotone — bet draws more
  if ((texture === 'monotone' || texture === 'monotone-connected') && eval_.handType === 'flush_draw') {
    betFreq = 0.65
    checkFreq = 0.35
  }

  // Adjust for connected — bet stronger
  if ((texture === 'rainbow-connected' || texture === 'two-tone-connected') && eval_.isValue) {
    betFreq = Math.min(1, betFreq * 0.85) // slightly more trapping
  }

  let actions: PostflopAction[]

  if (hasMultipleSizings) {
    // Cash: 线性范围 → 混合多个尺度
    const mainPct = 0.7
    const altPctFreq = 0.3
    actions = [
      { action: mainSizingKey, frequency: Math.round(betFreq * mainPct * 100) / 100, ev },
      { action: altSizingKey, frequency: Math.round(betFreq * altPctFreq * 100) / 100, ev: ev * 0.9 },
      { action: 'check', frequency: Math.round(checkFreq * 100) / 100, ev: ev * 0.3 },
    ]
  } else {
    // MTT / Short stack: 极化 → 单一尺度
    actions = [
      { action: mainSizingKey, frequency: Math.round(betFreq * 100) / 100, ev },
      { action: 'check', frequency: Math.round(checkFreq * 100) / 100, ev: ev * 0.3 },
    ]
  }

  // Normalize
  const total = actions.reduce((s, a) => s + a.frequency, 0)
  if (total > 0) {
    for (const a of actions) a.frequency = Math.round((a.frequency / total) * 100) / 100
  }

  return actions
}

function parseSizingPercent(sizing: string): number {
  const match = sizing.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 50
}

// ============================================================
// Hand tier score (for range filtering)
// ============================================================

function getTierScore(combo: string): number {
  const map: Record<string, number> = {
    'AA': 1, 'KK': 1, 'QQ': 2, 'AKs': 2, 'JJ': 2, 'AKo': 3, 'AQs': 3, 'TT': 3,
    'AQo': 4, 'AJs': 4, 'KQs': 4, '99': 4, 'AJo': 5, 'ATs': 5, 'KQo': 5, 'KJs': 5, '88': 5,
    'ATo': 6, 'A9s': 6, 'KJo': 6, 'KTs': 6, 'QJs': 6, '77': 6, 'JTs': 6,
    'A8s': 7, 'KTo': 7, 'QJo': 7, 'QTs': 7, 'JTo': 7, '66': 7, 'T9s': 7,
    'A5s': 8, 'K9s': 8, 'QTo': 8, 'J9s': 8, 'T8s': 8, '55': 8, '98s': 8,
    'A9o': 9, 'K8s': 9, 'Q9s': 9, 'J8s': 9, 'T9o': 9, '44': 9, '87s': 9,
    'A7o': 10, 'K9o': 10, 'Q8s': 10, '33': 10, '76s': 10,
    'A6o': 11, 'K7s': 11, 'Q9o': 11, 'J7s': 11, '22': 11, '65s': 11,
    'A5o': 12, 'K6s': 12, 'Q8o': 12, 'J6s': 12, 'T7o': 12, '54s': 12,
    'A4o': 13, 'K5s': 13, 'Q7o': 13, 'J5s': 13, 'T6o': 13, '43s': 13,
    'A3o': 14, 'K4s': 14, 'Q6o': 14, 'J4s': 14, 'T5o': 14, '32s': 14,
    'A2o': 15, 'K3o': 15,
  }
  return map[combo] ?? 15
}
