import { useCallback } from 'react'

/**
 * Hook for loading and caching strategy data via IPC.
 * Wraps the electronAPI for convenience in React components.
 */
export function useStrategyLoader() {
  const loadPreflopRange = useCallback(
    async (params: {
      gameType: 'cash' | 'tournament'
      position: number
      stackDepth: number
    }) => {
      return window.electronAPI.strategy.getPreflopRange(params)
    },
    []
  )

  const initSampleData = useCallback(async () => {
    return window.electronAPI.strategy.initSampleData()
  }, [])

  const getDataStats = useCallback(async () => {
    return window.electronAPI.strategy.getDataStats()
  }, [])

  return {
    loadPreflopRange,
    initSampleData,
    getDataStats,
  }
}
