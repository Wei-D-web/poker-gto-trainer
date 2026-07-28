/**
 * PotDisplay — Shows current pot and street indicator
 */
interface PotDisplayProps {
  pot: number
  street: string
}

const STREET_NAMES: Record<string, string> = {
  preflop: '翻前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  showdown: '摊牌',
}

export function PotDisplay({ pot, street }: PotDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
        {STREET_NAMES[street] || street}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500">底池</span>
        <span className="text-lg font-black text-amber-400 font-mono">
          ${pot.toFixed(1)}
        </span>
      </div>
      <div className="flex gap-1">
        {['chip', 'chip', 'chip'].map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-500/40"
            style={{ transform: `translateX(${(i - 1) * 3}px)` }}
          />
        ))}
      </div>
    </div>
  )
}
