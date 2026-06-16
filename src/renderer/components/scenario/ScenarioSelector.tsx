import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS, type Position } from '@shared/types/poker'
import { cn } from '../../lib/utils'
import { ArrowLeftRight, Layers } from 'lucide-react'

const POSITIONS: Position[] = [0, 1, 2, 3, 4, 5]
const STACK_DEPTHS = [10, 20, 30, 50, 75, 100, 150, 200]
const GAME_TYPES = [
  { id: 'cash' as const, label: 'Cash', icon: '💰' },
  { id: 'tournament' as const, label: 'MTT', icon: '🏆' },
]

export function ScenarioSelector() {
  const {
    gameType, heroPosition, villainPosition, stackDepth,
    setGameType, setHeroPosition, setVillainPosition, setStackDepth, flipPositions,
  } = useScenarioStore()

  return (
    <div className="space-y-5">
      {/* Game Type */}
      <div>
        <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2 block">
          Game Type
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {GAME_TYPES.map((gt) => (
            <button
              key={gt.id}
              onClick={() => setGameType(gt.id)}
              className={cn(
                'px-3 py-2 text-xs rounded-lg font-medium transition-all duration-200',
                'border',
                gameType === gt.id
                  ? 'bg-accent-muted text-accent border-accent/30 shadow-sm shadow-accent/10'
                  : 'bg-[#0F141C] text-neutral-400 border-transparent hover:border-[#1E293B] hover:text-neutral-300'
              )}
            >
              <span className="mr-1">{gt.icon}</span>
              {gt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Positions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
            Positions
          </label>
          <button
            onClick={flipPositions}
            className="p-1 rounded-md hover:bg-white/5 text-neutral-500 hover:text-neutral-300 transition-colors"
            title="Flip positions"
          >
            <ArrowLeftRight size={13} />
          </button>
        </div>

        {/* Seat layout */}
        <div className="bg-[#0F141C] rounded-xl p-3 border border-[#162032]">
          {/* Simplified table representation */}
          <div className="grid grid-cols-6 gap-1 mb-3">
            {POSITIONS.map((pos) => (
              <button
                key={`hero-${pos}`}
                onClick={() => setHeroPosition(pos)}
                className={cn(
                  'py-1.5 text-[10px] rounded-md font-semibold transition-all duration-200',
                  heroPosition === pos
                    ? 'bg-accent text-white shadow-sm shadow-accent/30'
                    : 'bg-[#141A23] text-neutral-500 hover:bg-[#1A2130] hover:text-neutral-400'
                )}
              >
                {POSITION_LABELS[pos]}
              </button>
            ))}
          </div>
          <div className="text-[9px] text-neutral-600 uppercase tracking-wider mb-1.5">vs</div>
          <div className="grid grid-cols-6 gap-1">
            {POSITIONS.map((pos) => (
              <button
                key={`vill-${pos}`}
                onClick={() => setVillainPosition(pos)}
                disabled={pos === heroPosition}
                className={cn(
                  'py-1.5 text-[10px] rounded-md font-semibold transition-all duration-200',
                  pos === heroPosition
                    ? 'bg-[#0A0F17] text-neutral-700 cursor-not-allowed'
                    : villainPosition === pos
                      ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
                      : 'bg-[#141A23] text-neutral-500 hover:bg-[#1A2130] hover:text-neutral-400'
                )}
              >
                {POSITION_LABELS[pos]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stack Depth */}
      <div>
        <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2 block">
          Stack Depth{' '}
          <span className="text-neutral-300 font-bold text-xs ml-1">{stackDepth}bb</span>
        </label>
        <div className="grid grid-cols-4 gap-1">
          {STACK_DEPTHS.map((depth) => (
            <button
              key={depth}
              onClick={() => setStackDepth(depth)}
              className={cn(
                'py-1.5 text-[11px] rounded-lg font-medium transition-all duration-200',
                stackDepth === depth
                  ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 shadow-sm shadow-amber-500/5'
                  : 'bg-[#0F141C] text-neutral-500 hover:bg-[#1A2130] hover:text-neutral-400'
              )}
            >
              {depth}
            </button>
          ))}
        </div>
      </div>

      {/* Position information */}
      <div className="bg-gradient-to-br from-[#11161D] to-[#0D1219] rounded-xl p-3 border border-[#162032]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-neutral-500">Hero</span>
          <span className="text-blue-400 font-semibold">{POSITION_LABELS[heroPosition]}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1.5">
          <span className="text-neutral-500">Villain</span>
          <span className="text-red-400 font-semibold">{POSITION_LABELS[villainPosition]}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1.5">
          <span className="text-neutral-500">Position</span>
          <span className={cn('font-semibold', heroPosition > villainPosition ? 'text-green-400' : 'text-amber-400')}>
            {heroPosition > villainPosition || (heroPosition === 4 && villainPosition === 5) ? 'In Position' : 'Out of Position'}
          </span>
        </div>
      </div>
    </div>
  )
}
