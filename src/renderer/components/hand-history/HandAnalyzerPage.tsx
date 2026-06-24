import { useState } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS, RANK_CHARS, SUIT_SYMBOLS, ALL_RANKS, type Position, type Suit } from '@shared/types/poker'
import type { HandInput, HandAction, HandAnalysisResult, DecisionAnalysis, GTOActionOption } from '../../../../src/main/solver/hand-analyzer'
import { analyzeHand } from '../../../../src/main/solver/hand-analyzer'
import { cn } from '../../lib/utils'
import { Search, X, ChevronRight, Check, AlertTriangle, TrendingDown, Zap, Target } from 'lucide-react'

const SUITS: Suit[] = ['s', 'h', 'd', 'c']
const SUIT_COLORS: Record<string, string> = { s: '#aaa', h: '#DC2626', d: '#2563EB', c: '#16A34A' }

const STREET_ACTIONS: Record<string, string[]> = {
  preflop: ['open_2.5bb', 'call', '3bet_10bb', 'fold', 'all_in'],
  flop: ['bet_33', 'bet_50', 'bet_75', 'bet_100', 'check', 'call', 'raise_3x', 'fold'],
  turn: ['bet_50', 'bet_75', 'bet_100', 'bet_150', 'check', 'call', 'raise_3x', 'fold', 'all_in'],
  river: ['bet_50', 'bet_75', 'bet_100', 'bet_150', 'check', 'call', 'raise_3x', 'fold', 'all_in'],
}

export function HandAnalyzerPage() {
  const { gameType } = useScenarioStore()
  const [heroCards, setHeroCards] = useState<string[]>([])
  const [board, setBoard] = useState<string[]>([])
  const [heroPos, setHeroPos] = useState<Position>(3)
  const [villainPos, setVillainPos] = useState<Position>(5)
  const [stackDepth, setStackDepth] = useState(100)
  const [actions, setActions] = useState<HandAction[]>([])
  const [currentStreet, setCurrentStreet] = useState<'preflop' | 'flop' | 'turn' | 'river'>('preflop')
  const [currentActor, setCurrentActor] = useState<'hero' | 'villain'>('hero')
  const [result, setResult] = useState<HandAnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [pickingCardFor, setPickingCardFor] = useState<'hero' | 'board' | null>(null)
  const [pickRank, setPickRank] = useState<number | null>(null)

  const addCard = (rank: number, suit: Suit) => {
    const card = `${RANK_CHARS[rank as keyof typeof RANK_CHARS]}${suit}`
    if (pickingCardFor === 'hero' && heroCards.length < 2 && !heroCards.includes(card)) {
      setHeroCards([...heroCards, card])
      if (heroCards.length === 1) setPickingCardFor(null)
    } else if (pickingCardFor === 'board' && board.length < 5 && !board.includes(card)) {
      setBoard([...board, card])
    }
    setPickRank(null)
  }

  const addAction = (actionStr: string) => {
    const action: HandAction = { street: currentStreet, actor: currentActor, action: actionStr }
    setActions([...actions, action])
    if (currentActor === 'hero') setCurrentActor('villain')
    else {
      setCurrentActor('hero')
      if (currentStreet === 'preflop' && actions.length >= 1) setCurrentStreet('flop')
      else if (currentStreet === 'flop' && actions.filter(a => a.street === 'flop').length >= 2) setCurrentStreet('turn')
      else if (currentStreet === 'turn' && actions.filter(a => a.street === 'turn').length >= 2) setCurrentStreet('river')
    }
  }

  const removeAction = (index: number) => setActions(actions.filter((_, i) => i !== index))

  const analyze = async () => {
    if (heroCards.length < 2) return
    setAnalyzing(true)
    try {
      const input: HandInput = {
        heroHand: heroCards, board, heroPosition: heroPos, villainPosition: villainPos,
        stackDepth, gameType, potSize: stackDepth * 0.12, actions,
      }
      const analysisResult = analyzeHand(input)
      setResult(analysisResult)
    } catch (e) { console.error('Analysis failed:', e) }
    finally { setAnalyzing(false) }
  }

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'correct': return 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15'
      case 'minor': return 'bg-blue-500/8 text-blue-400 border-blue-500/15'
      case 'moderate': return 'bg-amber-500/8 text-amber-400 border-amber-500/15'
      case 'major': return 'bg-orange-500/8 text-orange-400 border-orange-500/15'
      case 'critical': return 'bg-red-500/8 text-red-400 border-red-500/15'
      default: return ''
    }
  }

  const getGradeColor = (g: string) => {
    if (g.startsWith('A')) return 'text-emerald-400'
    if (g.startsWith('B')) return 'text-blue-400'
    if (g.startsWith('C')) return 'text-amber-400'
    if (g.startsWith('D')) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Search size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Hand Analyzer</h2>
            <p className="text-xs text-neutral-500">Input hand + action line → analyze GTO deviations per decision</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Input panel */}
        <div className="w-[380px] border-r border-[#152233] overflow-y-auto p-4 space-y-5 shrink-0 bg-[#080B10]">
          {/* 我的手牌 */}
          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">我的手牌</label>
            <div className="flex gap-2">
              {[0, 1].map(i => (
                <button
                  key={i}
                  onClick={() => { setPickingCardFor('hero'); setPickRank(null) }}
                  className={cn(
                    'w-16 h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-lg font-mono font-bold transition-all',
                    heroCards[i]
                      ? 'bg-[#0F141C] border-[#1C2A3D] text-neutral-100'
                      : 'border-[#1C2A3D] text-neutral-600 hover:border-neutral-500 hover:text-neutral-400',
                  )}
                >
                  {heroCards[i] ? formatCard(heroCards[i]) : '?'}
                </button>
              ))}
              {heroCards.length === 2 && (
                <button onClick={() => setHeroCards([])} className="p-1 text-neutral-600 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Board */}
          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Board</label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 2, 3, 4].map(i => (
                <button
                  key={i}
                  onClick={() => { setPickingCardFor('board'); setPickRank(null) }}
                  className={cn(
                    'w-14 h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-sm font-mono font-bold transition-all',
                    board[i]
                      ? 'bg-[#0F141C] border-[#1C2A3D] text-neutral-100'
                      : 'border-[#1C2A3D] text-neutral-600 hover:border-neutral-500 hover:text-neutral-400',
                  )}
                >
                  {board[i] ? formatCard(board[i]) : '?'}
                </button>
              ))}
              {board.length > 0 && (
                <button onClick={() => setBoard([])} className="p-1 text-neutral-600 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Card picker */}
          {pickingCardFor && (
            <div className="bg-[#0B1019] rounded-xl p-3 border border-[#1C2A3D] animate-scale-in">
              <div className="flex gap-[2px] mb-2 flex-wrap">
                {ALL_RANKS.map(r => (
                  <button
                    key={r}
                    onClick={() => setPickRank(pickRank === r ? null : r)}
                    className={cn(
                      'w-[26px] h-[26px] text-[11px] font-bold rounded transition-all',
                      pickRank === r
                        ? 'bg-blue-600 text-white scale-110 shadow-sm'
                        : 'bg-[#0F141C] text-neutral-400 hover:bg-[#151B28]',
                    )}
                  >
                    {RANK_CHARS[r]}
                  </button>
                ))}
              </div>
              {pickRank && (
                <div className="flex gap-1.5">
                  {SUITS.map(s => (
                    <button
                      key={s}
                      onClick={() => addCard(pickRank, s)}
                      className="flex-1 py-1.5 text-sm font-bold rounded-lg bg-[#0F141C] hover:bg-[#151B28] border border-[#1C2A3D] transition-colors"
                      style={{ color: SUIT_COLORS[s] }}
                    >
                      {SUIT_SYMBOLS[s]}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setPickingCardFor(null)} className="w-full mt-2 text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors">
                Cancel
              </button>
            </div>
          )}

          {/* Position & Stack */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">我的位置</label>
              <select value={heroPos} onChange={e => setHeroPos(Number(e.target.value) as Position)}
                className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50">
                {[0,1,2,3,4,5].map(p => <option key={p} value={p}>{POSITION_LABELS[p as Position]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">对手位置</label>
              <select value={villainPos} onChange={e => setVillainPos(Number(e.target.value) as Position)}
                className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-blue-500/50">
                {[0,1,2,3,4,5].filter(p => p !== heroPos).map(p => <option key={p} value={p}>{POSITION_LABELS[p as Position]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Stack: {stackDepth}bb</label>
            <input type="range" min={10} max={200} value={stackDepth} onChange={e => setStackDepth(Number(e.target.value))}
              className="w-full" />
          </div>

          {/* Action builder */}
          <div>
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block flex items-center justify-between">
              Action Line
              <span className="text-neutral-600 font-normal text-[9px]">
                {currentStreet} · {currentActor === 'hero' ? '我' : '对手'}
              </span>
            </label>

            {/* Street selector — GTO Wizard style tabs */}
            <div className="flex gap-0.5 mb-3 bg-[#060912] rounded-lg p-0.5 border border-[#152233]">
              {(['preflop', 'flop', 'turn', 'river'] as const).map(s => (
                <button key={s} onClick={() => setCurrentStreet(s)}
                  className={cn(
                    'flex-1 py-1.5 text-[11px] rounded-md font-semibold transition-all uppercase tracking-wide',
                    currentStreet === s
                      ? s === 'preflop' ? 'bg-purple-500/20 text-purple-300 shadow-sm' :
                        s === 'flop' ? 'bg-emerald-500/20 text-emerald-300 shadow-sm' :
                        s === 'turn' ? 'bg-amber-500/20 text-amber-300 shadow-sm' :
                        'bg-red-500/20 text-red-300 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-400 hover:bg-[#0A0F18]',
                  )}>
                  {s}
                </button>
              ))}
            </div>

            <div className="flex gap-1 flex-wrap mb-3">
              {STREET_ACTIONS[currentStreet].map(act => (
                <button key={act} onClick={() => addAction(act)}
                  className="px-2 py-1 text-[10px] bg-[#0F141C] hover:bg-[#151B28] text-neutral-400 hover:text-neutral-200 rounded-md font-medium transition-all border border-transparent hover:border-[#1C2A3D]">
                  {act.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* GTO Wizard-style action tree */}
            <div className="max-h-[280px] overflow-y-auto">
              {actions.length === 0 ? (
                <div className="text-[10px] text-neutral-600 text-center py-6 border border-dashed border-[#152233] rounded-xl">
                  Click actions above to build the line
                </div>
              ) : (
                <ActionTree actions={actions} board={board} onRemove={removeAction} />
              )}
            </div>
          </div>

          <button
            onClick={analyze}
            disabled={heroCards.length < 2 || actions.length === 0 || analyzing}
            className="w-full py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-neutral-700 disabled:to-neutral-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(147,51,234,0.2)] disabled:shadow-none active:scale-[0.98]">
            <Search size={15} />
            {analyzing ? 'Analyzing...' : 'Analyze Hand'}
          </button>
        </div>

        {/* Results panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
                <Search size={28} className="opacity-20" />
              </div>
              <div>
                <p className="text-sm font-medium">Input your hand and action line</p>
                <p className="text-xs opacity-60 mt-1">Then click "Analyze Hand" for GTO deviation analysis</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              {/* Grade */}
              <div className="text-center">
                <div className={cn('text-7xl font-black mb-2 tracking-tighter', getGradeColor(result.summary.grade))}>
                  {result.summary.grade}
                </div>
                <p className="text-sm text-neutral-400">{result.summary.overallAssessment}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <StatBox icon={Target} label="Decisions" value={result.summary.totalActions} color="text-blue-400" />
                <StatBox icon={AlertTriangle} label="Mistakes" value={result.summary.mistakes} color="text-amber-400" />
                <StatBox icon={TrendingDown} label="EV Lost" value={`${result.summary.totalEVLost}bb`} color="text-red-400" />
                <StatBox icon={Zap} label="Biggest" value={result.summary.biggestMistake.length > 28 ? result.summary.biggestMistake.slice(0, 26) + '…' : result.summary.biggestMistake} color="text-purple-400" small />
              </div>

              {/* Decision list */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-300 mb-3">Per-Decision Analysis</h3>
                <div className="space-y-3">
                  {result.decisions.map((d, i) => (
                    <DecisionCard key={i} decision={d} index={i} />
                  ))}
                </div>
              </div>

              {/* Street breakdown */}
              {Object.keys(result.streetBreakdown).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-neutral-300 mb-3">Street Breakdown</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(result.streetBreakdown).map(([street, data]) => (
                      <div key={street} className="bg-[#090D14] border border-[#152233] rounded-xl p-3.5 text-center">
                        <div className="text-[10px] text-neutral-500 mb-1 uppercase font-medium">
                          {street}
                        </div>
                        <div className="text-lg font-bold text-amber-400">{data.mistakes} err</div>
                        <div className="text-[10px] text-red-400 font-medium">-{data.evLost.toFixed(1)}bb</div>
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

function DecisionCard({ decision, index }: { decision: DecisionAnalysis; index: number }) {
  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'correct': return 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15'
      case 'minor': return 'bg-blue-500/8 text-blue-400 border-blue-500/15'
      case 'moderate': return 'bg-amber-500/8 text-amber-400 border-amber-500/15'
      case 'major': return 'bg-orange-500/8 text-orange-400 border-orange-500/15'
      case 'critical': return 'bg-red-500/8 text-red-400 border-red-500/15'
      default: return ''
    }
  }

  const getCategoryLabel = (cat: GTOActionOption['category']) => {
    switch (cat) {
      case 'value': return '价值'
      case 'bluff': return '诈唬'
      case 'protection': return '保护'
      case 'pot_control': return '控池'
    }
  }

  const getCategoryColor = (cat: GTOActionOption['category']) => {
    switch (cat) {
      case 'value': return 'bg-emerald-500'
      case 'bluff': return 'bg-red-500'
      case 'protection': return 'bg-amber-500'
      case 'pot_control': return 'bg-blue-500'
    }
  }

  const dist = decision.gtoDistribution || []

  return (
    <div className={cn('rounded-xl p-4 border transition-all', getSeverityColor(decision.severity))}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 font-mono font-medium">
            #{index + 1}
          </span>
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-medium',
            decision.street === 'preflop' ? 'bg-purple-500/8 text-purple-400' :
            decision.street === 'flop' ? 'bg-emerald-500/8 text-emerald-400' :
            decision.street === 'turn' ? 'bg-amber-500/8 text-amber-400' : 'bg-red-500/8 text-red-400',
          )}>
            {decision.street}
          </span>
          <span className="text-xs text-neutral-400">
            你的行动: <span className="text-neutral-200 font-medium">{decision.action}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-semibold',
            decision.isGTO
              ? 'bg-emerald-500/12 text-emerald-400'
              : 'bg-red-500/12 text-red-400',
          )}>
            {decision.isGTO
              ? `GTO 频率 ${decision.heroFrequency}%`
              : `偏离 -${decision.evDifference.toFixed(1)}bb`
            }
          </span>
        </div>
      </div>

      {/* GTO Frequency Distribution — always shown */}
      {dist.length > 0 && (
        <div className="mb-3">
          <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-1.5">GTO 混合策略</div>
          <div className="space-y-1.5">
            {dist.map((opt, i) => {
              const isHeroAction = decision.action === opt.action ||
                decision.action.toLowerCase().includes(opt.action.toLowerCase().replace(/%/g, '').replace('bet ', ''))
              // Simpler match: check if the action text overlaps significantly
              const heroWords = decision.action.toLowerCase().split(/\s+/)
              const optWords = opt.action.toLowerCase().split(/\s+/)
              const overlap = heroWords.some(w => optWords.some(ow => ow.includes(w) || w.includes(ow)))
              const isMatch = isHeroAction || overlap

              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={cn(
                    'text-[10px] w-16 text-right font-medium shrink-0',
                    isMatch ? 'text-neutral-200' : 'text-neutral-500',
                  )}>
                    {opt.action}
                    {isMatch && <span className="ml-0.5 text-blue-400">←</span>}
                  </span>
                  {/* Frequency bar */}
                  <div className="flex-1 h-4 bg-[#0A0F18] rounded-full overflow-hidden border border-[#152233]/30">
                    <div
                      className={cn('h-full rounded-full transition-all flex items-center justify-end pr-1.5', getCategoryColor(opt.category))}
                      style={{ width: `${Math.max(opt.frequency, 3)}%`, opacity: isMatch ? 1 : 0.5 }}
                    >
                      <span className="text-[8px] font-bold text-white/90 mix-blend-difference">
                        {opt.frequency}%
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] text-neutral-500 w-10 shrink-0">
                    {opt.ev > 0 ? '+' : ''}{opt.ev.toFixed(1)}bb
                  </span>
                  <span className="text-[8px] text-neutral-600 w-8 shrink-0">
                    {getCategoryLabel(opt.category)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Explanation */}
      <p className="text-xs text-neutral-300 leading-relaxed">{decision.explanation}</p>
    </div>
  )
}

function StatBox({ icon: Icon, label, value, color, small }: { icon: any; label: string; value: string | number; color: string; small?: boolean }) {
  return (
    <div className="bg-[#090D14] border border-[#152233] rounded-xl p-3.5 text-center">
      <Icon size={14} className={cn('mx-auto mb-1.5', color)} />
      <div className={cn('font-bold text-neutral-200', small ? 'text-xs' : 'text-lg')}>{value}</div>
      <div className="text-[9px] text-neutral-500 mt-0.5">{label}</div>
    </div>
  )
}

function formatCard(card: string): string {
  if (card.length < 2) return card
  const suit = card[card.length - 1] as Suit
  return `${card[0]}${SUIT_SYMBOLS[suit] || suit}`
}

// ============================================================
// GTO Wizard-style Action Tree
// ============================================================

const STREET_COLORS = {
  preflop: { bg: 'bg-purple-500/8', border: 'border-purple-500/20', text: 'text-purple-300', dot: 'bg-purple-400', label: 'PREFLOP' },
  flop: { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'FLOP' },
  turn: { bg: 'bg-amber-500/8', border: 'border-amber-500/20', text: 'text-amber-300', dot: 'bg-amber-400', label: 'TURN' },
  river: { bg: 'bg-red-500/8', border: 'border-red-500/20', text: 'text-red-300', dot: 'bg-red-400', label: 'RIVER' },
} as const

const SUIT_SYMBOLS_MAP: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_COLORS_MAP: Record<string, string> = { s: '#aaa', h: '#DC2626', d: '#2563EB', c: '#16A34A' }

function getBoardForStreet(board: string[], street: string): string[] {
  const counts: Record<string, number> = { preflop: 0, flop: 3, turn: 4, river: 5 }
  return board.slice(0, counts[street] || 0)
}

function ActionTree({ actions, board, onRemove }: {
  actions: HandAction[]
  board: string[]
  onRemove: (index: number) => void
}) {
  // Group actions by street
  const grouped: { street: string; actions: { action: HandAction; globalIndex: number }[] }[] = []
  let currentStreet = ''
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]
    if (a.street !== currentStreet) {
      currentStreet = a.street
      grouped.push({ street: a.street, actions: [] })
    }
    grouped[grouped.length - 1].actions.push({ action: a, globalIndex: i })
  }

  const newCardsForStreet = (street: string) => {
    const prev = getBoardForStreet(board, street)
    const prevStreet = street === 'flop' ? 'preflop' : street === 'turn' ? 'flop' : street === 'river' ? 'turn' : null
    if (!prevStreet || prev.length === 0) return prev
    const prevCards = getBoardForStreet(board, prevStreet)
    return prev.filter(c => !prevCards.includes(c))
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#152233]">
      {grouped.map((group, gi) => {
        const colors = STREET_COLORS[group.street as keyof typeof STREET_COLORS]
        const streetBoard = getBoardForStreet(board, group.street)
        const newCards = newCardsForStreet(group.street)
        const heroActs = group.actions.filter(a => a.action.actor === 'hero')
        const villActs = group.actions.filter(a => a.action.actor === 'villain')

        return (
          <div key={gi}>
            {/* Street header */}
            <div className={cn(
              'px-3 py-2 flex items-center gap-2.5 border-b border-[#152233]/50',
              colors.bg,
            )}>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
                <span className={cn('text-[11px] font-bold uppercase tracking-widest', colors.text)}>
                  {group.street}
                </span>
              </div>
              {streetBoard.length > 0 && (
                <div className="flex items-center gap-1 ml-1">
                  {streetBoard.map((c, ci) => {
                    const isNew = newCards.includes(c)
                    const suit = c[c.length - 1]
                    return (
                      <span
                        key={ci}
                        className={cn(
                          'text-[11px] font-mono font-bold px-1 py-0.5 rounded',
                          isNew && 'ring-1 ring-yellow-500/40 bg-yellow-500/5',
                        )}
                        style={{ color: SUIT_COLORS_MAP[suit] || '#aaa' }}
                      >
                        {c[0]}{SUIT_SYMBOLS_MAP[suit] || suit}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Split: 我 (left) / 对手 (right) */}
            <div className="grid grid-cols-2 divide-x divide-[#152233]/30">
              {/* 我的行动 */}
              <div className="bg-[#0B1019]">
                <div className="px-2.5 py-1 text-[9px] font-semibold text-blue-400/70 uppercase tracking-wider border-b border-[#152233]/15">
                  我
                </div>
                {heroActs.length > 0 ? heroActs.map(({ action: a, globalIndex }, ai) => (
                  <ActionRow key={ai} action={a} globalIndex={globalIndex} onRemove={onRemove} isLast={ai === heroActs.length - 1} />
                )) : (
                  <div className="px-3 py-2.5 text-[10px] text-neutral-700 italic">—</div>
                )}
              </div>

              {/* 对手行动 */}
              <div className="bg-[#0D1117]">
                <div className="px-2.5 py-1 text-[9px] font-semibold text-red-400/70 uppercase tracking-wider border-b border-[#152233]/15">
                  对手
                </div>
                {villActs.length > 0 ? villActs.map(({ action: a, globalIndex }, ai) => (
                  <ActionRow key={ai} action={a} globalIndex={globalIndex} onRemove={onRemove} isLast={ai === villActs.length - 1} />
                )) : (
                  <div className="px-3 py-2.5 text-[10px] text-neutral-700 italic">—</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActionRow({ action: a, globalIndex, onRemove, isLast }: {
  action: HandAction
  globalIndex: number
  onRemove: (index: number) => void
  isLast: boolean
}) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-2 group transition-all',
      !isLast && 'border-b border-[#152233]/10',
      a.actor === 'hero'
        ? 'hover:bg-blue-500/[0.03]'
        : 'hover:bg-red-500/[0.03]',
    )}>
      <ChevronRight size={9} className={cn('text-neutral-700 shrink-0', a.actor === 'hero' ? 'text-blue-700' : 'text-red-700')} />
      <span className={cn(
        'flex-1 text-xs font-medium',
        a.actor === 'hero' ? 'text-blue-100' : 'text-red-100',
      )}>
        {a.action.replace(/_/g, ' ')}
      </span>
      <button
        onClick={() => onRemove(globalIndex)}
        className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all p-0.5"
      >
        <X size={11} />
      </button>
    </div>
  )
}
