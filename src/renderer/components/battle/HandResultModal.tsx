/**
 * HandResultModal — Shows hand outcome after showdown or fold
 */
import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { PokerCard } from '../common/PokerCard'
import type { HandResult, GameState } from '../../services/game-simulator'

interface HandResultModalProps {
  result: HandResult
  gameState: GameState
  onNewHand: () => void
  onClose: () => void
}

export function HandResultModal({ result, gameState, onNewHand, onClose }: HandResultModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])

  const isHeroWin = result.winner === 'hero'
  const isTie = result.winner === 'tie'

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300',
      visible ? 'opacity-100' : 'opacity-0',
    )}>
      <div className={cn(
        'bg-neutral-900 border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl transition-all duration-500',
        visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4',
        isHeroWin ? 'border-emerald-500/30' : isTie ? 'border-neutral-600' : 'border-red-500/30',
      )}>
        {/* Result banner */}
        <div className={cn(
          'text-center mb-4',
          isHeroWin ? 'text-emerald-400' : isTie ? 'text-neutral-400' : 'text-red-400',
        )}>
          <span className="text-lg font-black">
            {isHeroWin ? '🎉 你赢了！' : isTie ? '🤝 平局' : '😞 AI 赢了'}
          </span>
          <p className="text-xs mt-1 text-neutral-500">{result.winReason}</p>
        </div>

        {/* Profit */}
        <div className="text-center mb-4">
          <span className={cn(
            'text-2xl font-black font-mono',
            result.heroNetWon > 0 ? 'text-emerald-400' : result.heroNetWon < 0 ? 'text-red-400' : 'text-neutral-400',
          )}>
            {result.heroNetWon >= 0 ? '+' : ''}{result.heroNetWon.toFixed(1)} BB
          </span>
        </div>

        {/* Showdown cards */}
        {result.showdown && (
          <>
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {gameState.board.map((c, i) => (
                <PokerCard key={i} card={c} size="sm" />
              ))}
            </div>
            <div className="flex items-center justify-between px-4 mb-1">
              <div className="text-center">
                <p className="text-[10px] text-neutral-500 mb-1">AI</p>
                <div className="flex gap-1">
                  {gameState.villain.holeCards.map((c, i) => (
                    <PokerCard key={i} card={c} size="sm" highlight={result.winner === 'villain'} />
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">{result.villainHand}</p>
              </div>
              <span className="text-neutral-600 text-xs">vs</span>
              <div className="text-center">
                <p className="text-[10px] text-neutral-500 mb-1">你</p>
                <div className="flex gap-1">
                  {gameState.hero.holeCards.map((c, i) => (
                    <PokerCard key={i} card={c} size="sm" highlight={result.winner === 'hero'} />
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">{result.heroHand}</p>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-neutral-700 text-neutral-400 text-xs font-bold hover:border-neutral-600 hover:text-neutral-300 transition-colors"
          >
            查看桌面
          </button>
          <button
            onClick={onNewHand}
            className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors active:scale-95"
          >
            下一局 →
          </button>
        </div>
      </div>
    </div>
  )
}
