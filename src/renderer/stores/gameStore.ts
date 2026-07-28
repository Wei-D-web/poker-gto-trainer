/**
 * Game Store — Zustand state for AI battle mode
 */
import { create } from 'zustand'
import {
  createGame,
  applyAction,
  getAIDecision,
  getAvailableActions,
  canAct,
  type GameState,
  type GameAction,
  type SessionStats,
  type Street,
} from '../services/game-simulator'
import type { Position } from '../../shared/types/poker'

// ─── Daily Limit ───────────────────────────────────────────

const DAILY_LIMITS: Record<string, number> = {
  free: 3,
  starter: 10,
  pro: Infinity,
  lifetime: Infinity,
  developer: Infinity,
}

function getDailyKey(): string {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `poker_battle_daily_${today}`
}

function getTodayHands(): number {
  try {
    return parseInt(localStorage.getItem(getDailyKey()) || '0', 10) || 0
  } catch { return 0 }
}

function incrementTodayHands(): number {
  const key = getDailyKey()
  const count = getTodayHands() + 1
  try { localStorage.setItem(key, String(count)) } catch {}
  return count
}

export function getDailyLimit(tier: string): number {
  return DAILY_LIMITS[tier] ?? 3
}

export function getHandsRemaining(tier: string): number {
  return Math.max(0, getDailyLimit(tier) - getTodayHands())
}

// ─── Store Types ───────────────────────────────────────────

interface GameStore {
  // State
  gameState: GameState | null
  isPlaying: boolean
  handsPlayed: number
  sessionStats: SessionStats
  isAIThinking: boolean
  showResult: boolean

  // Actions
  newHand: (heroPos: Position, villainPos: Position, stackDepth: number) => void
  heroAction: (action: { type: GameAction['type']; amount?: number }) => void
  dismissResult: () => void
  resetSession: () => void
}

// ─── Store ─────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  isPlaying: false,
  handsPlayed: 0,
  sessionStats: { handsPlayed: 0, heroWins: 0, villainWins: 0, ties: 0, netProfit: 0, biggestWin: 0, biggestLoss: 0 },
  isAIThinking: false,
  showResult: false,

  newHand: (heroPos: Position, villainPos: Position, stackDepth: number) => {
    const state = get()
    const gs = createGame(heroPos, villainPos, stackDepth)
    const newStats = { ...state.sessionStats, handsPlayed: state.sessionStats.handsPlayed + 1 }

    incrementTodayHands()

    set({
      gameState: gs,
      isPlaying: true,
      showResult: false,
      sessionStats: newStats,
    })

    // If AI acts first, trigger AI move after a delay
    if (gs.currentActor === 'villain') {
      setTimeout(() => get().executeAIMove?.(), 800)
    }
  },

  heroAction: (action: { type: GameAction['type']; amount?: number }) => {
    const { gameState } = get()
    if (!gameState || gameState.currentActor !== 'hero' || gameState.phase === 'showdown') return

    const ga: GameAction = {
      player: 'hero',
      type: action.type,
      amount: action.amount || 0,
      street: gameState.street,
    }

    let ns = applyAction(gameState, ga)
    set({ gameState: ns })

    // Check if hand is over
    if (ns.phase === 'showdown') {
      const stats = get().sessionStats
      const result = ns.result!
      set({
        sessionStats: {
          ...stats,
          heroWins: stats.heroWins + (result.winner === 'hero' ? 1 : 0),
          villainWins: stats.villainWins + (result.winner === 'villain' ? 1 : 0),
          ties: stats.ties + (result.winner === 'tie' ? 1 : 0),
          netProfit: stats.netProfit + result.heroNetWon,
          biggestWin: Math.max(stats.biggestWin, result.heroNetWon),
          biggestLoss: Math.min(stats.biggestLoss, result.heroNetWon),
        },
        showResult: true,
      })
      return
    }

    // If it's AI's turn, trigger after delay
    if (ns.currentActor === 'villain') {
      set({ isAIThinking: true })
      setTimeout(() => {
        const currentState = get().gameState
        if (!currentState || currentState.phase === 'showdown') {
          set({ isAIThinking: false })
          return
        }

        const aiAction = getAIDecision(currentState)
        let updatedState = applyAction(currentState, aiAction)
        set({ gameState: updatedState, isAIThinking: false })

        // Check if hand is over after AI action
        if (updatedState.phase === 'showdown') {
          const stats = get().sessionStats
          const result = updatedState.result!
          set({
            sessionStats: {
              ...stats,
              heroWins: stats.heroWins + (result.winner === 'hero' ? 1 : 0),
              villainWins: stats.villainWins + (result.winner === 'villain' ? 1 : 0),
              ties: stats.ties + (result.winner === 'tie' ? 1 : 0),
              netProfit: stats.netProfit + result.heroNetWon,
              biggestWin: Math.max(stats.biggestWin, result.heroNetWon),
              biggestLoss: Math.min(stats.biggestLoss, result.heroNetWon),
            },
            showResult: true,
          })
        }
      }, 600 + Math.random() * 800) // Add variable delay for realistic feel
    }
  },

  dismissResult: () => {
    set({ showResult: false })
  },

  resetSession: () => {
    set({
      gameState: null,
      isPlaying: false,
      handsPlayed: 0,
      sessionStats: { handsPlayed: 0, heroWins: 0, villainWins: 0, ties: 0, netProfit: 0, biggestWin: 0, biggestLoss: 0 },
      isAIThinking: false,
      showResult: false,
    })
  },

  executeAIMove: (_force = false) => {
    const { gameState, isAIThinking } = get()
    if (!gameState || gameState.phase === 'showdown' || isAIThinking) return
    if (gameState.currentActor !== 'villain') return

    set({ isAIThinking: true })
    setTimeout(() => {
      const currentState = get().gameState
      if (!currentState || currentState.phase === 'showdown') {
        set({ isAIThinking: false })
        return
      }

      const aiAction = getAIDecision(currentState)
      let updatedState = applyAction(currentState, aiAction)
      set({ gameState: updatedState, isAIThinking: false })

      if (updatedState.phase === 'showdown') {
        const stats = get().sessionStats
        const result = updatedState.result!
        set({
          sessionStats: {
            ...stats,
            heroWins: stats.heroWins + (result.winner === 'hero' ? 1 : 0),
            villainWins: stats.villainWins + (result.winner === 'villain' ? 1 : 0),
            ties: stats.ties + (result.winner === 'tie' ? 1 : 0),
            netProfit: stats.netProfit + result.heroNetWon,
            biggestWin: Math.max(stats.biggestWin, result.heroNetWon),
            biggestLoss: Math.min(stats.biggestLoss, result.heroNetWon),
          },
          showResult: true,
        })
      }
    }, 600 + Math.random() * 800)
  },
}))
