import { useState, useMemo } from 'react'
import { RangeMatrix } from '../matrix/RangeMatrix'
import { MatrixLegend } from '../matrix/MatrixLegend'
import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS, type ComboKey, type Position } from '@shared/types/poker'
import type { ComboStrategy } from '@shared/types/strategy'
import { cn } from '../../lib/utils'
import { ArrowLeftRight, BarChart3 } from 'lucide-react'

export function ComparePage() {
  const { gameType } = useScenarioStore()

  const [compareMode, setCompareMode] = useState<'side-by-side' | 'difference'>('side-by-side')
  const [selectedComboA, setSelectedComboA] = useState<ComboKey | null>(null)
  const [selectedComboB, setSelectedComboB] = useState<ComboKey | null>(null)
  const [posA, setPosA] = useState<Position>(3) // BTN
  const [posB, setPosB] = useState<Position>(0) // UTG
  const [compareStack, setCompareStack] = useState(100)

  const [rangeAData, setRangeAData] = useState<ComboStrategy[] | null>(null)
  const [rangeBData, setRangeBData] = useState<ComboStrategy[] | null>(null)
  const [loading, setLoading] = useState(false)

  const loadRanges = async () => {
    setLoading(true)
    try {
      const [resultA, resultB] = await Promise.all([
        window.electronAPI.strategy.getPreflopRange({ gameType, position: posA, stackDepth: compareStack }),
        window.electronAPI.strategy.getPreflopRange({ gameType, position: posB, stackDepth: compareStack }),
      ])
      setRangeAData(resultA.strategy?.combos || null)
      setRangeBData(resultB.strategy?.combos || null)
    } catch (err) {
      console.error('Failed to load ranges:', err)
    } finally {
      setLoading(false)
    }
  }

  const diffCombos = useMemo(() => {
    if (!rangeAData || !rangeBData) return null
    return rangeAData.map((comboA, i) => {
      const comboB = rangeBData[i]
      const diffWeight = (comboA?.weight || 0) - (comboB?.weight || 0)
      return {
        comboKey: comboA.comboKey,
        actions: [{ action: diffWeight > 0 ? 'more' : diffWeight < 0 ? 'less' : 'same', frequency: Math.abs(diffWeight), ev: diffWeight }],
        equity: 0,
        weight: diffWeight,
        ev: diffWeight,
      }
    })
  }, [rangeAData, rangeBData])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <ArrowLeftRight size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Range Comparison</h2>
            <p className="text-xs text-neutral-500">Compare GTO ranges across positions & stack depths</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5 flex-wrap">
          <div>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block mb-1.5">Position A</span>
            <PositionButtons selected={posA} onChange={setPosA} color="blue" />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block mb-1.5">Position B</span>
            <PositionButtons selected={posB} onChange={setPosB} color="red" />
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block mb-1.5">Stack</span>
            <select
              value={compareStack}
              onChange={e => setCompareStack(Number(e.target.value))}
              className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-blue-500/50"
            >
              {[10, 20, 30, 50, 75, 100, 150, 200].map(d => (
                <option key={d} value={d}>{d}bb</option>
              ))}
            </select>
          </div>
          <div className="pt-[22px]">
            <button
              onClick={loadRanges}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold bg-purple-500/8 hover:bg-purple-500/12 text-purple-400 rounded-lg transition-colors border border-purple-500/15 disabled:opacity-40"
            >
              {loading ? 'Loading...' : 'Load Ranges'}
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mt-3 bg-[#0F141C] rounded-lg p-0.5 w-fit ring-1 ring-white/[0.03]">
          {([
            { id: 'side-by-side' as const, label: 'Side by Side' },
            { id: 'difference' as const, label: 'Difference' },
          ]).map(mode => (
            <button
              key={mode.id}
              onClick={() => setCompareMode(mode.id)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md font-medium transition-all',
                compareMode === mode.id ? 'bg-purple-500/12 text-purple-400' : 'text-neutral-500 hover:text-neutral-300',
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!rangeAData || !rangeBData ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
              <BarChart3 size={28} className="opacity-20" />
            </div>
            <div>
              <p className="text-sm font-medium">Select positions and click "Load Ranges" to compare</p>
            </div>
          </div>
        ) : compareMode === 'side-by-side' ? (
          <div className="flex gap-8 justify-center items-start animate-fade-in">
            <div>
              <h3 className="text-sm font-semibold text-blue-400 mb-4 text-center">
                {POSITION_LABELS[posA]} ({compareStack}bb)
              </h3>
              <div className="bg-[#090D14] p-4 rounded-2xl border border-[#152233] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                <RangeMatrix
                  combos={rangeAData}
                  selectedCombo={selectedComboA}
                  hoveredCombo={null}
                  onSelectCombo={setSelectedComboA}
                  onHoverCombo={() => {}}
                  size="compact"
                />
              </div>
            </div>
            <div className="flex items-center justify-center pt-24">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <ArrowLeftRight size={18} className="text-purple-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-4 text-center">
                {POSITION_LABELS[posB]} ({compareStack}bb)
              </h3>
              <div className="bg-[#090D14] p-4 rounded-2xl border border-[#152233] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                <RangeMatrix
                  combos={rangeBData}
                  selectedCombo={selectedComboB}
                  hoveredCombo={null}
                  onSelectCombo={setSelectedComboB}
                  onHoverCombo={() => {}}
                  size="compact"
                />
              </div>
            </div>
          </div>
        ) : diffCombos ? (
          <div className="flex justify-center animate-fade-in">
            <div>
              <h3 className="text-sm font-semibold text-neutral-300 mb-4 text-center">
                Difference: {POSITION_LABELS[posA]} vs {POSITION_LABELS[posB]} ({compareStack}bb)
              </h3>
              <div className="bg-[#090D14] p-4 rounded-2xl border border-[#152233] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                <div className="mb-3 flex justify-center">
                  <MatrixLegend />
                </div>
                <RangeMatrix
                  combos={diffCombos}
                  selectedCombo={null}
                  hoveredCombo={null}
                  onSelectCombo={() => {}}
                  onHoverCombo={() => {}}
                  size="compact"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-4 text-center">
                Green = more frequent in {POSITION_LABELS[posA]} | Red = more frequent in {POSITION_LABELS[posB]}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function PositionButtons({ selected, onChange, color }: { selected: Position; onChange: (p: Position) => void; color: string }) {
  return (
    <div className="flex gap-1">
      {([0, 1, 2, 3, 4, 5] as Position[]).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all',
            selected === p
              ? color === 'blue'
                ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/25'
                : 'bg-red-500/12 text-red-400 ring-1 ring-red-500/25'
              : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300',
          )}
        >
          {POSITION_LABELS[p]}
        </button>
      ))}
    </div>
  )
}
