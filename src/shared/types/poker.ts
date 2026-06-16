// ============================================================
// Core Poker Types — shared between main & renderer processes
// ============================================================

/** Card rank: 2-14 (14 = Ace) */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

/** Card suit */
export type Suit = 'c' | 'd' | 'h' | 's'

/** A single playing card */
export interface Card {
  rank: Rank
  suit: Suit
}

/** Card represented as a compact string, e.g. "Ah", "Td", "2c" */
export type CardString = string

/** A hand combo: two cards, e.g. "AKs", "AKo", "AA", "T9o" */
export type ComboKey = string

/** The 6-max positions (UTG through BB). 9-max adds UTG+1, MP+1, etc. */
export enum Position {
  UTG = 0,
  MP = 1,
  CO = 2,
  BTN = 3,
  SB = 4,
  BB = 5,
}

export const POSITION_LABELS: Record<Position, string> = {
  [Position.UTG]: 'UTG',
  [Position.MP]: 'MP',
  [Position.CO]: 'CO',
  [Position.BTN]: 'BTN',
  [Position.SB]: 'SB',
  [Position.BB]: 'BB',
}

export const POSITION_LABELS_9MAX: Record<number, string> = {
  0: 'UTG',
  1: 'UTG+1',
  2: 'MP',
  3: 'MP+1',
  4: 'CO',
  5: 'BTN',
  6: 'SB',
  7: 'BB',
}

/** Game type */
export type GameType = 'cash' | 'tournament'

/** A poker street */
export type Street = 'preflop' | 'flop' | 'turn' | 'river'

/** Action types */
export type ActionType =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'all_in'

/** A single action in a hand */
export interface Action {
  player: 'hero' | 'villain'
  type: ActionType
  amount?: number // in big blinds (or fraction of pot for bet sizing display)
  isAllIn?: boolean
}

/** Bet sizing option: fraction of the pot */
export interface BetSize {
  label: string // e.g. "33%", "50%", "75%", "100%"
  fraction: number // e.g. 0.33, 0.5, 0.75, 1.0
}

/** Configuration for allowed bet sizes at each street */
export interface SizingStageConfig {
  betSizes: BetSize[]
  raiseSizes: BetSize[]
  donkBetAllowed: boolean
  minRaise: number // in big blinds
}

/** Full bet sizing schema for a scenario */
export interface BetSizingSchema {
  id: string
  name: string // "Standard", "Small", "Large", "Custom"
  description: string
  preflop: SizingStageConfig
  flop: SizingStageConfig
  turn: SizingStageConfig
  river: SizingStageConfig
}

/** The state of a poker hand at a decision point */
export interface GameState {
  gameType: GameType
  heroPosition: Position
  villainPosition: Position
  effectiveStack: number // in big blinds
  potSize: number // in big blinds
  board: CardString[] // 0 cards preflop, 3 flop, 4 turn, 5 river
  street: Street
  actions: Action[] // action history to reach this point
  betSizingSchemaId: string
  isHeroOOP: boolean // is hero out of position?
}

/** A unique scenario identifier */
export interface ScenarioId {
  gameType: GameType
  heroPosition: Position
  villainPosition: Position
  effectiveStack: number
  board: CardString[]
  street: Street
  actionsHash: string // deterministic hash of action history
  sizingSchemaId: string
}

/** Summary of a scenario for browsing/searching */
export interface ScenarioSummary {
  id: string
  label: string // Human-readable: "BTN vs BB, 100bb, Cash, SRP"
  gameType: GameType
  heroPosition: Position
  effectiveStack: number
  street: Street
  board: CardString[]
  potType: string // "SRP", "3BP", "4BP"
  description: string
}

/** All 169 possible starting hand combos (13x13 matrix positions) */
export interface ComboInfo {
  key: ComboKey // "AA", "AKs", "AKo", "T9o", etc.
  rank1: Rank
  rank2: Rank
  suited: boolean // true = suited, false = offsuit
  pair: boolean // true = pocket pair
  row: number // 0-12 (row in 13x13 grid, Ace high = 0)
  col: number // 0-12 (col in 13x13 grid, Ace high = 0)
}

/** Rank display chars */
export const RANK_CHARS: Record<Rank, string> = {
  14: 'A',
  13: 'K',
  12: 'Q',
  11: 'J',
  10: 'T',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2',
}

/** All ranks in descending order (Ace high) */
export const ALL_RANKS: Rank[] = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]

/** Suit symbols for display */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
}

/** Suit colors */
export const SUIT_COLORS: Record<Suit, string> = {
  s: '#000000',
  h: '#DC2626',
  d: '#2563EB',
  c: '#16A34A',
}

// ============================================================
// Opponent Types — 对手类型分类系统
// ============================================================

/** 对手玩家类型 — 基于 VPIP/PFR 统计的七种分类 */
export type OpponentTypeType =
  | 'nit'              // 岩石玩家：极紧，只玩强牌
  | 'tag'              // 紧凶玩家：ABC 坚实打法
  | 'lag'              // 松凶玩家：频繁施压
  | 'calling_station'  // 跟注站：过度跟注，极少弃牌
  | 'maniac'           // 疯子：极度激进，大量诈唬
  | 'reg'              // 常客/Pro：接近 GTO 的平衡打法
  | 'unknown'          // 未知玩家：默认按 GTO 处理

/** 对手类型完整档案 — 包含统计特征和剥削建议 */
export interface OpponentProfile {
  type: OpponentTypeType
  label: string           // 中文标签，如 "岩石玩家 (Nit)"
  vpip: number            // 入池率 0-100
  pfr: number             // 翻前加注率 0-100
  threebet: number        // 3-bet 频率 0-100
  foldToCbet: number      // 面对 c-bet 弃牌率 0-100
  aggression: number      // 激进因子 0-100
  wtsd: number            // 进入摊牌率 0-100
  description: string     // 一句话描述
  exploitStrategy: string // 总体剥削策略简述
  color: string           // UI 显示颜色 tailwind class
}

/** 所有预定义对手类型档案 */
export const OPPONENT_PROFILES: Record<OpponentTypeType, OpponentProfile> = {
  nit: {
    type: 'nit',
    label: '岩石玩家 (Nit)',
    vpip: 12, pfr: 8, threebet: 2, foldToCbet: 68, aggression: 25, wtsd: 22,
    description: '极紧，只玩强牌，面对压力容易弃牌',
    exploitStrategy: '多偷盲、高频 cbet、被反抗就弃牌。不要诈唬他们。',
    color: 'slate',
  },
  tag: {
    type: 'tag',
    label: '紧凶玩家 (TAG)',
    vpip: 18, pfr: 15, threebet: 5, foldToCbet: 50, aggression: 45, wtsd: 28,
    description: 'ABC 坚实打法，有纪律，范围较线性',
    exploitStrategy: '极化 3-bet 范围，攻击其 capped range，寻找其 over-fold 的场景。',
    color: 'blue',
  },
  lag: {
    type: 'lag',
    label: '松凶玩家 (LAG)',
    vpip: 28, pfr: 22, threebet: 10, foldToCbet: 42, aggression: 62, wtsd: 30,
    description: '频繁施压，范围宽但极化，攻击性强',
    exploitStrategy: '设陷阱慢打强牌，check-raise 更多，跟注抓诈更宽。4-bet bluff 反制。',
    color: 'orange',
  },
  calling_station: {
    type: 'calling_station',
    label: '跟注站 (Calling Station)',
    vpip: 35, pfr: 12, threebet: 3, foldToCbet: 35, aggression: 20, wtsd: 38,
    description: '什么牌都跟，极少弃牌，被动型送钱机器',
    exploitStrategy: '价值下注更薄（中对即下注），永远不要 triple barrel 诈唬，用大尺度榨取价值。',
    color: 'green',
  },
  maniac: {
    type: 'maniac',
    label: '疯子 (Maniac)',
    vpip: 45, pfr: 35, threebet: 18, foldToCbet: 25, aggression: 75, wtsd: 32,
    description: '极度激进，大量 3-bet 和诈唬，完全不按牌理出牌',
    exploitStrategy: '收紧到前 15% 范围，设陷阱等强牌，让他们 bluff 你。最小加注诱导继续诈唬。',
    color: 'red',
  },
  reg: {
    type: 'reg',
    label: '常客/Pro (Reg)',
    vpip: 22, pfr: 18, threebet: 7, foldToCbet: 48, aggression: 50, wtsd: 30,
    description: '平衡良好的常规玩家，接近 GTO 策略',
    exploitStrategy: '按 GTO 基线打，只有在有明确对手倾向数据时才做针对性偏移。',
    color: 'purple',
  },
  unknown: {
    type: 'unknown',
    label: '未知玩家 (Unknown)',
    vpip: 22, pfr: 17, threebet: 6, foldToCbet: 48, aggression: 42, wtsd: 28,
    description: '无数据的新玩家，默认按 GTO 处理',
    exploitStrategy: '使用 GTO 基线策略。快速收集数据（VPIP/PFR/fold to cbet）再决定偏移方向。',
    color: 'neutral',
  },
}
