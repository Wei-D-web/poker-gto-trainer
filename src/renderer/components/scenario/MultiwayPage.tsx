import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Users, AlertTriangle, Zap, BarChart3 } from 'lucide-react'

const POS_LABELS = ['UTG','MP','CO','BTN','SB','BB']
const RANKS = 'AKQJT98765432'.split('')
const SUITS = 'shdc'
const SUIT_COLORS: Record<string,string> = {s:'#aaa',h:'#DC2626',d:'#2563EB',c:'#16A34A'}
const SUIT_ICONS: Record<string,string> = {s:'♤',h:'♥',d:'◆',c:'♧'}

export function MultiwayPage() {
  const [board, setBoard] = useState<string[]>(['As','7d','2c'])
  const [numPlayers, setNumPlayers] = useState(3)
  const [aggressorPos, setAggressorPos] = useState(3)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pickRank, setPickRank] = useState('')
  const [pickSuit, setPickSuit] = useState('')

  const addCard = (card: string) => {
    if (board.length >= 5 || board.includes(card)) return
    setBoard([...board, card]); setPickRank(''); setPickSuit('')
  }

  const format = (c:string) => c ? c[0]+(SUIT_ICONS[c[1]]||c[1]) : '?'

  const analyze = async () => {
    setLoading(true)
    try {
      const otherPos = [0,1,2,4,5].filter(p => p !== aggressorPos).slice(0, numPlayers-1)
      const r = await (window as any).electronAPI.strategy.analyzeMultiWay({
        board, positions: [aggressorPos, ...otherPos], aggressor: aggressorPos,
      })
      setResult(r)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <Users size={18} className="text-pink-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Multi-way Pot Analysis</h2>
            <p className="text-xs text-neutral-500">3+ player heuristic analysis with deviation warnings</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-[#152233] p-4 space-y-5 overflow-y-auto shrink-0 bg-[#080B10]">
          {/* Board */}
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Board</div>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {board.map((c,i) => (
                <button key={i} onClick={() => setBoard(board.filter((_,j)=>j!==i))}
                  className="px-2.5 py-1.5 bg-[#0F141C] border border-[#1C2A3D] rounded-lg text-xs font-mono font-bold text-neutral-100 hover:border-red-500/30 transition-colors">
                  {c}
                </button>
              ))}
              {board.length < 5 && (
                <button onClick={()=>{}}
                  className="px-2.5 py-1.5 text-xs bg-[#0F141C] border border-dashed border-[#1C2A3D] rounded-lg text-neutral-500">
                  +
                </button>
              )}
            </div>
            {/* Quick card picker */}
            <div className="grid grid-cols-13 gap-[2px] mb-1.5">
              {RANKS.map(r => (
                <button key={r} onClick={()=>setPickRank(pickRank===r?'':r)}
                  className={cn(
                    'w-6 h-6 text-[10px] font-bold rounded transition-all',
                    pickRank===r
                      ? 'bg-blue-600 text-white scale-110'
                      : 'bg-[#0F141C] text-neutral-400 hover:bg-[#151B28]',
                  )}>
                  {r}
                </button>
              ))}
            </div>
            {pickRank && (
              <div className="flex gap-1.5 animate-scale-in">
                {SUITS.split('').map((s: string) => (
                  <button key={s} onClick={()=>addCard(pickRank+s)}
                    className="flex-1 py-1.5 text-sm font-bold rounded-lg bg-[#0F141C] hover:bg-[#151B28] border border-[#1C2A3D] transition-colors"
                    style={{color: SUIT_COLORS[s]}}>
                    {SUIT_ICONS[s]}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {[['As','7d','2c'],['Ah','Th','3d'],['Qh','Qd','5c'],['Jd','Td','9s']].map((f,i)=>(
                <button key={i} onClick={()=>setBoard(f)}
                  className="px-2.5 py-1 text-[10px] bg-[#0F141C] hover:bg-[#151B28] text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors border border-transparent hover:border-[#1C2A3D]">
                  {f.map(format).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Players */}
          <div className="pt-4 border-t border-[#152233]">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Players</div>
            <div className="flex gap-1">
              {[3,4,5,6].map(n=>(
                <button key={n} onClick={()=>setNumPlayers(n)}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                    numPlayers===n
                      ? 'bg-pink-500/12 text-pink-400 ring-1 ring-pink-500/25'
                      : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300',
                  )}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="pt-4 border-t border-[#152233]">
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Aggressor</div>
            <div className="grid grid-cols-6 gap-1">
              {[0,1,2,3,4,5].map(p=>(
                <button key={p} onClick={()=>setAggressorPos(p)}
                  className={cn(
                    'py-1.5 text-[10px] rounded font-medium transition-all',
                    aggressorPos===p
                      ? 'bg-pink-500/12 text-pink-400 ring-1 ring-pink-500/25'
                      : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300',
                  )}>
                  {POS_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <button onClick={analyze} disabled={loading}
            className="w-full py-2.5 text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:from-neutral-700 disabled:to-neutral-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(219,39,119,0.2)] disabled:shadow-none active:scale-[0.98]">
            <Zap size={14} /> {loading?'Analyzing...':'Analyze Multi-way'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
                <Users size={28} className="opacity-20" />
              </div>
              <div><p className="text-sm font-medium">Configure → Analyze</p></div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              {/* Warnings */}
              <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-amber-400"/>
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Important Notes</span>
                </div>
                <ul className="space-y-1.5">
                  {result.warnings.map((w:string,i:number)=>(
                    <li key={i} className="text-[11px] text-amber-300/80 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  {l:'Players',v:result.numPlayers,c:'text-pink-400'},
                  {l:'Adjusted c-bet',v:Math.round(result.adjustedCbetFreq*100)+'%',c:'text-emerald-400'},
                  {l:'Protection',v:result.protectionValue+'%',c:'text-blue-400'},
                  {l:'Position',v:result.rangeAdvantage==='last'?'IP Advantage':'Mid',c:'text-amber-400'},
                ].map((x,i)=>(
                  <div key={i} className="bg-[#090D14] border border-[#152233] rounded-xl p-3.5 text-center">
                    <div className={cn('text-lg font-bold',x.c)}>{x.v}</div>
                    <div className="text-[9px] text-neutral-500 mt-0.5">{x.l}</div>
                  </div>
                ))}
              </div>

              {/* HU vs Multi-way table */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                  <BarChart3 size={15} className="text-pink-400"/> HU vs Multi-way
                </h3>
                <div className="bg-[#090D14] rounded-xl overflow-hidden border border-[#152233] shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#152233] bg-[#0B1019]/50">
                        <th className="text-left px-4 py-2.5 text-neutral-500 font-semibold">Category</th>
                        <th className="text-left px-4 py-2.5 text-neutral-500 font-semibold">Heads-up</th>
                        <th className="text-left px-4 py-2.5 text-neutral-500 font-semibold">{result.numPlayers}-way</th>
                        <th className="text-left px-4 py-2.5 text-neutral-500 font-semibold">Adjustment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.recommendations.map((r:any,i:number)=>(
                        <tr key={i} className="border-b border-[#152233]/50">
                          <td className="px-4 py-3 text-neutral-200 font-medium">{r.category}</td>
                          <td className="px-4 py-3 text-neutral-400">{r.headsUpAction}</td>
                          <td className="px-4 py-3 text-pink-300 font-medium">{r.multiWayAction}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'text-[10px] px-2 py-1 rounded-full font-medium',
                              r.adjustment.includes('降低')
                                ? 'bg-red-500/8 text-red-400'
                                : 'bg-emerald-500/8 text-emerald-400',
                            )}>
                              {r.adjustment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
