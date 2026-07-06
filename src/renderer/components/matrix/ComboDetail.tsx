import type { ComboStrategy } from '@shared/types/strategy'
import { getActionLabel, ACTION_LABELS } from '@shared/constants/actions'
import { cn } from '../../lib/utils'
import { MoveHorizontal, Percent, Target } from 'lucide-react'

interface ComboDetailProps {
  comboKey: string | null
  data: ComboStrategy | null
}

/**
 * 选中手牌的详情面板
 * 显示手牌名称、频率、EV、每次行动的百分比分配
 * GTO Wizard 风格颜色编码
 */
export function ComboDetail({ comboKey, data }: ComboDetailProps) {
  if (!comboKey || !data || data.weight <= 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2 p-6">
        <Target size={24} className="opacity-30" />
        <span className="text-xs">Click a hand to see details</span>
      </div>
    )
  }

  const { weight, ev, equity, actions } = data
  const hasSplit = actions.filter(a => a.frequency > 0.01).length > 1

  return (
    <div className="space-y-4">
      {/* 手牌名 + 频率 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-blue-500/20 flex items-center justify-center">
          <span className="text-base font-extrabold text-neutral-100">{comboKey}</span>
        </div>
        <div>
          <div className="text-lg font-bold text-neutral-100">{comboKey}</div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Percent size={10} />
              {Math.round(weight * 100)}% frequency
            </span>
            {ev !== undefined && (
              <span className={cn(
                'font-mono',
                ev > 0 ? 'text-emerald-400' : ev < 0 ? 'text-red-400' : 'text-neutral-500',
              )}>
                EV {ev > 0 ? '+' : ''}{ev.toFixed(2)}
              </span>
            )}
            {equity !== undefined && (
              <span className="font-mono text-blue-400">
                EQ {Math.round(equity * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 行动分配 — 水平进度条 */}
      <div>
        <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <MoveHorizontal size={11} />
          Action Split
        </h4>
        {hasSplit ? (
          <div className="space-y-2">
            {/* 合并颜色条 */}
            <div className="h-6 rounded-lg overflow-hidden flex border border-[#1C2A3D]">
              {actions
                .filter(a => a.frequency > 0.01)
                .sort((a, b) => b.frequency - a.frequency)
                .map((a, i) => {
                  const label = getActionLabel(a.action)
                  const pct = Math.round(a.frequency * 100)
                  return (
                    <div
                      key={a.action}
                      className="flex items-center justify-center text-[9px] font-bold text-white first:rounded-l-lg last:rounded-r-lg transition-all duration-200"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: label.color,
                        minWidth: pct > 5 ? 'fit-content' : undefined,
                      }}
                      title={`${label.fullLabel}: ${pct}%`}
                    >
                      {pct > 10 ? `${pct}%` : ''}
                    </div>
                  )
                })}
            </div>

            {/* 各项明细 */}
            <div className="grid grid-cols-2 gap-1">
              {actions
                .filter(a => a.frequency > 0.01)
                .sort((a, b) => b.frequency - a.frequency)
                .map((a) => {
                  const label = getActionLabel(a.action)
                  const pct = Math.round(a.frequency * 100)
                  return (
                    <div
                      key={a.action}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ backgroundColor: `${label.color}12` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="text-neutral-300 font-medium flex-1">{label.shortLabel}</span>
                      <span className="text-neutral-500 font-mono">{pct}%</span>
                    </div>
                  )
                })}
            </div>
          </div>
        ) : (
          /* 单一行动 */
          <div className="flex flex-col gap-2">
            {actions
              .filter(a => a.frequency > 0.01)
              .map((a) => {
                const label = getActionLabel(a.action)
                return (
                  <div key={a.action}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: `${label.color}18`, color: label.color }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.fullLabel}
                    <span className="ml-auto text-xs opacity-60">{Math.round(a.frequency * 100)}%</span>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* 位置/排名等额外信息可在此扩展 */}
    </div>
  )
}
