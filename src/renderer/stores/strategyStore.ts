import { create } from 'zustand'
import type { StrategyData, PreflopRange, MatrixDisplayMode } from '@shared/types/strategy'
import type { ComboKey } from '@shared/types/poker'

interface StrategyStore {
  // Strategy data
  heroStrategy: StrategyData | null
  villainStrategy: StrategyData | null
  heroRange: PreflopRange | null
  villainRange: PreflopRange | null

  // UI state
  displayMode: MatrixDisplayMode
  selectedCombo: ComboKey | null
  hoveredCombo: ComboKey | null

  // Actions
  setHeroStrategy: (strategy: StrategyData | null) => void
  setVillainStrategy: (strategy: StrategyData | null) => void
  setHeroRange: (range: PreflopRange | null) => void
  setVillainRange: (range: PreflopRange | null) => void
  setDisplayMode: (mode: MatrixDisplayMode) => void
  selectCombo: (combo: ComboKey | null) => void
  hoverCombo: (combo: ComboKey | null) => void

  // Derived
  activeStrategy: StrategyData | null
}

export const useStrategyStore = create<StrategyStore>((set, get) => ({
  heroStrategy: null,
  villainStrategy: null,
  heroRange: null,
  villainRange: null,

  displayMode: 'hero',
  selectedCombo: null,
  hoveredCombo: null,

  setHeroStrategy: (strategy) => set({ heroStrategy: strategy }),
  setVillainStrategy: (strategy) => set({ villainStrategy: strategy }),
  setHeroRange: (range) => set({ heroRange: range }),
  setVillainRange: (range) => set({ villainRange: range }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  selectCombo: (combo) => set({ selectedCombo: combo }),
  hoverCombo: (combo) => set({ hoveredCombo: combo }),

  get activeStrategy() {
    const { heroStrategy, villainStrategy, displayMode } = get()
    if (displayMode === 'hero') return heroStrategy
    if (displayMode === 'villain') return villainStrategy
    return heroStrategy // default to hero for 'diff' and 'merged'
  },
}))
