import { create } from 'zustand'
import type { TrainingConfig, TrainingQuestion, TrainingFeedback, TrainingQuestionResult, TrainingSessionState, TrainingActionOption } from '@shared/types/training'
import type { ComboKey, Position } from '@shared/types/poker'
import { POSITION_LABELS } from '@shared/types/poker'

// ============================================================
// Hard training questions — preflop + postflop
// ============================================================

const HARD_QUESTIONS: TrainingQuestion[] = [
  // -- PREFLOP --
  {
    id: 'q1', scenarioId: 'bt100',
    description: 'BTN vs BB，100bb，你在 BTN，前面全弃牌。AKo 应该怎么做？',
    board: [], heroPosition: 3, effectiveStack: 100, potSize: 1.5, street: 'preflop', actions: '[]', questionType: 'action',
    options: [
      { label: 'Open 2.5bb (标准)', action: 'open', isCorrect: true },
      { label: 'Limp', action: 'limp', isCorrect: false },
      { label: 'Fold', action: 'fold', isCorrect: false },
      { label: 'Open 5bb', action: 'open_5', isCorrect: false },
    ],
  },
  {
    id: 'q2', scenarioId: 'bb100',
    description: 'BTN open 2.5bb，你在 BB 持 A5s。100bb 深度。应该？',
    board: [], heroPosition: 5, effectiveStack: 100, potSize: 4, street: 'preflop', actions: '[]', questionType: 'action',
    options: [
      { label: 'Call (防守)', action: 'call', isCorrect: true },
      { label: '3-bet 到 10bb', action: '3bet', isCorrect: false },
      { label: 'Fold', action: 'fold', isCorrect: false },
    ],
  },
  {
    id: 'q3', scenarioId: 'utg100',
    description: 'UTG open 2.5bb，BTN 3-bet 到 8bb。你在 UTG 持 JJ，100bb。？',
    board: [], heroPosition: 0, effectiveStack: 100, potSize: 12, street: 'preflop', actions: '[]', questionType: 'action',
    options: [
      { label: 'Call (控池)', action: 'call', isCorrect: true },
      { label: '4-bet 到 20bb', action: '4bet', isCorrect: false },
      { label: 'Fold (太紧了)', action: 'fold', isCorrect: false },
      { label: 'All-in 100bb', action: 'allin', isCorrect: false },
    ],
  },

  // -- A-HIGH DRY FLOP (A72r) --
  {
    id: 'q4', scenarioId: 'a72r_btn',
    description: 'BTN vs BB，A♠7♦2♣ 彩虹面。你是 BTN，IP。GTO 建议的 cbet 频率和尺度？',
    board: ['As', '7d', '2c'], heroPosition: 3, effectiveStack: 100, potSize: 6, street: 'flop', actions: '[]', questionType: 'action',
    options: [
      { label: '高频 33% (约70%)', action: 'bet_33_high', isCorrect: true },
      { label: '中频 50% (约50%)', action: 'bet_50_mid', isCorrect: false },
      { label: '低频 75% (约30%)', action: 'bet_75_low', isCorrect: false },
      { label: '100% 过牌', action: 'check_all', isCorrect: false },
    ],
  },
  {
    id: 'q5', scenarioId: 'a72r_kqo',
    description: 'BTN vs BB，A♠7♦2♣。你持 KQo（无任何击中）。GTO 建议？',
    board: ['As', '7d', '2c'], heroPosition: 3, effectiveStack: 100, potSize: 6, street: 'flop', actions: '[]', questionType: 'action',
    options: [
      { label: '高频 cbet 33% (有后门潜力)', action: 'bet_33', isCorrect: true },
      { label: '纯过牌/弃牌', action: 'check_fold', isCorrect: false },
      { label: 'bet 75% (诈唬)', action: 'bet_75', isCorrect: false },
      { label: '100% 过牌', action: 'check_100', isCorrect: false },
    ],
  },

  // -- MONOTONE FLOP (all hearts) --
  {
    id: 'q6', scenarioId: 'mono_btn',
    description: 'BTN vs BB，K♥9♥4♥ 单色面。BTN 的总体 cbet 频率应该？',
    board: ['Kh', '9h', '4h'], heroPosition: 3, effectiveStack: 100, potSize: 6, street: 'flop', actions: '[]', questionType: 'action',
    options: [
      { label: '低频 (~40%，选择性下注)', action: 'low_freq', isCorrect: true },
      { label: '高频 (~70%)', action: 'high_freq', isCorrect: false },
      { label: '0% (永远不过牌)', action: 'never_check', isCorrect: false },
      { label: '100% cbet', action: 'always_bet', isCorrect: false },
    ],
  },
  {
    id: 'q7', scenarioId: 'mono_ah',
    description: 'K♥9♥4♥ 单色面，你持 A♥3♠（有坚果同花听牌）。GTO 行动？',
    board: ['Kh', '9h', '4h'], heroPosition: 3, effectiveStack: 100, potSize: 6, street: 'flop', actions: '[]', questionType: 'action',
    options: [
      { label: 'Bet 50% (半诈唬听牌)', action: 'bet_50', isCorrect: true },
      { label: 'Bet 33%', action: 'bet_33', isCorrect: false },
      { label: 'Check (控池)', action: 'check', isCorrect: false },
      { label: 'Fold', action: 'fold', isCorrect: false },
    ],
  },

  // -- PAIRED BOARD (QQ5) --
  {
    id: 'q8', scenarioId: 'paired_cbet',
    description: 'BTN vs BB，Q♠Q♦5♣ 公对面。GTO 建议 cbet 频率？',
    board: ['Qs', 'Qd', '5c'], heroPosition: 3, effectiveStack: 100, potSize: 6, street: 'flop', actions: '[]', questionType: 'action',
    options: [
      { label: '极高频率 33% (~80%)', action: 'very_high', isCorrect: true },
      { label: '中频 50%', action: 'mid_freq', isCorrect: false },
      { label: 'OOP不cbet', action: 'no_cbet', isCorrect: false },
    ],
  },

  // -- CONNECTED FLOP (JT9) --
  {
    id: 'q9', scenarioId: 'jt9_btn',
    description: 'BTN vs BB，J♦T♦9♠ 高连接双色面。GTO 偏好的尺度和频率？',
    board: ['Jd', 'Td', '9s'], heroPosition: 3, effectiveStack: 100, potSize: 6, street: 'flop', actions: '[]', questionType: 'action',
    options: [
      { label: '低频 75% (~40%)', action: 'low_75', isCorrect: true },
      { label: '高频 33%', action: 'high_33', isCorrect: false },
      { label: '100% check', action: 'all_check', isCorrect: false },
      { label: '高频 150%', action: 'overbet', isCorrect: false },
    ],
  },
  {
    id: 'q10', scenarioId: 'jt9_set',
    description: 'J♦T♦9♠，你持 99 (中暗三条)。GTO 行动？',
    board: ['Jd', 'Td', '9s'], heroPosition: 3, effectiveStack: 100, potSize: 6, street: 'flop', actions: '[]', questionType: 'action',
    options: [
      { label: 'Bet 75% (强价值，需保护)', action: 'bet_75', isCorrect: true },
      { label: 'Bet 33%', action: 'bet_33', isCorrect: false },
      { label: 'Check-raise', action: 'check_raise', isCorrect: false },
      { label: 'Check-call (慢打)', action: 'check_call', isCorrect: false },
    ],
  },

  // -- TURN SCENARIOS --
  {
    id: 'q11', scenarioId: 'turn_double',
    description: 'BTN vs BB，A♠7♦2♣ T♥ 转牌。你 flop cbet 33%，BB call。转牌你应该？',
    board: ['As', '7d', '2c', 'Th'], heroPosition: 3, effectiveStack: 100, potSize: 10, street: 'turn', actions: '[]', questionType: 'action',
    options: [
      { label: '高频 double barrel 75%', action: 'bet_75', isCorrect: true },
      { label: 'Check back 控池', action: 'check', isCorrect: false },
      { label: 'Bet 33% again', action: 'bet_33', isCorrect: false },
    ],
  },
  {
    id: 'q12', scenarioId: 'turn_scare',
    description: 'BTN vs BB，Q♠Q♦5♣ K♥。你在 BTN 持 88。Flop 你 cbet 过。转牌？',
    board: ['Qs', 'Qd', '5c', 'Kh'], heroPosition: 3, effectiveStack: 100, potSize: 10, street: 'turn', actions: '[]', questionType: 'action',
    options: [
      { label: 'Check back (放弃，无摊牌价值)', action: 'check', isCorrect: true },
      { label: 'Double barrel 诈唬', action: 'bet_bluff', isCorrect: false },
      { label: 'Bet 33%', action: 'bet_33', isCorrect: false },
    ],
  },
]

// ============================================================
// Store
// ============================================================

interface TrainingStore {
  sessionState: TrainingSessionState
  config: TrainingConfig | null
  currentQuestion: TrainingQuestion | null
  feedback: TrainingFeedback | null
  results: TrainingQuestionResult[]
  questionIndex: number
  shuffledQuestions: TrainingQuestion[]

  setConfig: (config: TrainingConfig) => void
  startSession: () => void
  submitAnswer: (selectedAction: string) => void
  nextQuestion: () => void
  endSession: () => void
  resetSession: () => void
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  sessionState: 'idle',
  config: null,
  currentQuestion: null,
  feedback: null,
  results: [],
  questionIndex: 0,
  shuffledQuestions: [],

  setConfig: (config) => set({ config }),

  startSession: () => {
    const { config } = get()
    if (!config) return

    // Generate dynamic questions
    const generated = generateDynamicQuestions(config.questionCount, {
      positions: config.positions as Position[],
      stackDepths: config.stackDepths,
      streets: config.streets as string[],
    })

    const shuffled = [...generated].sort(() => Math.random() - 0.5).slice(0, config.questionCount)

    set({
      sessionState: 'active',
      currentQuestion: shuffled[0] || null,
      shuffledQuestions: shuffled,
      feedback: null,
      results: [],
      questionIndex: 0,
    })
  },

  submitAnswer: (selectedAction) => {
    const { currentQuestion, results } = get()
    if (!currentQuestion) return

    const correctOption = currentQuestion.options?.find(o => o.isCorrect)
    const isCorrect = correctOption?.action === selectedAction
    // Deterministic EV loss based on question difficulty
    const evDifference = isCorrect ? 0 : currentQuestion.street === 'preflop' ? 2.5 :
      currentQuestion.street === 'flop' ? 1.5 :
      currentQuestion.street === 'turn' ? 3.0 : 5.0

    const feedback: TrainingFeedback = {
      isCorrect,
      evDifference,
      correctAnswer: { actionIndex: currentQuestion.options?.findIndex(o => o.isCorrect) ?? 0 },
      explanation: isCorrect
        ? getCorrectExplanation(currentQuestion.id)
        : getWrongExplanation(currentQuestion.id, selectedAction),
      mistakes: isCorrect ? [] : [{
        yourAction: selectedAction,
        correctAction: correctOption?.action || 'unknown',
        evLost: evDifference,
        severity: evDifference > 0.08 ? 'major' : 'moderate',
      }],
    }

    const result: TrainingQuestionResult = {
      question: currentQuestion,
      userAnswer: {
        questionId: currentQuestion.id,
        selectedCombos: {},
        selectedActionIndex: currentQuestion.options?.findIndex(o => o.action === selectedAction) ?? -1,
        timeSpentMs: 0,
      },
      feedback,
    }

    set({ feedback, results: [...results, result] })
  },

  nextQuestion: () => {
    const { shuffledQuestions, questionIndex } = get()
    const nextIdx = questionIndex + 1

    if (nextIdx >= shuffledQuestions.length) {
      set({ sessionState: 'completed' })
      return
    }

    set({
      currentQuestion: shuffledQuestions[nextIdx],
      feedback: null,
      questionIndex: nextIdx,
    })
  },

  endSession: () => set({ sessionState: 'completed' }),
  resetSession: () => set({
    sessionState: 'idle', config: null, currentQuestion: null,
    feedback: null, results: [], questionIndex: 0, shuffledQuestions: [],
  }),
}))

// ============================================================
// Explanations
// ============================================================

function getCorrectExplanation(id: string): string {
  const map: Record<string, string> = {
    'q1': '正确！AKo 在 BTN 是 100% 开池牌。标准尺度 2.5bb 在 100bb 深度是最优的。',
    'q2': '正确！A5s 在 BB vs BTN open 是一个标准的防守牌。有 flush 潜力和 A 的摊牌价值。',
    'q3': '正确！JJ vs BTN 3-bet，UTG 应该 flat call。4-bet 只会让更好的牌 call，更差的牌 fold。',
    'q4': '正确！A72r 是经典的 A 高干燥面。BTN 有范围优势，用 33% 小尺度高频 cbet。',
    'q5': '正确！KQo 在 A72r 上虽然是 air，但有后门顺子 + 两高张潜力，GTO 会用部分频率 cbet 小尺度。',
    'q6': '正确！单色面大幅降低 cbet 频率，因为对手有很多同花/同花听牌。',
    'q7': '正确！有坚果同花听牌在单色面是强半诈唬，50% 尺度平衡价值和诈唬。',
    'q8': '正确！公对面 BTN 有巨大的范围 + 坚果优势，可以极高频率小额 cbet。',
    'q9': '正确！高连接面对翻前加注者不利，范围劣势。需要低频大尺度。',
    'q10': '正确！J♦T♦9♠ 极度湿润，暗三条需要大尺度下注来保护，拒绝对方的 equity。',
    'q11': '正确！A72r T♥ 转牌对 BTN 范围仍然有利，应该继续高频双枪。',
    'q12': '正确！88 在 QQ5K 面上几乎没有摊牌价值，也没有阻断对手的强牌，应该放弃。',
  }
  return map[id] || '符合 GTO 策略！'
}

// ============================================================
// Dynamic question generator
// ============================================================

const DYNAMIC_BOARDS = [
  ['As','7d','2c'], ['Ah','Th','3d'], ['Ks','8d','3c'], ['Qh','Qd','5c'],
  ['Kh','9h','4h'], ['Jd','Td','9s'], ['8h','7h','6s'], ['As','Ts','9h'],
  ['Ad','9s','4c'], ['Kh','Qd','5s'], ['Qs','7h','2d'], ['9s','6d','2c'],
  ['Js','6d','2c'], ['Ts','5d','3c'], ['Ah','3d','5c'], ['Ks','Kd','Jc'],
  ['8h','8d','4s'], ['5s','5d','Ah'], ['Th','9h','8h'], ['As','Qs','Ts'],
  ['9h','8d','7c'], ['Qh','Td','8s'], ['Kh','Jd','9h'], ['Kh','Qh','Jd'],
  ['6h','5d','4s'], ['As','Ks','Qd'], ['Jh','Jd','7h'], ['7s','4d','2c'],
]

const POSITIONS = [0,1,2,3,4,5] as Position[]
const POS_LABELS = ['UTG','MP','CO','BTN','SB','BB']
const DEPTHS = [20,30,50,75,100,150]

function generateDynamicQuestions(count: number, cfg: { positions: Position[]; stackDepths: number[]; streets: string[] }): TrainingQuestion[] {
  const questions: TrainingQuestion[] = []
  const used = new Set<string>()

  for (let i = 0; i < count * 3 && questions.length < count; i++) {
    const pos = cfg.positions[Math.floor(Math.random() * cfg.positions.length)] || 3
    const stack = cfg.stackDepths[Math.floor(Math.random() * cfg.stackDepths.length)] || 100
    const street = cfg.streets[Math.floor(Math.random() * cfg.streets.length)] || 'preflop'
    const board = DYNAMIC_BOARDS[Math.floor(Math.random() * DYNAMIC_BOARDS.length)]
    const key = `${pos}_${stack}_${street}_${board.join('')}`

    if (used.has(key)) continue
    used.add(key)

    const isPreflop = street === 'preflop'
    const desc = isPreflop
      ? `${POS_LABELS[pos]}，${stack}bb，你持什么手牌应该开池？`
      : `${POS_LABELS[pos]} vs BB，${stack}bb，${board.join(' ')}。GTO建议？`

    const opts = isPreflop
      ? [
          { label: getRandomPremiumHand(), action: 'open', isCorrect: true },
          { label: getRandomMarginalHand(), action: 'open_marginal', isCorrect: false },
          { label: getRandomTrashHand(), action: 'fold', isCorrect: false },
          { label: '全部手牌', action: 'all', isCorrect: false },
        ]
      : getBoardTextureOptions(board)

    questions.push({
      id: `dyn_${i}`,
      scenarioId: key,
      description: desc,
      board: isPreflop ? [] : board,
      heroPosition: pos,
      effectiveStack: stack,
      potSize: stack * 0.12,
      street,
      actions: '[]',
      questionType: 'action',
      options: opts,
    })
  }

  return questions
}

const PREMIUM = ['AA','KK','QQ','AKs','AKo','JJ','AQs']
const MARGINAL = ['A9s','KTo','QJo','JTs','55','76s','A5s','K9s','T9s','44']
const TRASH = ['72o','83o','94o','T2o','J3o','62o','73o','32o','84o','95o']

function getRandomPremiumHand() { return PREMIUM[Math.floor(Math.random()*PREMIUM.length)] }
function getRandomMarginalHand() { return MARGINAL[Math.floor(Math.random()*MARGINAL.length)] }
function getRandomTrashHand() { return TRASH[Math.floor(Math.random()*TRASH.length)] }

/** Get board-texture-aware options for postflop training questions */
function getBoardTextureOptions(board: string[]): TrainingActionOption[] {
  const rankMap: Record<string, number> = { A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const ranks = board.map(c => rankMap[c[0]] || 0)
  const suits = board.map(c => c[1])
  const uniqueRanks = [...new Set(ranks)]
  const uniqueSuits = [...new Set(suits)]
  const isPaired = uniqueRanks.length < ranks.length
  const isMonotone = uniqueSuits.length === 1
  const isConnected = ranks.length >= 3 && Math.max(...ranks) - Math.min(...ranks) <= 4

  if (isPaired) {
    // Paired boards → very high frequency small sizing
    return [
      { label: '高频33% cbet (~80%)', action: 'bet_33_high', isCorrect: true },
      { label: '中频50%', action: 'bet_50_mid', isCorrect: false },
      { label: 'Check', action: 'check', isCorrect: false },
      { label: '全范围过牌', action: 'check_all', isCorrect: false },
    ]
  } else if (isMonotone) {
    // Monotone → low frequency, medium sizing
    return [
      { label: '低频50% (~35-40%)', action: 'bet_50_low', isCorrect: true },
      { label: '高频33%', action: 'bet_33_high', isCorrect: false },
      { label: '100% cbet', action: 'always_bet', isCorrect: false },
      { label: '全范围过牌', action: 'check_all', isCorrect: false },
    ]
  } else if (isConnected) {
    // Connected/wet → low frequency, large sizing
    return [
      { label: '低频75% (~40%)', action: 'bet_75_low', isCorrect: true },
      { label: '高频33%', action: 'bet_33_high', isCorrect: false },
      { label: '100% check', action: 'check_100', isCorrect: false },
      { label: '全范围过牌', action: 'check_all', isCorrect: false },
    ]
  } else if (ranks.includes(14)) {
    // A-high dry → high frequency small sizing
    return [
      { label: '高频33% cbet (~70%)', action: 'bet_33_high', isCorrect: true },
      { label: '中频50%', action: 'bet_50_mid', isCorrect: false },
      { label: '低频75%', action: 'bet_75_low', isCorrect: false },
      { label: '全范围过牌', action: 'check_all', isCorrect: false },
    ]
  } else {
    // Default: rainbow/medium boards → moderate frequency
    return [
      { label: '中频33-50% cbet', action: 'bet_33_high', isCorrect: true },
      { label: '低频75%', action: 'bet_75_low', isCorrect: false },
      { label: '全范围过牌', action: 'check_all', isCorrect: false },
      { label: '100% cbet', action: 'always_bet', isCorrect: false },
    ]
  }
}

function getWrongExplanation(id: string, action: string): string {
  const map: Record<string, string> = {
    'q1': 'AKo 在 BTN 绝对是 open，从来不 lim 也不 fold。这是最 +EV 的手牌之一。',
    'q3': 'JJ 面对 BTN 3-bet 4-bet 会隔离自己对抗 QQ+/AK，flat call 保留对手的 bluff 范围。',
    'q4': 'A72r BTN 应该高频小尺度 cbet。大尺度浪费了位置优势。过牌则损失太多 EV。',
    'q5': 'KQo 在 A72r 有 backdoor straight draw，偶尔 cbet 是 GTO 混合策略的一部分。纯 fold 太弱。',
    'q6': '单色面大幅降低 cbet 频率。高频 cbet 会被对手的同花/听牌 exploit。',
    'q7': '有坚果同花听牌必须下注。Check 会损失价值，fold 是不可能的。',
    'q8': '公对面几乎永远应该 cbet。范围优势太大，check 就是放弃 EV。',
    'q9': 'JT9 高连接面必须低频大尺度。高频小尺度会被 raise 到死。',
    'q10': '暗三条在湿润面需要大尺度保护。小尺度给对手太好的赔率追牌。',
    'q11': 'A高干燥面转牌空白，继续 double barrel 是标准。Check 会放弃太多 EV。',
    'q12': '88 在这个面 check 是对的。Double barrel 诈唬在这里 -EV。',
  }
  return map[id] || '这不是 GTO 推荐的行动，会损失 EV。'
}
