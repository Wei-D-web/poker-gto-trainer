/**
 * WeaknessPanel — 薄弱环节检测
 *
 * Shows auto-detected player weaknesses sorted by severity,
 * with sample hands and training recommendations.
 */
import { cn } from '../../lib/utils'
import { AlertTriangle, ChevronRight, Target, Zap, TrendingDown } from 'lucide-react'
import type { DetectedWeakness, SessionHand } from '../../stores/sessionReviewStore'

interface Props {
  weaknesses: DetectedWeakness[]
  hands: SessionHand[]
  onSelectHand: (handId: string) => void
  loading: boolean
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: '严重' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: '高' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: '中' },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: '低' },
}

export function WeaknessPanel({ weaknesses, hands, onSelectHand, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-neutral-400">
          <Target className="w-8 h-8 animate-pulse text-amber-400" />
          <span className="text-sm">正在检测薄弱环节...</span>
        </div>
      </div>
    )
  }

  if (weaknesses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <div className="text-center">
          <p className="text-lg">🎯 暂无薄弱环节</p>
          <p className="text-sm mt-2">请先导入并分析对局数据</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary header */}
      <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/30">
        <div className="flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-neutral-200">
            发现 <span className="text-amber-400 font-bold">{weaknesses.length}</span> 个薄弱环节
          </span>
          <span className="text-xs text-neutral-500">
            {weaknesses.filter(w => w.severity === 'critical' || w.severity === 'high').length} 个高优先级
          </span>
        </div>
      </div>

      {/* Weaknesses list */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-800">
        {weaknesses.map((weakness, idx) => {
          const config = SEVERITY_CONFIG[weakness.severity]
          const sampleHands = weakness.sampleHandIds
            .map(id => hands.find(h => h.id === `sh_${id}`) || hands.find(h => h.handId === id))
            .filter(Boolean) as SessionHand[]

          return (
            <div key={weakness.id} className={cn('px-4 py-4 hover:bg-neutral-900/30 transition-colors')}>
              <div className="flex items-start gap-4">
                {/* Rank number */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300">
                  {idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title + severity */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-neutral-200">{weakness.label}</h3>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      config.bg, config.color, config.border, 'border',
                    )}>
                      {config.label}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 mb-3">{weakness.description}</p>

                  {/* Training recommendation */}
                  <div className="flex items-center gap-2 mb-3 p-2 rounded bg-blue-500/5 border border-blue-500/20">
                    <Target className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-blue-300">{weakness.trainingFocus}</span>
                  </div>

                  {/* Sample hands */}
                  {sampleHands.length > 0 && (
                    <div>
                      <span className="text-xs text-neutral-500 mb-1.5 block">示例牌局:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {sampleHands.map(hand => (
                          <button
                            key={hand.id}
                            onClick={() => onSelectHand(hand.id)}
                            className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                              'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700',
                            )}
                          >
                            <span className="font-mono">
                              {hand.heroHand[0]}{hand.heroHand[1]}
                              {hand.heroHand[0][0] === hand.heroHand[1][0] ? '' :
                                hand.heroHand[0][1] === hand.heroHand[1][1] ? 's' : 'o'}
                            </span>
                            <span className="text-neutral-500">
                              {hand.board.slice(0, 3).join(' ') || 'Pre'}
                            </span>
                            <ChevronRight className="w-3 h-3 text-neutral-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Deviation indicator */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className={cn(
                    'text-lg font-bold',
                    weakness.deviationPercent > 30 ? 'text-red-400' : 'text-amber-400',
                  )}>
                    {weakness.deviationPercent}%
                  </div>
                  <div className="text-xs text-neutral-600">偏离</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
