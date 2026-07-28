/**
 * Reusable Poker Card Component
 * Displays a single card with rank + suit in poker table green style.
 */
import { cn } from '../../lib/utils'

const SUIT_SYMBOLS: Record<string, string> = {
  s: '♠', h: '♥', d: '♦', c: '♣',
}

const SUIT_COLORS: Record<string, string> = {
  s: 'text-neutral-200', h: 'text-red-400', d: 'text-blue-400', c: 'text-emerald-400',
}

interface PokerCardProps {
  card: string // e.g. "Ah", "Td", "2c"
  faceDown?: boolean
  size?: 'sm' | 'md' | 'lg'
  delay?: number
  highlight?: boolean
  dimmed?: boolean
  noAnimate?: boolean
  className?: string
}

export function PokerCard({ card, faceDown = false, size = 'md', delay = 0, highlight, dimmed, noAnimate, className }: PokerCardProps) {
  const sizeClasses = {
    sm: 'w-8 h-12 text-[10px] rounded-md',
    md: 'w-11 h-16 text-xs rounded-lg',
    lg: 'w-14 h-20 text-sm rounded-xl',
  }

  if (faceDown || !card || card === '?') {
    return (
      <div
        className={cn(
          sizeClasses[size],
          'bg-gradient-to-br from-blue-700 to-blue-900 border border-blue-500/30 flex items-center justify-center shadow-lg',
          !noAnimate && 'animate-card-deal',
          className,
        )}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="w-2/3 h-2/3 rounded bg-blue-600/40 flex items-center justify-center">
          <span className="text-blue-300 text-[60%] font-bold">?</span>
        </div>
      </div>
    )
  }

  const rank = card.length >= 2 ? card[0] : ''
  const suit = (card.length >= 2 ? card[card.length - 1].toLowerCase() : 's')

  return (
    <div
      className={cn(
        sizeClasses[size],
        'bg-white dark:bg-neutral-100 border border-neutral-300 dark:border-neutral-400 flex flex-col items-center justify-center shadow-lg font-mono',
        SUIT_COLORS[suit] || 'text-neutral-800',
        !noAnimate && 'animate-card-deal',
        highlight && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-neutral-900',
        dimmed && 'opacity-50',
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="font-extrabold leading-none" style={{ fontSize: size === 'sm' ? '11px' : size === 'lg' ? '16px' : '14px' }}>
        {rank}
      </span>
      <span className="leading-none mt-0.5" style={{ fontSize: size === 'sm' ? '9px' : size === 'lg' ? '14px' : '12px' }}>
        {SUIT_SYMBOLS[suit] || suit}
      </span>
    </div>
  )
}
