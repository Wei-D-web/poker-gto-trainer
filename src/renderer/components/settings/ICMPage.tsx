import { useState, useEffect } from 'react'
import { calculateICM, type Player, type Payout, type ICMResult } from '../../../../src/main/solver/icm-calculator'
import { cn } from '../../lib/utils'
import { DollarSign, Users, TrendingUp, AlertTriangle, Plus, Trash2, Calculator } from 'lucide-react'

const DEFAULT_PLAYERS: Player[] = [
  { id: 'h', name: '我', stack: 5000 },
  { id: 'v1', name: 'Player 2', stack: 3500 },
  { id: 'v2', name: 'Player 3', stack: 2500 },
  { id: 'v3', name: 'Player 4', stack: 1500 },
]

const DEFAULT_PAYOUTS: Payout[] = [
  { position: 1, prize: 50, label: '🥇' },
  { position: 2, prize: 30, label: '🥈' },
  { position: 3, prize: 20, label: '🥉' },
]

export function ICMPage() {
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS)
  const [payouts, setPayouts] = useState<Payout[]>(DEFAULT_PAYOUTS)
  const [buyin, setBuyin] = useState(10)
  const [result, setResult] = useState<ICMResult | null>(null)

  const totalChips = players.reduce((s, p) => s + p.stack, 0)
  const prizePool = payouts.reduce((s, p) => s + p.prize, 0)

  const handleCalc = () => {
    if (players.length < 2) return
    const r = calculateICM(players, payouts)
    setResult(r)
  }

  const updateStack = (id: string, stack: number) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, stack: Math.max(0, stack) } : p))
    setResult(null)
  }

  const updatePayout = (pos: number, prize: number) => {
    setPayouts(prev => prev.map(p => p.position === pos ? { ...p, prize: Math.max(0, prize) } : p))
    setResult(null)
  }

  const addPlayer = () => {
    setPlayers(prev => [...prev, { id: `v${prev.length}`, name: `Player ${prev.length + 1}`, stack: 1500 }])
    setResult(null)
  }

  const removePlayer = (id: string) => {
    if (players.length <= 2) return
    setPlayers(prev => prev.filter(p => p.id !== id))
    setResult(null)
  }

  useEffect(() => {
    try {
      if (players.length >= 2) {
        const r = calculateICM(players, payouts)
        setResult(r)
      }
    } catch (e) {
      console.error('ICM calc error:', e)
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">ICM Calculator</h2>
            <p className="text-xs text-neutral-500">Malmuth-Harville algorithm · Exact mathematical solution</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Input panel */}
        <div className="w-80 border-r border-[#152233] overflow-y-auto p-4 space-y-5 shrink-0 bg-[#080B10]">
          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Stacks</label>
              <button onClick={addPlayer} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="space-y-1.5">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium w-20', p.id === 'h' ? 'text-blue-400' : 'text-neutral-400')}>
                    {p.name}
                  </span>
                  <input
                    type="number"
                    value={p.stack}
                    onChange={e => updateStack(p.id, Number(e.target.value))}
                    className="flex-1 bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 text-right focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  <span className="text-[10px] text-neutral-600 w-10 text-right">({Math.round(p.stack / totalChips * 100)}%)</span>
                  {players.length > 2 && (
                    <button onClick={() => removePlayer(p.id)} className="text-neutral-600 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-neutral-600 mt-1.5 text-right">Total: {totalChips.toLocaleString()}</div>
          </div>

          {/* Payouts */}
          <div className="pt-4 border-t border-[#152233]">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">Payouts</label>
            <div className="space-y-1.5">
              {payouts.map(p => (
                <div key={p.position} className="flex items-center gap-2">
                  <span className="text-xs w-8 text-center">{p.label}</span>
                  <input
                    type="number"
                    value={p.prize}
                    onChange={e => updatePayout(p.position, Number(e.target.value))}
                    className="flex-1 bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 text-right focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  <span className="text-[10px] text-neutral-600 w-10 text-right">({Math.round(p.prize / prizePool * 100)}%)</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-neutral-600 mt-1.5">
              Buy-in: ${buyin} · Pool: ${prizePool}
            </div>
          </div>

          <button onClick={handleCalc}
            className="w-full py-2.5 text-xs font-semibold bg-emerald-500/8 hover:bg-emerald-500/12 text-emerald-400 border border-emerald-500/15 rounded-xl transition-all flex items-center justify-center gap-2">
            <Calculator size={13} />
            Calculate ICM
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {result && (
            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
              <h3 className="text-sm font-semibold text-neutral-300">ICM Results</h3>

              {/* Equity table */}
              <div className="bg-[#090D14] rounded-xl overflow-hidden border border-[#152233] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#152233] bg-[#0B1019]/50">
                      <th className="text-left px-4 py-2.5 text-neutral-500 font-semibold">Player</th>
                      <th className="text-right px-4 py-2.5 text-neutral-500 font-semibold">Stack</th>
                      <th className="text-right px-4 py-2.5 text-neutral-500 font-semibold">Chip %</th>
                      <th className="text-right px-4 py-2.5 text-neutral-500 font-semibold">ICM $Value</th>
                      <th className="text-right px-4 py-2.5 text-neutral-500 font-semibold">Chip EV</th>
                      <th className="text-right px-4 py-2.5 text-neutral-500 font-semibold">ICM Tax</th>
                      <th className="text-right px-4 py-2.5 text-neutral-500 font-semibold">Bubble Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.players.map((p, i) => (
                      <tr key={i} className={cn('border-b border-[#152233]/50 transition-colors', p.id === 'h' && 'bg-blue-500/[0.03]')}>
                        <td className="px-4 py-3 font-semibold text-neutral-200">{p.name}</td>
                        <td className="px-4 py-3 text-right text-neutral-300 font-mono">{p.stack.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-neutral-400">{p.stackPercent}%</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400">${p.icmEquity}</td>
                        <td className="px-4 py-3 text-right text-neutral-400">${p.chipEV}</td>
                        <td className={cn('px-4 py-3 text-right font-semibold', p.icmTax < 0 ? 'text-red-400' : 'text-emerald-400')}>
                          {p.icmTax > 0 ? '+' : ''}{p.icmTax}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-400">{p.bubbleFactor}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Explanation cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} className="text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Bubble Factor</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Factor &gt;1 means losing 1 chip costs more than winning 1 chip gains. Short stacks typically have higher bubble factors.
                  </p>
                </div>
                <div className="bg-red-500/[0.04] border border-red-500/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={13} className="text-red-400" />
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">ICM Tax</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Negative ICM tax means your chips are worth less than their linear value. Big stacks usually have negative ICM tax.
                  </p>
                </div>
                <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={13} className="text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Usage</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    ICM is the foundation of tournament push/fold decisions. Short stacks should be tighter near the bubble.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
