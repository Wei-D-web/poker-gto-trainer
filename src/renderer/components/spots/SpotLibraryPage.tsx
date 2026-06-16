import { useState, useEffect } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS } from '@shared/types/poker'
import { cn } from '../../lib/utils'
import { Bookmark, Trash2, Plus, Tag, Edit3, Target, ExternalLink } from 'lucide-react'
import { useToastStore } from '../../stores/toastStore'

interface Spot {
  id: string; name: string; category: string; gameType: string
  heroPosition: number; villainPosition: number; stackDepth: number
  board: string; notes: string; tags: string[]; createdAt: string
}

const CATEGORIES = ['General', 'Preflop', 'Postflop', 'ICM', 'Bluffs', 'Value', 'Review']

export function SpotLibraryPage() {
  const addToast = useToastStore(s => s.addToast)
  const [spots, setSpots] = useState<Spot[]>([])
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveCat, setSaveCat] = useState('General')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [viewSpot, setViewSpot] = useState<Spot | null>(null)

  const { gameType, heroPosition, villainPosition, stackDepth } = useScenarioStore()

  const loadSpots = async () => {
    const r = await window.electronAPI.spotLibrary.list(filter ? { category: filter } : {})
    setSpots(r.spots)
  }

  useEffect(() => { loadSpots() }, [filter])

  const handleSaveCurrent = async () => {
    if (!saveName.trim()) return
    setSaving(true)
    await window.electronAPI.spotLibrary.save({
      name: saveName, category: saveCat, gameType, heroPosition, villainPosition, stackDepth,
      board: [], notes: '', tags: [saveCat],
    })
    addToast({ type: 'success', message: 'Spot saved!' })
    setShowSaveDialog(false)
    setSaveName('')
    loadSpots()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await window.electronAPI.spotLibrary.delete(id)
    addToast({ type: 'info', message: 'Deleted' })
    loadSpots()
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString()

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Bookmark size={18} className="text-yellow-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-200">Spot Library</h2>
            <p className="text-xs text-neutral-500">Save & organize interesting spots for later review</p>
          </div>
          <button onClick={() => setShowSaveDialog(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-500/8 hover:bg-blue-500/12 text-blue-400 rounded-lg transition-colors border border-blue-500/15 flex items-center gap-1.5">
            <Plus size={11} /> Save Current Spot
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter('')}
            className={cn('px-2.5 py-1 text-[10px] rounded-md font-medium transition-all',
              !filter ? 'bg-yellow-500/12 text-yellow-400 ring-1 ring-yellow-500/20' : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300')}>
            All
          </button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={cn('px-2.5 py-1 text-[10px] rounded-md font-medium transition-all',
                filter === c ? 'bg-yellow-500/12 text-yellow-400 ring-1 ring-yellow-500/20' : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300')}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {spots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-600 gap-4">
            <Bookmark size={32} className="opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">No spots saved yet</p>
              <p className="text-xs opacity-60 mt-1">Use "Save Current Spot" to bookmark interesting positions</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto grid gap-2">
            {spots.map(spot => (
              <div key={spot.id}
                className="bg-[#090D14] border border-[#152233] rounded-xl p-4 hover:border-[#2A3B52] transition-all cursor-pointer group"
                onClick={() => setViewSpot(viewSpot?.id === spot.id ? null : spot)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-200">{spot.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 ring-1 ring-white/[0.05]">
                      {spot.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-600">{formatDate(spot.createdAt)}</span>
                    <button onClick={e => { e.stopPropagation(); handleDelete(spot.id) }}
                      className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-blue-400">{POSITION_LABELS[spot.heroPosition]} vs {POSITION_LABELS[spot.villainPosition]}</span>
                  <span className="text-neutral-500">{spot.stackDepth}bb</span>
                  <span className="text-neutral-500">{spot.gameType === 'cash' ? 'Cash' : 'MTT'}</span>
                  {spot.board && <span className="text-neutral-400 font-mono text-[10px]">{spot.board}</span>}
                </div>

                {spot.notes && (
                  <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">{spot.notes}</p>
                )}

                {spot.tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {spot.tags.map(t => (
                      <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.03] text-neutral-600">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowSaveDialog(false)}>
          <div className="bg-[#0B1019] border border-[#1C2A3D] rounded-2xl p-6 w-[400px] shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-neutral-200 mb-4">Save Current Spot</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Name</label>
                <input value={saveName} onChange={e => setSaveName(e.target.value)}
                  placeholder={`${POSITION_LABELS[heroPosition]} vs ${POSITION_LABELS[villainPosition]} ${stackDepth}bb`}
                  className="w-full bg-[#06090F] border border-[#1C2A3D] rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-blue-500/50" />
              </div>
              <div>
                <label className="text-[10px] text-neutral-500 block mb-1">Category</label>
                <select value={saveCat} onChange={e => setSaveCat(e.target.value)}
                  className="w-full bg-[#06090F] border border-[#1C2A3D] rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-blue-500/50">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="text-[10px] text-neutral-600">
                {POSITION_LABELS[heroPosition]} vs {POSITION_LABELS[villainPosition]} · {stackDepth}bb · {gameType}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 text-xs text-neutral-400 hover:text-neutral-200">Cancel</button>
              <button onClick={handleSaveCurrent} disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
