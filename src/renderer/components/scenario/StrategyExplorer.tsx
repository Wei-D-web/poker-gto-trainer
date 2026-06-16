import { useEffect, useState, useMemo } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { useStrategyStore } from '../../stores/strategyStore'
import { useOpponentStore } from '../../stores/opponentStore'
import { ScenarioSelector } from './ScenarioSelector'
import { RangeMatrix } from '../matrix/RangeMatrix'
import { MatrixLegend } from '../matrix/MatrixLegend'
import { MatrixToolbar } from '../matrix/MatrixToolbar'
import { StrategyDetailPanel } from '../strategy/StrategyDetailPanel'
import { DecisionTreePanel, generateGameTree } from '../decision-tree/DecisionTreePanel'
import { ActionPathBreadcrumb, generateBreadcrumbSteps } from './ActionPathBreadcrumb'
import { BoardSelector } from './BoardSelector'
import { PostflopAnalysis } from './PostflopAnalysis'
import { PresetSolutionsPanel } from './PresetSolutionsPanel'
import { POSITION_LABELS, OPPONENT_PROFILES, type OpponentTypeType } from '@shared/types/poker'
import { formatCard } from '@shared/utils/poker-math'
import { Loader2, Sparkles, LayoutGrid, GitBranch, Zap, X, Crosshair, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

type ViewMode = 'matrix' | 'tree'
type SizingTab = '33%' | '50%' | '75%' | '100%' | '150%'

export function StrategyExplorer() {
  const { gameType, heroPosition, villainPosition, stackDepth, isLoading, setLoading } = useScenarioStore()
  const {
    heroStrategy, villainStrategy, displayMode, selectedCombo, hoveredCombo,
    setHeroStrategy, setVillainStrategy, setHeroRange, setVillainRange,
    selectCombo, hoverCombo,
  } = useStrategyStore()

  const [viewMode, setViewMode] = useState<ViewMode>('matrix')
  const [activeSizing, setActiveSizing] = useState<SizingTab>('33%')
  const [activeBoard, setActiveBoard] = useState<string[]>([])
  const [actionsHistory, setActionsHistory] = useState<string[]>([])
  const [cfrStatus, setCfrStatus] = useState<string | null>(null)
  const [customBoard, setCustomBoard] = useState<string[]>([])
  const [postflopResult, setPostflopResult] = useState<any>(null)
  const [analyzingPostflop, setAnalyzingPostflop] = useState(false)

  // === Exploit bar state ===
  const { opponentType, exploitMode, setOpponentType, toggleExploitMode, panelExpanded, togglePanel } = useOpponentStore()
  const [showExploitBar, setShowExploitBar] = useState(false)
  const [exploitAdjustedResult, setExploitAdjustedResult] = useState<any>(null)
  const [loadingExploit, setLoadingExploit] = useState(false)

  const loadExploitAdjustments = async (type: OpponentTypeType) => {
    if (!postflopResult || customBoard.length < 3) return
    setLoadingExploit(true)
    try {
      const result = await window.electronAPI.strategy.getExploitAdjustments({
        board: customBoard,
        heroPosition,
        villainPosition,
        stackDepth,
        opponentType: type,
      })
      setExploitAdjustedResult(result)
    } catch (err) {
      console.error('Failed to load exploit adjustments:', err)
    } finally {
      setLoadingExploit(false)
    }
  }

  const currentStreet = activeBoard.length === 0 ? 'preflop' : activeBoard.length === 3 ? 'flop' : activeBoard.length === 4 ? 'turn' : 'river'

  // Load preflop ranges
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const heroResult = await window.electronAPI.strategy.getPreflopRange({
          gameType, position: heroPosition, stackDepth,
        })
        if (cancelled) return
        if (heroResult.strategy) {
          setHeroStrategy(heroResult.strategy)
          setHeroRange(heroResult.range)
        }
        if (villainPosition !== heroPosition) {
          const villainResult = await window.electronAPI.strategy.getPreflopRange({
            gameType, position: villainPosition, stackDepth,
          })
          if (cancelled) return
          if (villainResult.strategy) {
            setVillainStrategy(villainResult.strategy)
            setVillainRange(villainResult.range)
          }
        }
      } catch (err) {
        console.error('Failed to load strategy:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [gameType, heroPosition, villainPosition, stackDepth])

  const activeStrategy = displayMode === 'hero' ? heroStrategy : displayMode === 'villain' ? villainStrategy : heroStrategy
  const activeCombos = activeStrategy?.combos ?? []

  const gameTree = useMemo(() => {
    return generateGameTree(currentStreet, POSITION_LABELS[heroPosition], POSITION_LABELS[villainPosition])
  }, [currentStreet, heroPosition, villainPosition])

  const breadcrumbSteps = useMemo(() => {
    return generateBreadcrumbSteps(currentStreet, POSITION_LABELS[heroPosition], POSITION_LABELS[villainPosition], actionsHistory, (index) => {
      if (index === 0) { setActiveBoard([]); setActionsHistory([]) }
      else { setActionsHistory(prev => prev.slice(0, index - 1)) }
    })
  }, [currentStreet, heroPosition, villainPosition, actionsHistory])

  const analyzePostflop = async () => {
    if (customBoard.length < 3) return
    setAnalyzingPostflop(true)
    try {
      const result = await window.electronAPI.strategy.analyzePostflop({
        board: customBoard,
        heroPosition,
        villainPosition,
        stackDepth,
        gameType,
        ante: gameType === 'tournament' ? 0.1 : 0,
      })
      setPostflopResult(result)
      setExploitAdjustedResult(null) // Reset exploit on new analysis
      setShowExploitBar(true)
    } catch (err) {
      console.error('Postflop analysis failed:', err)
    } finally {
      setAnalyzingPostflop(false)
    }
  }

  const runCFRSolver = async () => {
    setCfrStatus('Solving...')
    try {
      const range = await window.electronAPI.strategy.solvePreflop({
        position: heroPosition,
        stackDepth,
        iterations: 800,
      })
      const combos = Object.entries(range).map(([key, freq]) => ({
        comboKey: key,
        actions: freq > 0 ? [{ action: 'raise', frequency: freq, ev: freq * 0.06 }] : [{ action: 'fold', frequency: 1, ev: 0 }],
        equity: freq > 0 ? 0.5 : 0,
        weight: freq,
        ev: freq > 0 ? freq * 0.05 : 0,
      }))
      setHeroStrategy({
        scenarioId: `cfr_${heroPosition}_${stackDepth}`,
        combos,
        heroEV: combos.reduce((s, c) => s + c.ev, 0) / combos.length,
        villainEV: 0,
        heroEquity: 0.5,
        metadata: {
          solverVersion: 'CFR-v1', convergence: 5, totalIterations: 800,
          solvedDate: new Date().toISOString(), source: 'on-device-cfr',
        },
      })
      setCfrStatus('Solved!')
      setTimeout(() => setCfrStatus(null), 2500)
    } catch (err) {
      setCfrStatus('Failed: ' + String(err))
    }
  }

  const SIZINGS: SizingTab[] = ['33%', '50%', '75%', '100%', '150%']

  return (
    <div className="flex h-full">
      {/* ── Left Sidebar ── */}
      <div className="w-64 bg-[#080B10] border-r border-[#152233] p-4 overflow-y-auto shrink-0 space-y-5">
        <ScenarioSelector />

        {/* CFR Solver */}
        <div className="pt-4 border-t border-[#152233]">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap size={13} className="text-amber-400" />
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Solver</span>
          </div>
          <button
            onClick={runCFRSolver}
            disabled={!!cfrStatus?.startsWith('Solving')}
            className={cn(
              'w-full py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
              cfrStatus?.startsWith('Solving')
                ? 'bg-amber-500/5 text-amber-400/60 border border-amber-500/10 cursor-wait'
                : 'bg-amber-500/8 hover:bg-amber-500/12 text-amber-400 border border-amber-500/15 hover:border-amber-500/25',
            )}
          >
            <Sparkles size={12} className={cn(cfrStatus?.startsWith('Solving') && 'animate-spin')} />
            {cfrStatus?.startsWith('Solving') ? 'Computing...' : 'Run CFR Solver'}
          </button>
          {cfrStatus && !cfrStatus.startsWith('Solving') && (
            <p className={cn(
              'text-[10px] mt-1.5 text-center font-medium animate-fade-in',
              cfrStatus === 'Solved!' ? 'text-emerald-400' : 'text-red-400',
            )}>
              {cfrStatus}
            </p>
          )}
          <p className="text-[9px] text-neutral-600 mt-1.5 text-center leading-relaxed">
            On-device Nash equilibrium computation
          </p>
        </div>

        {/* View mode toggle */}
        <div className="pt-4 border-t border-[#152233]">
          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2 block">View</label>
          <div className="flex gap-1 bg-[#0F141C] rounded-lg p-0.5 ring-1 ring-white/[0.03]">
            {([
              { id: 'matrix' as const, icon: LayoutGrid, label: 'Matrix' },
              { id: 'tree' as const, icon: GitBranch, label: 'Tree' },
            ]).map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={cn(
                  'flex-1 py-1.5 text-[11px] rounded-md font-medium transition-all flex items-center justify-center gap-1.5',
                  viewMode === mode.id
                    ? 'bg-blue-500/12 text-blue-400'
                    : 'text-neutral-500 hover:text-neutral-400',
                )}
              >
                <mode.icon size={11} />
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Board selector for postflop analysis */}
        <div className="pt-4 border-t border-[#152233]">
          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2 block">Postflop</label>
          <BoardSelector
            board={customBoard}
            onChange={setCustomBoard}
            onAnalyze={analyzePostflop}
            isLoading={analyzingPostflop}
          />
        </div>

        {/* Preset solutions quick-access */}
        <div className="pt-4 border-t border-[#152233]">
          <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
            <Zap size={10} className="text-amber-400" />
            Quick Presets
          </label>
          <PresetSolutionsPanel />
        </div>

        {/* Postflop sizing tabs */}
        {activeBoard.length > 0 && (
          <div className="pt-4 border-t border-[#152233] animate-fade-in">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-2 block">Sizing</label>
            <div className="flex gap-1">
              {SIZINGS.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSizing(s)}
                  className={cn(
                    'flex-1 py-1 text-[10px] rounded font-semibold transition-all',
                    activeSizing === s
                      ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/25'
                      : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-400',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-2.5 border-b border-[#152233] shrink-0 bg-[#080B10]/80 backdrop-blur-sm">
          <ActionPathBreadcrumb steps={breadcrumbSteps} className="mb-2" />
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-200">
                  {POSITION_LABELS[heroPosition]} vs {POSITION_LABELS[villainPosition]}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 font-medium ring-1 ring-white/[0.04]">
                  {stackDepth}bb
                </span>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  gameType === 'cash'
                    ? 'bg-emerald-500/8 text-emerald-400 ring-1 ring-emerald-500/15'
                    : 'bg-purple-500/8 text-purple-400 ring-1 ring-purple-500/15',
                )}>
                  {gameType === 'cash' ? 'Cash' : 'MTT'}
                </span>
              </div>
              {activeBoard.length > 0 && (
                <div className="flex gap-1.5 mt-1.5 animate-fade-in">
                  {activeBoard.map((card, i) => (
                    <span key={i} className="px-2.5 py-1 bg-[#111723] border border-[#1C2A3D] rounded-md text-xs font-mono font-bold text-neutral-100">
                      {formatCard(card)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeBoard.length > 0 && (
                <button
                  onClick={() => { setActiveBoard([]); setActionsHistory([]) }}
                  className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <X size={11} />
                  Reset
                </button>
              )}
              <MatrixLegend />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden bg-[#05080C]">
          {postflopResult ? (
            <div className="flex-1 overflow-auto p-6 animate-fade-in">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-neutral-200">Postflop GTO Analysis</h3>
                  <button
                    onClick={() => { setPostflopResult(null); setShowExploitBar(false); setExploitAdjustedResult(null) }}
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    ← Back to Preflop
                  </button>
                </div>

                {/* === Exploit Bar (Cash only) === */}
                {gameType === 'cash' && showExploitBar && (
                  <div className="mb-5 bg-[#090D14] rounded-xl border border-orange-500/10 overflow-hidden transition-all">
                    <button
                      onClick={togglePanel}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <Crosshair size={14} className="text-orange-400" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-orange-400">剥削顾问</span>
                          <span className="text-[11px] text-neutral-500 ml-2">
                            vs {OPPONENT_PROFILES[opponentType].label} {exploitAdjustedResult ? '(已调整)' : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronDown size={14} className={cn('text-neutral-500 transition-transform', panelExpanded && 'rotate-180')} />
                    </button>
                    {panelExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#152233] animate-fade-in">
                        {/* Opponent quick select */}
                        <div className="flex gap-1.5 flex-wrap mb-3 mt-2">
                          {(['nit', 'tag', 'lag', 'calling_station', 'maniac', 'reg'] as OpponentTypeType[]).map(type => {
                            const p = OPPONENT_PROFILES[type]
                            const isSelected = opponentType === type
                            return (
                              <button
                                key={type}
                                onClick={() => { setOpponentType(type); loadExploitAdjustments(type) }}
                                disabled={loadingExploit}
                                className={cn(
                                  'px-2 py-1 rounded-md text-[11px] font-medium transition-all border',
                                  isSelected
                                    ? 'bg-orange-500/10 border-orange-500/25 text-orange-400'
                                    : 'bg-[#0F141C] border-[#1C2A3D] text-neutral-500 hover:text-neutral-300',
                                )}
                              >
                                {p.label.split(' ')[0]}
                              </button>
                            )
                          })}
                        </div>

                        {/* Exploit summary if loaded */}
                        {exploitAdjustedResult?.summary && (
                          <div className="space-y-2">
                            <p className="text-xs text-neutral-400">{exploitAdjustedResult.summary.overallTheme}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {exploitAdjustedResult.summary.keyAdjustments.slice(0, 3).map((adj: string, i: number) => (
                                <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-orange-500/[0.04] border border-orange-500/10 text-orange-400/80">
                                  {adj}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-neutral-500 pt-1">
                              <span>VPIP {exploitAdjustedResult.summary.vpipShift > 0 ? '+' : ''}{exploitAdjustedResult.summary.vpipShift}%</span>
                              <span>c-bet {exploitAdjustedResult.summary.cbetFreqShift > 0 ? '+' : ''}{exploitAdjustedResult.summary.cbetFreqShift}%</span>
                              <span>诈唬 {exploitAdjustedResult.summary.bluffFreqShift > 0 ? '+' : ''}{exploitAdjustedResult.summary.bluffFreqShift}%</span>
                              <span>尺度: {exploitAdjustedResult.summary.sizingRecommendation}</span>
                            </div>
                          </div>
                        )}

                        {loadingExploit && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                            <Loader2 size={12} className="animate-spin" /> 计算剥削调整中...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Postflop Analysis — show exploit-adjusted if in exploit mode */}
                <PostflopAnalysis result={postflopResult} />
              </div>
            </div>
          ) : viewMode === 'matrix' ? (
            <>
              <div className="flex-1 flex items-start justify-center overflow-auto p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full border-2 border-neutral-700 border-t-blue-500 animate-spin" />
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">Loading strategy data...</span>
                  </div>
                ) : activeCombos.length > 0 ? (
                  <div className="animate-scale-in">
                    <MatrixToolbar />
                    <div className="bg-[#090D14] p-5 rounded-2xl border border-[#152233] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                      <RangeMatrix
                        combos={activeCombos}
                        selectedCombo={selectedCombo}
                        hoveredCombo={hoveredCombo}
                        onSelectCombo={selectCombo}
                        onHoverCombo={hoverCombo}
                        size="comfortable"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-600">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-800/30 flex items-center justify-center">
                      <Sparkles size={28} className="opacity-30" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No strategy data loaded</p>
                      <p className="text-xs opacity-60 mt-1">Run CFR Solver or initialize sample data in Settings</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Detail panel */}
              <div className="w-80 border-l border-[#152233] overflow-y-auto shrink-0 bg-[#080B10]">
                <StrategyDetailPanel comboKey={selectedCombo} combos={activeCombos} />
              </div>
            </>
          ) : (
            <div className="flex-1 p-4 animate-fade-in">
              <DecisionTreePanel
                tree={gameTree}
                onNavigateToNode={(id) => setActionsHistory(prev => [...prev, id])}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
