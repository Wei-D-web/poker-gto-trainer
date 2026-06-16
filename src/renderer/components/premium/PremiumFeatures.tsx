import { useState, useEffect, useMemo } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS, type Position, type ComboKey } from '@shared/types/poker'
import { preflopEquity } from '../../../../src/main/solver/equity-calculator'
import { RangeMatrix } from '../matrix/RangeMatrix'
import { cn } from '../../lib/utils'
import { useToastStore } from '../../stores/toastStore'
import { useAuth, type SubscriptionTier } from '../../contexts/AuthContext'
import { STRIPE_PRICES, redirectToCheckout } from '../../lib/stripe'
import {
  Zap, Calendar, TrendingUp, Download, FileJson, Image, FileSpreadsheet,
  Flame, Trophy, Target, RotateCcw, BarChart3, ArrowUp, AlertTriangle,
  GitCompare, Crosshair, Shield, User, UserX, Crown, CreditCard, RefreshCw,
  Check, ExternalLink, Mail, Clock,
} from 'lucide-react'

/* ================================================================
   TAB SWITCHER
   ================================================================ */

type TabId = 'drills' | 'lab' | 'comparison' | 'exploit' | 'progress' | 'export' | 'pricing'

export function PremiumFeatures() {
  const [tab, setTab] = useState<TabId>('drills')

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Zap size={18} className="text-amber-400" />
          </div>
          <div className="flex-1"><h2 className="text-sm font-semibold text-neutral-200">Premium</h2><p className="text-xs text-neutral-500">Advanced training & tools</p></div>
        </div>
        <div className="flex gap-1 bg-[#0F141C] rounded-lg p-0.5 w-fit ring-1 ring-white/[0.03]">
          {([
            { id: 'drills' as const, icon: Flame, label: 'Daily Drills' },
            { id: 'lab' as const, icon: Zap, label: 'Strategy Lab' },
            { id: 'comparison' as const, icon: GitCompare, label: 'Cash vs MTT' },
            { id: 'exploit' as const, icon: Crosshair, label: '剥削顾问' },
            { id: 'progress' as const, icon: TrendingUp, label: 'Progress' },
            { id: 'export' as const, icon: Download, label: 'Export' },
            { id: 'pricing' as const, icon: Crown, label: '升级' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-3 py-1.5 text-[11px] rounded-md font-medium transition-all flex items-center gap-1.5',
                tab === t.id ? 'bg-amber-500/12 text-amber-400' : 'text-neutral-500 hover:text-neutral-300')}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'drills' && <DailyDrills />}
        {tab === 'lab' && <StrategyLab />}
        {tab === 'comparison' && <CashVsMttPreview />}
        {tab === 'exploit' && <ExploitAdvisorPreview />}
        {tab === 'progress' && <ProgressTracker />}
        {tab === 'export' && <ExportPanel />}
        {tab === 'pricing' && <PricingView />}
      </div>
    </div>
  )
}

/* ================================================================
   DAILY DRILLS — Gamified daily GTO challenge
   ================================================================ */

const DAILY_SCENARIOS = [
  { position: 'BTN vs BB', heroPos: 3, vilPos: 5, depth: 100, street: 'preflop' },
  { position: 'CO vs BTN', heroPos: 2, vilPos: 3, depth: 100, street: 'flop' },
  { position: 'UTG vs BB', heroPos: 0, vilPos: 5, depth: 100, street: 'preflop' },
  { position: 'SB vs BB', heroPos: 4, vilPos: 5, depth: 50, street: 'preflop' },
  { position: 'BTN vs BB', heroPos: 3, vilPos: 5, depth: 30, street: 'preflop' },
]

interface DrillQuestion {
  hand: ComboKey; position: string; scenario: string
  options: string[]; correctIdx: number; explanation: string
}

function generateDrills(): DrillQuestion[] {
  const hands: ComboKey[] = ['AA','AKs','KK','QQ','A5s','JTs','KQo','88','T9s','A2s','72o','KJo']
  return DAILY_SCENARIOS.map((s, i) => {
    const hand = hands[(i * 3 + new Date().getDate()) % hands.length]
    if (s.depth >= 100 && (hand === 'AA' || hand === 'KK' || hand === 'AKs')) {
      return { hand, position: s.position, scenario: `You're in ${s.position}. ${hand}. Action?`, options: ['Open 2.5bb','Limp','Fold','All-in'], correctIdx: 0, explanation: `${hand} is a premium open from any position. Standard 2.5bb open.` }
    }
    if (s.depth <= 30 && hand === 'A5s') {
      return { hand, position: s.position, scenario: `Short stack (30bb). ${s.position}. ${hand}. Action?`, options: ['Open 2bb','Open 2.5bb','Fold','Jam 30bb'], correctIdx: 3, explanation: 'A5s is a great short-stack jam hand from late position (30bb). Blocks AK/AQ.' }
    }
    if (hand === '72o') {
      return { hand, position: s.position, scenario: `${s.position}. You're dealt 72o. Action?`, options: ['Open','Limp','Fold','3-bet'], correctIdx: 2, explanation: '72o is the worst hand in poker. Always fold preflop from any position.' }
    }
    if (hand === 'JTs' || hand === 'T9s') {
      return { hand, position: s.position, scenario: `${s.position} with ${hand} at ${s.depth}bb. Action?`, options: ['Open 2.5bb','Fold','Limp','3-bet'], correctIdx: 0, explanation: `${hand} is a standard open from most positions at 100bb. Good playability postflop.` }
    }
    return { hand, position: s.position, scenario: `${s.position}. ${hand} at ${s.depth}bb. Action?`, options: ['Open 2.5bb','Fold','Limp','Call'], correctIdx: 0, explanation: 'Standard open with this hand from this position.' }
  })
}

function DailyDrills() {
  const today = new Date().toLocaleDateString()
  const storageKey = `drills_${today}`
  const streakKey = 'drill_streak'

  const [drills, setDrills] = useState<DrillQuestion[]>(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) return JSON.parse(saved) } catch {}
    return generateDrills()
  })
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [streak, setStreak] = useState(() => { try { return parseInt(localStorage.getItem(streakKey) || '0') } catch { return 0 } })

  useEffect(() => {
    if (drills.length > 0) localStorage.setItem(storageKey, JSON.stringify(drills))
  }, [drills])

  const score = Object.entries(answers).filter(([i, a]) => drills[Number(i)]?.correctIdx === a).length
  const allAnswered = Object.keys(answers).length === drills.length

  const handleSubmit = () => {
    setSubmitted(true)
    if (score === drills.length) {
      const newStreak = streak + 1
      setStreak(newStreak)
      localStorage.setItem(streakKey, String(newStreak))
    } else {
      setStreak(0)
      localStorage.setItem(streakKey, '0')
    }
  }

  const resetDrills = () => {
    const fresh = generateDrills()
    setDrills(fresh); setAnswers({}); setSubmitted(false)
    localStorage.setItem(storageKey, JSON.stringify(fresh))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Streak display */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-full px-5 py-2">
          <Flame size={18} className={cn(streak > 0 ? 'text-amber-400' : 'text-neutral-600')} />
          <span className="text-sm font-bold text-amber-400">{streak} day streak</span>
          {streak >= 7 && <Trophy size={16} className="text-amber-400" />}
          {streak >= 30 && <span className="text-xs text-amber-400">🔥 Legend</span>}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {drills.map((d, i) => {
          const answered = i in answers
          const correct = answered && answers[i] === d.correctIdx
          return (
            <div key={i} className={cn(
              'bg-[#090D14] rounded-2xl border p-5 transition-all',
              submitted && correct ? 'border-emerald-500/30 bg-emerald-500/[0.03]' :
              submitted && answered ? 'border-red-500/30 bg-red-500/[0.03]' :
              'border-[#152233]',
            )}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 ring-1 ring-white/[0.05]">#{i + 1}</span>
                <span className="text-xs text-neutral-300 font-medium">{d.scenario}</span>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {d.options.map((opt, oi) => {
                  const isSelected = answers[i] === oi
                  const isCorrect = oi === d.correctIdx
                  return (
                    <button key={oi}
                      onClick={() => { if (!submitted) setAnswers(prev => ({ ...prev, [i]: oi })) }}
                      className={cn('px-3 py-1.5 text-xs rounded-lg font-medium transition-all border',
                        submitted && isCorrect ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                        submitted && isSelected && !isCorrect ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        isSelected ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        'bg-[#0F141C] border-transparent text-neutral-400 hover:border-[#1C2A3D]',
                      )}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {submitted && (
                <p className={cn('text-[10px] leading-relaxed', correct ? 'text-emerald-400/80' : 'text-red-400/80')}>
                  {correct ? '✅ ' : '❌ '}{d.explanation}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 justify-center">
        {!submitted ? (
          <button onClick={handleSubmit} disabled={!allAnswered}
            className="px-8 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-40">
            Submit ({Object.keys(answers).length}/{drills.length})
          </button>
        ) : (
          <div className="text-center space-y-3">
            <div className={cn('text-lg font-bold', score === drills.length ? 'text-emerald-400' : score >= 3 ? 'text-amber-400' : 'text-red-400')}>
              {score}/{drills.length} correct
              {score === drills.length ? ' 🎉 Perfect!' : score >= 3 ? ' 👍 Good!' : ''}
            </div>
            <button onClick={resetDrills} className="px-4 py-2 text-xs bg-[#0F141C] hover:bg-[#151B28] text-neutral-300 rounded-lg transition-colors flex items-center gap-1.5 mx-auto">
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   STRATEGY LAB — Full postflop strategy browser
   ================================================================ */

function StrategyLab() {
  const { heroPosition, villainPosition, stackDepth } = useScenarioStore()
  const [board, setBoard] = useState('As 7d 2c')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    setLoading(true)
    try {
      const r = await window.electronAPI.strategy.analyzePostflop({
        board: board.split(' '), heroPosition, villainPosition, stackDepth,
      })
      setResult(r)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const TEXTURES = [
    'As 7d 2c','Ah Qd 3s','Kh 9h 4h','Qh Qd 5c','Jd Td 9s',
    'Ad Kc Jh','9h 8d 7c','Ah Kh Th','Ks Jd 6h','7h 6d 2c',
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <input type="text" value={board} onChange={e => setBoard(e.target.value)}
            className="flex-1 bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2 text-sm text-neutral-200 font-mono focus:outline-none focus:border-blue-500/50"
            placeholder="Board (e.g. As 7d 2c)" />
          <button onClick={analyze} disabled={loading}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5">
            <Zap size={12} />{loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* Quick texture buttons */}
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[9px] text-neutral-600 self-center mr-1">Quick:</span>
          {TEXTURES.map(t => (
            <button key={t} onClick={() => setBoard(t)}
              className={cn('px-2 py-1 text-[10px] rounded-md transition-all font-mono',
                board === t ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/20' : 'bg-[#0F141C] text-neutral-400 hover:text-neutral-300')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Strategy table */}
          <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 size={12} /> Full Strategy Breakdown — {board}
            </h3>

            {/* Overall stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { l: 'C-bet Freq', v: `${Math.round((result.overallCbetFreq || 0.5) * 100)}%`, c: 'text-amber-400' },
                { l: 'Check Freq', v: `${Math.round(((1 - (result.overallCbetFreq || 0.5)) * 100))}%`, c: 'text-blue-400' },
                { l: 'Rec Sizing', v: result.recommendedSizing || '50%', c: 'text-purple-400' },
                { l: 'Position', v: result.isHeroIP ? 'IP ✅' : 'OOP ⚠️', c: result.isHeroIP ? 'text-emerald-400' : 'text-red-400' },
              ].map(s => (
                <div key={s.l} className="bg-[#0B1019] rounded-xl p-3 text-center border border-[#152233]">
                  <div className={cn('text-lg font-bold', s.c)}>{s.v}</div>
                  <div className="text-[9px] text-neutral-500">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Action distribution by hand type */}
            {result.combos && (
              <div>
                <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">By Hand Category</h4>
                <div className="grid grid-cols-2 gap-1.5 max-h-[400px] overflow-y-auto">
                  {result.combos.slice(0, 40).map((c: any, i: number) => {
                    const primaryAction = c.actions?.[0]
                    const betFreq = c.actions?.find((a: any) => a.action?.includes('bet'))?.frequency || 0
                    const checkFreq = c.actions?.find((a: any) => a.action === 'check')?.frequency || 0
                    return (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0B1019] border border-[#152233]/50 text-[11px]">
                        <span className="text-neutral-300 font-mono font-bold w-12">{c.comboKey}</span>
                        <span className="text-neutral-600 text-[9px] w-14">{c.handType || '??'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 text-[9px]">EQ {(c.equity * 100).toFixed(0)}%</span>
                          {betFreq > 0.3 && <span className="text-amber-400 font-bold">{Math.round(betFreq * 100)}% bet</span>}
                          {checkFreq > 0.3 && <span className="text-blue-400 font-medium">{Math.round(checkFreq * 100)}% chk</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   PROGRESS TRACKER
   ================================================================ */

interface ProgressEntry { date: string; handsPlayed: number; avgGrade: string; avgEVLost: number; winRate: number }

function ProgressTracker() {
  const [entries, setEntries] = useState<ProgressEntry[]>(() => {
    try { const s = localStorage.getItem('progress_history'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [todayHands, setTodayHands] = useState(0)

  const loadToday = async () => {
    try {
      const r = await window.electronAPI.handHistory.list({ limit: 500 })
      const today = new Date().toDateString()
      const todayHandsList = r.hands.filter((h: any) => new Date(h.createdAt).toDateString() === today && h.analyzed)
      setTodayHands(todayHandsList.length)

      const avgEV = todayHandsList.length > 0 ? todayHandsList.reduce((s: number, h: any) => s + h.totalEVLost, 0) / todayHandsList.length : 0
      const newEntry: ProgressEntry = {
        date: new Date().toLocaleDateString(),
        handsPlayed: todayHandsList.length,
        avgGrade: todayHandsList.length > 0 ? todayHandsList.sort((a: any, b: any) => (a.grade || '').localeCompare(b.grade || ''))[Math.floor(todayHandsList.length / 2)]?.grade || '-' : '-',
        avgEVLost: Math.round(avgEV * 100) / 100,
        winRate: todayHandsList.length > 0 ? Math.round(todayHandsList.filter((h: any) => h.heroWon).length / todayHandsList.length * 100) : 0,
      }

      setEntries(prev => {
        const filtered = prev.filter(e => e.date !== newEntry.date)
        const updated = [...filtered, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-30)
        localStorage.setItem('progress_history', JSON.stringify(updated))
        return updated
      })
    } catch {}
  }

  useEffect(() => { loadToday() }, [])

  const maxEV = Math.max(...entries.map(e => e.avgEVLost), 0.01)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">30-Day Progress</h3>
        <button onClick={loadToday} className="text-[10px] text-neutral-500 hover:text-neutral-300">
          Refresh
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <TrendingUp size={40} className="mx-auto opacity-20 mb-3" />
          <p className="text-sm">No progress data yet</p>
          <p className="text-xs mt-1">Analyze hands daily to track improvement</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{entries.reduce((s, e) => s + e.handsPlayed, 0)}</div>
              <div className="text-[9px] text-neutral-500">Total Hands</div>
            </div>
            <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{entries.length}</div>
              <div className="text-[9px] text-neutral-500">Days Tracked</div>
            </div>
            <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{todayHands}</div>
              <div className="text-[9px] text-neutral-500">Today</div>
            </div>
          </div>

          {/* Chart (simple bar) */}
          <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-5">
            <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-4">EV Lost per Day</h4>
            <div className="flex items-end gap-1 h-32">
              {entries.map((e, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div className="w-full bg-gradient-to-t from-red-500/60 to-red-400/40 rounded-t-sm transition-all hover:from-red-500 hover:to-red-400"
                    style={{ height: `${Math.max(4, (e.avgEVLost / maxEV) * 100)}%` }} />
                  <div className="absolute -bottom-6 text-[8px] text-neutral-600 rotate-45 origin-left whitespace-nowrap hidden group-hover:block">
                    {e.date.slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-8 text-[9px] text-neutral-600">
              <span>{entries[0]?.date}</span>
              <span>{entries[entries.length - 1]?.date}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   EXPORT SYSTEM
   ================================================================ */

function ExportPanel() {
  const addToast = useToastStore(s => s.addToast)
  const [selectedHands, setSelectedHands] = useState<any[]>([])

  const loadForExport = async () => {
    try {
      const r = await window.electronAPI.handHistory.list({ limit: 500 })
      setSelectedHands(r.hands.filter((h: any) => h.analyzed))
    } catch {}
  }

  useEffect(() => { loadForExport() }, [])

  const exportJSON = () => {
    const data = JSON.stringify(selectedHands.map(h => ({
      id: h.id, heroHand: h.heroHand, board: h.board, grade: h.grade,
      totalEVLost: h.totalEVLost, mistakes: h.totalMistakes, position: h.heroPosition,
    })), null, 2)
    downloadFile(data, `poker-gto-hands-${Date.now()}.json`, 'application/json')
    addToast({ type: 'success', message: `Exported ${selectedHands.length} hands as JSON` })
  }

  const exportCSV = () => {
    const header = 'id,hero_hand,board,grade,ev_lost,mistakes,position,result\n'
    const rows = selectedHands.map(h =>
      `${h.id},${(h.heroHand || []).join('-')},${(h.board || []).join('-')},${h.grade},${h.totalEVLost},${h.totalMistakes},${h.heroPosition},${h.heroWon ? 'Won' : 'Lost'}`
    ).join('\n')
    downloadFile(header + rows, `poker-gto-hands-${Date.now()}.csv`, 'text/csv')
    addToast({ type: 'success', message: `Exported ${selectedHands.length} hands as CSV` })
  }

  const exportRangeJSON = () => {
    const data = { format: 'pokergto-range-v1', exportDate: new Date().toISOString(), hands: selectedHands.length }
    downloadFile(JSON.stringify(data, null, 2), `pokergto-range-${Date.now()}.json`, 'application/json')
    addToast({ type: 'success', message: 'Range exported' })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-neutral-200 mb-2">Export Hand Histories</h3>
        <p className="text-xs text-neutral-500 mb-4">{selectedHands.length} analyzed hands available for export</p>

        <div className="grid gap-3">
          <ExportCard icon={FileJson} label="Export as JSON" desc={`${selectedHands.length} hands in structured JSON format`} color="text-blue-400" onClick={exportJSON} />
          <ExportCard icon={FileSpreadsheet} label="Export as CSV" desc="Open in Excel/Google Sheets for custom analysis" color="text-emerald-400" onClick={exportCSV} />
          <ExportCard icon={Image} label="Export Range JSON" desc="Range data in portable format (compatible with analysis tools)" color="text-purple-400" onClick={exportRangeJSON} />
        </div>
      </div>

      <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-neutral-200 mb-2">Export Current Strategy</h3>
        <p className="text-xs text-neutral-500 mb-4">Export the current range matrix as a screenshot or data file</p>
        <button onClick={() => {
          const el = document.querySelector('.range-matrix-container')
          if (el) {
            import('../../lib/export-utils').then(({ exportAsJSON }) => {
              exportAsJSON({ screenshot: 'range-matrix' }, `pokergto-range-${Date.now()}.json`)
              addToast({ type: 'info', message: 'Exported range data' })
            })
          }
        }}
          className="px-4 py-2 text-xs font-semibold bg-amber-500/8 hover:bg-amber-500/12 text-amber-400 rounded-lg transition-colors border border-amber-500/15 flex items-center gap-1.5">
          <Download size={12} /> Export Range Data
        </button>
      </div>
    </div>
  )
}

/* ================================================================
   CASH VS MTT PREVIEW — Premium feature teaser
   ================================================================ */

function CashVsMttPreview() {
  const CONCEPTS = [
    { title: '线性范围 vs 极化范围', cash: 'Cash: value和bluff用相似尺度 (33-75%)，最大化EV', mtt: 'MTT: value大尺度(75-100%), bluff小尺度(33%)，降低ICM风险' },
    { title: '范围优势 vs ICM压力', cash: 'Cash: 翻前加注者高频小额cbet (~72%)，无生存压力', mtt: 'MTT: ICM压力降低cbet频率 (~65%)，每个筹码都珍贵' },
    { title: '价值导向 vs 生存导向', cash: 'Cash: 每个+EV决策直接转化为利润，深码可玩tricky', mtt: 'MTT: 不是所有+cEV都是+$EV，泡沫期避免高波动' },
    { title: '隐含赔率 vs 反隐含赔率', cash: 'Cash深码(>150bb): suited connectors价值上升', mtt: 'MTT浅码(<30bb): 小对子失去set-mining价值' },
    { title: 'Ante效应 (仅MTT)', cash: 'Cash无ante，底池=1.5bb', mtt: 'MTT有ante(0.1bb)，底池=2.3bb，BB防守更宽+5-8%' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/15 rounded-full px-5 py-2">
          <GitCompare size={18} className="text-indigo-400" />
          <span className="text-sm font-bold text-indigo-400">Cash vs MTT 策略对比</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">Premium</span>
        </div>
        <p className="text-xs text-neutral-500 mt-3">同一场景下，现金局与锦标赛的 GTO 策略有显著差异。理解这些差异是成为完整牌手的关键。</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/[0.04] rounded-xl p-4 border border-emerald-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-emerald-400">Cash Game</span>
            <span className="text-[9px] text-emerald-500/60 ml-auto">100bb deep</span>
          </div>
          <ul className="space-y-2 text-[11px] text-neutral-400">
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">•</span> 线性范围 — value和bluff用相似尺度</li>
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">•</span> 宽LP开池 — BTN可开~40%范围</li>
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">•</span> 低频check-raise — 线性范围少极化</li>
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">•</span> 深码隐含赔率 — suited connectors+15%</li>
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">•</span> 无ICM压力 — thin value bet middle pair</li>
          </ul>
        </div>
        <div className="bg-purple-500/[0.04] rounded-xl p-4 border border-purple-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs font-bold text-purple-400">MTT (Tournament)</span>
            <span className="text-[9px] text-purple-500/60 ml-auto">ante 0.1bb</span>
          </div>
          <ul className="space-y-2 text-[11px] text-neutral-400">
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span> 极化范围 — value大尺度, bluff小尺度</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span> 紧EP开池 — ICM迫使UTG收紧10-15%</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span> 高频check-raise — 保护手牌+极化</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span> 浅码push/fold — high card价值上升</li>
            <li className="flex items-start gap-1.5"><span className="text-purple-400 mt-0.5">•</span> ICM敏感 — 泡沫期避免coin-flip</li>
          </ul>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">核心概念差异</h4>
        {CONCEPTS.map(c => (
          <div key={c.title} className="bg-[#090D14] border border-[#152233] rounded-xl p-4 grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-400 font-semibold">{c.title}</span>
              <p className="text-[11px] text-neutral-400">{c.cash}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-purple-400 font-semibold">{c.title}</span>
              <p className="text-[11px] text-neutral-400">{c.mtt}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/15 text-center">
        <p className="text-xs text-neutral-300">
          💡 <b>Pro 提示:</b> 在完整版中使用 <b>Cash vs MTT</b> 页面，选择任意翻牌，实时对比两种模式下的 c-bet 频率、sizing 建议和 per-combo 策略差异。
        </p>
      </div>
    </div>
  )
}

/* ================================================================
   EXPLOIT ADVISOR PREVIEW — Premium feature teaser
   ================================================================ */

function ExploitAdvisorPreview() {
  const OPPONENT_TYPES = [
    { type: 'nit', label: '岩石', desc: '极紧·只玩强牌', icon: Shield, color: 'bg-slate-500', exploit: '多偷盲·高频cbet' },
    { type: 'tag', label: '紧凶', desc: 'ABC坚实', icon: User, color: 'bg-blue-500', exploit: '极化3bet·找漏洞' },
    { type: 'lag', label: '松凶', desc: '频繁施压', icon: Zap, color: 'bg-orange-500', exploit: '设陷阱·check-raise' },
    { type: 'station', label: '跟注站', desc: '过度跟注', icon: Target, color: 'bg-green-500', exploit: 'Thin value·不诈唬' },
    { type: 'maniac', label: '疯子', desc: '疯狂激进', icon: AlertTriangle, color: 'bg-red-500', exploit: '收紧·等好牌' },
    { type: 'reg', label: '常客', desc: '接近GTO', icon: Crosshair, color: 'bg-purple-500', exploit: 'GTO基线·微调' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/15 rounded-full px-5 py-2">
          <Crosshair size={18} className="text-orange-400" />
          <span className="text-sm font-bold text-orange-400">对手剥削顾问</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Premium</span>
        </div>
        <p className="text-xs text-neutral-500 mt-3">识别 7 种对手类型，针对性地偏离 GTO 基线。Cash Game 精进必备。</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {OPPONENT_TYPES.map(opp => {
          const Icon = opp.icon
          return (
            <div key={opp.type} className="bg-[#090D14] border border-[#152233] rounded-xl p-4 hover:border-orange-500/20 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('w-3 h-3 rounded-full', opp.color)} />
                <span className="text-xs font-bold text-neutral-200">{opp.label}</span>
                <span className="text-[10px] text-neutral-500 ml-auto">{opp.desc}</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2">🎯 {opp.exploit}</p>
              <div className="w-full bg-neutral-800/30 rounded-full h-1.5">
                <div
                  className={cn('h-1.5 rounded-full', opp.color.replace('bg-', 'bg-').replace('500', '500/60'))}
                  style={{ width: `${opp.type === 'maniac' ? 85 : opp.type === 'lag' ? 65 : opp.type === 'station' ? 55 : opp.type === 'tag' ? 45 : opp.type === 'nit' ? 25 : 50}%` }}
                />
              </div>
              <span className="text-[9px] text-neutral-600 mt-1 block">激进程度</span>
            </div>
          )
        })}
      </div>

      <div className="bg-[#090D14] border border-orange-500/15 rounded-xl p-5">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target size={12} /> 剥削策略速查表
        </h4>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="bg-slate-500/[0.04] border border-slate-500/10 rounded-lg p-3">
            <span className="font-bold text-slate-400">vs 岩石 (Nit)</span>
            <ul className="mt-1.5 space-y-0.5 text-neutral-400">
              <li>• 偷盲+15%，c-bet +25%</li>
              <li>• 被反抗立即弃牌</li>
              <li>• 少设陷阱，他们不诈唬</li>
            </ul>
          </div>
          <div className="bg-green-500/[0.04] border border-green-500/10 rounded-lg p-3">
            <span className="font-bold text-green-400">vs 跟注站</span>
            <ul className="mt-1.5 space-y-0.5 text-neutral-400">
              <li>• Thin value — 中对即下注</li>
              <li>• 尺度过大一级 (75%)</li>
              <li>• 永远不 triple barrel 诈唬</li>
            </ul>
          </div>
          <div className="bg-orange-500/[0.04] border border-orange-500/10 rounded-lg p-3">
            <span className="font-bold text-orange-400">vs 松凶 (LAG)</span>
            <ul className="mt-1.5 space-y-0.5 text-neutral-400">
              <li>• Check-raise +25%，设陷阱</li>
              <li>• 更宽check-call抓诈</li>
              <li>• 4bet bluff 反制</li>
            </ul>
          </div>
          <div className="bg-red-500/[0.04] border border-red-500/10 rounded-lg p-3">
            <span className="font-bold text-red-400">vs 疯子 (Maniac)</span>
            <ul className="mt-1.5 space-y-0.5 text-neutral-400">
              <li>• 收紧到前15%，只玩好牌</li>
              <li>• Trap +50%，让他们送</li>
              <li>• 从不弃中等以上牌</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/15 text-center">
        <p className="text-xs text-neutral-300">
          💡 <b>Pro 提示:</b> 完整版支持选中任意翻牌场景，一键切换对手类型，实时查看 GTO Baseline → Exploit Adjusted 的频率偏移和 per-combo 解释。
        </p>
      </div>
    </div>
  )
}

/* ================================================================
   PRICING VIEW — Stripe Checkout Integration
   ================================================================ */

function PricingView() {
  const { user, tier } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSubscribe = async (planTier: 'pro' | 'lifetime', priceId: string) => {
    if (!priceId) {
      setError('Stripe price ID not configured.')
      return
    }
    setLoading(planTier)
    setError('')
    const result = await redirectToCheckout(priceId, planTier, user?.email)
    if (result.error) setError(result.error)
    setLoading(null)
  }

  const TIER_BADGE: Record<SubscriptionTier, string> = {
    lifetime: '当前: 终身版',
    pro: '当前: 专业版',
    free: '当前: 免费版',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Current Status */}
      <div className="text-center">
        <div className={cn(
          'inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold',
          tier === 'free' ? 'bg-neutral-500/10 border border-neutral-500/15 text-neutral-400' :
          tier === 'pro' ? 'bg-blue-500/10 border border-blue-500/15 text-blue-400' :
          'bg-amber-500/10 border border-amber-500/15 text-amber-400',
        )}>
          <Crown size={14} />
          {TIER_BADGE[tier]}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-4">
        {/* Pro Monthly */}
        <div className={cn(
          'rounded-2xl border p-5 transition-all',
          tier === 'pro' ? 'border-blue-500/30 bg-blue-500/[0.03]' : 'border-[#152233] bg-[#090D14]',
        )}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-neutral-200">专业版 · 月付</div>
              <div className="text-[10px] text-neutral-500">Pro Monthly</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-neutral-100">$29.99<span className="text-xs text-neutral-500 font-normal">/月</span></div>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {['全部 GTO 策略浏览器', 'Cash vs MTT 对比', '对手剥削顾问', '每日训练 (Daily Drills)', '手牌历史导出', '进度追踪'].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-400">
                <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe('pro', STRIPE_PRICES.proMonthly)}
            disabled={loading === 'pro' || tier === 'pro'}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading === 'pro' ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            {tier === 'pro' ? '当前方案' : '订阅 Subscribe'}
          </button>
        </div>

        {/* Pro Yearly */}
        <div className="rounded-2xl border border-[#152233] bg-[#090D14] p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-neutral-200">专业版 · 年付</div>
              <div className="text-[10px] text-neutral-500">Pro Yearly</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold mb-1 inline-block">省 $140</span>
              <div className="text-xl font-black text-emerald-400">$219<span className="text-xs text-neutral-500 font-normal">/年</span></div>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {['月付版全部功能', '优先新功能体验', '专属 Discord 频道'].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-400">
                <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe('pro', STRIPE_PRICES.proYearly)}
            disabled={loading === 'pro-yearly' || tier === 'pro' || tier === 'lifetime'}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading === 'pro-yearly' ? <RefreshCw size={14} className="animate-spin" /> : <CreditCard size={14} />}
            {tier === 'pro' || tier === 'lifetime' ? '已升级' : '订阅 Subscribe'}
          </button>
        </div>

        {/* Lifetime */}
        <div className={cn(
          'rounded-2xl border p-5 transition-all',
          tier === 'lifetime' ? 'border-amber-500/30 bg-amber-500/[0.03]' : 'border-amber-500/20 bg-amber-500/[0.02]',
        )}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-amber-400">终身版</div>
              <div className="text-[10px] text-neutral-500">Lifetime · 一次购买终身使用</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold mb-1 inline-block">最划算</span>
              <div className="text-xl font-black text-amber-400">$299<span className="text-xs text-neutral-500 font-normal">买断</span></div>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {['全部专业版功能', '终身免费更新', '无订阅过期风险', '专属终身版徽章'].map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-400">
                <Check size={11} className="text-amber-500 mt-0.5 shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe('lifetime', STRIPE_PRICES.lifetime)}
            disabled={loading === 'lifetime' || tier === 'lifetime'}
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-neutral-700 disabled:to-neutral-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 shadow-[0_2px_16px_rgba(245,158,11,0.15)]"
          >
            {loading === 'lifetime' ? <RefreshCw size={14} className="animate-spin" /> : <Crown size={14} />}
            {tier === 'lifetime' ? '当前方案' : '立即购买 Buy Now'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {/* Footer */}
      <p className="text-[10px] text-neutral-600 text-center">
        7 天免费试用 · 随时取消 · 安全支付由 <ExternalLink size={10} className="inline" /> Stripe 提供
      </p>
    </div>
  )
}

function ExportCard({ icon: Icon, label, desc, color, onClick }: { icon: any; label: string; desc: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left bg-[#0B1019] hover:bg-[#0F141C] border border-[#1C2A3D] hover:border-[#2A3B52] rounded-xl p-4 transition-all group">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.03]', color)}><Icon size={18} /></div>
        <div className="flex-1"><div className="text-sm font-semibold text-neutral-200">{label}</div><div className="text-[10px] text-neutral-500 mt-0.5">{desc}</div></div>
        <Download size={14} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
      </div>
    </button>
  )
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
