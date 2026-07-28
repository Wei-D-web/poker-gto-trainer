/**
 * GameHUD — Top stats bar for AI battle mode
 */
import { type SessionStats, getHandsRemaining } from '../../services/game-simulator'
import { cn } from '../../lib/utils'

interface GameHUDProps {
  sessionStats: SessionStats
  handsPlayed: number
  dailyLimit: number
  handsRemaining: number
  isAIThinking: boolean
  onNewHand: () => void
  onReset: () => void
}

export function GameHUD({ sessionStats, handsPlayed, dailyLimit, handsRemaining, isAIThinking, onNewHand, onReset }: GameHUDProps) {
  const limitLabel = dailyLimit === Infinity ? '∞' : String(dailyLimit)

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800 backdrop-blur-sm">
      {/* Left: Hand count + limit */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">对局</span>
          <span className="text-sm font-bold text-neutral-200 font-mono">
            {handsPlayed}
          </span>
          <span className="text-neutral-600 text-xs">/ 今日限额</span>
          <span className="text-sm font-bold text-amber-400 font-mono">
            {limitLabel}
          </span>
        </div>
        {handsRemaining <= 3 && dailyLimit !== Infinity && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            剩 {handsRemaining} 局
          </span>
        )}
      </div>

      {/* Center: Status */}
      <div className="flex items-center gap-3">
        {isAIThinking && (
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            AI 思考中...
          </div>
        )}
      </div>

      {/* Right: Stats */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-neutral-500">胜</span>
          <span className="text-emerald-400 font-mono font-bold">{sessionStats.heroWins}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-neutral-500">负</span>
          <span className="text-red-400 font-mono font-bold">{sessionStats.villainWins}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-neutral-500">平</span>
          <span className="text-neutral-400 font-mono font-bold">{sessionStats.ties}</span>
        </div>
        <div className="h-4 w-px bg-neutral-700" />
        <div className={cn(
          'font-mono font-bold',
          sessionStats.netProfit > 0 ? 'text-emerald-400' : sessionStats.netProfit < 0 ? 'text-red-400' : 'text-neutral-400',
        )}>
          {sessionStats.netProfit >= 0 ? '+' : ''}{sessionStats.netProfit.toFixed(1)}
        </div>

        {/* Action buttons */}
        <button
          onClick={onNewHand}
          disabled={handsRemaining <= 0 && dailyLimit !== Infinity}
          className="ml-2 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-600/20 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          + 新一局
        </button>
        <button
          onClick={onReset}
          className="px-2 py-1 rounded-lg text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          重置
        </button>
      </div>
    </div>
  )
}
