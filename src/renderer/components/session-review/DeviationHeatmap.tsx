/**
 * DeviationHeatmap — GTO 偏差热力图 (13×13 range matrix)
 *
 * Shows where the player overplays or underplays relative to GTO.
 * Red = overplay (too aggressive), Blue = underplay (too passive)
 */
import { useMemo } from 'react'
import { cn } from '../../lib/utils'
import type { RangeDeviation } from '../../stores/sessionReviewStore'
import { Loader2 } from 'lucide-react'

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

interface Props {
  deviations: RangeDeviation[]
  loading: boolean
  streetFilter: string
  onStreetFilter: (street: string) => void
}

export function DeviationHeatmap({ deviations, loading, streetFilter, onStreetFilter }: Props) {
  // Build matrix lookup
  const deviationMap = useMemo(() => {
    const map = new Map<string, RangeDeviation>()
    for (const d of deviations) {
      map.set(`${d.row}_${d.col}`, d)
    }
    return map
  }, [deviations])

  const maxDeviation = useMemo(() => {
    if (deviations.length === 0) return 0.3
    return Math.max(...deviations.map(d => Math.abs(d.deviation)), 0.3)
  }, [deviations])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="text-sm text-neutral-400">正在计算 GTO 偏差...</span>
        </div>
      </div>
    )
  }

  if (deviations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <div className="text-center">
          <p className="text-lg">📊 暂无偏差数据</p>
          <p className="text-sm mt-2">请先导入并分析对局</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800">
        <span className="text-xs text-neutral-500 mr-1">按街:</span>
        {['all', 'preflop', 'flop', 'turn', 'river'].map(street => (
          <button
            key={street}
            onClick={() => onStreetFilter(street)}
            className={cn(
              'px-3 py-1 rounded text-xs transition-colors',
              streetFilter === street
                ? 'bg-blue-600/30 text-blue-300'
                : 'text-neutral-500 hover:text-neutral-300',
            )}
          >
            {street === 'all' ? '全部' :
              street === 'preflop' ? '翻前' :
                street === 'flop' ? '翻牌' :
                  street === 'turn' ? '转牌' : '河牌'}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>过度游戏 (太激进)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>游戏不足 (太被动)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-neutral-700" />
          <span>接近 GTO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-neutral-900 border border-neutral-700" />
          <span>无数据</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <div className="inline-block">
          {/* Column headers */}
          <div className="flex ml-8">
            {RANKS.map(r => (
              <div key={r} className="w-9 h-6 flex items-center justify-center text-xs text-neutral-500">
                {r}
              </div>
            ))}
          </div>

          {/* Rows */}
          {RANKS.map((rowRank, rowIdx) => (
            <div key={rowRank} className="flex items-center">
              <div className="w-8 h-9 flex items-center justify-center text-xs text-neutral-500">
                {rowRank}
              </div>
              {RANKS.map((colRank, colIdx) => {
                const dev = deviationMap.get(`${rowIdx}_${colIdx}`)
                return (
                  <HeatmapCell
                    key={`${rowIdx}_${colIdx}`}
                    deviation={dev}
                    maxDeviation={maxDeviation}
                  />
                )
              })}
            </div>
          ))}

          {/* Combo label guide */}
          <div className="mt-4 text-xs text-neutral-600 text-center">
            悬停格子查看组合和 GTO 频率 vs 实际频率
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatmapCell({ deviation, maxDeviation }: { deviation?: RangeDeviation; maxDeviation: number }) {
  if (!deviation) {
    return (
      <div className="w-9 h-9 border border-neutral-800 bg-neutral-900/50">
        <div className="w-full h-full" />
      </div>
    )
  }

  const { actualFreq, gtoFreq, deviation: dev } = deviation
  const intensity = Math.min(1, Math.abs(dev) / maxDeviation)

  // Color: red for overplay, blue for underplay
  let bgColor: string
  if (Math.abs(dev) < 0.05) {
    bgColor = `rgba(64, 64, 64, 0.4)` // neutral
  } else if (dev > 0) {
    // Overplay — red
    const alpha = 0.2 + intensity * 0.6
    bgColor = `rgba(239, 68, 68, ${alpha})`
  } else {
    // Underplay — blue
    const alpha = 0.2 + intensity * 0.6
    bgColor = `rgba(59, 130, 246, ${alpha})`
  }

  const title = `GTO: ${Math.round(gtoFreq * 100)}% | 实际: ${Math.round(actualFreq * 100)}% | 偏差: ${dev > 0 ? '+' : ''}${Math.round(dev * 100)}%`

  return (
    <div
      className="w-9 h-9 border border-neutral-800 flex items-center justify-center text-[10px] cursor-pointer hover:border-neutral-500 transition-colors"
      style={{ backgroundColor: bgColor }}
      title={title}
    >
      <span className={cn(
        'font-medium',
        Math.abs(dev) < 0.05 ? 'text-neutral-600' : 'text-neutral-300',
      )}>
        {Math.round(actualFreq * 100)}
      </span>
    </div>
  )
}
