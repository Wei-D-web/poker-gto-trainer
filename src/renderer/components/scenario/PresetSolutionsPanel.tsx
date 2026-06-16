import { useState } from 'react'
import { useScenarioStore } from '../../stores/scenarioStore'
import { PostflopAnalysis } from './PostflopAnalysis'
import { cn } from '../../lib/utils'
import { Zap, ChevronRight, Layers } from 'lucide-react'

interface PresetFlop {
  board: string[]
  texture: string
  description: string
}

interface PresetCategory {
  label: string
  accent: string
  flops: PresetFlop[]
}

const PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: 'A-High', accent: 'text-red-400',
    flops: [
      { board: ['As','7d','2c'], texture: 'ace-high-dry', description: 'A72 rainbow — classic dry' },
      { board: ['Ah','Qd','3s'], texture: 'ace-high-wet', description: 'AQ3 two-tone' },
      { board: ['Ad','Kc','Jh'], texture: 'broadway-heavy', description: 'AKJ Broadway heavy' },
      { board: ['As','9d','8s'], texture: 'ace-high-wet', description: 'A98 connected' },
      { board: ['As','5d','2c'], texture: 'ace-high-dry', description: 'A52 wheel potential' },
      { board: ['Ah','7h','6d'], texture: 'ace-high-wet', description: 'A76 semi-connected' },
    ],
  },
  {
    label: 'Broadway', accent: 'text-purple-400',
    flops: [
      { board: ['Kh','Qd','2s'], texture: 'broadway-heavy', description: 'KQ2 rainbow' },
      { board: ['Ks','Jd','6h'], texture: 'broadway-heavy', description: 'KJ6 rainbow' },
      { board: ['Kh','9d','8h'], texture: 'two-tone-connected', description: 'K98 connected' },
      { board: ['Qh','Jd','5s'], texture: 'broadway-heavy', description: 'QJ5 rainbow' },
      { board: ['Ks','Td','9h'], texture: 'two-tone-connected', description: 'KT9 connected' },
    ],
  },
  {
    label: 'Paired', accent: 'text-amber-400',
    flops: [
      { board: ['Qh','Qd','3s'], texture: 'paired', description: 'QQ3 paired' },
      { board: ['Js','Jd','8h'], texture: 'paired-two-tone', description: 'JJ8 paired' },
      { board: ['9h','9d','Ks'], texture: 'paired', description: '99K overcard' },
      { board: ['7h','7d','As'], texture: 'paired', description: '77A overcard' },
    ],
  },
  {
    label: 'Monotone', accent: 'text-emerald-400',
    flops: [
      { board: ['Kh','9h','4h'], texture: 'monotone', description: 'K94 mono' },
      { board: ['Ah','Th','3h'], texture: 'ace-high-monotone', description: 'AT3 mono A-high' },
      { board: ['Jh','7h','5h'], texture: 'monotone', description: 'J75 mono connected' },
      { board: ['Ah','Kh','Th'], texture: 'monotone-connected', description: 'AKT mono premium' },
    ],
  },
  {
    label: 'Connected', accent: 'text-blue-400',
    flops: [
      { board: ['Jd','Td','9s'], texture: 'two-tone-connected', description: 'JT9 wet' },
      { board: ['9h','8d','7c'], texture: 'rainbow-connected', description: '987 rainbow' },
      { board: ['7d','6c','5h'], texture: 'rainbow-connected', description: '765 rainbow' },
      { board: ['Jh','Td','8c'], texture: 'two-tone-connected', description: 'JT8 semi' },
    ],
  },
  {
    label: 'Low / Dry', accent: 'text-neutral-400',
    flops: [
      { board: ['7h','6d','2c'], texture: 'rainbow-dry', description: '762 low dry' },
      { board: ['9h','5d','3s'], texture: 'rainbow-dry', description: '953 low dry' },
      { board: ['Ah','3d','2c'], texture: 'wheel', description: 'A32 wheel draw' },
    ],
  },
]

export function PresetSolutionsPanel() {
  const { heroPosition, villainPosition, stackDepth } = useScenarioStore()
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [selectedFlop, setSelectedFlop] = useState<string[] | null>(null)
  const [postflopResult, setPostflopResult] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const analyzeFlop = async (board: string[]) => {
    setSelectedFlop(board)
    setAnalyzing(true)
    try {
      const result = await window.electronAPI.strategy.analyzePostflop({
        board,
        heroPosition,
        villainPosition,
        stackDepth,
      })
      setPostflopResult(result)
    } catch (e) {
      console.error('Postflop analysis failed:', e)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div>
      {/* Preset flops grid */}
      <div className="space-y-1">
        {PRESET_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === cat.label ? null : cat.label)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:bg-white/[0.04]"
            >
              <ChevronRight
                size={11}
                className={cn(
                  'text-neutral-600 transition-transform',
                  expandedCategory === cat.label && 'rotate-90',
                )}
              />
              <Layers size={11} className={cat.accent} />
              <span className="text-neutral-400">{cat.label}</span>
              <span className="text-[9px] text-neutral-600 ml-auto">{cat.flops.length}</span>
            </button>

            {expandedCategory === cat.label && (
              <div className="ml-5 space-y-0.5 mt-0.5 mb-1 animate-fade-in">
                {cat.flops.map((flop) => (
                  <button
                    key={flop.board.join('')}
                    onClick={() => analyzeFlop(flop.board)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] transition-all',
                      selectedFlop && selectedFlop.join('') === flop.board.join('')
                        ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/15'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.03]',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">
                        {flop.board.map(c => {
                          const suitIcons: Record<string,string> = {s:'♠',h:'♥',d:'♦',c:'♣'}
                          return c[0] + (suitIcons[c[1]] || c[1])
                        }).join(' ')}
                      </span>
                      {analyzing && selectedFlop?.join('') === flop.board.join('') && (
                        <span className="animate-spin"><Zap size={9} /></span>
                      )}
                    </div>
                    <div className="text-[9px] text-neutral-600 mt-0.5">{flop.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Analysis result overlay */}
      {postflopResult && selectedFlop && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-start justify-center pt-12 overflow-auto animate-fade-in" onClick={() => setPostflopResult(null)}>
          <div className="w-[700px] bg-[#0B1019] border border-[#1C2A3D] rounded-2xl p-6 shadow-2xl m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-200">
                Preset Analysis: {selectedFlop.map(c => {
                  const suitIcons: Record<string,string> = {s:'♠',h:'♥',d:'♦',c:'♣'}
                  return c[0] + (suitIcons[c[1]] || c[1])
                }).join(' ')}
              </h3>
              <button
                onClick={() => setPostflopResult(null)}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Close
              </button>
            </div>
            <PostflopAnalysis result={postflopResult} />
          </div>
        </div>
      )}
    </div>
  )
}
