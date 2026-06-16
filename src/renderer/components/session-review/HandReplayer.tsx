/**
 * HandReplayer — 手牌回放器
 *
 * Street-by-street replay with side-by-side GTO comparison.
 * Left: visual replay of the hand
 * Right: per-decision GTO analysis
 */
import { useState, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { ChevronLeft, ChevronRight, Play, SkipForward, AlertTriangle, Check, X } from 'lucide-react'
import type { SessionHand } from '../../stores/sessionReviewStore'

interface Props {
  hand: SessionHand | null
  allHands: SessionHand[]
  onSelectHand: (handId: string) => void
}

const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const SUIT_COLORS: Record<string, string> = { s: 'text-neutral-200', h: 'text-red-400', d: 'text-blue-400', c: 'text-green-400' }
const STREET_LABELS: Record<string, string> = {
  preflop: '翻前', flop: '翻牌', turn: '转牌', river: '河牌',
}

export function HandReplayer({ hand, allHands, onSelectHand }: Props) {
  const [replayIndex, setReplayIndex] = useState(0)

  if (!hand) {
    // Show hand picker
    const keyHands = allHands.filter(h => h.isKeyHand)
    const otherHands = allHands.filter(h => !h.isKeyHand).slice(0, 30)

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-200">选择一手牌开始回放</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {keyHands.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-amber-400 font-medium">🔑 关键手牌 ({keyHands.length})</div>
              {keyHands.map(h => (
                <HandRow key={h.id} hand={h} onClick={() => onSelectHand(h.id)} />
              ))}
            </div>
          )}
          {otherHands.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs text-neutral-500 font-medium">其他手牌</div>
              {otherHands.map(h => (
                <HandRow key={h.id} hand={h} onClick={() => onSelectHand(h.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Split actions by street
  const actionsByStreet = useMemo(() => {
    const map: Record<string, any[]> = { preflop: [], flop: [], turn: [], river: [] }
    for (const a of hand.actions) {
      if (map[a.street]) map[a.street].push(a)
    }
    return map
  }, [hand])

  const allActions = hand.actions
  const currentAction = allActions[Math.min(replayIndex, allActions.length - 1)]
  const currentStreet = currentAction?.street || 'preflop'
  const currentBoard = getBoardAtStreet(hand.board, currentStreet)

  // Decision analysis for current action
  const heroDecisions = hand.actions
    .map((_a, i) => i)
    .filter(i => hand.actions[i].actor === 'hero')
  const heroDecisionIdx = heroDecisions.indexOf(replayIndex)
  const currentDecision = heroDecisionIdx >= 0 ? (hand as any).decisionAnalysis?.[heroDecisionIdx] : null

  const isLastAction = replayIndex >= allActions.length - 1

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Replay area */}
      <div className="flex-1 flex flex-col border-r border-neutral-800">
        {/* Board cards */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-medium text-neutral-200">
                {hand.heroHand[0]}{hand.heroHand[0][1] ? SUIT_SYMBOLS[hand.heroHand[0][1]?.toLowerCase()] || '' : ''}
                {' '}
                {hand.heroHand[1]}{hand.heroHand[1][1] ? SUIT_SYMBOLS[hand.heroHand[1][1]?.toLowerCase()] || '' : ''}
              </span>
              <span className="text-xs text-neutral-500 ml-2">
                {STREET_LABELS[currentStreet]} · Pot: {Math.round(hand.potSize * 100) / 100} bb
              </span>
            </div>
            <span className={cn(
              'text-sm font-medium',
              hand.heroWon ? 'text-emerald-400' : hand.heroWon === false ? 'text-red-400' : 'text-neutral-500',
            )}>
              {hand.heroWon ? `+${Math.round(hand.amountWon * 100) / 100} bb` :
                hand.heroWon === false ? `-${Math.round(hand.effectiveStack * 100) / 100} bb` : '-'}
            </span>
          </div>

          {/* Board display */}
          <div className="flex items-center gap-3 mb-3">
            {currentBoard.length > 0 ? currentBoard.map((card, i) => (
              <CardDisplay key={i} card={card as string} />
            )) : (
              <span className="text-sm text-neutral-600">翻前</span>
            )}
          </div>

          {/* Action timeline */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {allActions.map((action, i) => (
              <button
                key={i}
                onClick={() => setReplayIndex(i)}
                className={cn(
                  'flex-shrink-0 px-2 py-1 rounded text-xs transition-colors',
                  i === replayIndex
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                    : i < replayIndex
                      ? 'bg-neutral-800 text-neutral-500'
                      : 'bg-neutral-900 text-neutral-700',
                  action.actor === 'hero' && 'font-medium',
                )}
              >
                {i < replayIndex ? '✓' : ''} {action.action}
              </button>
            ))}
          </div>
        </div>

        {/* Action detail */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Current action highlight */}
          <div className={cn(
            'w-32 h-32 rounded-full border-4 flex items-center justify-center mb-6',
            currentAction?.actor === 'hero' ? 'border-blue-500/50 bg-blue-500/10' : 'border-red-500/50 bg-red-500/10',
          )}>
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                currentAction?.actor === 'hero' ? 'text-blue-400' : 'text-red-400',
              )}>
                {currentAction?.action.toUpperCase()}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {currentAction?.actor === 'hero' ? '我' : '对手'}
              </div>
            </div>
          </div>

          {currentDecision && (
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              currentDecision.isGTO ? 'bg-emerald-500/10 border border-emerald-500/30' :
                'bg-red-500/10 border border-red-500/30',
            )}>
              {currentDecision.isGTO ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <X className="w-4 h-4 text-red-400" />
              )}
              <span className={cn('text-sm', currentDecision.isGTO ? 'text-emerald-300' : 'text-red-300')}>
                {currentDecision.explanation || (currentDecision.isGTO ? '符合 GTO' : '偏离 GTO')}
              </span>
            </div>
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-neutral-800 bg-neutral-900/30">
          <button
            onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}
            disabled={replayIndex === 0}
            className="p-2 rounded-lg hover:bg-neutral-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-400" />
          </button>
          <button
            onClick={() => setReplayIndex(Math.min(allActions.length - 1, replayIndex + 1))}
            disabled={isLastAction}
            className="p-2 rounded-lg hover:bg-neutral-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </button>
          <button
            onClick={() => setReplayIndex(0)}
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <SkipForward className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Right: GTO Analysis */}
      <div className="w-96 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-200">GTO 分析</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(hand as any).decisionAnalysis?.length > 0 ? (
            (hand as any).decisionAnalysis.map((d: any, i: number) => (
              <div key={i} className={cn(
                'px-4 py-3 border-b border-neutral-800/50',
                !d.isGTO && 'bg-red-500/5',
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-neutral-500">{STREET_LABELS[d.street] || d.street}</span>
                  {d.isGTO ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className={cn(
                      'w-3.5 h-3.5',
                      d.severity === 'critical' ? 'text-red-400' :
                        d.severity === 'major' ? 'text-orange-400' :
                          'text-amber-400',
                    )} />
                  )}
                </div>
                <p className="text-sm text-neutral-300">{d.explanation}</p>
                {!d.isGTO && (
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-neutral-500">
                      你的: <span className="text-red-300">{d.action}</span>
                    </span>
                    <span className="text-neutral-500">
                      GTO: <span className="text-emerald-300">{d.gtoAction}</span>
                    </span>
                    <span className="text-red-400 font-medium">-{Math.round(d.evDifference * 100) / 100} bb</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-neutral-500 text-center">
              暂无逐决策分析数据
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HandRow({ hand, onClick }: { hand: SessionHand; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-neutral-900/50 transition-colors',
        'border-b border-neutral-800/30',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-neutral-200">
          {hand.heroHand[0]}{hand.heroHand[1]}
          {hand.heroHand[0][0] === hand.heroHand[1][0] ? '' :
            hand.heroHand[0][1] === hand.heroHand[1][1] ? 's' : 'o'}
        </span>
        <span className="text-xs text-neutral-500">
          {hand.board.slice(0, 3).join(' ') || 'Preflop'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {hand.isKeyHand && <span className="text-xs text-amber-400">🔑</span>}
        <span className={cn('text-xs', hand.heroWon ? 'text-emerald-400' : 'text-red-400')}>
          {hand.heroWon ? 'W' : hand.heroWon === false ? 'L' : '-'}
        </span>
      </div>
    </div>
  )
}

function CardDisplay({ card }: { card: string }) {
  if (!card || card.length < 2) return null
  const rank = card[0]
  const suit = (card[1] || 's').toLowerCase()
  return (
    <div className={cn(
      'w-10 h-14 rounded-lg border border-neutral-600 bg-neutral-800 flex flex-col items-center justify-center',
      SUIT_COLORS[suit] || 'text-neutral-200',
    )}>
      <span className="text-sm font-bold">{rank}</span>
      <span className="text-xs">{SUIT_SYMBOLS[suit] || suit}</span>
    </div>
  )
}

function getBoardAtStreet(board: string[], street: string): string[] {
  switch (street) {
    case 'preflop': return []
    case 'flop': return board.slice(0, 3)
    case 'turn': return board.slice(0, 4)
    case 'river': return board.slice(0, 5)
    default: return board
  }
}
