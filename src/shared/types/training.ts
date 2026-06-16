import type { ComboKey, Position, GameType, CardString } from './poker'

// ============================================================
// Training / Quiz Mode Types
// ============================================================

/** Configuration for a training session */
export interface TrainingConfig {
  gameType: GameType
  positions: Position[]
  stackDepths: number[]
  streets: ('preflop' | 'flop' | 'turn' | 'river')[]
  potTypes: string[]
  difficulty: TrainingDifficulty
  questionCount: number
  timeLimitPerQuestion?: number // seconds, undefined = no limit
}

export type TrainingDifficulty = 'easy' | 'medium' | 'hard'

/** A single training question */
export interface TrainingQuestion {
  id: string
  scenarioId: string
  description: string // "BTN vs BB, 100bb, Flop K♠7♥2♦, you face a 33% c-bet"
  board: CardString[]
  heroPosition: Position
  effectiveStack: number
  potSize: number
  street: string
  actions: string // action history so far
  questionType: 'range' | 'action' | 'frequency'
  // For range questions:
  correctRange?: Record<ComboKey, number>
  // For action questions:
  options?: TrainingActionOption[]
  correctActionIndex?: number
  // For frequency questions:
  correctFrequencies?: Record<string, number> // action -> frequency
}

export interface TrainingActionOption {
  label: string
  action: string
  isCorrect: boolean
}

/** User's answer to a training question */
export interface UserAnswer {
  questionId: string
  // Range answer:
  selectedCombos?: Record<ComboKey, number>
  // Action answer:
  selectedActionIndex?: number
  // Frequency answer:
  selectedFrequencies?: Record<string, number>
  timeSpentMs: number
}

/** Feedback after answering a question */
export interface TrainingFeedback {
  isCorrect: boolean
  evDifference: number // EV lost (in bb) compared to GTO
  correctAnswer: {
    range?: Record<ComboKey, number>
    actionIndex?: number
    frequencies?: Record<string, number>
  }
  explanation: string
  mistakes: TrainingMistake[]
}

export interface TrainingMistake {
  comboKey?: ComboKey
  yourAction: string
  correctAction: string
  evLost: number
  severity: 'minor' | 'moderate' | 'major'
}

/** Session-level training statistics */
export interface TrainingStats {
  sessionId: string
  startTime: string
  endTime?: string
  totalQuestions: number
  correctAnswers: number
  accuracy: number // 0-1
  totalEVLost: number // cumulative EV lost
  avgEVLostPerQuestion: number
  weakAreas: WeakArea[]
  questions: TrainingQuestionResult[]
}

export interface TrainingQuestionResult {
  question: TrainingQuestion
  userAnswer: UserAnswer
  feedback: TrainingFeedback
}

/** Identified weak area in player's game */
export interface WeakArea {
  category: string // "3bet defense", "c-betting OOP", etc.
  frequency: number
  avgEVLost: number
  severity: 'low' | 'medium' | 'high'
  recommendation: string
}

/** Training session state */
export type TrainingSessionState = 'idle' | 'configuring' | 'active' | 'reviewing' | 'completed'
