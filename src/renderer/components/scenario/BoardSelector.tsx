import { useState } from 'react'
import { cn } from '../../lib/utils'
import { RANK_CHARS, SUIT_SYMBOLS, type Rank, type Suit, type CardString, ALL_RANKS } from '@shared/types/poker'
import { X, Sparkles, Grid3X3 } from 'lucide-react'

interface BoardSelectorProps {
  board: CardString[]
  onChange: (board: CardString[]) => void
  onAnalyze: () => void
  isLoading?: boolean
}

const SUITS: Suit[] = ['s', 'h', 'd', 'c']
const SUIT_COLORS: Record<string, string> = { s: '#000', h: '#DC2626', d: '#2563EB', c: '#16A34A' }

type PresetCategory = 'ace-high' | 'broadway' | 'mid-low' | 'paired' | 'monotone' | 'connected' | 'wet'

interface PresetGroup {
  category: PresetCategory
  label: string
  presets: { label: string; cards: CardString[]; desc: string }[]
}

const PRESET_GROUPS: PresetGroup[] = [
  {
    category: 'ace-high', label: 'A高面',
    presets: [
      { label: 'A高干', cards: ['As', '7d', '2c'], desc: 'A72r — 经典A高彩虹干燥面' },
      { label: 'A高湿', cards: ['Ah', 'Th', '3d'], desc: 'AT3tt — A高双色半湿润' },
      { label: 'A高中', cards: ['Ad', '9s', '4c'], desc: 'A94r — A高彩虹中张' },
      { label: 'A高连', cards: ['As', 'Ks', 'Qd'], desc: 'AKQtt — A高Broadway双色' },
      { label: 'A高低', cards: ['Ah', '5d', '2c'], desc: 'A52r — A高彩虹低张' },
      { label: 'A高J高', cards: ['Ac', 'Jh', '4d'], desc: 'AJ4r — A高带J彩虹' },
    ],
  },
  {
    category: 'broadway', label: 'Broadway面',
    presets: [
      { label: 'K高干', cards: ['Ks', '8d', '3c'], desc: 'K83r — K高彩虹干燥' },
      { label: 'KQx', cards: ['Kh', 'Qd', '5s'], desc: 'KQ5r — 两Broadway彩虹' },
      { label: 'KJx双色', cards: ['Kd', 'Jd', '4s'], desc: 'KJ4tt — KJ双色面' },
      { label: 'Q高干', cards: ['Qs', '7h', '2d'], desc: 'Q72r — Q高彩虹干燥' },
      { label: 'QJx双色', cards: ['Qh', 'Jh', '5c'], desc: 'QJ5tt — QJ双色面' },
      { label: 'AKQ单色', cards: ['Ah', 'Kh', 'Qh'], desc: 'AKQm — Broadway单色' },
    ],
  },
  {
    category: 'mid-low', label: '中低张面',
    presets: [
      { label: '中张干', cards: ['9s', '6d', '2c'], desc: '962r — 中低张彩虹干燥' },
      { label: '中张湿', cards: ['8h', '7h', '2d'], desc: '872tt — 中张双色' },
      { label: '低张干', cards: ['7s', '4d', '2c'], desc: '742r — 低张彩虹干燥' },
      { label: 'Wheel面', cards: ['Ah', '3d', '5c'], desc: 'A53r — 带A低张彩虹' },
      { label: 'J高干', cards: ['Js', '6d', '2c'], desc: 'J62r — J高彩虹' },
      { label: 'T高干', cards: ['Ts', '5d', '3c'], desc: 'T53r — T高彩虹' },
    ],
  },
  {
    category: 'paired', label: '公对面',
    presets: [
      { label: '大公对', cards: ['Qh', 'Qd', '5c'], desc: 'QQ5r — 大公对彩虹' },
      { label: 'A公对', cards: ['As', 'Ad', '8h'], desc: 'AA8tt — A公对双色' },
      { label: 'K公对', cards: ['Ks', 'Kd', 'Jc'], desc: 'KKJr — K公对彩虹' },
      { label: '中公对', cards: ['8h', '8d', '4s'], desc: '884r — 中公对彩虹' },
      { label: '小公对', cards: ['5s', '5d', 'Ah'], desc: '55A — 小公对带A' },
      { label: '公对双色', cards: ['Jh', 'Jd', '7h'], desc: 'JJ7tt — 公对同花听牌面' },
    ],
  },
  {
    category: 'monotone', label: '单色面',
    presets: [
      { label: '单色高', cards: ['Kh', '9h', '4h'], desc: 'K94m — 单色高张' },
      { label: '单色低', cards: ['8d', '5d', '2d'], desc: '852m — 单色低张' },
      { label: '单色连', cards: ['Jh', 'Th', '8h'], desc: 'JT8m — 单色连接' },
      { label: '单色Broadway', cards: ['As', 'Qs', 'Ts'], desc: 'AQTm — 单色Broadway' },
      { label: '单色公对', cards: ['9h', '9d', '3h'], desc: '993tt — 公对同花听牌' },
    ],
  },
  {
    category: 'connected', label: '连接面',
    presets: [
      { label: '高连双色', cards: ['Jd', 'Td', '9s'], desc: 'JT9tt — 高连接双色' },
      { label: '低连双色', cards: ['8h', '7h', '6s'], desc: '876tt — 低连接双色' },
      { label: '连虹', cards: ['9h', '8d', '7c'], desc: '987r — 连接彩虹' },
      { label: '间连', cards: ['Qh', 'Td', '8s'], desc: 'QT8tt — 间连接(gap)' },
      { label: '双色间连', cards: ['Kh', 'Jd', '9h'], desc: 'KJ9tt — K高间连双色' },
    ],
  },
  {
    category: 'wet', label: '湿润/特殊面',
    presets: [
      { label: '全连单色', cards: ['Th', '9h', '8h'], desc: 'T98m — 全连接单色' },
      { label: 'A高全湿', cards: ['As', 'Ks', 'Ts'], desc: 'AKTtt — A高双色含听牌' },
      { label: '双Broadway湿', cards: ['Kh', 'Qh', 'Jd'], desc: 'KQJtt — 双Broadway双色' },
      { label: '三小连', cards: ['6h', '5d', '4s'], desc: '654r — 三小连接彩虹' },
    ],
  },
]

export function BoardSelector({ board, onChange, onAnalyze, isLoading }: BoardSelectorProps) {
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null)
  const [selectedSuit, setSelectedSuit] = useState<Suit | null>(null)
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('ace-high')

  const addCard = (rank: Rank, suit: Suit) => {
    const card = `${RANK_CHARS[rank]}${suit}`
    if (board.length >= 5) return
    if (board.includes(card)) return
    onChange([...board, card])
    setSelectedRank(null)
    setSelectedSuit(null)
  }

  const removeCard = (index: number) => onChange(board.filter((_, i) => i !== index))
  const clearBoard = () => onChange([])

  const activePresets = PRESET_GROUPS.find(g => g.category === activeCategory)?.presets || []

  return (
    <div className="space-y-3">
      {/* Board display */}
      <div className="flex items-center gap-2 min-h-[36px]">
        {board.length === 0 ? (
          <span className="text-xs text-neutral-600 py-1">选择牌面...</span>
        ) : (
          <>
            {board.map((card, i) => (
              <button
                key={i}
                onClick={() => removeCard(i)}
                className="relative group px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm font-mono font-bold text-neutral-100 hover:border-red-600/50 transition-colors"
              >
                {formatCardDisplay(card)}
                <X size={10} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 text-red-400 transition-opacity" />
              </button>
            ))}
            {board.length < 5 && (
              <span className="text-neutral-700 text-xs">?</span>
            )}
            <button onClick={clearBoard} className="p-1 text-neutral-600 hover:text-neutral-400 transition-colors">
              <X size={13} />
            </button>
          </>
        )}
      </div>

      {/* Card picker */}
      <div className="bg-neutral-900/50 rounded-xl p-2.5 border border-neutral-800">
        <div className="flex gap-[2px] mb-2 flex-wrap">
          {ALL_RANKS.map(rank => (
            <button
              key={rank}
              onClick={() => setSelectedRank(selectedRank === rank ? null : rank)}
              className={cn(
                'w-[26px] h-[26px] text-[11px] font-bold rounded transition-all',
                selectedRank === rank
                  ? 'bg-blue-600 text-white shadow-sm scale-110'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
              )}
            >
              {RANK_CHARS[rank]}
            </button>
          ))}
        </div>
        {selectedRank && (
          <div className="flex gap-1.5">
            {SUITS.map(suit => (
              <button
                key={suit}
                onClick={() => addCard(selectedRank!, suit)}
                className="flex-1 py-1.5 text-sm font-bold rounded-lg transition-all bg-neutral-800 hover:bg-neutral-700 border border-neutral-700"
                style={{ color: SUIT_COLORS[suit] || '#fff' }}
              >
                {SUIT_SYMBOLS[suit]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 flex-wrap">
        {PRESET_GROUPS.map(group => (
          <button
            key={group.category}
            onClick={() => setActiveCategory(group.category)}
            className={cn(
              'px-2 py-1 text-[10px] rounded font-medium transition-all',
              activeCategory === group.category
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
            )}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Preset flops for active category */}
      <div className="grid grid-cols-2 gap-1">
        {activePresets.map((preset, i) => (
          <button
            key={i}
            onClick={() => onChange(preset.cards)}
            className={cn(
              'px-2.5 py-2 text-left rounded-lg transition-all group',
              'bg-neutral-800/30 hover:bg-neutral-700/50 border border-neutral-800/50 hover:border-neutral-700',
              JSON.stringify(board) === JSON.stringify(preset.cards) && 'border-blue-500/40 bg-blue-600/10'
            )}
          >
            <div className="text-[10px] font-semibold text-neutral-200">{preset.label}</div>
            <div className="text-[9px] text-neutral-500 mt-0.5 leading-tight">{preset.desc}</div>
          </button>
        ))}
      </div>

      {/* Analyze button */}
      {board.length >= 3 && (
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className="w-full py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
        >
          <Sparkles size={14} />
          {isLoading ? '分析中...' : `分析 ${formatBoardShort(board)}`}
        </button>
      )}
    </div>
  )
}

function formatCardDisplay(card: string): string {
  if (card.length < 2) return card
  const rank = card[0]
  const suit = card[card.length - 1] as Suit
  const sym = SUIT_SYMBOLS[suit] || suit
  return `${rank}${sym}`
}

function formatBoardShort(board: string[]): string {
  return board.map(c => formatCardDisplay(c)).join('')
}
