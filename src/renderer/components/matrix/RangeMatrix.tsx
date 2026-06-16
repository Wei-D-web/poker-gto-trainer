import { useMemo, useCallback } from 'react'
import { ALL_RANKS, RANK_CHARS, type ComboKey } from '@shared/types/poker'
import { cn } from '../../lib/utils'
import type { ComboStrategy } from '@shared/types/strategy'

interface RangeMatrixProps {
  combos: ComboStrategy[]
  selectedCombo: ComboKey | null
  hoveredCombo: ComboKey | null
  onSelectCombo: (combo: ComboKey | null) => void
  onHoverCombo: (combo: ComboKey | null) => void
  className?: string
  size?: 'compact' | 'comfortable'
  showHeatmap?: boolean
}

type ComboDataMap = Record<ComboKey, { weight: number; ev: number; equity: number; actions: ComboStrategy['actions'] }>

/**
 * Professional 7-stop heatmap gradient — PioSolver-grade.
 * Uses CSS custom properties for consistency.
 */
function frequencyToColor(freq: number): string {
  if (freq <= 0.01) return '#0D1219'   // empty
  if (freq <= 0.15) return '#0A2E1F'  // trace green
  if (freq <= 0.30) return '#0B5C3B'  // light green
  if (freq <= 0.50) return '#0D8C56'  // medium green
  if (freq <= 0.70) return '#D4850A'  // amber (mixed)
  if (freq <= 0.90) return '#E04A1A'  // orange-red
  return '#E0243F'                     // red (100%)
}

function frequencyToTextColor(freq: number): string {
  if (freq <= 0.01) return '#3A4556'
  if (freq <= 0.20) return '#6B7D8E'
  if (freq <= 0.40) return '#9BA5B5'
  if (freq <= 0.65) return '#D0D6E0'
  if (freq <= 0.85) return '#F0F2F8'
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

  // Value-heavy combos: green ring
  if (eq > 0.6 && betFreq > 0.5) return 'ring-1 ring-emerald-500/50 ring-inset'
  // Good value: emerald ring
  if (eq > 0.55 && betFreq > 0.4) return 'ring-1 ring-emerald-500/35 ring-inset'
  // Bluff candidates: red dashed
  if (eq < 0.3 && betFreq > 0.3) return 'ring-1 ring-red-500/45 ring-inset'
  // Marginal: amber
  if (eq >= 0.3 && eq <= 0.55 && betFreq > 0.3) return 'ring-1 ring-amber-500/35 ring-inset'
  // Check-heavy: subtle neutral ring
  if (checkFreq > 0.6) return 'ring-1 ring-neutral-500/25 ring-inset'
  return ''
}

export function RangeMatrix({
  combos, selectedCombo, hoveredCombo, onSelectCombo, onHoverCombo,
  className, size = 'comfortable', showHeatmap = true,
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
      {/* Column headers (ranks across the top) */}
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
            const bgColor = frequencyToColor(weight)
            const textColor = frequencyToTextColor(weight)
            const border = frequencyToBorder(weight, isSelected, isHovered)
            const primaryAction = data?.actions?.[0]?.action ?? '-'
            const heatmapRing = showHeatmap ? getHeatmapRing(data, weight) : ''

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
                  backgroundColor: bgColor,
                  border,
                }}
                onClick={() => handleCellClick(comboKey)}
                onMouseEnter={() => onHoverCombo(comboKey)}
                onMouseLeave={() => onHoverCombo(null)}
                data-tooltip={`${comboKey} · ${Math.round(weight * 100)}% · ${primaryAction}`}
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
