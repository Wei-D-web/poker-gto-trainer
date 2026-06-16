/**
 * SessionBrowser — 牌局列表
 *
 * Shows imported sessions with stats, key hand counts, and alignment scores.
 */
import { cn } from '../../lib/utils'
import { Trash2, ChevronRight, Calendar, Clock, DollarSign, TrendingUp, RefreshCw } from 'lucide-react'
import type { SessionData } from '../../stores/sessionReviewStore'

interface Props {
  sessions: SessionData[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
  loading: boolean
}

export function SessionBrowser({ sessions, selectedId, onSelect, onRefresh, loading }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-4">
        <div className="text-6xl">📂</div>
        <div className="text-center">
          <p className="text-lg font-medium text-neutral-400">还没有导入任何对局</p>
          <p className="text-sm mt-1">
            点击右上角「导入牌谱」按钮，支持 PokerStars、GGPoker、WPK 格式
          </p>
        </div>
        <div className="text-xs text-neutral-600 mt-4 max-w-md text-center">
          支持格式：PokerStars、GGPoker、WPK(德州扑克) 的 .txt 牌谱文件。
          <br />
          也支持直接粘贴牌谱文本。
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
        <span className="text-xs text-neutral-500">
          {sessions.length} 场对局
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          刷新
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={cn(
              'px-4 py-3 border-b border-neutral-800/50 cursor-pointer transition-colors',
              'hover:bg-neutral-900/50',
              selectedId === session.id && 'bg-blue-600/10 border-l-2 border-l-blue-500',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Session icon */}
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                  session.profit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400',
                )}>
                  {session.profit >= 0 ? 'W' : 'L'}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-neutral-200">
                      {session.stakes} — {session.tableName}
                    </span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      session.gameType === 'cash' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400',
                    )}>
                      {session.gameType === 'cash' ? 'Cash' : 'MTT'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {session.date?.slice(0, 10) || '未知日期'}
                    </span>
                    {session.durationMinutes > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.durationMinutes} 分钟
                      </span>
                    )}
                    <span>{session.totalHands} 手牌</span>
                  </div>
                </div>
              </div>

              {/* Right side: stats + select button */}
              <div className="flex items-center gap-4">
                {/* Alignment gauge */}
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        session.gtoAlignmentScore >= 80 ? 'bg-emerald-500' :
                          session.gtoAlignmentScore >= 60 ? 'bg-amber-500' :
                            'bg-red-500',
                      )}
                      style={{ width: `${Math.max(5, session.gtoAlignmentScore)}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-right text-neutral-400">
                    {session.gtoAlignmentScore}%
                  </span>
                </div>

                {/* Profit */}
                <span className={cn(
                  'text-sm font-medium w-20 text-right',
                  session.profit >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}>
                  {session.profit >= 0 ? '+' : ''}{Math.round(session.profit * 100) / 100} bb
                </span>

                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
