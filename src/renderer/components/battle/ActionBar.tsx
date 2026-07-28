/**
 * ActionBar — Hero action buttons for poker table
 */
import { type GameAction, getAvailableActions } from '../../services/game-simulator'
import type { GameState } from '../../services/game-simulator'
import { cn } from '../../lib/utils'

interface ActionBarProps {
  gameState: GameState
  onAction: (action: { type: GameAction['type']; amount?: number }) => void
  disabled?: boolean
}

const ACTION_STYLES: Record<string, string> = {
  fold: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400',
  check: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400',
  call: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 text-green-400',
  bet: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 text-amber-400',
  raise: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 text-purple-400',
  all_in: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 text-orange-400',
}

export function ActionBar({ gameState, onAction, disabled }: ActionBarProps) {
  const actions = getAvailableActions(gameState)

  if (actions.length === 0) return null

  return (
    <div className="flex items-center gap-2 animate-slide-up">
      {actions.map((act) => (
        <button
          key={act.type}
          onClick={() => onAction({ type: act.type, amount: act.amount })}
          disabled={disabled || act.disabled}
          className={cn(
            'px-4 py-2.5 rounded-xl border font-bold text-xs tracking-wide',
            'transition-all duration-150 active:scale-95',
            ACTION_STYLES[act.type] || 'bg-neutral-800 border-neutral-700 text-neutral-400',
            (disabled || act.disabled) && 'opacity-30 cursor-not-allowed',
          )}
        >
          {act.label}
        </button>
      ))}
    </div>
  )
}
