/**
 * Opponent Store — 对手分析与剥削状态管理
 *
 * 管理当前对手类型选择、自定义统计数据和剥削策略视图切换。
 * 用于 Cash 游戏中的对手针对性偏移分析。
 */

import { create } from 'zustand'
import type { OpponentTypeType, OpponentProfile } from '@shared/types/poker'
import { OPPONENT_PROFILES } from '@shared/types/poker'

interface OpponentStore {
  // === 状态 ===
  /** 当前对手类型 */
  opponentType: OpponentTypeType
  /** 是否启用剥削视图（vs GTO baseline） */
  exploitMode: boolean
  /** 是否展开剥削面板 */
  panelExpanded: boolean
  /** 自定义 VPIP（null = 使用预设值） */
  customVpip: number | null
  /** 自定义 PFR（null = 使用预设值） */
  customPfr: number | null
  /** 自定义 fold to cbet（null = 使用预设值） */
  customFoldToCbet: number | null

  // === Actions ===
  setOpponentType: (type: OpponentTypeType) => void
  toggleExploitMode: () => void
  setExploitMode: (enabled: boolean) => void
  togglePanel: () => void
  setCustomStat: (stat: 'vpip' | 'pfr' | 'foldToCbet', value: number | null) => void
  resetCustomStats: () => void

  // === 计算值 ===
  /** 当前对手完整档案（合并自定义 stats） */
  readonly profile: OpponentProfile
  /** 对手颜色映射（用于 UI） */
  readonly colorMap: Record<OpponentTypeType, string>
  /** 中文类型标签 */
  readonly typeLabel: string
}

export const useOpponentStore = create<OpponentStore>((set, get) => ({
  opponentType: 'unknown',
  exploitMode: false,
  panelExpanded: false,
  customVpip: null,
  customPfr: null,
  customFoldToCbet: null,

  setOpponentType: (type) => set({ opponentType: type }),
  toggleExploitMode: () => set(s => ({ exploitMode: !s.exploitMode })),
  setExploitMode: (enabled) => set({ exploitMode: enabled }),
  togglePanel: () => set(s => ({ panelExpanded: !s.panelExpanded })),
  setCustomStat: (stat, value) => {
    const statKeyMap: Record<string, 'customVpip' | 'customPfr' | 'customFoldToCbet'> = {
      vpip: 'customVpip',
      pfr: 'customPfr',
      foldToCbet: 'customFoldToCbet',
    }
    const key = statKeyMap[stat]
    if (key) set({ [key]: value })
  },
  resetCustomStats: () => set({ customVpip: null, customPfr: null, customFoldToCbet: null }),

  get profile(): OpponentProfile {
    const state = get()
    const base = OPPONENT_PROFILES[state.opponentType]
    return {
      ...base,
      vpip: state.customVpip ?? base.vpip,
      pfr: state.customPfr ?? base.pfr,
      foldToCbet: state.customFoldToCbet ?? base.foldToCbet,
    }
  },

  get colorMap(): Record<OpponentTypeType, string> {
    return {
      nit: 'bg-slate-500',
      tag: 'bg-blue-500',
      lag: 'bg-orange-500',
      calling_station: 'bg-green-500',
      maniac: 'bg-red-500',
      reg: 'bg-purple-500',
      unknown: 'bg-neutral-500',
    }
  },

  get typeLabel(): string {
    return OPPONENT_PROFILES[get().opponentType].label
  },
}))
