/**
 * CommunityCards — Public board cards display
 */
import { PokerCard } from '../common/PokerCard'
import type { CardString } from '../../../shared/types/poker'

interface CommunityCardsProps {
  cards: CardString[]
  street: string
}

const STREET_LABELS: Record<string, string> = {
  preflop: '',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
}

export function CommunityCards({ cards, street }: CommunityCardsProps) {
  if (cards.length === 0) {
    return (
      <div className="flex items-center gap-2 opacity-40">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-11 h-16 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 flex items-center justify-center">
            <span className="text-neutral-600 text-[10px]">?</span>
          </div>
        ))}
        <span className="text-[10px] text-neutral-600 ml-1">Flop</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in">
      {street !== 'preflop' && (
        <span className="text-[10px] text-neutral-500 font-medium tracking-wider uppercase">
          {STREET_LABELS[street] || ''}
        </span>
      )}
      <div className="flex gap-1.5">
        {cards.map((card, i) => (
          <PokerCard
            key={`${card}-${i}`}
            card={card}
            size="lg"
            delay={i * 200 + 300}
            highlight={street === 'river' && i >= 3}
          />
        ))}
        {/* Placeholder slots for future streets */}
        {cards.length < 5 && Array.from({ length: 5 - cards.length }).map((_, i) => (
          <div key={`empty-${i}`} className="w-14 h-20 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/30 flex items-center justify-center" />
        ))}
      </div>
    </div>
  )
}
