import { ACTION_LABELS } from '@shared/constants/actions'
import { cn } from '../../lib/utils'

interface MatrixLegendProps {
  /** Whether action-split display mode is active. Shows extra action color legend. */
  showActionColors?: boolean
}

/**
 * GTO Wizard 标准颜色编码图例
 *
 * RANGE FREQUENCY: 6-stop gradient optimized for dark background
 *   Empty (#0F141F) → Green (翡翠绿) → Yellow (暗金) → Orange (橘红) → Red (火砖红)
 *
 * ACTIONS (conic-gradient split mode):
 *   🔵 Fold=蓝  🟢 Call/Check=绿  🟠 Bet=橙→红(越大越深)  🔴 Raise=红  ⚫ All-in=深红
 */
const ACTION_LEGEND_ITEMS = [
  { label: 'Fold', color: '#3B82F6' },
  { label: 'Check', color: '#22C55E' },
  { label: 'Call', color: '#16A34A' },
  { label: 'Bet S', color: '#F59E0B' },
  { label: 'Bet M', color: '#F97316' },
  { label: 'Bet L', color: '#DC2626' },
  { label: 'Raise', color: '#EF4444' },
  { label: 'All-in', color: '#991B1B' },
]

export function MatrixLegend({ showActionColors = false }: MatrixLegendProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Range frequency gradient — 6-stop GTO Wizard standard */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Range</span>
        <div className="flex items-center gap-[2px]">
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#0F141F' }} title="0% (不在范围)" />
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#0B5C33' }} title="<25%" />
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#3B8C3B' }} title="25-50%" />
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#B8860B' }} title="50-70%" />
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#D4650A' }} title="70-85%" />
          <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: '#C0392B' }} title=">85%" />
        </div>
        <span className="text-[10px] text-neutral-600 font-medium">0%</span>
        <div
          className="w-16 h-1.5 rounded-full"
          style={{
            background: 'linear-gradient(to right, #0F141F, #0B5C33, #3B8C3B, #B8860B, #D4650A, #C0392B)',
          }}
        />
        <span className="text-[10px] text-neutral-600 font-medium">100%</span>
      </div>

      {/* Action color legend — conic-gradient mode */}
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
