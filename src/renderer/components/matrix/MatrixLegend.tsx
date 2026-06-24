import { ACTION_LABELS } from '@shared/constants/actions'
import { cn } from '../../lib/utils'

interface MatrixLegendProps {
  /** Whether action-split display mode is active. Shows extra action color legend. */
  showActionColors?: boolean
}

const ACTION_LEGEND_ITEMS = [
  { label: 'Fold', color: '#3B82F6' },
  { label: 'Check', color: '#A78BFA' },
  { label: 'Call', color: '#10B981' },
  { label: 'Bet', color: '#F59E0B' },
  { label: 'Raise', color: '#EF4444' },
  { label: 'All-in', color: '#991B1B' },
]

/**
 * GTOWizard-style frequency legend — 3-stop gradient.
 * Green (low) → amber (medium) → red (high).
 * Optionally shows action color guide for conic-gradient split cells.
 */
export function MatrixLegend({ showActionColors = false }: MatrixLegendProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Range frequency gradient */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Range</span>
        <div className="flex items-center gap-[2px]">
          <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#0D1219' }} title="0%" />
          <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#0E3B24' }} title="<40%" />
          <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#8B5D1A' }} title="40-70%" />
          <div className="w-5 h-3 rounded-sm" style={{ backgroundColor: '#8B1A1A' }} title=">70%" />
        </div>
        <span className="text-[10px] text-neutral-600 font-medium">0%</span>
        <div
          className="w-14 h-1.5 rounded-full"
          style={{
            background: 'linear-gradient(to right, #0D1219, #0E3B24, #8B5D1A, #8B1A1A)',
          }}
        />
        <span className="text-[10px] text-neutral-600 font-medium">100%</span>
      </div>

      {/* Action color legend */}
      {showActionColors && (
        <>
          <div className="w-px h-4 bg-[#1C2A3D]" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Actions</span>
            {ACTION_LEGEND_ITEMS.map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] text-neutral-600">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
