import { useState, useMemo, useCallback } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS, type Position, type ComboKey } from '@shared/types/poker'
import { ALL_COMBOS, COMBO_MAP } from '@shared/utils/combo-utils'
import type { ComboStrategy } from '@shared/types/strategy'
import { cn } from '../../lib/utils'
import { Save, Download, Upload, Trash2, Edit3 } from 'lucide-react'

type FrequencyMap = Record<ComboKey, number>

interface SavedRange {
  id: string; name: string; position: Position; stackDepth: number
  gameType: 'cash' | 'tournament'; combos: FrequencyMap; createdAt: string
}

const PRESET_RANGES = [
  { name: 'UTG Open', position: 0 as Position, label: '~16% VPIP' },
  { name: 'MP Open', position: 1 as Position, label: '~20% VPIP' },
  { name: 'CO Open', position: 2 as Position, label: '~26% VPIP' },
  { name: 'BTN Open', position: 3 as Position, label: '~40% VPIP' },
  { name: 'BB Defend', position: 5 as Position, label: '~30% defend' },
]

export function RangeEditorPage() {
  const { gameType } = useScenarioStore()
  const [currentRange, setCurrentRange] = useState<FrequencyMap>({})
  const [rangeName, setRangeName] = useState('My Custom Range')
  const [selectedPosition, setSelectedPosition] = useState<Position>(3)
  const [stackDepth, setStackDepth] = useState(100)
  const [savedRanges, setSavedRanges] = useState<SavedRange[]>([])
  const [editMode, setEditMode] = useState<'toggle' | 'paint' | 'erase'>('toggle')

  const comboStrategies = useMemo((): ComboStrategy[] => {
    return ALL_COMBOS.map(combo => {
      const freq = currentRange[combo.key] ?? 0
      return {
        comboKey: combo.key,
        actions: freq > 0 ? [{ action: 'in_range', frequency: freq, ev: 0 }] : [{ action: 'fold', frequency: 1, ev: 0 }],
        equity: freq > 0 ? 0.5 : 0,
        weight: freq,
        ev: freq > 0 ? freq * 0.03 : 0,
      }
    })
  }, [currentRange])

  const stats = useMemo(() => {
    const inRangeCombos = Object.entries(currentRange).filter(([, f]) => f > 0)
    const totalPairs = inRangeCombos.filter(([k]) => COMBO_MAP[k]?.pair).length
    const totalSuited = inRangeCombos.filter(([k]) => COMBO_MAP[k]?.suited).length
    const totalOffsuit = inRangeCombos.filter(([k]) => k && !COMBO_MAP[k]?.pair && !COMBO_MAP[k]?.suited).length
    const totalCombos = inRangeCombos.reduce((sum, [, f]) => sum + f, 0)
    const avgFreq = inRangeCombos.length > 0 ? inRangeCombos.reduce((s, [, f]) => s + f, 0) / inRangeCombos.length : 0
    return {
      inRangeHands: inRangeCombos.length,
      totalCombos: Math.round(totalCombos * 100) / 100,
      vpip: Math.round((inRangeCombos.length / 169) * 100),
      rangePercent: Math.round((totalCombos / 169) * 100),
      pairs: totalPairs, suited: totalSuited, offsuit: totalOffsuit,
      avgFreq: Math.round(avgFreq * 100),
    }
  }, [currentRange])

  const handleComboClick = useCallback((comboKey: ComboKey) => {
    setCurrentRange(prev => {
      const next = { ...prev }
      const currentFreq = next[comboKey] ?? 0
      if (editMode === 'erase') { delete next[comboKey]; return next }
      if (editMode === 'toggle') {
        if (currentFreq === 0) next[comboKey] = 0.5
        else if (currentFreq <= 0.5) next[comboKey] = 1.0
        else delete next[comboKey]
      } else {
        next[comboKey] = 1.0
      }
      return next
    })
  }, [editMode])

  const handleSave = () => {
    const newRange: SavedRange = {
      id: `custom_${Date.now()}`, name: rangeName, position: selectedPosition,
      stackDepth, gameType, combos: { ...currentRange }, createdAt: new Date().toISOString(),
    }
    setSavedRanges(prev => [...prev, newRange])
  }

  const loadPreset = async (position: Position) => {
    try {
      const result = await window.electronAPI.strategy.getPreflopRange({ gameType, position, stackDepth })
      if (result.range?.combos) {
        setCurrentRange({ ...result.range.combos })
        setSelectedPosition(position)
        setRangeName(`${POSITION_LABELS[position]} ${stackDepth}bb Custom`)
      }
    } catch (err) { console.error('Failed to load preset:', err) }
  }

  const clearRange = () => setCurrentRange({})

  const exportRange = () => {
    const data = JSON.stringify({ name: rangeName, position: selectedPosition, stackDepth, gameType, combos: currentRange }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${rangeName.replace(/\s+/g, '_')}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const importRange = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string)
          if (data.combos) { setCurrentRange(data.combos); setRangeName(data.name || 'Imported Range') }
        } catch (err) { console.error('Invalid JSON file') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Edit3 size={18} className="text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Range Editor</h2>
            <p className="text-xs text-neutral-500">Build and save custom hand ranges</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text" value={rangeName} onChange={e => setRangeName(e.target.value)}
            className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-sm text-neutral-200 w-48 focus:outline-none focus:border-blue-500/50"
            placeholder="Range name..."
          />
          <select value={selectedPosition} onChange={e => setSelectedPosition(Number(e.target.value) as Position)}
            className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-blue-500/50">
            {([0,1,2,3,4,5] as Position[]).map(p => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
          </select>
          <select value={stackDepth} onChange={e => setStackDepth(Number(e.target.value))}
            className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-sm text-neutral-300 focus:outline-none focus:border-blue-500/50">
            {[10,20,30,50,75,100,150,200].map(d => <option key={d} value={d}>{d}bb</option>)}
          </select>
        </div>

        {/* Tool bar */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex gap-0.5 bg-[#0F141C] rounded-lg p-0.5 ring-1 ring-white/[0.03]">
            {([
              { id: 'toggle' as const, label: 'Toggle' },
              { id: 'paint' as const, label: 'Paint' },
              { id: 'erase' as const, label: 'Erase' },
            ]).map(mode => (
              <button key={mode.id} onClick={() => setEditMode(mode.id)}
                className={cn(
                  'px-3 py-1 text-xs rounded-md font-medium transition-all',
                  editMode === mode.id ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300',
                )}>
                {mode.label}
              </button>
            ))}
          </div>

          <button onClick={handleSave} className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/8 hover:bg-emerald-500/12 text-emerald-400 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-500/15">
            <Save size={11} /> Save
          </button>
          <button onClick={exportRange} className="px-3 py-1.5 text-xs font-semibold bg-blue-500/8 hover:bg-blue-500/12 text-blue-400 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-500/15">
            <Download size={11} /> Export
          </button>
          <button onClick={importRange} className="px-3 py-1.5 text-xs font-semibold bg-purple-500/8 hover:bg-purple-500/12 text-purple-400 rounded-lg transition-colors flex items-center gap-1.5 border border-purple-500/15">
            <Upload size={11} /> Import
          </button>
          <button onClick={clearRange} className="px-3 py-1.5 text-xs font-semibold bg-red-500/8 hover:bg-red-500/12 text-red-400 rounded-lg transition-colors flex items-center gap-1.5 border border-red-500/15">
            <Trash2 size={11} /> Clear
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] text-neutral-600 self-center mr-1 font-medium">Presets:</span>
          {PRESET_RANGES.map(preset => (
            <button key={preset.name} onClick={() => loadPreset(preset.position)}
              className="px-2.5 py-1 text-[10px] bg-[#0F141C] hover:bg-[#151B28] text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors border border-transparent hover:border-[#1C2A3D] font-medium"
              title={preset.label}>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex items-start justify-center overflow-auto p-6">
          <div className="bg-[#090D14] p-5 rounded-2xl border border-[#152233] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <EditableRangeMatrix combos={currentRange} selectedCombo={null} onSelectCombo={handleComboClick} />
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="w-64 border-l border-[#152233] p-4 overflow-y-auto shrink-0 space-y-4 bg-[#080B10]">
          <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Range Stats</h3>
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Hands" value={stats.inRangeHands} suffix="/169" />
            <StatBox label="Combos" value={stats.totalCombos} />
            <StatBox label="VPIP" value={stats.vpip} suffix="%" />
            <StatBox label="Range %" value={stats.rangePercent} suffix="%" />
          </div>
          <div className="space-y-1.5">
            {[
              { l: 'Pairs', v: stats.pairs },
              { l: 'Suited', v: stats.suited },
              { l: 'Offsuit', v: stats.offsuit },
              { l: 'Avg Freq', v: `${stats.avgFreq}%` },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-neutral-500">{l}</span>
                <span className="text-neutral-300 font-medium">{v}</span>
              </div>
            ))}
          </div>

          {savedRanges.length > 0 && (
            <div className="pt-4 border-t border-[#152233]">
              <h3 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Saved</h3>
              <div className="space-y-1">
                {savedRanges.map(range => (
                  <button key={range.id}
                    onClick={() => { setCurrentRange({ ...range.combos }); setRangeName(range.name); setSelectedPosition(range.position); setStackDepth(range.stackDepth) }}
                    className="w-full text-left px-3 py-2 bg-[#0B1019] hover:bg-[#0F141C] rounded-lg transition-colors border border-transparent hover:border-[#1C2A3D]">
                    <div className="text-xs text-neutral-300 font-medium truncate">{range.name}</div>
                    <div className="text-[10px] text-neutral-600">{POSITION_LABELS[range.position]} · {range.stackDepth}bb</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, suffix = '' }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="bg-[#0B1019] rounded-xl p-3 border border-[#152233]">
      <div className="text-[10px] text-neutral-500">{label}</div>
      <div className="text-lg font-bold text-neutral-200">
        {typeof value === 'number' ? Math.round(value * 100) / 100 : value}{suffix}
      </div>
    </div>
  )
}

function EditableRangeMatrix({
  combos, selectedCombo, onSelectCombo,
}: { combos: FrequencyMap; selectedCombo: ComboKey | null; onSelectCombo: (key: ComboKey) => void }) {
  const ALL_RANKS = [14,13,12,11,10,9,8,7,6,5,4,3,2] as const
  const RANK_CHARS: Record<number,string> = {14:'A',13:'K',12:'Q',11:'J',10:'T',9:'9',8:'8',7:'7',6:'6',5:'5',4:'4',3:'3',2:'2'}
  const getColor = (freq: number) => {
    if (freq <= 0) return '#0D1219'
    if (freq <= 0.25) return '#064E3B'
    if (freq <= 0.5) return '#047857'
    if (freq <= 0.75) return '#F59E0B'
    return '#DC2626'
  }
  const getTextColor = (freq: number) => {
    if (freq <= 0) return '#4B5563'
    if (freq <= 0.5) return '#E5E5E5'
    return '#FFFFFF'
  }
  return (
    <div className="select-none">
      <div className="flex mb-0.5">
        <div className="w-11 h-11 mr-0.5" />
        {ALL_RANKS.map(r => (
          <div key={`h-${r}`} className="w-11 h-11 flex items-center justify-center text-[10px] text-neutral-500 font-semibold mr-[1px]">
            {RANK_CHARS[r]}
          </div>
        ))}
      </div>
      {ALL_RANKS.map((rowRank, ri) => (
        <div key={`r-${rowRank}`} className="flex mb-[1px]">
          <div className="w-11 h-11 flex items-center justify-center text-[10px] text-neutral-500 font-semibold mr-0.5">
            {RANK_CHARS[rowRank]}
          </div>
          {ALL_RANKS.map((colRank, ci) => {
            let key: string
            if (ri === ci) key = `${RANK_CHARS[rowRank]}${RANK_CHARS[colRank]}`
            else if (ri < ci) key = `${RANK_CHARS[rowRank]}${RANK_CHARS[colRank]}s`
            else key = `${RANK_CHARS[colRank]}${RANK_CHARS[rowRank]}o`
            const freq = combos[key] ?? 0
            const bg = getColor(freq); const tc = getTextColor(freq)
            return (
              <button key={key}
                className="matrix-cell w-11 h-11 flex flex-col items-center justify-center rounded-[3px] mr-[1px] border border-transparent"
                style={{ backgroundColor: bg }}
                onClick={() => onSelectCombo(key)}
                title={`${key}: ${Math.round(freq * 100)}%`}>
                <span className="text-[10px] leading-tight font-medium" style={{ color: tc }}>{key}</span>
                {freq > 0 && <span className="text-[7px] leading-none opacity-70" style={{ color: tc }}>{Math.round(freq * 100)}%</span>}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
