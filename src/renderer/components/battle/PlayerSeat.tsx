/**
 * PlayerSeat — Displays a player at the poker table with cards, chips, and action indicator
 */
import { PokerCard } from '../common/PokerCard'
import { cn } from '../../lib/utils'

interface PlayerSeatProps {
  name: string
  isHero: boolean
  stack: number
  currentBet: number
  holeCards: string[]
  folded: boolean
  isAllIn: boolean
  isActing: boolean
  isWinner?: boolean
  position: number
  showCards?: boolean
  lastAction?: string
  compact?: boolean
}

export function PlayerSeat({
  name, isHero, stack, currentBet, holeCards, folded, isAllIn, isActing, isWinner, position,
  showCards = false, lastAction, compact = false,
}: PlayerSeatProps) {
  const positionNames: Record<number, string> = {
    0: 'UTG', 1: 'MP', 2: 'CO', 3: 'BTN', 4: 'SB', 5: 'BB',
  }

  return (
    <div className={cn(
      'flex flex-col items-center gap-1.5 transition-all duration-300',
      isActing && 'scale-105',
      folded && 'opacity-50',
      compact && 'gap-0.5',
    )}>
      {/* Position + Name */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
          {positionNames[position] || `P${position}`}
        </span>
        <span className={cn(
          'text-sm font-bold',
          isHero ? 'text-cyan-400' : 'text-neutral-300',
        )}>
          {name}
        </span>
        {isWinner && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">WIN</span>
        )}
      </div>

      {/* Hole Cards */}
      <div className="flex gap-1">
        {holeCards.map((card, i) => (
          <PokerCard
            key={i}
            card={card}
            faceDown={!isHero && !showCards}
            size={compact ? 'sm' : 'md'}
            delay={i * 150}
            dimmed={folded && !showCards}
          />
        ))}
      </div>

      {/* Stack + Bet */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-400">
          筹码: <span className="text-neutral-200 font-mono font-bold">${stack.toFixed(1)}</span>
        </span>
        {currentBet > 0 && (
          <span className="text-amber-400">
            下注: <span className="font-mono font-bold">${currentBet.toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-1.5 h-4">
        {isAllIn && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold animate-pulse">
            ALL-IN
          </span>
        )}
        {folded && !isAllIn && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold">
            FOLD
          </span>
        )}
        {isActing && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold animate-pulse">
            行动中...
          </span>
        )}
        {lastAction && !isActing && (
          <span className="text-[10px] text-neutral-500 animate-fade-in">{lastAction}</span>
        )}
      </div>
    </div>
  )
}
