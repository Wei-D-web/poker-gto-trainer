/**
 * Bluff Catcher Training Store
 *
 * Manages state for the River Bluff Catcher quiz training module.
 * Generates scenarios via IPC, tracks answers, and provides instant feedback.
 */

import { create } from 'zustand'

// ============================================================
// Types
// ============================================================

export interface BCScenario {
  id: string
  heroHand: string
  board: string[]
  potSize: number
  betSize: number
  betSizing: number
  description: string
  solution: {
    correctAction: 'call' | 'fold'
    mdf: number
    handStrength: string
    blockersValue: string[]
    blockersBluff: string[]
    boardTexture: string
    completedDraws: string[]
    explanation: string
    evCall: number
    requiredEquity: number
    decisionType: 'pure_call' | 'pure_fold' | 'mixed'
    mixedFreq?: number
  }
}

export interface BCQuestion {
  scenario: BCScenario
  options: { label: string; action: 'call' | 'fold'; isCorrect: boolean }[]
}

export interface BCAnswer {
  question: BCQuestion
  selectedAction: string
  isCorrect: boolean
}

export type BCPhase = 'setup' | 'quiz' | 'results'

interface BluffCatcherStore {
  phase: BCPhase
  count: number
  questions: BCQuestion[]
  currentIndex: number
  answers: BCAnswer[]
  correctCount: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'

  setCount: (n: number) => void
  setDifficulty: (d: 'beginner' | 'intermediate' | 'advanced') => void
  startQuiz: () => Promise<void>
  submitAnswer: (action: 'call' | 'fold') => void
  nextQuestion: () => void
  reset: () => void
}

export const useBluffCatcherStore = create<BluffCatcherStore>((set, get) => ({
  phase: 'setup',
  count: 10,
  questions: [],
  currentIndex: 0,
  answers: [],
  correctCount: 0,
  difficulty: 'intermediate',

  setCount: (n) => set({ count: n }),
  setDifficulty: (d) => set({ difficulty: d }),

  startQuiz: async () => {
    const { count } = get()
    set({ phase: 'quiz', currentIndex: 0, answers: [], correctCount: 0, questions: [] })

    try {
      const rawQuestions = await window.electronAPI.training.generateBluffCatchScenarios({
        count,
        includePaired: true,
        includeFlushBoards: true,
        includeStraightBoards: true,
      })

      const questions: BCQuestion[] = rawQuestions.map((raw: {
        scenario: { id: string; heroHand: string; board: string[]; potSize: number; betSize: number; betSizing: number; description: string; solution: any }
        options: { label: string; action: 'call' | 'fold'; isCorrect: boolean }[]
      }) => ({
        scenario: raw.scenario,
        options: raw.options,
      }))

      set({ questions })
    } catch (err) {
      console.error('Failed to generate bluff catcher scenarios:', err)
      // Fallback: generate locally via dynamic import
      try {
        const { generateBluffCatchScenarios } = await import(
          /* @vite-ignore */ '../../../src/main/solver/bluff-catcher-engine'
        )
        const generated = generateBluffCatchScenarios(count)
        set({ questions: generated as unknown as BCQuestion[] })
      } catch (fallbackErr) {
        console.error('Fallback generation failed:', fallbackErr)
        set({ phase: 'setup' })
      }
    }
  },

  submitAnswer: (action) => {
    const { questions, currentIndex, answers, correctCount } = get()
    const q = questions[currentIndex]
    if (!q) return

    const isCorrect = q.options.find(o => o.action === action)?.isCorrect ?? false
    const answer: BCAnswer = { question: q, selectedAction: action, isCorrect }

    set({
      answers: [...answers, answer],
      correctCount: correctCount + (isCorrect ? 1 : 0),
    })
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get()
    if (currentIndex + 1 >= questions.length) {
      set({ phase: 'results' })
    } else {
      set({ currentIndex: currentIndex + 1 })
    }
  },

  reset: () =>
    set({
      phase: 'setup',
      currentIndex: 0,
      answers: [],
      correctCount: 0,
      questions: [],
    }),
}))
