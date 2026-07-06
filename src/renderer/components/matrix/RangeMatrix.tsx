import { useMemo, useCallback } from 'react'
import { ALL_RANKS, RANK_CHARS, type ComboKey } from '@shared/types/poker'
import { cn } from '../../lib/utils'
import type { ComboStrategy } from '@shared/types/strategy'
import { getActionLabel, ACTION_LABELS } from '@shared/constants/actions'

interface RangeMatrixProps {
  combos: ComboStrategy[]
  selectedCombo: ComboKey | null
  hoveredCombo: ComboKey | null
  onSelectCombo: (combo: ComboKey | null) => void
  onHoverCombo: (combo: ComboKey | null) => void
  className?: string
  size?: 'compact' | 'comfortable'
  showHeatmap?: boolean
  /** When true, cells with mixed actions show conic-gradient splits (GTOWizard-style) */
  showActionSplits?: boolean
  /** Only show action splits for combos whose dominant action is NOT this action id */
  highlightNonDefaultAction?: string
}

type ComboDataMap = Record<ComboKey, { weight: number; ev: number; equity: number; actions: ComboStrategy['actions'] }>

/**
 * GTO Wizard 标准六阶热力图颜色函数
 *
 * 频率区间映射（针对暗色背景 #05080C 优化）:
 *   0%        → 深空灰 (空/不在范围)
 *   < 0.25    → 翡翠绿 (低频)
 *   0.25–0.50 → 翠绿 (中低频)
 *   0.50–0.70 → 暗金 (中频)
 *   0.70–0.85 → 橘红 (中高频)
 *   ≥ 0.85    → 火砖红 (高频/核心)
 */
function frequencyToColor(freq: number): string {
  if (freq <= 0.01) return '#0F141F'
  if (freq < 0.25) return '#0B5C33'
  if (freq < 0.50) return '#3B8C3B'
  if (freq < 0.70) return '#B8860B'
  if (freq < 0.85) return '#D4650A'
  return '#C0392B'
}

function frequencyToTextColor(freq: number): string {
  if (freq <= 0.01) return '#3A4556'
  if (freq < 0.25) return '#A8D8BA'
  if (freq < 0.50) return '#D0F0C0'
  if (freq < 0.70) return '#FFE8A0'
  if (freq < 0.85) return '#FFE0D0'
  return '#FFFFFF'
}

function frequencyToBorder(freq: number, isSelected: boolean, isHovered: boolean): string {
  if (isSelected) return '2px solid #60A5FA'
  if (isHovered && freq > 0) return '1px solid rgba(255,255,255,0.28)'
  if (freq > 0.85) return '1px solid rgba(255,180,160,0.12)'
  if (freq > 0.50) return '1px solid rgba(255,220,140,0.08)'
  if (freq > 0.01) return '1px solid rgba(180,220,190,0.05)'
  return '1px solid rgba(255,255,255,0.02)'
}

/** GTO Wizard 风格的 equity ring — 基于 Equity+Bet 频率的指示环 */
function getHeatmapRing(data: ComboDataMap[string] | undefined, weight: number): string {
  if (!data || weight < 0.05) return ''
  const acts = data.actions
  const betFreq = acts.find(a => a.action.includes('bet') || a.action === 'raise')?.frequency || 0
  const checkFreq = acts.find(a => a.action === 'check')?.frequency || 0
  const eq = data.equity

  if (eq > 0.6 && betFreq > 0.5) return 'ring-1 ring-emerald-400/50 ring-inset'
  if (eq > 0.55 && betFreq > 0.4) return 'ring-1 ring-emerald-400/35 ring-inset'
  if (eq < 0.3 && betFreq > 0.3) return 'ring-1 ring-red-400/50 ring-inset'
  if (eq >= 0.3 && eq <= 0.55 && betFreq > 0.3) return 'ring-1 ring-amber-400/40 ring-inset'
  if (checkFreq > 0.6) return 'ring-1 ring-green-400/30 ring-inset'
  return ''
}

/**
 * 将行动 ID 映射为 GTO Wizard 标准颜色，用于 conic-gradient 分割显示。
 *
 * 颜色标准 (GTO Wizard Poker Arena):
 *   Fold     → 🔵 蓝
 *   Check    → 🟢 绿
 *   Call     → 🟢 深绿
 *   Bet 小   → 🟠 浅橙
 *   Bet 中   → 🟠 橙
 *   Bet 大   → 🔴 红
 *   Raise    → 🔴 红
 *   All-in   → ⚫ 深红
 */
function actionToColor(actionId: string): string {
  const exact = ACTION_LABELS.find(l => l.id === actionId)
  if (exact) return exact.color

  // type prefix fallback — 保持与 ACTION_LABELS 颜色标准一致
  if (actionId === 'raise' || actionId.startsWith('raise_')) return '#EF4444'
  if (actionId === 'bet' || actionId.startsWith('bet_')) return '#F59E0B'
  if (actionId === 'fold') return '#3B82F6'
  if (actionId === 'check') return '#22C55E'
  if (actionId === 'call') return '#16A34A'
  if (actionId === 'all_in' || actionId.startsWith('all_in')) return '#991B1B'

  return getActionLabel(actionId).color
}

/** Determine if a combo has meaningful multiple actions that warrant a split display */
function shouldShowSplit(actions: ComboStrategy['actions'], weight: number): boolean {
  if (weight < 0.02 || actions.length < 2) return false
  const significant = actions.filter(a => a.frequency > 0.03)
  if (significant.length < 2) return false
  // Must not have a single dominant (>95%) action
  return significant[0].frequency <= 0.95
}

/**
 * Build a CSS conic-gradient string from action frequencies.
 * Clockwise from 12 o'clock, largest action first.
 * GTO Wizard style: clear color separation with subtle transition.
 */
function buildConicGradient(actions: ComboStrategy['actions'], weight: number): string {
  const significant = actions
    .filter(a => a.frequency > 0.01)
    .sort((a, b) => b.frequency - a.frequency)

  if (significant.length === 0) return frequencyToColor(weight)

  // If effectively single-action, use solid action color
  if (significant.length === 1 || significant[0].frequency >= 0.98) {
    return actionToColor(significant[0].action)
  }

  // Normalize to sum = 1
  const total = significant.reduce((s, a) => s + a.frequency, 0)
  const normalized = total > 0
    ? significant.map(a => ({ action: a.action, freq: a.frequency / total }))
    : significant.map(a => ({ action: a.action, freq: 0 }))

  // Build stops from angle 0deg (12 o'clock), clockwise
  let current = 0
  const stops: string[] = []
  for (const a of normalized) {
    const pct = a.freq * 100
    const color = actionToColor(a.action)
    stops.push(`${color} ${current}% ${current + pct}%`)
    current += pct
  }

  // Fill remaining with last color (handles rounding)
  if (current < 100) {
    const lastColor = actionToColor(normalized[normalized.length - 1].action)
    stops.push(`${lastColor} ${current}% 100%`)
  }

  return `conic-gradient(from 0deg, ${stops.join(', ')})`
}

export function RangeMatrix({
  combos, selectedCombo, hoveredCombo, onSelectCombo, onHoverCombo,
  className, size = 'comfortable', showHeatmap = true,
  showActionSplits = true,
  highlightNonDefaultAction,
}: RangeMatrixProps) {
  const comboDataMap = useMemo((): ComboDataMap => {
    const map: ComboDataMap = {}
    for (const c of combos) {
      map[c.comboKey] = { weight: c.weight, ev: c.ev, equity: c.equity, actions: c.actions }
    }
    return map
  }, [combos])

  // Sizing
  const cellSize = size === 'compact' ? 'w-[30px] h-[30px]' : 'w-[44px] h-[44px]'
  const fontSize = size === 'compact' ? 'text-[9px]' : 'text-[11px]'
  const freqSize = size === 'compact' ? 'text-[7px]' : 'text-[8px]'
  const headerSize = size === 'compact' ? 'text-[9px]' : 'text-[10px]'
  const headerCell = size === 'compact' ? 'w-[30px] h-[18px]' : 'w-[44px] h-[22px]'
  const gap = size === 'compact' ? 'gap-[1px]' : 'gap-[2px]'
  const corner = size === 'compact' ? 'w-[30px] h-[18px]' : 'w-[44px] h-[22px]'
  const cellRadius = size === 'compact' ? 'rounded-[2px]' : 'rounded-[4px]'

  const handleCellClick = useCallback(
    (comboKey: ComboKey) => {
      onSelectCombo(selectedCombo === comboKey ? null : comboKey)
    },
    [selectedCombo, onSelectCombo],
  )

  // Count rows for grid line positioning
  const GRID = 13

  return (
    <div className={cn('select-none relative', className)}>
      {/* ── Column headers ── */}
      <div className={`flex ${gap} mb-[2px]`}>
        <div className={corner} />
        {ALL_RANKS.map((rank) => (
          <div
            key={`col-${rank}`}
            className={cn(
              headerCell,
              'flex items-center justify-center font-semibold text-neutral-500',
            )}
          >
            <span className={headerSize}>{RANK_CHARS[rank]}</span>
          </div>
        ))}
      </div>

      {/* ── Matrix grid container (for grid line overlay) ── */}
      <div className="relative">
        {/* Grid cells */}
        {ALL_RANKS.map((rowRank, rowIdx) => (
          <div key={`row-${rowRank}`} className={`flex ${gap} ${size === 'compact' ? 'mb-[1px]' : 'mb-[2px]'}`}>
            {/* Row header */}
            <div
              className={cn(
                headerCell,
                'flex items-center justify-center font-semibold text-neutral-500',
              )}
            >
              <span className={headerSize}>{RANK_CHARS[rowRank]}</span>
            </div>

            {ALL_RANKS.map((colRank, colIdx) => {
              let comboKey: ComboKey
              if (rowIdx === colIdx) {
                comboKey = `${RANK_CHARS[rowRank]}${RANK_CHARS[colRank]}`
              } else if (rowIdx < colIdx) {
                comboKey = `${RANK_CHARS[rowRank]}${RANK_CHARS[colRank]}s`
              } else {
                comboKey = `${RANK_CHARS[colRank]}${RANK_CHARS[rowRank]}o`
              }

              const data = comboDataMap[comboKey]
              const weight = data?.weight ?? 0
              const isSelected = selectedCombo === comboKey
              const isHovered = hoveredCombo === comboKey
              const isPair = rowIdx === colIdx
              const isSuited = rowIdx < colIdx
              const isOffsuit = rowIdx > colIdx
              const actions = data?.actions ?? []
              const heatmapRing = showHeatmap ? getHeatmapRing(data, weight) : ''

              // Decide: use action-split conic-gradient or solid heatmap color
              const useSplit = showActionSplits && data && shouldShowSplit(actions, weight)
              let bgStyle: React.CSSProperties
              let textColor: string

              if (useSplit) {
                bgStyle = { background: buildConicGradient(actions, weight) }
                textColor = '#FFFFFF'
              } else {
                bgStyle = { backgroundColor: frequencyToColor(weight) }
                textColor = frequencyToTextColor(weight)
              }

              const border = frequencyToBorder(weight, isSelected, isHovered)
              const tooltipParts = [`${comboKey}`]
              if (weight > 0) {
                tooltipParts.push(`${Math.round(weight * 100)}%`)
                if (useSplit) {
                  for (const a of actions.filter(x => x.frequency > 0.01)) {
                    const label = getActionLabel(a.action)
                    tooltipParts.push(`${label.shortLabel} ${Math.round(a.frequency * 100)}%`)
                  }
                } else if (actions[0]) {
                  tooltipParts.push(getActionLabel(actions[0].action).shortLabel)
                }
              }

              return (
                <button
                  key={comboKey}
                  className={cn(
                    'matrix-cell',
                    cellSize,
                    cellRadius,
                    'flex flex-col items-center justify-center',
                    'transition-all duration-100',
                    heatmapRing,
                    isSelected && 'z-10 scale-110 shadow-[0_0_18px_rgba(59,130,246,0.5)]',
                    isHovered && !isSelected && 'z-10 scale-105',
                    isPair && 'font-bold',
                  )}
                  style={{
                    ...bgStyle,
                    border,
                  }}
                  onClick={() => handleCellClick(comboKey)}
                  onMouseEnter={() => onHoverCombo(comboKey)}
                  onMouseLeave={() => onHoverCombo(null)}
                  data-tooltip={tooltipParts.join(' · ')}
                >
                  <span
                    className={cn(fontSize, 'leading-none tracking-tight')}
                    style={{ color: textColor }}
                  >
                    {comboKey}
                  </span>
                  {weight > 0.03 && (
                    <span
                      className={cn(freqSize, 'leading-none mt-[2px] opacity-80')}
                      style={{ color: textColor }}
                    >
                      {Math.round(weight * 100)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        {/* ── Diagonal separator line (pair/offsuit boundary) ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        >
          {/* Draw subtle empty-cell separators at boundaries */}
          {Array.from({ length: GRID - 1 }).map((_, i) => {
            const row = i + 1
            const col = i
            const cellW = size === 'compact' ? 30 : 44
            const cellGap = size === 'compact' ? 1 : 2
            const headerW = cellW // header same width
            const step = cellW + cellGap

            // Horizontal separator between suited and offsuit regions
            const topY = row * step
            const leftX = col * step

            return (
              <div
                key={`sep-${i}`}
                className="absolute"
                style={{
                  top: `${topY - cellGap / 2}px`,
                  left: `${headerW + leftX - cellGap / 2}px`,
                  width: `${(GRID - col) * step}px`,
                  height: '0px',
                  borderTop: '1px dashed rgba(255,255,255,0.03)',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
