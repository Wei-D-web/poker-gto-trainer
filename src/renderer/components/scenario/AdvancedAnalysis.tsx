import { useState, useMemo, useCallback } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { useStrategyStore } from '../../stores/strategyStore'
import { BoardSelector } from './BoardSelector'
import { RangeMatrix } from '../matrix/RangeMatrix'
import { MatrixLegend } from '../matrix/MatrixLegend'
import { EquityDistribution } from '../strategy/EquityDistribution'
import { POSITION_LABELS, type ComboKey } from '@shared/types/poker'
import type { NodeLock, LockAction } from '../../../../src/main/solver/node-locker'
import { applyNodeLocks, type LockResult } from '../../../../src/main/solver/node-locker'
import type { ComboStrategy } from '@shared/types/strategy'
import { cn } from '../../lib/utils'
import { Lock, Unlock, RefreshCw, ArrowRightLeft, BarChart3, Target, Zap } from 'lucide-react'

const LOCK_ACTIONS: { id: LockAction; label: string; color: string }[] = [
  { id: 'fold', label: 'Force Fold', color: 'bg-neutral-600' },
  { id: 'check', label: 'Force Check', color: 'bg-blue-600' },
  { id: 'call', label: 'Force Call', color: 'bg-green-600' },
  { id: 'bet_small', label: 'Force Small Bet', color: 'bg-amber-500' },
  { id: 'bet_medium', label: 'Force Med Bet', color: 'bg-orange-500' },
  { id: 'bet_large', label: 'Force Large Bet', color: 'bg-red-500' },
  { id: 'raise', label: 'Force Raise', color: 'bg-purple-500' },
]

export function AdvancedAnalysis() {
  const { gameType, heroPosition, villainPosition, stackDepth } = useScenarioStore()
  const heroStrategy = useStrategyStore((s) => s.heroStrategy)

  const [board, setBoard] = useState<string[]>(['As', '7d', '2c'])
  const [locks, setLocks] = useState<NodeLock[]>([])
  const [activeLockAction, setActiveLockAction] = useState<LockAction>('fold')
  const [lockResult, setLockResult] = useState<LockResult | null>(null)
  const [postflopResult, setPostflopResult] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [viewMode, setViewMode] = useState<'original' | 'adjusted' | 'diff'>('adjusted')
  const [sizings, setSizings] = useState<string[]>(['33%', '50%', '75%'])

  const analyze = async () => {
    if (board.length < 3) return
    setAnalyzing(true)
    try {
      const result = await window.electronAPI.strategy.analyzePostflop({
        board, heroPosition, villainPosition, stackDepth,
      })
      setPostflopResult(result)
      setLocks([])
      setLockResult(null)
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleApplyLocks = () => {
    if (!postflopResult || locks.length === 0) return
    const baseStrategy: Record<ComboKey, { actions: Array<{ action: string; frequency: number; ev: number }>; equity: number; weight: number }> = {}
    for (const c of postflopResult.combos) {
      baseStrategy[c.comboKey] = {
        actions: c.actions,
        equity: c.equity,
        weight: c.weight,
      }
    }
    const result = applyNodeLocks(baseStrategy, locks, board, heroPosition > villainPosition)
    setLockResult(result)
  }

  const handleLockCombo = useCallback((comboKey: ComboKey | null) => {
    if (!comboKey) return
    setLocks(prev => {
      const existing = prev.findIndex(l => l.comboKey === comboKey)
      if (existing >= 0) return prev.filter((_, i) => i !== existing)
      return [...prev, { comboKey, action: activeLockAction, frequency: 1.0 }]
    })
  }, [activeLockAction])

  const displayCombos = useMemo((): ComboStrategy[] => {
    if (!postflopResult) return []
    const base = viewMode === 'original' || !lockResult
      ? postflopResult.combos
      : viewMode === 'adjusted'
        ? postflopResult.combos.map((c: any) => {
            const adj = lockResult?.adjustedStrategy[c.comboKey]
            if (!adj) return c
            return { ...c, actions: adj.actions, isLocked: adj.isLocked }
          })
        : postflopResult.combos.map((c: any) => {
            const orig = lockResult?.originalStrategy[c.comboKey]
            const adj = lockResult?.adjustedStrategy[c.comboKey]
            if (!orig || !adj) return c
            const origBet = orig.actions.find((a: any) => a.action.includes('bet'))?.frequency || 0
            const adjBet = adj.actions.find((a: any) => a.action.includes('bet'))?.frequency || 0
            return {
              ...c,
              weight: adjBet - origBet,
              actions: [{ action: adjBet > origBet ? 'more_bet' : adjBet < origBet ? 'less_bet' : 'same', frequency: Math.abs(adjBet - origBet), ev: adjBet - origBet }],
              isLocked: adj.isLocked,
            }
          })
    return base.map((c: any) => ({
      comboKey: c.comboKey,
      actions: c.actions || [{ action: 'fold', frequency: 1, ev: 0 }],
      equity: c.equity || 0,
      weight: c.weight ?? 0,
      ev: (c.weight ?? 0) * 0.05,
    }))
  }, [postflopResult, lockResult, viewMode])

  const toggleSizing = (s: string) => {
    setSizings(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Lock size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Advanced Analysis · Node Locking</h2>
            <p className="text-xs text-neutral-500">Lock specific combos → observe how GTO adapts</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Controls */}
        <div className="w-72 border-r border-[#152233] overflow-y-auto p-4 space-y-5 shrink-0 bg-[#080B10]">
          {/* Board */}
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Board</label>
            <BoardSelector board={board} onChange={setBoard} onAnalyze={analyze} isLoading={analyzing} />
          </div>

          {/* Multi-sizing */}
          <div className="pt-4 border-t border-[#152233]">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5 block">Sizings</label>
            <div className="flex gap-1 flex-wrap">
              {['33%', '50%', '75%', '100%', '150%'].map(s => (
                <button key={s} onClick={() => toggleSizing(s)}
                  className={cn(
                    'px-2.5 py-1 text-[10px] rounded-md font-medium transition-all',
                    sizings.includes(s)
                      ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/25'
                      : 'bg-white/[0.03] text-neutral-500 hover:text-neutral-300',
                  )}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-neutral-600 mt-1.5">GTO distributes frequency across {sizings.length} sizings</p>
          </div>

          {/* Lock controls */}
          <div className="pt-4 border-t border-[#152233]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Node Locking</label>
              <span className="text-[9px] text-neutral-500 font-medium">{locks.length} locked</span>
            </div>

            <div className="flex gap-1 flex-wrap mb-2">
              {LOCK_ACTIONS.map(la => (
                <button key={la.id} onClick={() => setActiveLockAction(la.id)}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded font-medium transition-all',
                    activeLockAction === la.id
                      ? `${la.color} text-white shadow-sm`
                      : 'bg-white/[0.03] text-neutral-500 hover:text-neutral-300',
                  )}>
                  {la.label}
                </button>
              ))}
            </div>

            <p className="text-[9px] text-neutral-600 mb-2">
              Click combo in matrix → lock to "{LOCK_ACTIONS.find(l => l.id === activeLockAction)?.label}"
            </p>

            {locks.length > 0 && (
              <div className="space-y-1 max-h-[150px] overflow-y-auto mb-2">
                {locks.map((lock, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-white/[0.02] rounded-lg text-[10px] border border-white/[0.03]">
                    <span className="text-neutral-300 font-mono font-bold">{lock.comboKey}</span>
                    <span className="text-neutral-500 text-[9px]">→ {LOCK_ACTIONS.find(l => l.id === lock.action)?.label}</span>
                    <button onClick={() => setLocks(prev => prev.filter((_, j) => j !== i))}
                      className="text-neutral-600 hover:text-red-400 transition-colors">
                      <Unlock size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleApplyLocks}
              disabled={locks.length === 0 || !postflopResult}
              className="w-full py-2 text-xs font-semibold bg-purple-500/8 hover:bg-purple-500/12 text-purple-400 border border-purple-500/15 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
              <Lock size={12} />
              Apply Locks & Recalculate
            </button>

            {locks.length > 0 && (
              <button onClick={() => { setLocks([]); setLockResult(null) }}
                className="w-full py-1.5 mt-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors">
                Clear All Locks
              </button>
            )}
          </div>

          {/* Lock result summary */}
          {lockResult && (
            <div className="pt-4 border-t border-[#152233] animate-fade-in">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">Results</label>
              <div className="bg-purple-500/[0.04] border border-purple-500/15 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-neutral-500">Locked</span>
                  <span className="text-purple-400 font-bold">{lockResult.summary.totalLocked}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-neutral-500">Affected</span>
                  <span className="text-amber-400 font-bold">{lockResult.summary.affectedCombos} combos</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-neutral-500">Shift</span>
                  <span className={cn('font-bold', lockResult.summary.strategyShift === '更激进' ? 'text-emerald-400' : 'text-red-400')}>
                    {lockResult.summary.strategyShift}
                  </span>
                </div>
                <p className="text-[9px] text-neutral-500 leading-relaxed mt-1">{lockResult.summary.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Display */}
        <div className="flex-1 overflow-y-auto p-6">
          {!postflopResult ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
                <Lock size={28} className="opacity-20" />
              </div>
              <div>
                <p className="text-sm font-medium">Select board → Analyze → Lock combos → Observe adjustments</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
              {/* View mode toggle */}
              <div className="flex items-center gap-4">
                <div className="flex gap-0.5 bg-[#0F141C] rounded-lg p-0.5 ring-1 ring-white/[0.03]">
                  {[
                    { id: 'original', label: 'Original' },
                    { id: 'adjusted', label: 'Locked' },
                    { id: 'diff', label: 'Difference' },
                  ].map(m => (
                    <button key={m.id} onClick={() => setViewMode(m.id as any)}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-md font-medium transition-all',
                        viewMode === m.id ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300',
                      )}>
                      {m.label}
                    </button>
                  ))}
                </div>
                {lockResult && (
                  <span className="text-[10px] text-neutral-500">
                    {lockResult.adjustments.length} combos changed frequency
                  </span>
                )}
              </div>

              {/* Equity distribution */}
              {postflopResult && (
                <EquityDistribution combos={postflopResult.combos} />
              )}

              {/* Matrix with locks */}
              <div className="bg-[#090D14] rounded-2xl p-5 border border-[#152233] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-neutral-300">
                      {board.join(' ')} · {postflopResult.description}
                    </h3>
                    {sizings.length > 1 && (
                      <p className="text-[9px] text-neutral-500 mt-0.5">
                        Multi-size: {sizings.join(' + ')} · GTO mixed strategy
                      </p>
                    )}
                  </div>
                  <MatrixLegend />
                </div>

                {locks.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-3">
                    {locks.map((lock, i) => (
                      <span key={i} className={cn(
                        'text-[9px] px-2.5 py-1 rounded-full font-mono font-bold',
                        lock.action === 'fold' ? 'bg-neutral-500/10 text-neutral-400' :
                        lock.action.includes('bet') ? 'bg-amber-500/10 text-amber-400' :
                        'bg-blue-500/10 text-blue-400',
                      )}>
                        🔒 {lock.comboKey}
                      </span>
                    ))}
                  </div>
                )}

                <RangeMatrix
                  combos={displayCombos}
                  selectedCombo={null}
                  hoveredCombo={null}
                  onSelectCombo={handleLockCombo}
                  onHoverCombo={() => {}}
                  size="compact"
                />
              </div>

              {/* Adjustments list */}
              {lockResult && lockResult.adjustments.length > 0 && (
                <div className="animate-fade-in">
                  <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Frequency Changes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {lockResult.adjustments.map((adj, i) => (
                      <div key={i} className="bg-[#0B1019] border border-[#1C2A3D] rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono font-bold text-neutral-200">{adj.comboKey}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-neutral-500">{adj.originalAction}</span>
                            <ArrowRightLeft size={9} className="text-neutral-600" />
                            <span className="text-[9px] text-purple-400 font-medium">{adj.adjustedAction}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-purple-400">{adj.frequencyChange}%</span>
                          <div className="text-[8px] text-neutral-600 truncate max-w-[80px]">{adj.reason.slice(0, 15)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
