import { useState, useCallback, useEffect, useRef } from 'react'
import { POSITION_LABELS, type Position } from '@shared/types/poker'
import { createGame, applyAction, getAIDecision, type GameState, type GameAction, type SessionStats } from '../../../../src/main/solver/game-engine'
import { cn } from '../../lib/utils'
import { RotateCcw, Play, Trophy, TrendingUp } from 'lucide-react'

const SUIT: Record<string, { icon: string; color: string }> = {
  s: { icon: '♠', color: '#b0b0b0' },
  h: { icon: '♥', color: '#dc2626' },
  d: { icon: '♦', color: '#3b82f6' },
  c: { icon: '♣', color: '#16a34a' },
}

const POSITION_TABLE_SPOTS: Record<number, { top: string; left: string }> = {
  0: { top: '8%', left: '18%' },   // UTG
  1: { top: '8%', left: '38%' },   // MP
  2: { top: '8%', left: '62%' },   // CO
  3: { top: '8%', left: '82%' },   // BTN
  4: { top: '82%', left: '82%' },  // SB
  5: { top: '82%', left: '62%' },  // BB - default villain
}

const SIZINGS = [
  { label: '1/3', pct: 0.33 },
  { label: '1/2', pct: 0.50 },
  { label: '2/3', pct: 0.67 },
  { label: 'Pot', pct: 1.0 },
  { label: '1.5x', pct: 1.5 },
]

export function PlaygroundPage() {
  const [heroPos, setHeroPos] = useState<Position>(3)
  const [villainPos, setVillainPos] = useState<Position>(5)
  const [game, setGame] = useState<GameState | null>(null)
  const [stats, setStats] = useState<SessionStats>({ handsPlayed: 0, heroWins: 0, villainWins: 0, ties: 0, netProfit: 0, biggestWin: 0, biggestLoss: 0 })
  const [aiThinking, setAiThinking] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [handCount, setHandCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const startHand = useCallback(() => {
    // Clear any stale AI timer from previous hand
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = undefined }
    setLastResult(null)
    const g = createGame(heroPos, villainPos, 100)
    setGame(g)
    // If villain acts first preflop
    if (g.currentActor === 'villain') {
      setAiThinking(true)
      timerRef.current = setTimeout(() => {
        const ai = getAIDecision(g)
        const after = applyAction(g, ai)
        setAiThinking(false)
        if (after.phase === 'showdown') finishHand(after)
        else setGame(after)
      }, 500 + Math.random() * 400)
    }
  }, [heroPos, villainPos])

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!game || game.currentActor !== 'hero' || game.phase === 'showdown' || aiThinking) return
      if (e.target instanceof HTMLInputElement) return
      const key = e.key.toLowerCase()
      if (key === 'f') doAction('fold')
      else if (key === 'c') doAction('check')
      else if (key === 'a') doAction('all_in')
      else if (key === '1') doAction(game.villain.currentBet > game.hero.currentBet ? 'raise' : 'bet', 0.33)
      else if (key === '2') doAction(game.villain.currentBet > game.hero.currentBet ? 'raise' : 'bet', 0.50)
      else if (key === '3') doAction(game.villain.currentBet > game.hero.currentBet ? 'raise' : 'bet', 0.67)
      else if (game.villain.currentBet === game.hero.currentBet) return
      else if (key === 'enter' || key === ' ') doAction('call')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [game, aiThinking, doAction])

  const finishHand = (final: GameState) => {
    setGame(final)
    if (final.result) {
      const r = final.result
      setLastResult(r.winner === 'hero' ? `+${r.heroNetWon}bb` : r.winner === 'villain' ? `${r.heroNetWon}bb` : 'Tie')
      setHandCount(c => c + 1)
      setStats(s => ({
        handsPlayed: s.handsPlayed + 1,
        heroWins: s.heroWins + (r.winner === 'hero' ? 1 : 0),
        villainWins: s.villainWins + (r.winner === 'villain' ? 1 : 0),
        ties: s.ties + (r.winner === 'tie' ? 1 : 0),
        netProfit: s.netProfit + r.heroNetWon,
        biggestWin: Math.max(s.biggestWin, r.heroNetWon),
        biggestLoss: Math.min(s.biggestLoss, r.heroNetWon),
      }))
    }
  }

  const doAction = useCallback((type: GameAction['type'], sizingPct?: number) => {
    if (!game || game.currentActor !== 'hero' || game.phase === 'showdown' || aiThinking) return

    const pot = game.pot  // pot already includes all bets
    const toCall = game.villain.currentBet - game.hero.currentBet

    let amount = 0
    if (type === 'bet' || type === 'raise') {
      const pct = sizingPct ?? 0.5
      amount = Math.round(pot * pct * 100) / 100
    }
    if (type === 'call') amount = toCall
    if (type === 'all_in') amount = game.hero.stack

    const action: GameAction = { player: 'hero', type, amount, sizing: sizingPct != null ? String(Math.round(sizingPct * 100)) + '%' : undefined, street: game.street }
    const afterHero = applyAction(game, action)
    setGame(afterHero)

    if (afterHero.phase === 'showdown') { finishHand(afterHero); return }

    // AI turn
    if (afterHero.currentActor === 'villain') {
      setAiThinking(true)
      timerRef.current = setTimeout(() => {
        const aiAction = getAIDecision(afterHero)
        const afterAI = applyAction(afterHero, aiAction)
        setAiThinking(false)
        if (afterAI.phase === 'showdown') finishHand(afterAI)
        else setGame(afterAI)
      }, 400 + Math.random() * 500)
    }
  }, [game, aiThinking])

  const stackDepth = 100

  // --- Render ---

  if (!game) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#05080C]">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Play size={18} className="text-emerald-400" /></div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-neutral-200">实战模拟</h2>
              <p className="text-xs text-neutral-500">对抗 GTO AI · 真实牌桌体验</p>
            </div>
            {stats.handsPlayed > 0 && <MiniStats stats={stats} />}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-8">
            <div className="w-28 h-28 rounded-full bg-emerald-500/5 flex items-center justify-center mx-auto border-2 border-emerald-500/10">
              <Play size={48} className="text-emerald-400/60" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-200 mb-2">Ready to Play</h3>
              <p className="text-sm text-neutral-500 mb-6">选择位置，开始对抗 GTO AI</p>

              <div className="flex items-center gap-4 justify-center mb-2">
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-2">你的位置</label>
                  <div className="flex gap-1">
                    {[0,1,2,3,4,5].map(p => (
                      <button key={p} onClick={() => setHeroPos(p as Position)}
                        className={cn('w-10 h-10 text-xs rounded-xl font-bold transition-all flex items-center justify-center',
                          heroPos === p ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 scale-110' : 'bg-white/[0.03] text-neutral-500 hover:bg-white/[0.06]')}>
                        {POSITION_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-neutral-700 text-lg mt-6">vs</span>
                <div>
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-2">AI 位置</label>
                  <div className="flex gap-1">
                    {[0,1,2,3,4,5].map(p => (
                      <button key={p} onClick={() => setVillainPos(p as Position)}
                        className={cn('w-10 h-10 text-xs rounded-xl font-bold transition-all flex items-center justify-center',
                          villainPos === p ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30 scale-110' : 'bg-white/[0.03] text-neutral-500 hover:bg-white/[0.06]')}>
                        {POSITION_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={startHand}
              className="px-10 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-bold text-base transition-all shadow-[0_4px_30px_rgba(16,185,129,0.3)] active:scale-95">
              Deal Hand 🎴
            </button>

            {stats.handsPlayed > 0 && <MiniStats stats={stats} />}
          </div>
        </div>
      </div>
    )
  }

  const isHeroTurn = game.currentActor === 'hero' && game.phase !== 'showdown' && !aiThinking
  const pot = game.pot  // pot already includes all bets
  const toCall = game.villain.currentBet - game.hero.currentBet

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#05080C]">
      {/* Top bar */}
      <div className="px-5 py-2.5 border-b border-[#152233] flex items-center justify-between shrink-0 bg-[#080B10]/80">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-neutral-300">
            {POSITION_LABELS[game.heroPosition]} vs {POSITION_LABELS[game.villainPosition]}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 ring-1 ring-white/[0.05]">
            {game.street}
          </span>
          <span className="text-[10px] text-neutral-500">Pot: <b className="text-amber-400">{Math.round(pot * 100) / 100}bb</b></span>
          {isHeroTurn && <span className="text-[10px] text-emerald-400 animate-pulse-subtle font-medium">● Your turn</span>}
          {aiThinking && <span className="text-[10px] text-neutral-500 animate-pulse-subtle">AI thinking...</span>}
        </div>
        <div className="flex items-center gap-4">
          {stats.handsPlayed > 0 && (
            <span className={cn('text-xs font-semibold', stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {stats.netProfit > 0 ? '+' : ''}{Math.round(stats.netProfit * 100) / 100}bb
            </span>
          )}
          <button onClick={startHand}
            className="px-3 py-1.5 text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 rounded-lg transition-colors flex items-center gap-1.5 border border-white/[0.06]">
            <RotateCcw size={11} /> New Hand
          </button>
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Felt background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f08] via-[#0d1a0a] to-[#0a0f08]" />

        {/* Main table oval */}
        <div className="relative w-[680px] h-[380px]">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-[50%] bg-gradient-to-br from-amber-900/60 via-amber-800/40 to-amber-900/60 border-4 border-amber-900/30 shadow-[0_20px_80px_rgba(0,0,0,0.5),inset_0_2px_20px_rgba(0,0,0,0.3)]" />

          {/* Inner felt */}
          <div className="absolute inset-[18px] rounded-[50%] bg-gradient-to-br from-[#1a6b3a] via-[#166534] to-[#14532d] border border-emerald-700/20 shadow-[inset_0_2px_40px_rgba(0,0,0,0.3)]" />

          {/* Inner line */}
          <div className="absolute inset-[60px] rounded-[50%] border border-white/[0.03]" />

          {/* AI position indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
            <div className={cn(
              'px-4 py-2 rounded-xl text-center min-w-[140px] transition-all',
              aiThinking ? 'bg-amber-500/10 border border-amber-500/20' :
              game.currentActor === 'villain' ? 'bg-white/[0.03] border border-white/[0.06]' :
              'bg-transparent border border-transparent',
            )}>
              <div className="flex items-center gap-2 justify-center mb-1.5">
                {game.phase === 'showdown' || game.villain.folded
                  ? game.villain.holeCards.map((c, i) => <PokerCard key={i} card={c} size="sm" />)
                  : <><PokerCard card="?" size="sm" /><PokerCard card="?" size="sm" /></>
                }
              </div>
              <div className="text-xs font-bold text-red-400">AI</div>
              <div className="text-[10px] text-neutral-500">{POSITION_LABELS[game.villainPosition]}</div>
              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{game.villain.stack}bb</div>
              {game.villain.currentBet > 0 && <div className="text-[10px] text-amber-400 mt-0.5 font-medium">{game.villain.currentBet}bb</div>}
            </div>
          </div>

          {/* Hero position indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
            <div className={cn(
              'px-4 py-2 rounded-xl text-center min-w-[140px] transition-all',
              isHeroTurn ? 'bg-emerald-500/10 border border-emerald-500/30 ring-2 ring-emerald-500/10' :
              'bg-transparent border border-transparent',
            )}>
              <div className="flex items-center gap-2 justify-center mb-1.5">
                {game.hero.holeCards.map((c, i) => <PokerCard key={i} card={c} size="sm" />)}
              </div>
              <div className="text-xs font-bold text-emerald-400">Hero</div>
              <div className="text-[10px] text-neutral-500">{POSITION_LABELS[game.heroPosition]}</div>
              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{game.hero.stack}bb</div>
              {game.hero.currentBet > 0 && <div className="text-[10px] text-amber-400 mt-0.5 font-medium">{game.hero.currentBet}bb</div>}
            </div>
          </div>

          {/* Center: board cards + pot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            {/* Board cards */}
            <div className="flex gap-2.5 mb-3">
              {game.board.length === 0 ? (
                <div className="flex gap-2.5">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="w-[54px] h-[76px] rounded-lg border border-dashed border-white/[0.05] bg-white/[0.01]" />
                  ))}
                </div>
              ) : (
                <>
                  {game.board.map((c, i) => <PokerCard key={i} card={c} size="md" />)}
                  {Array.from({length: 5 - game.board.length}).map((_, i) => (
                    <div key={i} className="w-[54px] h-[76px] rounded-lg border border-dashed border-white/[0.05] bg-transparent" />
                  ))}
                </>
              )}
            </div>

            {/* Pot */}
            <div className="bg-black/40 backdrop-blur-sm border border-amber-500/10 rounded-full px-5 py-1.5">
              <span className="text-sm font-bold text-amber-400/90">{Math.round(pot * 100) / 100} bb</span>
            </div>
          </div>
        </div>

        {/* Result overlay */}
        {game.phase === 'showdown' && game.result && (
          <div className={cn(
            'mt-3 px-6 py-3 rounded-xl text-center animate-scale-in z-20',
            game.result.winner === 'hero' ? 'bg-emerald-500/10 border border-emerald-500/20' :
            game.result.winner === 'villain' ? 'bg-red-500/10 border border-red-500/20' :
            'bg-neutral-500/10 border border-neutral-500/20',
          )}>
            <span className={cn('text-sm font-bold',
              game.result.winner === 'hero' ? 'text-emerald-400' : 'text-red-400')}>
              {game.result.winner === 'hero' ? `🏆 +${game.result.heroNetWon}bb`
               : game.result.winner === 'villain' ? `😞 ${game.result.heroNetWon}bb`
               : '🤝 Split'}
            </span>
            <span className="text-[10px] text-neutral-500 ml-2">{game.result.winReason}</span>
            <button onClick={startHand} className="ml-3 text-[11px] text-emerald-400 hover:underline font-medium">
              Next hand →
            </button>
          </div>
        )}

        {/* Action buttons */}
        {isHeroTurn && (
          <div className="mt-3 flex flex-col items-center gap-2 animate-fade-in z-20">
            {/* Bet sizing row */}
            <div className="flex gap-1.5">
              {SIZINGS.map(s => (
                <button key={s.label} onClick={() => doAction(toCall > 0 ? 'raise' : 'bet', s.pct)}
                  className="px-3 py-1.5 text-[11px] font-semibold bg-amber-500/8 hover:bg-amber-500/15 text-amber-400 border border-amber-500/15 rounded-lg transition-all hover:border-amber-500/30">
                  {toCall > 0 ? 'Raise' : 'Bet'} {s.label}
                </button>
              ))}
              <button onClick={() => doAction('all_in')}
                className="px-3 py-1.5 text-[11px] font-semibold bg-purple-500/8 hover:bg-purple-500/15 text-purple-400 border border-purple-500/15 rounded-lg transition-all">
                All-in ({game.hero.stack}bb)
              </button>
            </div>

            {/* Primary actions */}
            <div className="flex gap-2">
              <button onClick={() => doAction('fold')}
                className="px-8 py-2.5 text-sm font-bold bg-red-500/8 hover:bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl transition-all hover:border-red-500/40">
                Fold <kbd className="ml-2 text-[9px] text-red-500/50 font-normal">F</kbd>
              </button>
              {toCall === 0 ? (
                <button onClick={() => doAction('check')}
                  className="px-8 py-2.5 text-sm font-bold bg-blue-500/8 hover:bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-xl transition-all">
                  Check <kbd className="ml-2 text-[9px] text-blue-500/50 font-normal">C</kbd>
                </button>
              ) : (
                <button onClick={() => doAction('call')}
                  className="px-8 py-2.5 text-sm font-bold bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-xl transition-all">
                  Call {Math.round(toCall * 100) / 100}bb <kbd className="ml-2 text-[9px] text-emerald-500/50 font-normal">⏎</kbd>
                </button>
              )}
              <button onClick={() => doAction('all_in')}
                className="px-8 py-2.5 text-sm font-bold bg-purple-500/8 hover:bg-purple-500/15 text-purple-400 border border-purple-500/20 rounded-xl transition-all">
                All-in <kbd className="ml-2 text-[9px] text-purple-500/50 font-normal">A</kbd>
              </button>
            </div>
            <div className="text-[9px] text-neutral-700 text-center mt-1">
              F=Fold C=Check ⏎=Call A=All-in 1-3=Bet sizing
            </div>
          </div>
        )}

        {/* Waiting for AI overlay */}
        {aiThinking && (
          <div className="mt-3 text-xs text-neutral-500 animate-pulse-subtle z-20">AI is deciding...</div>
        )}
      </div>
    </div>
  )
}

/** Professional poker card component */
function PokerCard({ card, size = 'md' }: { card: string; size?: 'sm' | 'md' }) {
  const isBack = card === '?'
  const dims = size === 'sm' ? 'w-11 h-[62px]' : 'w-[54px] h-[76px]'
  const textSize = size === 'sm' ? 'text-sm' : 'text-base'
  const suitSize = size === 'sm' ? 'text-xs' : 'text-sm'

  if (isBack) {
    return (
      <div className={cn(dims, 'rounded-[6px] flex items-center justify-center', 'bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 border-2 border-blue-700/40 shadow-md')}>
        <div className="w-[70%] h-[80%] rounded-[4px] border border-blue-600/30 bg-gradient-to-br from-blue-800/50 to-blue-900/50 flex items-center justify-center">
          <span className="text-blue-400/30 text-xs">♠♥</span>
        </div>
      </div>
    )
  }

  const rank = card[0]
  const suitChar = card[card.length - 1]
  const suit = SUIT[suitChar] || { icon: suitChar, color: '#999' }

  return (
    <div className={cn(dims, 'rounded-[6px] bg-white border-2 border-neutral-200 flex flex-col shadow-md hover:shadow-lg transition-shadow')}
      style={{ color: suit.color }}>
      <div className={cn('pl-1.5 pt-0.5 font-bold leading-none', textSize)}>{rank}</div>
      <div className="flex-1 flex items-center justify-center">
        <span className={cn('leading-none', suitSize)} style={{ color: suit.color }}>{suit.icon}</span>
      </div>
      <div className={cn('pr-1.5 pb-0.5 font-bold leading-none self-end rotate-180', textSize)}>{rank}</div>
    </div>
  )
}

function MiniStats({ stats }: { stats: SessionStats }) {
  return (
    <div className="flex items-center gap-4 text-xs">
      <span className="text-neutral-500">{stats.handsPlayed}h</span>
      <span className="text-emerald-400">{stats.heroWins}W</span>
      <span className="text-red-400">{stats.villainWins}L</span>
      <span className={cn('font-semibold', stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
        {stats.netProfit > 0 ? '+' : ''}{Math.round(stats.netProfit)}bb
      </span>
    </div>
  )
}
