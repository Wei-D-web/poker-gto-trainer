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
 * Three-stop heatmap gradient — GTOWizard-style.
 * Green → yellow → red based on frequency.
 */
function frequencyToColor(freq: number): string {
  if (freq <= 0.01) return '#0D1219'
  if (freq < 0.40) return '#0E3B24'   // deep green: low freq
  if (freq < 0.70) return '#8B5D1A'   // amber: medium freq
  return '#8B1A1A'                     // deep red: high freq
}

function frequencyToTextColor(freq: number): string {
  if (freq <= 0.01) return '#3A4556'
  if (freq < 0.40) return '#9BA5B5'
  if (freq < 0.70) return '#F0F2F8'
  return '#FFFFFF'
}

function frequencyToBorder(freq: number, isSelected: boolean, isHovered: boolean): string {
  if (isSelected) return '2px solid #3B82F6'
  if (isHovered && freq > 0) return '1px solid rgba(255,255,255,0.28)'
  if (freq > 0.7) return '1px solid rgba(255,255,255,0.08)'
  if (freq > 0.3) return '1px solid rgba(255,255,255,0.04)'
  return '1px solid transparent'
}

function getHeatmapRing(data: ComboDataMap[string] | undefined, weight: number): string {
  if (!data || weight < 0.05) return ''
  const acts = data.actions
  const betFreq = acts.find(a => a.action.includes('bet') || a.action === 'raise')?.frequency || 0
  const checkFreq = acts.find(a => a.action === 'check')?.frequency || 0
  const eq = data.equity

  if (eq > 0.6 && betFreq > 0.5) return 'ring-1 ring-emerald-500/50 ring-inset'
  if (eq > 0.55 && betFreq > 0.4) return 'ring-1 ring-emerald-500/35 ring-inset'
  if (eq < 0.3 && betFreq > 0.3) return 'ring-1 ring-red-500/45 ring-inset'
  if (eq >= 0.3 && eq <= 0.55 && betFreq > 0.3) return 'ring-1 ring-amber-500/35 ring-inset'
  if (checkFreq > 0.6) return 'ring-1 ring-neutral-500/25 ring-inset'
  return ''
}

/** Map action id to a stable color for split rendering.
 *  Handles both base action names ('raise', 'bet', 'fold') and
 *  size-specific ones ('raise_3x', 'bet_50') by matching the type prefix. */
function actionToColor(actionId: string): string {
  // Try exact match first
  const exact = ACTION_LABELS.find(l => l.id === actionId)
  if (exact) return exact.color

  // Fallback: match by type/prefix
  if (actionId === 'raise' || actionId.startsWith('raise_')) return '#EF4444'
  if (actionId === 'bet' || actionId.startsWith('bet_')) return '#F59E0B'
  if (actionId === 'fold') return '#3B82F6'
  if (actionId === 'check') return '#A78BFA'
  if (actionId === 'call') return '#10B981'
  if (actionId === 'all_in' || actionId.startsWith('all_in')) return '#991B1B'

  // Last resort: label lookup
  const label = getActionLabel(actionId)
  return label.color
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
 */
function buildConicGradient(actions: ComboStrategy['actions'], weight: number): string {
  const significant = actions
    .filter(a => a.frequency > 0.01)
    .sort((a, b) => b.frequency - a.frequency)

  if (significant.length === 0) return frequencyToColor(weight)

  // If effectively single-action, fall through to solid
  if (significant.length === 1 || significant[0].frequency >= 0.98) {
    return actionToColor(significant[0].action)
  }

  // Normalize to sum = 1 (actions may add up to 0-1 per combo)
  const total = significant.reduce((s, a) => s + a.frequency, 0)
  const normalized = total > 0
    ? significant.map(a => ({ action: a.action, freq: a.frequency / total }))
    : significant.map(a => ({ action: a.action, freq: 0 }))

  // Build stops from angle 0deg (12 o'clock)
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

  return `conic-gradient(${stops.join(', ')})`
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

  return (
    <div className={cn('select-none', className)}>
      {/* Column headers */}
      <div className={`flex ${gap} mb-[2px]`}>
        <div className={corner} />
        {ALL_RANKS.map((rank) => (
          <div
            key={`col-${rank}`}
            className={cn(headerCell, 'flex items-center justify-center font-semibold text-neutral-500')}
          >
            <span className={headerSize}>{RANK_CHARS[rank]}</span>
          </div>
        ))}
      </div>

      {/* Matrix grid */}
      {ALL_RANKS.map((rowRank, rowIdx) => (
        <div key={`row-${rowRank}`} className={`flex ${gap} mb-[2px]`}>
          {/* Row header */}
          <div className={cn(headerCell, 'flex items-center justify-center font-semibold text-neutral-500')}>
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
            const actions = data?.actions ?? []
            const heatmapRing = showHeatmap ? getHeatmapRing(data, weight) : ''

            // Decide: use action-split conic-gradient or solid heatmap color
            const useSplit = showActionSplits && data && shouldShowSplit(actions, weight)
            let bgStyle: React.CSSProperties
            let textColor: string

            if (useSplit) {
              bgStyle = {
                background: buildConicGradient(actions, weight),
              }
              // Lighter text over colorful backgrounds
              textColor = '#FFFFFF'
            } else {
              bgStyle = { backgroundColor: frequencyToColor(weight) }
              textColor = frequencyToTextColor(weight)
            }

            const border = frequencyToBorder(weight, isSelected, isHovered)
            const primaryAction = actions?.[0]?.action ?? '-'
            const tooltipParts = [`${comboKey}`]
            if (weight > 0) {
              tooltipParts.push(`${Math.round(weight * 100)}%`)
              if (useSplit) {
                for (const a of actions.filter(x => x.frequency > 0.01)) {
                  const label = getActionLabel(a.action)
                  tooltipParts.push(`${label.shortLabel} ${Math.round(a.frequency * 100)}%`)
                }
              } else {
                tooltipParts.push(primaryAction)
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
                  'transition-all duration-150',
                  heatmapRing,
                  isSelected && 'z-10 scale-110 shadow-[0_0_16px_rgba(59,130,246,0.4)]',
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
                {weight > 0.05 && (
                  <span
                    className={cn(freqSize, 'leading-none mt-[2px] opacity-75')}
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
    </div>
  )
}
