import { useMemo, useState } from 'react'
import type { PostflopResult } from '../../../../src/main/solver/postflop-engine'
import { RangeMatrix } from '../matrix/RangeMatrix'
import { MatrixLegend } from '../matrix/MatrixLegend'
import { cn } from '../../lib/utils'
import { Zap, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'

interface PostflopAnalysisProps {
  result: PostflopResult
}

export function PostflopAnalysis({ result }: PostflopAnalysisProps) {
  const [showMatrix, setShowMatrix] = useState(true)
  const [filterHandType, setFilterHandType] = useState<string | null>(null)

  const matrixCombos = useMemo(() => {
    return result.combos.map(c => ({
      comboKey: c.comboKey,
      actions: c.actions.map(a => ({ action: a.action, frequency: a.frequency, ev: a.ev })),
      equity: c.equity,
      weight: c.weight,
      ev: c.weight * c.equity * 0.1,
    }))
  }, [result.combos])

  const handTypeStats = useMemo(() => {
    const groups: Record<string, { count: number; totalBetFreq: number; avgEquity: number }> = {}
    for (const c of result.combos) {
      if (c.weight < 0.05) continue
      const ht = c.handType
      if (!groups[ht]) groups[ht] = { count: 0, totalBetFreq: 0, avgEquity: 0 }
      const betAction = c.actions.find(a => a.action.startsWith('bet'))
      groups[ht].count++
      groups[ht].totalBetFreq += betAction?.frequency || 0
      groups[ht].avgEquity += c.equity
    }
    for (const g of Object.values(groups)) {
      g.totalBetFreq /= g.count
      g.avgEquity /= g.count
    }
    return groups
  }, [result.combos])

  const handTypeLabels: Record<string, string> = {
    set: 'Set', two_pair: 'Two Pair', overpair: 'Overpair',
    top_pair_top_kicker: 'TPTK', top_pair: 'Top Pair', middle_pair: 'Middle Pair',
    bottom_pair: 'Bottom Pair', pocket_pair_below: 'Low PP',
    flush_draw: 'Flush Draw', oesd: 'OESD', gutshot: 'Gutshot',
    two_overcards: 'Two Overcards', one_overcard: 'One Overcard',
    backdoor_draws: 'Backdoor Draws', air: 'Air',
  }

  const inRange = result.combos.filter(c => c.weight > 0.05)
  const checkCombos = inRange.filter(c => c.actions.some(a => a.action === 'check' && a.frequency > 0.5))

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-gradient-to-br from-blue-500/[0.06] to-purple-500/[0.06] rounded-2xl p-5 border border-blue-500/15">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-neutral-100">{result.description}</h3>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold ring-1 ring-amber-500/15">
            Rec {result.recommendedSizing}
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          {result.board.map((card, i) => (
            <span key={i} className="px-3 py-2 bg-[#090D14] rounded-lg text-sm font-mono font-bold text-neutral-100 border border-[#1C2A3D]">
              {card}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#090D14] rounded-xl p-3 border border-[#152233]">
            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">C-bet Freq</div>
            <div className="text-xl font-bold text-amber-400">{Math.round(result.overallCbetFreq * 100)}%</div>
          </div>
          <div className="bg-[#090D14] rounded-xl p-3 border border-[#152233]">
            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Position</div>
            <div className="text-sm font-bold text-neutral-200">{result.isHeroIP ? 'IP ✅' : 'OOP ⚠️'}</div>
          </div>
          <div className="bg-[#090D14] rounded-xl p-3 border border-[#152233]">
            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">In Range</div>
            <div className="text-xl font-bold text-blue-400">{inRange.length}</div>
          </div>
        </div>
      </div>

      {/* Matrix toggle */}
      <button
        onClick={() => setShowMatrix(!showMatrix)}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors font-medium"
      >
        {showMatrix ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showMatrix ? 'Hide Range Matrix' : 'Show Range Matrix'}
      </button>

      {showMatrix && (
        <div className="bg-[#090D14] rounded-2xl p-5 border border-[#152233] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              Color = frequency · Number = c-bet%
            </span>
            <MatrixLegend />
          </div>
          <RangeMatrix
            combos={matrixCombos}
            selectedCombo={null}
            hoveredCombo={null}
            onSelectCombo={() => {}}
            onHoverCombo={() => {}}
            size="compact"
          />
        </div>
      )}

      {/* Hand type breakdown */}
      <div>
        <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BarChart3 size={12} />
          Hand Type Breakdown
        </h4>
        <div className="space-y-1">
          {Object.entries(handTypeStats)
            .filter(([, s]) => s.count > 0)
            .sort(([, a], [, b]) => b.avgEquity - a.avgEquity)
            .map(([ht, stats]) => (
              <button
                key={ht}
                onClick={() => setFilterHandType(filterHandType === ht ? null : ht)}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all',
                  filterHandType === ht
                    ? 'bg-blue-500/8 border border-blue-500/20'
                    : 'bg-[#0B1019] border border-transparent hover:border-[#1C2A3D]',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-neutral-300 font-medium min-w-[80px]">{handTypeLabels[ht] || ht}</span>
                  <span className="text-neutral-600 text-[10px]">×{stats.count}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-neutral-500 text-[10px]">EQ {Math.round(stats.avgEquity * 100)}%</span>
                  <span className={cn(
                    'font-mono font-medium text-[10px]',
                    stats.totalBetFreq > 0.5 ? 'text-amber-400' : 'text-blue-400',
                  )}>
                    {stats.totalBetFreq > 0.5 ? 'bet' : 'check'} {Math.round(stats.totalBetFreq * 100)}%
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* GTO Summary */}
      <div className="bg-[#0B1019] rounded-2xl p-5 border border-[#1C2A3D]">
        <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Zap size={12} className="text-amber-400" />
          GTO Strategy Summary
        </h4>
        <div className="space-y-2.5 text-xs text-neutral-400 leading-relaxed">
          <p>
            <span className="text-neutral-200 font-medium">Overall: </span>
            {result.overallCbetFreq > 0.6 ? 'High-frequency small sizing' : result.overallCbetFreq > 0.4 ? 'Medium-frequency mixed strategy' : 'Low-frequency large sizing'}
          </p>
          <p>
            <span className="text-neutral-200 font-medium">Value: </span>
            {result.combos.filter(c => c.handType === 'set' || c.handType === 'two_pair' || c.handType === 'overpair').length > 5
              ? 'Strong value bets high frequency, medium hands mix in checks'
              : 'Most value hands should bet'}
          </p>
          <p>
            <span className="text-neutral-200 font-medium">Bluffs: </span>
            {result.texture.includes('dry') || result.texture.includes('high')
              ? 'Select hands with backdoor potential (overcards + backdoor flush/straight)'
              : result.texture.includes('monotone')
                ? 'Prioritize flush draws and combo draws'
                : 'Draws and two-overcard hands are best bluff candidates'}
          </p>
          <p>
            <span className="text-neutral-200 font-medium">Check range: </span>
            {checkCombos.length > 0
              ? `Middle pairs, bottom pairs, and non-developing overcards (~${Math.round(checkCombos.length / Math.max(1, inRange.length) * 100)}% of range)`
              : 'Almost no pure check range on this texture'}
          </p>
        </div>
      </div>
    </div>
  )
}
