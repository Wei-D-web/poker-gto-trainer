import { useState, useEffect, useMemo } from 'react'
import { POSITION_LABELS, type Position } from '@shared/types/poker'
import { RangeMatrix } from '../matrix/RangeMatrix'
import { MatrixLegend } from '../matrix/MatrixLegend'
import type { ComboStrategy } from '@shared/types/strategy'
import { cn } from '../../lib/utils'
import { BookOpen, Search, Grid3X3, ChevronLeft, ChevronRight, Target, Layers } from 'lucide-react'

interface ChartEntry {
  id: string; position: Position; stackDepth: number
  combos: ComboStrategy[]; vpip: number; description: string
}

const STACK_DEPTHS = [10, 20, 30, 50, 75, 100, 150, 200]

const CHART_INFO: Record<number, { name: string; desc: string; color: string }> = {
  0: { name: 'UTG Open', desc: 'Under the Gun RFI range — tightest position', color: 'text-red-400' },
  1: { name: 'MP Open', desc: 'Middle Position RFI range', color: 'text-amber-400' },
  2: { name: 'CO Open', desc: 'Cutoff RFI range — wide stealing range', color: 'text-yellow-400' },
  3: { name: 'BTN Open', desc: 'Button RFI range — widest opening range', color: 'text-emerald-400' },
  4: { name: 'SB Open', desc: 'Small Blind RFI — steal from blinds', color: 'text-blue-400' },
  5: { name: 'BB Defend', desc: 'Big Blind defense vs open', color: 'text-purple-400' },
}

export function PreflopChartsPage() {
  const [charts, setCharts] = useState<ChartEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPos, setSelectedPos] = useState<Position>(3)
  const [selectedDepth, setSelectedDepth] = useState(100)
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid')
  const [detailChart, setDetailChart] = useState<ChartEntry | null>(null)

  useEffect(() => {
    loadAllCharts()
  }, [])

  const loadAllCharts = async () => {
    setLoading(true)
    const all: ChartEntry[] = []

    for (const pos of [0,1,2,3,4,5] as Position[]) {
      for (const depth of STACK_DEPTHS) {
        try {
          const result = await window.electronAPI.strategy.getPreflopRange({
            gameType: 'cash', position: pos, stackDepth: depth,
          })
          if (result.strategy?.combos) {
            const inRange = result.strategy.combos.filter(c => c.weight > 0.05)
            all.push({
              id: `chart_${pos}_${depth}`,
              position: pos,
              stackDepth: depth,
              combos: result.strategy.combos,
              vpip: Math.round((inRange.length / 169) * 100),
              description: `${POSITION_LABELS[pos]} · ${depth}bb · ${CHART_INFO[pos]?.desc || ''}`,
            })
          }
        } catch (e) {
          // Skip unavailable combos
        }
      }
    }
    setCharts(all)
    if (all.length > 0) setDetailChart(all[0])
    setLoading(false)
  }

  const filteredCharts = useMemo(() =>
    charts.filter(c => c.position === selectedPos && c.stackDepth === selectedDepth),
    [charts, selectedPos, selectedDepth],
  )

  // All charts for the selected stack depth (one per position) — for grid view
  const depthGrid = useMemo(() =>
    STACK_DEPTHS.filter(d => charts.some(c => c.stackDepth === d && c.position === selectedPos)),
    [charts, selectedPos],
  )

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BookOpen size={18} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-200">Preflop Charts Library</h2>
            <p className="text-xs text-neutral-500">GTO 翻前范围图册 · 全部位置 × 深度</p>
          </div>
          <div className="flex gap-1 bg-[#0F141C] rounded-lg p-0.5 ring-1 ring-white/[0.03]">
            {([
              { id: 'grid' as const, icon: Grid3X3, label: 'Grid' },
              { id: 'detail' as const, icon: Search, label: 'Detail' },
            ]).map(m => (
              <button key={m.id} onClick={() => setViewMode(m.id)}
                className={cn('px-3 py-1.5 text-[11px] rounded-md font-medium transition-all flex items-center gap-1.5',
                  viewMode === m.id ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300')}>
                <m.icon size={11} /> {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick filters */}
        {viewMode === 'grid' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider mr-1">Position:</span>
            {[0,1,2,3,4,5].map(p => (
              <button key={p} onClick={() => setSelectedPos(p as Position)}
                className={cn('px-3 py-1.5 text-[11px] rounded-lg font-semibold transition-all',
                  selectedPos === p ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/25' : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300')}>
                {POSITION_LABELS[p]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#05080C]">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-neutral-500 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-neutral-600 border-t-blue-500 animate-spin" />
            Loading {charts.length} charts...
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid view: one chart per stack depth */
          <div className="max-w-5xl mx-auto space-y-6">
            {depthGrid.map(depth => {
              const chartsAtDepth = charts.filter(c => c.stackDepth === depth && c.position === selectedPos)
              if (chartsAtDepth.length === 0) return null
              const c = chartsAtDepth[0]

              return (
                <div key={c.id} className="bg-[#090D14] rounded-2xl border border-[#152233] p-5 hover:border-[#2A3B52] transition-all cursor-pointer group shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
                  onClick={() => { setDetailChart(c); setViewMode('detail') }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-200">{POSITION_LABELS[c.position]} RFI</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 ring-1 ring-white/[0.05]">
                          {c.stackDepth}bb
                        </span>
                        <span className="text-[10px] text-neutral-600">VPIP {c.vpip}%</span>
                      </div>
                      <p className="text-[10px] text-neutral-600 mt-1">{CHART_INFO[c.position]?.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                  </div>
                  <div className="flex justify-center">
                    <RangeMatrix combos={c.combos} selectedCombo={null} hoveredCombo={null}
                      onSelectCombo={() => {}} onHoverCombo={() => {}} size="compact" />
                  </div>
                </div>
              )
            })}
          </div>
        ) : detailChart ? (
          /* Detail view */
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('grid')}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1">
                <ChevronLeft size={12} /> Back to Grid
              </button>
            </div>

            {/* Position selector */}
            <div className="flex gap-1 flex-wrap">
              {[0,1,2,3,4,5].map(p => {
                const d = charts.find(c => c.position === p && c.stackDepth === selectedDepth)
                return (
                  <button key={p} onClick={() => {
                    const c = charts.find(x => x.position === p && x.stackDepth === selectedDepth)
                    if (c) { setSelectedPos(p); setDetailChart(c) }
                  }}
                  className={cn('px-3 py-1.5 text-xs rounded-lg font-semibold transition-all',
                    selectedPos === p ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/25' : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300')}>
                    {POSITION_LABELS[p]}
                  </button>
                )
              })}
            </div>

            {/* Depth selector */}
            <div className="flex gap-1 flex-wrap">
              {STACK_DEPTHS.map(d => {
                const has = charts.some(c => c.position === selectedPos && c.stackDepth === d)
                return (
                  <button key={d} onClick={() => {
                    if (!has) return
                    const c = charts.find(x => x.position === selectedPos && x.stackDepth === d)
                    if (c) { setSelectedDepth(d); setDetailChart(c) }
                  }}
                  disabled={!has}
                  className={cn('px-3 py-1.5 text-xs rounded-lg font-semibold transition-all',
                    selectedDepth === d ? 'bg-amber-500/12 text-amber-400 ring-1 ring-amber-500/25' :
                    has ? 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300' : 'text-neutral-700 cursor-not-allowed')}>
                    {d}bb
                  </button>
                )
              })}
            </div>

            {/* The chart */}
            <div className="bg-[#090D14] rounded-2xl border border-[#152233] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-200">
                      {POSITION_LABELS[detailChart.position]} · {detailChart.stackDepth}bb
                    </span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
                      detailChart.vpip > 30 ? 'bg-emerald-500/8 text-emerald-400 ring-1 ring-emerald-500/15' :
                      detailChart.vpip > 20 ? 'bg-amber-500/8 text-amber-400 ring-1 ring-amber-500/15' :
                      'bg-red-500/8 text-red-400 ring-1 ring-red-500/15')}>
                      VPIP {detailChart.vpip}%
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {detailChart.combos.filter(c => c.weight > 0.05).length} hands in range
                    </span>
                  </div>
                </div>
                <MatrixLegend />
              </div>
              <div className="flex justify-center">
                <RangeMatrix combos={detailChart.combos} selectedCombo={null} hoveredCombo={null}
                  onSelectCombo={() => {}} onHoverCombo={() => {}} size="comfortable" />
              </div>
            </div>

            {/* Range stats */}
            {detailChart && (
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="Pairs" value={detailChart.combos.filter(c => c.weight > 0.05 && c.comboKey[0] === c.comboKey[1]).length} />
                <StatBox label="Suited" value={detailChart.combos.filter(c => c.weight > 0.05 && c.comboKey.length > 2 && c.comboKey[2] === 's').length} />
                <StatBox label="Offsuit" value={detailChart.combos.filter(c => c.weight > 0.05 && c.comboKey.length > 2 && c.comboKey[2] === 'o').length} />
                <StatBox label="Combos" value={Math.round(detailChart.combos.reduce((s,c) => s + c.weight, 0))} />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#090D14] border border-[#152233] rounded-xl p-3 text-center">
      <div className="text-lg font-bold text-neutral-200">{value}</div>
      <div className="text-[9px] text-neutral-500">{label}</div>
    </div>
  )
}
