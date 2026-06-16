import { useState } from 'react'
import { POSITION_LABELS, type Position } from '@shared/types/poker'
import { formatCard } from '@shared/utils/poker-math'
import { cn } from '../../lib/utils'
import { BookOpen, Play, ChevronRight, TrendingDown, Check, X } from 'lucide-react'

interface HandAction {
  street: string
  player: string
  action: string
  amount?: number
  isGTO: boolean
  evDifference?: number
}

interface HandRecord {
  id: string
  gameType: 'cash' | 'tournament'
  heroPosition: Position
  villainPosition: Position
  stackDepth: number
  board: string[]
  potSize: number
  actions: HandAction[]
  result: string
  heroHand: string
  villainHand?: string
}

// Sample hands for demo
const SAMPLE_HANDS: HandRecord[] = [
  {
    id: 'hand_1',
    gameType: 'cash',
    heroPosition: 3,
    villainPosition: 5,
    stackDepth: 100,
    board: ['Kh', '7d', '2s', 'Jh', '3c'],
    potSize: 12.5,
    heroHand: 'AKs',
    villainHand: 'QJo',
    actions: [
      { street: 'preflop', player: '我 (BTN)', action: 'Open 2.5bb', amount: 2.5, isGTO: true },
      { street: 'preflop', player: '对手 (BB)', action: 'Call', amount: 2.5, isGTO: true },
      { street: 'flop', player: '对手 (BB)', action: 'Check', isGTO: true },
      { street: 'flop', player: '我 (BTN)', action: 'Bet 33%', amount: 2.0, isGTO: true },
      { street: 'flop', player: '对手 (BB)', action: 'Call', amount: 2.0, isGTO: false, evDifference: 0.12 },
      { street: 'turn', player: '对手 (BB)', action: 'Check', isGTO: true },
      { street: 'turn', player: '我 (BTN)', action: 'Bet 75%', amount: 8.5, isGTO: true },
      { street: 'turn', player: '对手 (BB)', action: 'Fold', isGTO: true },
    ],
    result: '我 wins 9.5bb',
  },
  {
    id: 'hand_2',
    gameType: 'cash',
    heroPosition: 2,
    villainPosition: 3,
    stackDepth: 100,
    board: ['Ah', 'Th', '3h', '8d', '2h'],
    potSize: 18.0,
    heroHand: 'QhJh',
    actions: [
      { street: 'preflop', player: '我 (CO)', action: 'Open 2.5bb', amount: 2.5, isGTO: true },
      { street: 'preflop', player: '对手 (BTN)', action: 'Call', amount: 2.5, isGTO: true },
      { street: 'flop', player: '我 (CO)', action: 'Bet 50%', amount: 3.0, isGTO: false, evDifference: 0.08 },
      { street: 'flop', player: '对手 (BTN)', action: 'Raise 3x', amount: 9.0, isGTO: false, evDifference: 0.15 },
      { street: 'flop', player: '我 (CO)', action: 'Call', amount: 9.0, isGTO: true },
      { street: 'turn', player: '我 (CO)', action: 'Check', isGTO: true },
      { street: 'turn', player: '对手 (BTN)', action: 'Bet 75%', amount: 13.5, isGTO: true },
      { street: 'turn', player: '我 (CO)', action: 'Call', amount: 13.5, isGTO: true },
      { street: 'river', player: '我 (CO)', action: 'Check', isGTO: true },
      { street: 'river', player: '对手 (BTN)', action: 'All-in', isGTO: true },
      { street: 'river', player: '我 (CO)', action: 'Call', amount: 72.0, isGTO: true },
    ],
    result: '我 wins 128bb with flush',
  },
]

export function HandHistoryPage() {
  const [selectedHand, setSelectedHand] = useState<HandRecord | null>(null)
  const [currentActionIndex, setCurrentActionIndex] = useState(-1)

  const visibleActions = selectedHand
    ? selectedHand.actions.slice(0, currentActionIndex + 1)
    : []

  const gtoMistakes = selectedHand
    ? selectedHand.actions.filter(a => !a.isGTO)
    : []

  const totalEVLost = gtoMistakes.reduce((sum, a) => sum + (a.evDifference || 0), 0)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen size={20} className="text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Hand History</h2>
            <p className="text-xs text-neutral-500">Review and analyze played hands against GTO</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Hand list */}
        <div className="w-72 border-r border-neutral-800 overflow-y-auto shrink-0">
          {SAMPLE_HANDS.map(hand => (
            <button
              key={hand.id}
              onClick={() => { setSelectedHand(hand); setCurrentActionIndex(-1) }}
              className={cn(
                'w-full text-left p-3 border-b border-neutral-800 hover:bg-neutral-800/30 transition-colors',
                selectedHand?.id === hand.id && 'bg-blue-600/10 border-l-2 border-l-blue-500'
              )}
            >
              <div className="text-xs font-medium text-neutral-300">
                {POSITION_LABELS[hand.heroPosition]} vs {POSITION_LABELS[hand.villainPosition]} · {hand.stackDepth}bb
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">{hand.heroHand}</div>
              <div className="text-[10px] text-neutral-600 mt-0.5">{hand.board.map(formatCard).join(' ') || 'Preflop'}</div>
              <div className="text-[10px] mt-0.5 text-green-400">{hand.result}</div>
            </button>
          ))}
        </div>

        {/* Hand viewer */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedHand ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-600 gap-3">
              <BookOpen size={32} className="text-neutral-700" />
              <span>Select a hand to view replay and GTO analysis</span>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              {/* Hand info */}
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-semibold text-neutral-200">
                      {POSITION_LABELS[selectedHand.heroPosition]} vs {POSITION_LABELS[selectedHand.villainPosition]}
                    </span>
                    <span className="text-xs text-neutral-500 ml-2">{selectedHand.stackDepth}bb · {selectedHand.gameType}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-green-400">{selectedHand.heroHand}</span>
                </div>

                {/* Board */}
                <div className="flex gap-2 mb-3">
                  {selectedHand.board.length > 0 ? selectedHand.board.map((card, i) => (
                    <span key={i} className="px-3 py-2 bg-neutral-700 rounded-lg text-base font-mono font-bold text-neutral-100">
                      {formatCard(card)}
                    </span>
                  )) : (
                    <span className="text-sm text-neutral-600">Preflop</span>
                  )}
                </div>

                <div className="text-xs text-green-400 font-medium">{selectedHand.result}</div>
              </div>

              {/* GTO mistakes summary */}
              {gtoMistakes.length > 0 && (
                <div className="bg-red-600/5 border border-red-600/20 rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <TrendingDown size={14} />
                    GTO Deviations ({gtoMistakes.length})
                  </h4>
                  <div className="space-y-2">
                    {gtoMistakes.map((mistake, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">{mistake.player}: {mistake.action}</span>
                        <span className="text-red-400 font-mono">-{mistake.evDifference?.toFixed(2)}bb EV</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-red-300 mt-2 pt-2 border-t border-red-600/20 font-medium">
                    Total EV Lost: -{totalEVLost.toFixed(2)}bb
                  </div>
                </div>
              )}

              {/* Action timeline controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentActionIndex(-1)}
                  className="px-3 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setCurrentActionIndex(prev => Math.min(prev + 1, selectedHand.actions.length - 1))}
                  className="px-3 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Play size={12} /> Next Action
                </button>
                <button
                  onClick={() => setCurrentActionIndex(selectedHand.actions.length - 1)}
                  className="px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors"
                >
                  Show All
                </button>
              </div>

              {/* Action timeline */}
              <div className="space-y-1">
                {selectedHand.actions.map((action, i) => {
                  const isVisible = i <= currentActionIndex
                  const isCurrent = i === currentActionIndex

                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
                        isVisible ? 'opacity-100' : 'opacity-30',
                        isCurrent && 'bg-blue-600/10 border border-blue-600/20',
                        !action.isGTO && isVisible && 'bg-red-600/5'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-[60px]">
                        {action.isGTO ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <X size={14} className="text-red-500" />
                        )}
                        <span className="text-[10px] text-neutral-500 uppercase">{action.street}</span>
                      </div>

                      <ChevronRight size={12} className="text-neutral-700" />

                      <div className="flex-1">
                        <span className="text-xs text-neutral-300">{action.player}</span>
                        <span className="text-xs text-neutral-500 mx-2">→</span>
                        <span className="text-xs font-medium text-neutral-200">{action.action}</span>
                        {action.amount && (
                          <span className="text-[10px] text-neutral-500 ml-1">({action.amount}bb)</span>
                        )}
                      </div>

                      {!action.isGTO && (
                        <span className="text-[10px] text-red-400 font-mono">-{action.evDifference?.toFixed(2)}bb</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
