import { contextBridge, ipcRenderer } from 'electron'
import type { GameType, Position, OpponentTypeType } from '../shared/types/poker'
import type { PreflopRange, StrategyData } from '../shared/types/strategy'
import type { ScenarioSummary } from '../shared/types/scenario'

const electronAPI = {
  strategy: {
    getPreflopRange: (
      params: { gameType: GameType; position: Position; stackDepth: number }
    ): Promise<{ range: PreflopRange | null; strategy: StrategyData | null }> =>
      ipcRenderer.invoke('strategy:getPreflopRange', params),

    getPostflopScenario: (params: {
      gameType: GameType; heroPosition: Position; villainPosition: Position
      stackDepth: number; board: string[]; street: string; actions: string
    }): Promise<StrategyData | null> =>
      ipcRenderer.invoke('strategy:getPostflopScenario', params),

    listScenarios: (filters?: {
      gameType?: GameType; heroPosition?: Position
      stackDepthMin?: number; stackDepthMax?: number
    }): Promise<ScenarioSummary[]> =>
      ipcRenderer.invoke('strategy:listScenarios', filters),

    initSampleData: (): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('strategy:initSampleData'),

    analyzePostflop: (params: {
      board: string[]
      heroPosition: number
      villainPosition: number
      stackDepth: number
      gameType?: GameType
      ante?: number
    }): Promise<any> =>
      ipcRenderer.invoke('strategy:analyzePostflop', params),

    analyzeTurn: (params: { flop: string[]; turn: string }): Promise<any> =>
      ipcRenderer.invoke('strategy:analyzeTurn', params),

    analyzeRiver: (params: { turnBoard: string[]; river: string }): Promise<any> =>
      ipcRenderer.invoke('strategy:analyzeRiver', params),

    analyzeMultiWay: (params: { board: string[]; positions: number[]; aggressor: number }): Promise<any> =>
      ipcRenderer.invoke('strategy:analyzeMultiWay', params),

    solvePreflop: (params: {
      position: number
      stackDepth: number
      gameType?: GameType
      ante?: number
      iterations?: number
    }): Promise<Record<string, number>> =>
      ipcRenderer.invoke('strategy:solvePreflop', params),

    /** Cash vs MTT 策略对比 */
    compareCashMtt: (params: {
      board: string[]
      heroPosition: number
      villainPosition: number
      stackDepth: number
      ante?: number
    }): Promise<{ cash: any; tournament: any }> =>
      ipcRenderer.invoke('strategy:compareCashMtt', params),

    /** 对手剥削调整 */
    getExploitAdjustments: (params: {
      board: string[]
      heroPosition: number
      villainPosition: number
      stackDepth: number
      opponentType: OpponentTypeType
    }): Promise<any> =>
      ipcRenderer.invoke('strategy:getExploitAdjustments', params),

    initPostflopData: (): Promise<{ success: boolean; message: string }> =>
      ipcRenderer.invoke('strategy:initPostflopData'),

    getAvailableStackDepths: (gameType: GameType, position: Position): Promise<number[]> =>
      ipcRenderer.invoke('strategy:getAvailableStackDepths', gameType, position),

    getDataStats: (): Promise<{ preflopCount: number; scenarioCount: number; strategyCount: number }> =>
      ipcRenderer.invoke('strategy:getDataStats'),
  },

  update: {
    check: (): Promise<void> => ipcRenderer.invoke('update:check'),
    download: (): Promise<void> => ipcRenderer.invoke('update:download'),
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    onStatus: (callback: (data: { status: string; version?: string; percent?: number; message?: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    },
  },

  handHistory: {
    importFromText: (params: { text: string; gameType?: string }): Promise<{ success: boolean; handId?: string; error?: string; count?: number }> =>
      ipcRenderer.invoke('handhistory:import', params),
    importFromFile: (): Promise<{ success: boolean; count: number; errors: string[] }> =>
      ipcRenderer.invoke('handhistory:importFile'),
    list: (params?: { limit?: number; offset?: number }): Promise<{ hands: any[]; total: number }> =>
      ipcRenderer.invoke('handhistory:list', params),
    getById: (id: string): Promise<any> =>
      ipcRenderer.invoke('handhistory:getById', id),
    batchAnalyze: (params?: { ids?: string[]; allUnanalyzed?: boolean }): Promise<{ success: boolean; results: any[] }> =>
      ipcRenderer.invoke('handhistory:batchAnalyze', params),
    delete: (ids: string[]): Promise<{ deleted: number }> =>
      ipcRenderer.invoke('handhistory:delete', ids),
    getStats: (): Promise<{ totalHands: number; analyzedCount: number; unanalyzedCount: number; totalEVLost: number; averageGrade: string; winRate: number }> =>
      ipcRenderer.invoke('handhistory:getStats'),
  },

  spotLibrary: {
    save: (params: any): Promise<{ success: boolean; id: string }> => ipcRenderer.invoke('spot:save', params),
    list: (params?: { category?: string }): Promise<{ spots: any[] }> => ipcRenderer.invoke('spot:list', params),
    delete: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('spot:delete', id),
    update: (params: any): Promise<{ success: boolean }> => ipcRenderer.invoke('spot:update', params),
  },

  report: {
    exportPDF: (params: { ids: string[] }): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('report:exportPDF', params),
  },

  preferences: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('preferences:get', key),
    set: (key: string, value: string): Promise<void> => ipcRenderer.invoke('preferences:set', key, value),
  },

  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  },

  auth: {
    getSession: (): Promise<any> => ipcRenderer.invoke('auth:getSession'),
    setSession: (data: any): Promise<void> => ipcRenderer.invoke('auth:setSession', data),
    clearSession: (): Promise<void> => ipcRenderer.invoke('auth:clearSession'),
  },

  sessionReview: {
    importFromFiles: (): Promise<{ success: boolean; sessionId?: string; handCount: number; errors: string[] }> =>
      ipcRenderer.invoke('session:importFromFiles'),
    importFromText: (params: { text: string }): Promise<{ success: boolean; sessionId?: string; handCount: number; errors: string[] }> =>
      ipcRenderer.invoke('session:importFromText', params),
    list: (): Promise<{ sessions: any[] }> =>
      ipcRenderer.invoke('session:list'),
    analyze: (params: { sessionId: string }): Promise<any> =>
      ipcRenderer.invoke('session:analyze', params),
    getDetail: (params: { sessionId: string }): Promise<any> =>
      ipcRenderer.invoke('session:getDetail', params),
    getStats: (): Promise<any> =>
      ipcRenderer.invoke('session:getStats'),
    delete: (params: { sessionId: string }): Promise<{ deleted: boolean }> =>
      ipcRenderer.invoke('session:delete', params),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
