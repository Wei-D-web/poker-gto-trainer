/**
 * SessionReviewPage — 对局复盘教练 主页面
 *
 * Four tabs: 牌局列表 | 偏差热力图 | 薄弱环节 | 手牌回放器
 */
import { useEffect, useState, useCallback } from 'react'
import { useSessionReviewStore } from '../../stores/sessionReviewStore'
import { SessionBrowser } from './SessionBrowser'
import { DeviationHeatmap } from './DeviationHeatmap'
import { WeaknessPanel } from './WeaknessPanel'
import { HandReplayer } from './HandReplayer'
import { ImportDialog } from './ImportDialog'
import { cn } from '../../lib/utils'
import {
  Upload, BarChart3, AlertTriangle, Play, Loader2, TrendingUp,
  Target, Zap, ChevronRight,
} from 'lucide-react'

type TabId = 'sessions' | 'heatmap' | 'weakness' | 'replayer'

const TABS: { id: TabId; label: string; icon: typeof Upload }[] = [
  { id: 'sessions', label: '牌局列表', icon: Upload },
  { id: 'heatmap', label: '偏差热力图', icon: BarChart3 },
  { id: 'weakness', label: '薄弱环节', icon: AlertTriangle },
  { id: 'replayer', label: '手牌回放器', icon: Play },
]

export function SessionReviewPage() {
  const store = useSessionReviewStore()
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [analyzeLoading, setAnalyzeLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
    loadStats()
  }, [])

  const loadSessions = async () => {
    store.setLoading(true)
    try {
      const result = await window.electronAPI.sessionReview.list()
      store.setSessions(result.sessions || [])
    } catch (e) {
      showToast('加载牌局列表失败')
    } finally {
      store.setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const stats = await window.electronAPI.sessionReview.getStats()
      store.setStats(stats)
    } catch { /* ignore */ }
  }

  const handleImportFiles = async () => {
    setImporting(true)
    try {
      const result = await window.electronAPI.sessionReview.importFromFiles()
      if (result.success) {
        showToast(`成功导入 ${result.handCount} 手牌`)
        await loadSessions()
        if (result.sessionId) {
          store.selectSession(result.sessionId)
          await analyzeSession(result.sessionId)
        }
      } else {
        showToast(result.errors[0] || '导入失败')
      }
    } catch (e) {
      showToast('导入失败: ' + String(e))
    } finally {
      setImporting(false)
      setShowImport(false)
    }
  }

  const handleImportText = async () => {
    if (!importText.trim()) return
    setImporting(true)
    try {
      const result = await window.electronAPI.sessionReview.importFromText({ text: importText })
      if (result.success) {
        showToast(`成功导入 ${result.handCount} 手牌`)
        await loadSessions()
        if (result.sessionId) {
          store.selectSession(result.sessionId)
          await analyzeSession(result.sessionId)
        }
        setImportText('')
      } else {
        showToast(result.errors[0] || '导入失败')
      }
    } catch (e) {
      showToast('导入失败: ' + String(e))
    } finally {
      setImporting(false)
      setShowImport(false)
    }
  }

  const analyzeSession = async (sessionId: string) => {
    setAnalyzeLoading(true)
    store.setLoading(true)
    try {
      const result = await window.electronAPI.sessionReview.analyze({ sessionId })
      if (result.success) {
        store.setHands(result.hands || [])
        store.setWeaknesses(result.weaknesses || [])
        store.setRangeDeviations(result.rangeDeviations || [])
        store.setAlignmentScore(result.alignmentScore || 0)
        store.setTotalEVLost(result.totalEVLost || 0)
        store.setActiveTab('heatmap')

        const keyHands = (result.hands || []).filter((h: any) => h.isKeyHand)
        if (keyHands.length > 0) {
          showToast(`分析完成！发现 ${keyHands.length} 手关键牌局，${(result.weaknesses || []).length} 个薄弱环节`)
        } else {
          showToast(`分析完成！GTO 对齐度: ${result.alignmentScore}%`)
        }
      }
    } catch (e) {
      showToast('分析失败: ' + String(e))
    } finally {
      setAnalyzeLoading(false)
      store.setLoading(false)
    }
  }

  const handleSelectSession = useCallback(async (id: string) => {
    store.selectSession(id)
    store.reset()
    await analyzeSession(id)
  }, [])

  const handleSelectHand = useCallback((id: string) => {
    store.selectHand(id)
    store.setActiveTab('replayer')
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const selectedSession = store.sessions.find(s => s.id === store.selectedSessionId)
  const selectedHand = store.hands.find(h => h.id === store.selectedHandId)

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-bold">对局复盘教练</h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Session Review Coach — 导入牌谱，发现偏差，对点训练
          </p>
        </div>
        <div className="flex items-center gap-3">
          {store.stats && (
            <div className="flex items-center gap-4 mr-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                {store.stats.averageAlignment}% 对齐
              </span>
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                {store.stats.totalSessions} 场
              </span>
            </div>
          )}
          <button
            onClick={() => setShowImport(true)}
            disabled={importing}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
              'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50',
            )}
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            导入牌谱
          </button>
        </div>
      </div>

      {/* Session selector */}
      {store.sessions.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 border-b border-neutral-800/50 bg-neutral-900/30 overflow-x-auto">
          <span className="text-xs text-neutral-500 mr-2">Session:</span>
          {store.sessions.slice(0, 20).map(s => (
            <button
              key={s.id}
              onClick={() => handleSelectSession(s.id)}
              className={cn(
                'px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors',
                store.selectedSessionId === s.id
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-transparent',
              )}
            >
              {s.stakes} {s.tableName.slice(0, 12)}
              <span className="ml-1.5 text-neutral-500">{s.totalHands}h</span>
            </button>
          ))}
        </div>
      )}

      {/* Session summary bar */}
      {selectedSession && (
        <div className="grid grid-cols-6 gap-3 px-6 py-3 border-b border-neutral-800 bg-neutral-900/20">
          <StatBox label="手牌数" value={String(selectedSession.totalHands)} />
          <StatBox label="GTO 对齐度" value={`${store.alignmentScore}%`}
            color={store.alignmentScore >= 80 ? 'text-emerald-400' :
              store.alignmentScore >= 60 ? 'text-amber-400' : 'text-red-400'} />
          <StatBox label="EV 损失" value={`${Math.round(store.totalEVLost * 100) / 100} bb`}
            color="text-red-400" />
          <StatBox label="关键手牌" value={String(store.hands.filter(h => h.isKeyHand).length)}
            color="text-amber-400" />
          <StatBox label="薄弱环节" value={String(store.weaknesses.length)} />
          <StatBox label="盈利" value={`${selectedSession.profit >= 0 ? '+' : ''}${Math.round(selectedSession.profit * 100) / 100} bb`}
            color={selectedSession.profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-1.5 border-b border-neutral-800">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => store.setActiveTab(tab.id)}
            disabled={tab.id !== 'sessions' && !store.hands.length}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm transition-colors',
              store.activeTab === tab.id
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300',
              tab.id !== 'sessions' && !store.hands.length && 'opacity-40 cursor-not-allowed',
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {store.activeTab === 'sessions' && (
          <SessionBrowser
            sessions={store.sessions}
            selectedId={store.selectedSessionId}
            onSelect={handleSelectSession}
            onRefresh={loadSessions}
            loading={store.loading}
          />
        )}
        {store.activeTab === 'heatmap' && (
          <DeviationHeatmap
            deviations={store.rangeDeviations}
            loading={store.loading}
            streetFilter={store.streetFilter}
            onStreetFilter={store.setStreetFilter}
          />
        )}
        {store.activeTab === 'weakness' && (
          <WeaknessPanel
            weaknesses={store.weaknesses}
            hands={store.hands}
            onSelectHand={handleSelectHand}
            loading={store.loading}
          />
        )}
        {store.activeTab === 'replayer' && (
          <HandReplayer
            hand={selectedHand || null}
            allHands={store.hands}
            onSelectHand={handleSelectHand}
          />
        )}
      </div>

      {/* Import dialog */}
      {showImport && (
        <ImportDialog
          importText={importText}
          onTextChange={setImportText}
          onImportFiles={handleImportFiles}
          onImportText={handleImportText}
          onClose={() => setShowImport(false)}
          importing={importing}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl text-sm text-neutral-200 animate-in slide-in-from-bottom-2 z-50">
          {toast}
        </div>
      )}

      {/* Loading overlay */}
      {analyzeLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm z-40">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="text-sm text-neutral-400">正在分析牌局...</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <div className={cn('text-lg font-bold', color || 'text-neutral-200')}>{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  )
}
