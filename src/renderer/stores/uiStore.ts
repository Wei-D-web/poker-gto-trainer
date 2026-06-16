import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface UIStore {
  theme: Theme
  sidebarCollapsed: boolean
  splitRatio: number // horizontal split (strategy explorer)
  activeRoute: string
  showEquity: boolean
  showEV: boolean

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSplitRatio: (ratio: number) => void
  setActiveRoute: (route: string) => void
  toggleEquity: () => void
  toggleEV: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  splitRatio: 0.55,
  activeRoute: 'analyzer',
  showEquity: true,
  showEV: true,

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  toggleEquity: () => set((s) => ({ showEquity: !s.showEquity })),
  toggleEV: () => set((s) => ({ showEV: !s.showEV })),
}))
