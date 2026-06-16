import { useState, useMemo } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS, type Position } from '@shared/types/poker'
import { simulateRangeBattle, buildStandardRange, type RangeBattleResult } from '../../../../src/main/solver/range-battle'
import { BoardSelector } from './BoardSelector'
import { RangeMatrix } from '../matrix/RangeMatrix'
import type { ComboStrategy } from '@shared/types/strategy'
import { cn } from '../../lib/utils'
import { Swords, Zap, Target, TrendingUp, Shield, BarChart3 } from 'lucide-react'

export function RangeBattlePage() {
  const { gameType, stackDepth } = useScenarioStore()
  const [board, setBoard] = useState<string[]>(['As', '7d', '2c'])
  const [heroPos, setHeroPos] = useState<Position>(3)
  const [villainPos, setVillainPos] = useState<Position>(5)
  const [result, setResult] = useState<RangeBattleResult | null>(null)
  const [computing, setComputing] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'hero-evs' | 'villain-evs'>('overview')

  const heroRange = useMemo(() => buildStandardRange(heroPos, stackDepth), [heroPos, stackDepth])
  const villainRange = useMemo(() => buildStandardRange(villainPos, stackDepth), [villainPos, stackDepth])

  const runBattle = () => {
    setComputing(true)
    // Simulate asynchronously to not block UI
    setTimeout(() => {
      const r = simulateRangeBattle({ board, heroRange, villainRange })
      setResult(r)
      setComputing(false)
    }, 50)
  }

  // Convert EV map to ComboStrategy[] for RangeMatrix
  const heroEVCombos = useMemo((): ComboStrategy[] => {
    if (!result) return []
    return Object.entries(result.heroComboEVs).map(([key, eq]) => ({
      comboKey: key,
      actions: [{ action: eq > 0.5 ? 'value' : 'bluff', frequency: 1, ev: eq - 0.5 }],
      equity: eq,
      weight: heroRange[key] || 0,
      ev: eq - 0.5,
    }))
  }, [result, heroRange])

  const villainEVCombos = useMemo((): ComboStrategy[] => {
    if (!result) return []
    return Object.entries(result.villainComboEVs).map(([key, eq]) => ({
      comboKey: key,
      actions: [{ action: eq > 0.5 ? 'value' : 'bluff', frequency: 1, ev: eq - 0.5 }],
      equity: eq,
      weight: villainRange[key] || 0,
      ev: eq - 0.5,
    }))
  }, [result, villainRange])

  const formatCard = (c: string) => {
    const suitIcons: Record<string,string> = {s:'♠',h:'♥',d:'♦',c:'♣'}
    return c[0] + (suitIcons[c[1]] || c[1])
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Swords size={18} className="text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-200">Range Battle</h2>
            <p className="text-xs text-neutral-500">Range vs Range equity simulation — see who dominates each board</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Controls */}
        <div className="w-72 border-r border-[#152233] p-4 space-y-5 overflow-y-auto shrink-0 bg-[#080B10]">
          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Board</label>
            <BoardSelector board={board} onChange={setBoard} isLoading={computing} />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Hero Position</label>
            <div className="grid grid-cols-6 gap-1">
              {([0,1,2,3,4,5] as Position[]).map(p => (
                <button key={p} onClick={() => setHeroPos(p)}
                  className={cn('py-1.5 text-[10px] rounded font-semibold transition-all',
                    heroPos === p ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/25' : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300')}>
                  {POSITION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Villain Position</label>
            <div className="grid grid-cols-6 gap-1">
              {([0,1,2,3,4,5] as Position[]).map(p => (
                <button key={p} onClick={() => setVillainPos(p)}
                  className={cn('py-1.5 text-[10px] rounded font-semibold transition-all',
                    villainPos === p ? 'bg-red-500/12 text-red-400 ring-1 ring-red-500/25' : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300')}>
                  {POSITION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <button onClick={runBattle} disabled={board.length < 3 || computing}
            className="w-full py-2.5 text-sm font-bold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:from-neutral-700 disabled:to-neutral-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_2px_16px_rgba(220,38,38,0.2)]">
            <Swords size={15} /> {computing ? 'Computing...' : 'Run Battle'}
          </button>

          <div className="text-[9px] text-neutral-600 text-center leading-relaxed">
            Uses 169×169 preflop equity lookup table for instant Monte Carlo simulation.
            {stackDepth}bb · {gameType === 'cash' ? 'Cash' : 'MTT'}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
                <Swords size={36} className="opacity-20" />
              </div>
              <div>
                <p className="text-sm font-medium">Select a board and click "Run Battle"</p>
                <p className="text-xs opacity-60 mt-1">BTN vs BB on A72r makes a great first comparison</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              {/* Equity comparison card */}
              <div className="bg-gradient-to-br from-blue-500/[0.04] via-red-500/[0.04] to-blue-500/[0.04] rounded-2xl p-6 border border-[#1C2A3D]">
                <div className="text-center mb-5">
                  <div className="flex gap-2 justify-center mb-3">
                    {board.map((c, i) => (
                      <span key={i} className="px-3 py-2 bg-[#090D14] rounded-lg text-sm font-mono font-bold text-neutral-100 border border-[#1C2A3D]">
                        {formatCard(c)}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] text-neutral-400 font-medium ring-1 ring-white/[0.05]">
                    {result.boardTexture}
                  </span>
                </div>

                {/* Equity bars */}
                <div className="flex items-center gap-6 mb-5">
                  <div className="text-center shrink-0 w-24">
                    <div className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-1">{POSITION_LABELS[heroPos]}</div>
                    <div className="text-3xl font-black text-blue-400">{result.heroEquity}%</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-5 bg-[#0F141C] rounded-full overflow-hidden flex">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full transition-all duration-700"
                        style={{ width: `${result.heroEquity}%` }} />
                      <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-r-full transition-all duration-700"
                        style={{ width: `${result.villainEquity}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-neutral-600 mt-1.5">
                      <span>Hero {result.heroEquity}%</span>
                      <span className={cn('font-semibold', result.heroRangeAdvantage > 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {result.heroRangeAdvantage > 0 ? '+' : ''}{result.heroRangeAdvantage}% advantage
                      </span>
                      <span>Villain {result.villainEquity}%</span>
                    </div>
                  </div>
                  <div className="text-center shrink-0 w-24">
                    <div className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mb-1">{POSITION_LABELS[villainPos]}</div>
                    <div className="text-3xl font-black text-red-400">{result.villainEquity}%</div>
                  </div>
                </div>

                <div className="bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-3 text-center">
                  <span className="text-xs text-amber-400 font-semibold">{result.recommendedAction}</span>
                </div>
              </div>

              {/* Hand type breakdown */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard icon={Target} label="Hero Value" value={result.heroValueHands} sub="combos >55% EQ" color="text-blue-400" />
                <StatCard icon={Shield} label="Hero Bluffs" value={result.heroBluffHands} sub="combos <35% EQ" color="text-blue-300" />
                <StatCard icon={Target} label="Villain Value" value={result.villainValueHands} sub="combos >55% EQ" color="text-red-400" />
                <StatCard icon={Shield} label="Villain Bluffs" value={result.villainBluffHands} sub="combos <35% EQ" color="text-red-300" />
              </div>

              {/* Equity Distribution */}
              <div className="bg-[#090D14] rounded-2xl p-5 border border-[#152233]">
                <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BarChart3 size={12} /> Equity Distribution
                </h4>
                <div className="space-y-2">
                  {result.equityDistribution.map((bucket) => {
                    const maxCount = Math.max(...result.equityDistribution.map(b => Math.max(b.heroCount, b.villainCount)), 1)
                    const heroWidth = (bucket.heroCount / maxCount) * 100
                    const villainWidth = (bucket.villainCount / maxCount) * 100
                    return (
                      <div key={bucket.bucket} className="flex items-center gap-3">
                        <span className="text-[10px] text-neutral-500 w-14 text-right">{bucket.bucket}</span>
                        <div className="flex-1 flex gap-1">
                          <div className="flex-1 flex justify-end">
                            <div className="h-4 bg-blue-500/60 rounded-l transition-all" style={{ width: `${heroWidth}%`, minWidth: bucket.heroCount > 0 ? '4px' : 0 }} />
                          </div>
                          <div className="flex-1">
                            <div className="h-4 bg-red-500/60 rounded-r transition-all" style={{ width: `${villainWidth}%`, minWidth: bucket.villainCount > 0 ? '4px' : 0 }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-600 w-8">
                          {bucket.heroCount}/{bucket.villainCount}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-center gap-6 mt-3 text-[9px]">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500/60" /> {POSITION_LABELS[heroPos]}</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/60" /> {POSITION_LABELS[villainPos]}</span>
                </div>
              </div>

              {/* Per-combo EV matrix */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {([
                    { id: 'overview' as const, label: 'Overview' },
                    { id: 'hero-evs' as const, label: `${POSITION_LABELS[heroPos]} per-combo EQ` },
                    { id: 'villain-evs' as const, label: `${POSITION_LABELS[villainPos]} per-combo EQ` },
                  ]).map(v => (
                    <button key={v.id} onClick={() => setActiveView(v.id)}
                      className={cn('px-3 py-1.5 text-xs rounded-lg font-medium transition-all',
                        activeView === v.id ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300')}>
                      {v.label}
                    </button>
                  ))}
                </div>

                {activeView === 'hero-evs' && (
                  <div className="bg-[#090D14] p-4 rounded-2xl border border-[#152233]">
                    <RangeMatrix combos={heroEVCombos} selectedCombo={null} hoveredCombo={null}
                      onSelectCombo={() => {}} onHoverCombo={() => {}} size="compact" />
                  </div>
                )}
                {activeView === 'villain-evs' && (
                  <div className="bg-[#090D14] p-4 rounded-2xl border border-[#152233]">
                    <RangeMatrix combos={villainEVCombos} selectedCombo={null} hoveredCombo={null}
                      onSelectCombo={() => {}} onHoverCombo={() => {}} size="compact" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: number; sub: string; color: string }) {
  return (
    <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className={color} />
        <span className="text-[10px] text-neutral-500 font-medium">{label}</span>
      </div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
      <div className="text-[9px] text-neutral-600 mt-0.5">{sub}</div>
    </div>
  )
}
