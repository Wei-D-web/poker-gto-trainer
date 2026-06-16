/**
 * Session Review Zustand Store — 对局复盘教练状态管理
 */
import { create } from 'zustand'

export interface SessionData {
  id: string
  date: string
  gameType: string
  stakes: string
  tableName: string
  totalHands: number
  durationMinutes: number
  profit: number
  gtoAlignmentScore: number
  heroName: string
  createdAt: number
}

export interface SessionHand {
  id: string
  sessionId: string
  handId: string
  heroHand: string[]
  board: string[]
  heroPosition: number
  villainPosition: number
  effectiveStack: number
  potSize: number
  actions: any[]
  heroWon: boolean | null
  amountWon: number
  totalEVLost: number
  isKeyHand: boolean
  keyHandReason?: string
}

export interface DetectedWeakness {
  id: string
  category: string
  label: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  sampleHandIds: string[]
  trainingFocus: string
}

export interface RangeDeviation {
  combo: string
  row: number
  col: number
  actualFreq: number
  gtoFreq: number
  deviation: number
}

interface SessionReviewState {
  // Data
  sessions: SessionData[]
  selectedSessionId: string | null
  hands: SessionHand[]
  selectedHandId: string | null
  weaknesses: DetectedWeakness[]
  rangeDeviations: RangeDeviation[]
  alignmentScore: number
  totalEVLost: number

  // UI state
  loading: boolean
  activeTab: 'sessions' | 'heatmap' | 'weakness' | 'replayer'
  streetFilter: string
  severityFilter: string

  // Stats
  stats: {
    totalSessions: number
    totalHands: number
    averageAlignment: number
    totalEVLost: number
    topWeakness: string
    weeklyImprovement: number
  } | null

  // Actions
  setSessions: (sessions: SessionData[]) => void
  selectSession: (id: string | null) => void
  selectHand: (id: string | null) => void
  setHands: (hands: SessionHand[]) => void
  setWeaknesses: (weaknesses: DetectedWeakness[]) => void
  setRangeDeviations: (deviations: RangeDeviation[]) => void
  setAlignmentScore: (score: number) => void
  setTotalEVLost: (ev: number) => void
  setLoading: (loading: boolean) => void
  setActiveTab: (tab: 'sessions' | 'heatmap' | 'weakness' | 'replayer') => void
  setStreetFilter: (street: string) => void
  setSeverityFilter: (severity: string) => void
  setStats: (stats: any) => void
  reset: () => void
}

export const useSessionReviewStore = create<SessionReviewState>((set) => ({
  sessions: [],
  selectedSessionId: null,
  hands: [],
  selectedHandId: null,
  weaknesses: [],
  rangeDeviations: [],
  alignmentScore: 0,
  totalEVLost: 0,
  loading: false,
  activeTab: 'sessions',
  streetFilter: 'all',
  severityFilter: 'all',
  stats: null,

  setSessions: (sessions) => set({ sessions }),
  selectSession: (id) => set({ selectedSessionId: id }),
  selectHand: (id) => set({ selectedHandId: id }),
  setHands: (hands) => set({ hands }),
  setWeaknesses: (weaknesses) => set({ weaknesses }),
  setRangeDeviations: (deviations) => set({ rangeDeviations }),
  setAlignmentScore: (score) => set({ alignmentScore: score }),
  setTotalEVLost: (ev) => set({ totalEVLost: ev }),
  setLoading: (loading) => set({ loading }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setStreetFilter: (street) => set({ streetFilter: street }),
  setSeverityFilter: (severity) => set({ severityFilter: severity }),
  setStats: (stats) => set({ stats }),
  reset: () => set({
    hands: [],
    selectedHandId: null,
    weaknesses: [],
    rangeDeviations: [],
    alignmentScore: 0,
    totalEVLost: 0,
    activeTab: 'sessions',
    streetFilter: 'all',
    severityFilter: 'all',
  }),
}))
