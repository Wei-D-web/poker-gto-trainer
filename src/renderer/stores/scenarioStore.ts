import { create } from 'zustand'
import type { GameType, Position, Street } from '@shared/types/poker'
import { POSITION_LABELS } from '@shared/types/poker'
import type { ScenarioSummary } from '@shared/types/scenario'
import { DEFAULT_SCHEMA_ID } from '@shared/constants/bet-sizings'
import { COMMON_STACK_DEPTHS } from '@shared/constants/stack-depths'

interface ScenarioStore {
  // Selection state
  gameType: GameType
  heroPosition: Position
  villainPosition: Position
  stackDepth: number
  sizingSchemaId: string
  street: Street
  board: string[]
  isHeroOOP: boolean

  // Scenario data
  currentScenarioId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setGameType: (gt: GameType) => void
  setHeroPosition: (pos: Position) => void
  setVillainPosition: (pos: Position) => void
  setStackDepth: (bb: number) => void
  setSizingSchema: (id: string) => void
  flipPositions: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentScenarioId: (id: string | null) => void

  // Derived
  heroLabel: string
  villainLabel: string
}

export const useScenarioStore = create<ScenarioStore>((set, get) => ({
  gameType: 'cash',
  heroPosition: 3, // BTN default
  villainPosition: 5, // BB default
  stackDepth: 100,
  sizingSchemaId: DEFAULT_SCHEMA_ID,
  street: 'preflop',
  board: [],
  isHeroOOP: false,

  currentScenarioId: null,
  isLoading: false,
  error: null,

  setGameType: (gt) => set({ gameType: gt, currentScenarioId: null }),
  setHeroPosition: (pos) => {
    // Auto-set villain position if same
    const state = get()
    set({
      heroPosition: pos,
      villainPosition: state.villainPosition === pos ? ((pos + 1) % 6) as Position : state.villainPosition,
      isHeroOOP: pos > state.villainPosition || (pos === 4 && state.villainPosition === 5),
      currentScenarioId: null,
    })
  },
  setVillainPosition: (pos) => {
    const state = get()
    set({
      villainPosition: pos,
      isHeroOOP: state.heroPosition > pos || (state.heroPosition === 4 && pos === 5),
      currentScenarioId: null,
    })
  },
  setStackDepth: (bb) => set({ stackDepth: bb, currentScenarioId: null }),
  setSizingSchema: (id) => set({ sizingSchemaId: id }),
  flipPositions: () => {
    const { heroPosition, villainPosition } = get()
    set({
      heroPosition: villainPosition,
      villainPosition: heroPosition,
      isHeroOOP: villainPosition > heroPosition,
      currentScenarioId: null,
    })
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentScenarioId: (id) => set({ currentScenarioId: id }),

  get heroLabel() {
    return POSITION_LABELS[get().heroPosition]
  },
  get villainLabel() {
    return POSITION_LABELS[get().villainPosition]
  },
}))
