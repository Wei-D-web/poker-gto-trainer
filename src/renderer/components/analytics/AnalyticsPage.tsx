import { useState, useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { BarChart3, TrendingUp, TrendingDown, Target, AlertTriangle, Zap, Activity, PieChart, ArrowUp, ArrowDown } from 'lucide-react'

interface HandData {
  id: string; grade: string; totalMistakes: number; totalEVLost: number
  heroHand: string[]; board: string[]; heroPosition: number; heroWon: boolean | null
  analyzed: boolean; potSize: number
}

export function AnalyticsPage() {
  const [hands, setHands] = useState<HandData[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'overview' | 'positions' | 'streets' | 'trends'>('overview')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const r = await window.electronAPI.handHistory.list({ limit: 200 })
      setHands(r.hands.filter((h: any) => h.analyzed))
    } catch { /* empty */ }
    setLoading(false)
  }

  const analyzed = useMemo(() => hands.filter(h => h.analyzed), [hands])

  // Computed stats
  const stats = useMemo(() => {
    if (analyzed.length === 0) return null
    const total = analyzed.length
    const totalEV = analyzed.reduce((s, h) => s + h.totalEVLost, 0)
    const avgEV = totalEV / total
    const grades = analyzed.map(h => h.grade).filter(Boolean)
    const gradeDist: Record<string, number> = {}
    grades.forEach(g => { const k = g[0]; gradeDist[k] = (gradeDist[k] || 0) + 1 })

    // By position
    const posStats: Record<number, { hands: number; evLost: number; won: number }> = {}
    analyzed.forEach(h => {
      if (!posStats[h.heroPosition]) posStats[h.heroPosition] = { hands: 0, evLost: 0, won: 0 }
      posStats[h.heroPosition].hands++
      posStats[h.heroPosition].evLost += h.totalEVLost
      if (h.heroWon) posStats[h.heroPosition].won++
    })

    // Mistake severity distribution
    const mistakes = analyzed.map(h => h.totalMistakes)
    const noMistakes = mistakes.filter(m => m === 0).length
    const minorMistakes = mistakes.filter(m => m >= 1 && m <= 2).length
    const moderateMistakes = mistakes.filter(m => m >= 3 && m <= 5).length
    const majorMistakes = mistakes.filter(m => m > 5).length

    // Win rate
    const winRate = analyzed.filter(h => h.heroWon).length / total * 100

    return {
      total, totalEV: Math.round(totalEV * 100) / 100, avgEV: Math.round(avgEV * 100) / 100,
      gradeDist, posStats, winRate: Math.round(winRate),
      noMistakes, minorMistakes, moderateMistakes, majorMistakes,
      bestGrade: grades.sort()[0] || '-', worstGrade: grades.sort().reverse()[0] || '-',
    }
  }, [analyzed])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-600 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-neutral-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!stats || analyzed.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><BarChart3 size={18} className="text-purple-400" /></div>
            <div><h2 className="text-sm font-semibold text-neutral-200">Analytics</h2><p className="text-xs text-neutral-500">Session analysis & performance trends</p></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-neutral-600">
          <div className="text-center space-y-3">
            <BarChart3 size={40} className="mx-auto opacity-20" />
            <p className="text-sm">No analyzed hands yet</p>
            <p className="text-xs">Import and analyze hands in Hand History (⌘5) first</p>
          </div>
        </div>
      </div>
    )
  }

  const POS_LABELS = ['UTG','MP','CO','BTN','SB','BB']

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><BarChart3 size={18} className="text-purple-400" /></div>
          <div className="flex-1"><h2 className="text-sm font-semibold text-neutral-200">Analytics</h2><p className="text-xs text-neutral-500">{stats.total} hands analyzed</p></div>
          <button onClick={loadData} className="text-xs text-neutral-500 hover:text-neutral-300">Refresh</button>
        </div>
        <div className="flex gap-1 bg-[#0F141C] rounded-lg p-0.5 w-fit ring-1 ring-white/[0.03]">
          {([
            { id: 'overview' as const, icon: Activity, label: 'Overview' },
            { id: 'positions' as const, icon: Target, label: 'Positions' },
            { id: 'streets' as const, icon: PieChart, label: 'Distribution' },
          ]).map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={cn('px-3 py-1.5 text-[11px] rounded-md font-medium transition-all flex items-center gap-1.5',
                view === v.id ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300')}>
              <v.icon size={11} /> {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {view === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Top stats row */}
            <div className="grid grid-cols-5 gap-3">
              <KPI icon={BarChart3} label="Hands" value={stats.total} color="text-blue-400" />
              <KPI icon={TrendingDown} label="Total EV Lost" value={`${stats.totalEV}bb`} color="text-red-400" />
              <KPI icon={Target} label="Avg EV/Hand" value={`${stats.avgEV}bb`} color="text-amber-400" />
              <KPI icon={TrendingUp} label="Win Rate" value={`${stats.winRate}%`} color="text-emerald-400" />
              <KPI icon={Zap} label="Best/Worst" value={`${stats.bestGrade}/${stats.worstGrade}`} color="text-purple-400" />
            </div>

            {/* Grade distribution */}
            <div className="bg-[#090D14] rounded-2xl border border-[#152233] p-5">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Grade Distribution</h3>
              <div className="space-y-2">
                {['A','B','C','D','F'].map(g => {
                  const count = stats.gradeDist[g] || 0
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                  const color = g === 'A' ? 'bg-emerald-500' : g === 'B' ? 'bg-blue-500' : g === 'C' ? 'bg-amber-500' : g === 'D' ? 'bg-orange-500' : 'bg-red-500'
                  return (
                    <div key={g} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-neutral-300 w-6">{g}</span>
                      <div className="flex-1 h-5 bg-[#0F141C] rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-xs text-neutral-500 w-16 text-right">{count} ({Math.round(pct)}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mistake severity */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats.noMistakes}</div>
                <div className="text-[10px] text-neutral-500 mt-1">0 Mistakes</div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.minorMistakes}</div>
                <div className="text-[10px] text-neutral-500 mt-1">1-2 Mistakes</div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">{stats.moderateMistakes}</div>
                <div className="text-[10px] text-neutral-500 mt-1">3-5 Mistakes</div>
              </div>
              <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.majorMistakes}</div>
                <div className="text-[10px] text-neutral-500 mt-1">5+ Mistakes</div>
              </div>
            </div>
          </div>
        )}

        {view === 'positions' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Performance by Position</h3>
            <div className="space-y-2">
              {Object.entries(stats.posStats).map(([pos, data]) => {
                const avgEV = data.hands > 0 ? Math.round(data.evLost / data.hands * 100) / 100 : 0
                const wr = data.hands > 0 ? Math.round(data.won / data.hands * 100) : 0
                const maxEV = Math.max(...Object.values(stats.posStats).map(d => d.hands > 0 ? d.evLost / d.hands : 0), 1)
                const evBar = (avgEV / maxEV) * 100

                return (
                  <div key={pos} className="bg-[#090D14] border border-[#152233] rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-neutral-200 w-10">{POS_LABELS[Number(pos)]}</span>
                      <span className="text-[10px] text-neutral-500">{data.hands} hands</span>
                      <span className={cn('text-[10px] font-medium', wr >= 50 ? 'text-emerald-400' : 'text-red-400')}>
                        WR {wr}%
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-neutral-500">Avg EV Lost</span>
                        <span className="text-red-400">{avgEV}bb/hand</span>
                      </div>
                      <div className="h-2 bg-[#0F141C] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full" style={{ width: `${Math.min(evBar, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'streets' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Mistake Distribution</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-5">
                <h4 className="text-xs font-semibold text-neutral-300 mb-4 flex items-center gap-2"><PieChart size={13} className="text-purple-400" /> By Severity</h4>
                <div className="space-y-2">
                  {[
                    { l: '0 mistakes', v: stats.noMistakes, c: 'bg-emerald-500', t: 'text-emerald-400' },
                    { l: '1-2 mistakes', v: stats.minorMistakes, c: 'bg-blue-500', t: 'text-blue-400' },
                    { l: '3-5 mistakes', v: stats.moderateMistakes, c: 'bg-amber-500', t: 'text-amber-400' },
                    { l: '5+ mistakes', v: stats.majorMistakes, c: 'bg-red-500', t: 'text-red-400' },
                  ].map(item => {
                    const max = Math.max(stats.noMistakes, stats.minorMistakes, stats.moderateMistakes, stats.majorMistakes, 1)
                    return (
                      <div key={item.l} className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 w-20">{item.l}</span>
                        <div className="flex-1 h-4 bg-[#0F141C] rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', item.c)} style={{ width: `${(item.v / max) * 100}%` }} />
                        </div>
                        <span className={cn('text-[10px] font-bold', item.t)}>{item.v}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-5">
                <h4 className="text-xs font-semibold text-neutral-300 mb-4 flex items-center gap-2"><Activity size={13} className="text-blue-400" /> Session Summary</h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Hands Analyzed</span>
                    <span className="text-neutral-200 font-bold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Clean Hands (0 mistakes)</span>
                    <span className="text-emerald-400 font-bold">{stats.noMistakes} ({stats.total > 0 ? Math.round(stats.noMistakes / stats.total * 100) : 0}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Hands with Mistakes</span>
                    <span className="text-red-400 font-bold">{stats.total - stats.noMistakes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total EV Wasted</span>
                    <span className="text-red-400 font-bold">{stats.totalEV}bb</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Win Rate</span>
                    <span className={cn('font-bold', stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400')}>{stats.winRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
      <Icon size={14} className={cn('mx-auto mb-1.5', color)} />
      <div className={cn('text-xl font-bold', color)}>{value}</div>
      <div className="text-[9px] text-neutral-500 mt-0.5">{label}</div>
    </div>
  )
}
