import { useMemo } from 'react'
import type { ComboKey } from '@shared/types/poker'
import type { ComboStrategy } from '@shared/types/strategy'
import { getActionLabel } from '@shared/constants/actions'
import { cn } from '../../lib/utils'
import { Target, TrendingUp, BarChart3, Info } from 'lucide-react'

const STRENGTH_MAP: Record<string, number> = {
  'AA': 100, 'KK': 92, 'QQ': 85, 'JJ': 78, 'TT': 72, 'AKs': 70,
  'AKo': 65, 'AQs': 63, '99': 62, '88': 56, 'AQo': 55, 'AJs': 54, 'KQs': 53,
}
function getStrength(combo: string): number {
  return STRENGTH_MAP[combo] ?? 35
}

interface StrategyDetailPanelProps {
  comboKey: ComboKey | null
  combos: ComboStrategy[]
}

export function StrategyDetailPanel({ comboKey, combos }: StrategyDetailPanelProps) {
  const selectedComboData = useMemo(() => {
    if (!comboKey) return null
    return combos.find(c => c.comboKey === comboKey) ?? null
  }, [comboKey, combos])

  const aggregateStats = useMemo(() => {
    const inRange = combos.filter(c => c.weight > 0)
    const totalWeight = inRange.reduce((s, c) => s + c.weight, 0)
    const avgEV = inRange.length > 0 ? inRange.reduce((s, c) => s + c.ev * c.weight, 0) / Math.max(totalWeight, 1) : 0
    return {
      inRangeCount: inRange.length,
      rangePercent: Math.round((inRange.length / 169) * 100),
      totalCombos: Math.round(totalWeight * 100) / 100,
      avgEV,
    }
  }, [combos])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
          {comboKey ? 'Combo Detail' : 'Range Overview'}
        </h3>
        {comboKey && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold ring-1 ring-blue-500/15">
            {getStrength(comboKey)}/100
          </span>
        )}
      </div>

      {/* Aggregate stats */}
      {!comboKey && (
        <div className="space-y-3">
          <div className="bg-[#0B1019] rounded-xl p-4 border border-[#152233]">
            <div className="flex items-center gap-2 mb-2">
              <Target size={13} className="text-blue-400" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Range Coverage</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-neutral-100">{aggregateStats.rangePercent}%</span>
              <span className="text-xs text-neutral-500">{aggregateStats.inRangeCount}/169 hands</span>
            </div>
            <div className="mt-2.5 h-1.5 bg-[#0F141C] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                style={{ width: `${aggregateStats.rangePercent}%` }}
              />
            </div>
          </div>

          <div className="bg-[#0B1019] rounded-xl p-4 border border-[#152233]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-emerald-400" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Average EV</span>
            </div>
            <span className={cn('text-2xl font-bold', aggregateStats.avgEV >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {aggregateStats.avgEV > 0 ? '+' : ''}{aggregateStats.avgEV.toFixed(2)}
            </span>
            <span className="text-xs text-neutral-500 ml-1.5">bb/hand</span>
          </div>

          <div className="text-xs text-neutral-500 leading-relaxed bg-[#0B1019] rounded-xl p-4 border border-[#152233]">
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={12} className="text-neutral-500" />
              <span className="text-neutral-400 font-medium">How to use</span>
            </div>
            <ul className="space-y-1.5 list-disc pl-4 text-[11px]">
              <li>Click any cell to see detailed strategy</li>
              <li>Color depth = in-range frequency</li>
              <li>Green/Red = EV of each action</li>
              <li>Run CFR for computed ranges</li>
            </ul>
          </div>
        </div>
      )}

      {selectedComboData && <ComboDetailView combo={selectedComboData} />}
    </div>
  )
}

function ComboDetailView({ combo }: { combo: ComboStrategy }) {
  const sortedActions = [...combo.actions]
    .filter(a => a.frequency > 0.005)
    .sort((a, b) => b.frequency - a.frequency)

  const totalActions = sortedActions.reduce((s, a) => s + a.frequency, 0)
  const normalizedActions = sortedActions.map(a => ({
    ...a,
    normalizedFreq: totalActions > 0 ? a.frequency / totalActions : 0,
  }))

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Combo header */}
      <div className="bg-gradient-to-br from-[#0B1019] to-[#090D14] rounded-xl p-4 border border-[#152233]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-white font-mono tracking-tight">
            {combo.comboKey}
          </span>
          <span className={cn(
            'text-[10px] px-2.5 py-1 rounded-full font-bold uppercase',
            combo.weight > 0.6 ? 'bg-emerald-500/10 text-emerald-400' :
            combo.weight > 0.25 ? 'bg-amber-500/10 text-amber-400' :
            'bg-[#0F141C] text-neutral-600',
          )}>
            {Math.round(combo.weight * 100)}% range
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#06090F] rounded-lg p-3 border border-[#152233]/50">
            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Equity</div>
            <div className="text-sm font-bold text-neutral-200">{(combo.equity * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-[#06090F] rounded-lg p-3 border border-[#152233]/50">
            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">EV</div>
            <div className={cn('text-sm font-bold', combo.ev >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {combo.ev > 0 ? '+' : ''}{combo.ev.toFixed(2)}bb
            </div>
          </div>
        </div>
      </div>

      {/* Action distribution */}
      <div>
        <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <BarChart3 size={12} />
          Action Distribution
        </h4>
        <div className="space-y-2.5">
          {normalizedActions.map((action) => {
            const label = getActionLabel(action.action)
            return (
              <div key={action.action}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-300 font-medium">{label.fullLabel}</span>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {Math.round(action.frequency * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#0F141C] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(action.normalizedFreq * 100)}%`,
                      backgroundColor: label.color,
                      boxShadow: `0 0 6px ${label.color}40`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* EV per action */}
      <div>
        <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingUp size={12} />
          EV per Action
        </h4>
        <div className="space-y-1">
          {normalizedActions.map(action => {
            const label = getActionLabel(action.action)
            return (
              <div key={action.action} className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-[#0B1019] border border-[#152233]/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="text-xs text-neutral-400">{label.shortLabel}</span>
                </div>
                <span className={cn(
                  'text-xs font-mono font-semibold',
                  action.ev > 0 ? 'text-emerald-400' : action.ev < 0 ? 'text-red-400' : 'text-neutral-600',
                )}>
                  {action.ev > 0 ? '+' : ''}{action.ev.toFixed(2)}bb
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
