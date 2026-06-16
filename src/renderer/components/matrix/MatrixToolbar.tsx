import { cn } from '../../lib/utils'
import type { MatrixDisplayMode } from '@shared/types/strategy'
import { useStrategyStore } from '../../stores/strategyStore'
import { User, Users, GitCompare, Layers } from 'lucide-react'

const MODES: { id: MatrixDisplayMode; label: string; icon: typeof User }[] = [
  { id: 'hero', label: '我', icon: User },
  { id: 'villain', label: '对手', icon: Users },
  { id: 'diff', label: 'Diff', icon: GitCompare },
  { id: 'merged', label: 'Merged', icon: Layers },
]

export function MatrixToolbar() {
  const displayMode = useStrategyStore((s) => s.displayMode)
  const setDisplayMode = useStrategyStore((s) => s.setDisplayMode)
  const selectedCombo = useStrategyStore((s) => s.selectedCombo)

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-0.5 bg-[#0F141C] rounded-lg p-0.5 ring-1 ring-white/[0.03]">
        {MODES.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.id}
              onClick={() => setDisplayMode(mode.id)}
              className={cn(
                'px-3 py-1.5 text-[11px] rounded-md font-medium transition-all flex items-center gap-1.5',
                displayMode === mode.id
                  ? 'bg-blue-500/15 text-blue-400 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-300',
              )}
            >
              <Icon size={11} />
              {mode.label}
            </button>
          )
        })}
      </div>

      {selectedCombo && (
        <span className="text-[11px] text-neutral-500 animate-fade-in">
          Selected:{' '}
          <span className="text-blue-400 font-mono font-bold">{selectedCombo}</span>
        </span>
      )}
    </div>
  )
}
