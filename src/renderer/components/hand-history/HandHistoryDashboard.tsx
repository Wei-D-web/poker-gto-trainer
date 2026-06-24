import { useState, useEffect, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { useToastStore } from '../../stores/toastStore'
import type { HandHistorySummary, HandHistoryStats } from '../../../../src/shared/types/hand-history'
import {
  Upload, Zap, Trash2, TrendingDown, Target, BarChart3,
  CheckCircle, AlertTriangle, FileText, RefreshCw, BookOpen, Download,
} from 'lucide-react'

export function HandHistoryDashboard() {
  const addToast = useToastStore((s) => s.addToast)
  const [hands, setHands] = useState<HandHistorySummary[]>([])
  const [stats, setStats] = useState<HandHistoryStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [importText, setImportText] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [listResult, statsResult] = await Promise.all([
        window.electronAPI.handHistory.list({ limit: 50 }),
        window.electronAPI.handHistory.getStats(),
      ])
      setHands(listResult.hands)
      setTotal(listResult.total)
      setStats(statsResult)
    } catch (e) {
      console.error('Failed to load:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleImportText = async () => {
    if (!importText.trim()) return
    const result = await window.electronAPI.handHistory.importFromText({ text: importText })
    if (result.success) {
      addToast({ type: 'success', message: `Imported ${result.count || 1} hand(s)` })
      setImportText('')
      setShowImportModal(false)
      loadData()
    } else {
      addToast({ type: 'error', message: result.error || 'Import failed' })
    }
  }

  const handleImportFile = async () => {
    const result = await window.electronAPI.handHistory.importFromFile()
    if (result.success) {
      addToast({ type: 'success', message: `Imported ${result.count} hand(s)` })
      loadData()
    } else if (result.errors?.length > 0) {
      addToast({ type: 'warning', message: result.errors[0] })
    }
  }

  const handleBatchAnalyze = async () => {
    setAnalyzing(true)
    try {
      const result = await window.electronAPI.handHistory.batchAnalyze({
        allUnanalyzed: selectedIds.size === 0,
        ids: selectedIds.size > 0 ? [...selectedIds] : undefined,
      })
      const succeeded = result.results.filter((r: any) => r.success).length
      addToast({ type: 'success', message: `Analyzed ${succeeded} hand(s)` })
      loadData()
    } catch (e) {
      addToast({ type: 'error', message: 'Analysis failed' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleExportPDF = async () => {
    const ids = selectedIds.size > 0 ? [...selectedIds] : hands.map(h => h.id)
    if (ids.length === 0) return
    const result = await window.electronAPI.report.exportPDF({ ids })
    if (result.success) {
      addToast({ type: 'success', message: `Report saved!` })
    } else if (result.error !== 'Cancelled') {
      addToast({ type: 'error', message: result.error || 'Export failed' })
    }
  }

  const handleDelete = async (ids: string[]) => {
    await window.electronAPI.handHistory.delete(ids)
    setSelectedIds(new Set())
    addToast({ type: 'info', message: `Deleted ${ids.length} hand(s)` })
    loadData()
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const getGradeColor = (g: string) => {
    if (g.startsWith('A')) return 'text-emerald-400'
    if (g.startsWith('B')) return 'text-blue-400'
    if (g.startsWith('C')) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <BookOpen size={18} className="text-cyan-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-200">Hand History</h2>
            <p className="text-xs text-neutral-500">Import PokerStars/GG hand histories & batch analyze vs GTO</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportFile}
              className="px-3 py-1.5 text-xs font-semibold bg-cyan-500/8 hover:bg-cyan-500/12 text-cyan-400 rounded-lg transition-colors border border-cyan-500/15 flex items-center gap-1.5"
            >
              <Upload size={11} /> Import File
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-500/8 hover:bg-blue-500/12 text-blue-400 rounded-lg transition-colors border border-blue-500/15 flex items-center gap-1.5"
            >
              <FileText size={11} /> Paste Text
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-6">
            <StatCard icon={BarChart3} label="Total Hands" value={stats.totalHands} color="text-blue-400" />
            <StatCard icon={CheckCircle} label="Analyzed" value={stats.analyzedCount} color="text-emerald-400" />
            <StatCard icon={AlertTriangle} label="Unanalyzed" value={stats.unanalyzedCount} color="text-amber-400" />
            <StatCard icon={TrendingDown} label="Total EV Lost" value={`${stats.totalEVLost}bb`} color="text-red-400" />
            <StatCard icon={Target} label="Avg Grade" value={stats.averageGrade} color={getGradeColor(stats.averageGrade)} />
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{total} hands total</span>
            {selectedIds.size > 0 && (
              <span className="text-xs text-blue-400">{selectedIds.size} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={hands.length === 0}
              className="px-3 py-1.5 text-xs font-medium bg-blue-500/8 hover:bg-blue-500/12 text-blue-400 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-30"
            >
              <Download size={11} /> Export PDF
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => handleDelete([...selectedIds])}
                className="px-3 py-1.5 text-xs font-medium bg-red-500/8 hover:bg-red-500/12 text-red-400 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={11} /> Delete
              </button>
            )}
            <button
              onClick={handleBatchAnalyze}
              disabled={analyzing}
              className="px-3 py-1.5 text-xs font-semibold bg-purple-500/8 hover:bg-purple-500/12 text-purple-400 rounded-lg transition-colors border border-purple-500/15 flex items-center gap-1.5 disabled:opacity-40"
            >
              {analyzing ? (
                <RefreshCw size={11} className="animate-spin" />
              ) : (
                <Zap size={11} />
              )}
              {selectedIds.size > 0 ? `Analyze ${selectedIds.size} Selected` : 'Analyze All'}
            </button>
            <button onClick={loadData} className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Hands table */}
        {hands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-600 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
              <Upload size={28} className="opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No hand histories yet</p>
              <p className="text-xs opacity-60 mt-1">Click "Import File" or "Paste Text" to get started</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#090D14] rounded-xl border border-[#152233] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#152233] bg-[#0B1019]/50">
                  <th className="w-8 px-3 py-2.5">
                    <input type="checkbox" onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(hands.map(h => h.id)))
                      else setSelectedIds(new Set())
                    }} className="rounded" />
                  </th>
                  <th className="text-left px-3 py-2.5 text-neutral-500 font-semibold">Hand</th>
                  <th className="text-left px-3 py-2.5 text-neutral-500 font-semibold">Board</th>
                  <th className="text-center px-3 py-2.5 text-neutral-500 font-semibold">Pos</th>
                  <th className="text-right px-3 py-2.5 text-neutral-500 font-semibold">Pot</th>
                  <th className="text-center px-3 py-2.5 text-neutral-500 font-semibold">Result</th>
                  <th className="text-center px-3 py-2.5 text-neutral-500 font-semibold">Mistakes</th>
                  <th className="text-center px-3 py-2.5 text-neutral-500 font-semibold">EV Lost</th>
                  <th className="text-center px-3 py-2.5 text-neutral-500 font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody>
                {hands.map((hand) => (
                  <tr
                    key={hand.id}
                    className={cn(
                      'border-b border-[#152233]/50 hover:bg-white/[0.02] transition-colors',
                      selectedIds.has(hand.id) && 'bg-blue-500/[0.04]',
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(hand.id)}
                        onChange={() => toggleSelect(hand.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-neutral-200 font-mono font-bold">
                        {hand.heroHand.join(' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-neutral-400 font-mono text-[10px]">
                        {hand.board.length > 0 ? hand.board.join(' ') : 'Preflop'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-neutral-400">{['UTG','MP','CO','BTN','SB','BB'][hand.heroPosition] || '-'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-neutral-400">{hand.potSize}bb</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        hand.heroWon === null
                          ? 'bg-neutral-500/10 text-neutral-400'
                          : hand.heroWon
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400',
                      )}>
                        {hand.heroWon === null ? '?' : hand.heroWon ? 'Won' : 'Lost'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        'font-medium',
                        hand.totalMistakes === 0 ? 'text-emerald-400' : 'text-amber-400',
                      )}>
                        {hand.analyzed ? hand.totalMistakes : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={hand.totalEVLost > 0 ? 'text-red-400' : 'text-neutral-400'}>
                        {hand.analyzed ? `${hand.totalEVLost}bb` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn('font-bold text-xs', getGradeColor(hand.grade))}>
                        {hand.analyzed ? hand.grade : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowImportModal(false)}>
          <div className="bg-[#0B1019] border border-[#1C2A3D] rounded-2xl p-6 w-[600px] shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-neutral-200 mb-4">Paste Hand History</h3>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="Paste PokerStars or GG Poker hand history text here..."
              className="w-full h-64 bg-[#06090F] border border-[#1C2A3D] rounded-xl p-4 text-xs text-neutral-200 font-mono resize-none focus:outline-none focus:border-blue-500/50"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportText}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className={color} />
        <span className="text-[10px] text-neutral-500 font-medium">{label}</span>
      </div>
      <div className={cn('text-xl font-bold', color)}>{value}</div>
    </div>
  )
}
