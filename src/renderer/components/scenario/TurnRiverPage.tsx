import { useState } from 'react'
import { cn } from '../../lib/utils'
import { ArrowRight, AlertTriangle, Zap, Layout } from 'lucide-react'

const SUITS = ['s','h','d','c'] as const
const SUIT_CHARS: Record<string, string> = { s: '♤', h: '♥', d: '◆', c: '♧' }
const SUIT_COLORS: Record<string, string> = { s: '#aaa', h: '#DC2626', d: '#2563EB', c: '#16A34A' }
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2']
const FLOP_PRESETS = [['As','7d','2c'],['Ah','Th','3d'],['Kh','9h','4h'],['Qh','Qd','5c'],['Jd','Td','9s']]

export function TurnRiverPage() {
  const [flop, setFlop] = useState<string[]>(['As','7d','2c'])
  const [turnCard, setTurnCard] = useState('Th')
  const [riverCard, setRiverCard] = useState('3c')
  const [pickingFor, setPickingFor] = useState<'flop'|'turn'|'river'|null>(null)
  const [pickRank, setPickRank] = useState('')
  const [turnResult, setTurnResult] = useState<any>(null)
  const [riverResult, setRiverResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const addCard = (card: string) => {
    if (pickingFor === 'flop' && flop.length < 3) setFlop([...flop, card])
    else if (pickingFor === 'turn') setTurnCard(card)
    else if (pickingFor === 'river') setRiverCard(card)
    setPickRank(''); setPickingFor(null)
  }

  const analyze = async () => {
    setLoading(true)
    try {
      const t = await (window as any).electronAPI.strategy.analyzeTurn({ flop, turn: turnCard })
      setTurnResult(t)
      const r = await (window as any).electronAPI.strategy.analyzeRiver({ turnBoard: [...flop, turnCard], river: riverCard })
      setRiverResult(r)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const format = (c: string) => c ? c[0] + (SUIT_CHARS[c[1]] || c[1]) : '?'

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <ArrowRight size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Turn & River Analysis</h2>
            <p className="text-xs text-neutral-500">Board texture + turn/river → strategy shift detection</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-[#152233] p-4 space-y-5 overflow-y-auto shrink-0 bg-[#080B10]">
          {/* Flop */}
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Flop</div>
            <div className="flex gap-1.5 flex-wrap mb-1">
              {flop.map((c,i) => (
                <button key={i} onClick={() => setFlop(flop.filter((_,j)=>j!==i))}
                  className="px-3 py-2 bg-[#0F141C] border border-[#1C2A3D] rounded-lg text-sm font-mono font-bold text-neutral-100 hover:border-red-500/30 transition-colors">
                  {format(c)}
                </button>
              ))}
              {flop.length < 3 && (
                <button onClick={()=>setPickingFor('flop')}
                  className="px-3 py-2 text-xs bg-[#0F141C] border border-dashed border-[#1C2A3D] rounded-lg text-neutral-500 hover:border-neutral-500 transition-colors">
                  + Add
                </button>
              )}
            </div>
          </div>

          {/* Turn */}
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Turn</div>
            <button onClick={()=>setPickingFor('turn')}
              className={cn(
                'px-4 py-2.5 rounded-lg text-sm font-mono font-bold transition-all',
                turnCard
                  ? 'bg-[#0F141C] border border-[#1C2A3D] text-neutral-100'
                  : 'bg-[#0F141C] border border-dashed border-[#1C2A3D] text-neutral-500 hover:border-neutral-500',
              )}>
              {turnCard ? format(turnCard) : '?'}
            </button>
          </div>

          {/* River */}
          <div>
            <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">River</div>
            <button onClick={()=>setPickingFor('river')}
              className={cn(
                'px-4 py-2.5 rounded-lg text-sm font-mono font-bold transition-all',
                riverCard
                  ? 'bg-[#0F141C] border border-[#1C2A3D] text-neutral-100'
                  : 'bg-[#0F141C] border border-dashed border-[#1C2A3D] text-neutral-500 hover:border-neutral-500',
              )}>
              {riverCard ? format(riverCard) : '?'}
            </button>
          </div>

          {/* Card picker */}
          {pickingFor && (
            <div className="bg-[#0B1019] rounded-xl p-3 border border-[#1C2A3D] animate-scale-in">
              <div className="grid grid-cols-13 gap-[2px] mb-2">
                {RANKS.map(r => (
                  <button key={r} onClick={()=>setPickRank(pickRank===r?'':r)}
                    className={cn(
                      'w-7 h-7 text-[11px] font-bold rounded transition-all',
                      pickRank===r
                        ? 'bg-blue-600 text-white scale-110 shadow-sm'
                        : 'bg-[#0F141C] text-neutral-400 hover:bg-[#151B28]',
                    )}>
                    {r}
                  </button>
                ))}
              </div>
              {pickRank && (
                <div className="flex gap-2">
                  {SUITS.map(s => (
                    <button key={s} onClick={()=>addCard(pickRank+s)}
                      className="flex-1 py-2 text-lg font-bold rounded-lg bg-[#0F141C] hover:bg-[#151B28] border border-[#1C2A3D] transition-colors"
                      style={{color: SUIT_COLORS[s]}}>
                      {SUIT_CHARS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Presets */}
          <div>
            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Presets</div>
            <div className="flex gap-1.5 flex-wrap">
              {FLOP_PRESETS.map((f,i) => (
                <button key={i} onClick={()=>{setFlop(f); setTurnCard(null); setRiverCard(null)}}
                  className="px-2.5 py-1.5 text-[10px] bg-[#0F141C] hover:bg-[#151B28] text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors border border-transparent hover:border-[#1C2A3D]">
                  {f.map(format).join(' ')}
                </button>
              ))}
            </div>
          </div>

          <button onClick={analyze} disabled={flop.length<3||!turnCard||loading}
            className="w-full py-2.5 text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-neutral-700 disabled:to-neutral-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(217,119,6,0.2)] disabled:shadow-none active:scale-[0.98]">
            <Zap size={14} /> {loading ? 'Analyzing...' : 'Analyze Turn & River'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!turnResult ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
                <ArrowRight size={28} className="opacity-20" />
              </div>
              <div>
                <p className="text-sm font-medium">Select flop + turn → Analyze</p>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              {/* Turn result */}
              <div className="bg-amber-500/[0.04] border border-amber-500/15 rounded-2xl p-6">
                <span className={cn(
                  'text-[10px] px-2.5 py-1 rounded-full font-semibold',
                  turnResult.isBrick
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : turnResult.isScareCard
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-blue-500/10 text-blue-400',
                )}>
                  {turnResult.isBrick ? 'Brick' : turnResult.isScareCard ? 'Scare Card ⚠️' : 'Overcard'}
                </span>
                <p className="text-sm text-neutral-200 mt-3 mb-5 leading-relaxed">{turnResult.strategyShift.description}</p>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    {l:'Double Barrel',v:Math.round(turnResult.strategyShift.doubleBarrelFreq*100)+'%',c:'text-amber-400'},
                    {l:'Check Back',v:Math.round(turnResult.strategyShift.checkBackFreq*100)+'%',c:'text-blue-400'},
                    {l:'Best Sizing',v:turnResult.strategyShift.sizingPreference,c:'text-purple-400'},
                  ].map((x,i)=>(
                    <div key={i} className="bg-[#090D14] rounded-xl p-3.5 text-center border border-[#152233]">
                      <div className={cn('text-lg font-bold',x.c)}>{x.v}</div>
                      <div className="text-[9px] text-neutral-500 mt-0.5">{x.l}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Recommendations</div>
                {turnResult.recommendations.map((r:any,i:number)=>(
                  <div key={i} className="flex justify-between px-3.5 py-2.5 bg-[#090D14] rounded-lg mb-1 text-xs border border-[#152233]/50">
                    <span className="text-neutral-300 font-medium">{r.handType}</span>
                    <span className="text-amber-400 font-mono font-bold">{r.action}</span>
                    <span className="text-neutral-500">{Math.round(r.frequency*100)}%</span>
                  </div>
                ))}
              </div>

              {/* River result */}
              {riverResult && (
                <div className="bg-red-500/[0.04] border border-red-500/15 rounded-2xl p-6 animate-fade-in">
                  <span className={cn(
                    'text-[10px] px-2.5 py-1 rounded-full font-semibold',
                    riverResult.completedDraws.length>0
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-emerald-500/10 text-emerald-400',
                  )}>
                    {riverResult.completedDraws.length>0 ? 'Draws completed: '+riverResult.completedDraws.join(', ') : 'Draws missed'}
                  </span>
                  <p className="text-sm text-neutral-200 mt-3 mb-5 leading-relaxed">{riverResult.strategy.description}</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {l:'Value Bet',v:Math.round(riverResult.strategy.valueBetFreq*100)+'%',c:'text-emerald-400'},
                      {l:'Bluff',v:Math.round(riverResult.strategy.bluffFreq*100)+'%',c:'text-red-400'},
                      {l:'Check',v:Math.round(riverResult.strategy.checkBackFreq*100)+'%',c:'text-blue-400'},
                      {l:'Sizing',v:riverResult.strategy.sizingPreference,c:'text-purple-400'},
                    ].map((x,i)=>(
                      <div key={i} className="bg-[#090D14] rounded-xl p-3 text-center border border-[#152233]">
                        <div className={cn('text-sm font-bold',x.c)}>{x.v}</div>
                        <div className="text-[9px] text-neutral-500 mt-0.5">{x.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-500/[0.03] border border-amber-500/15 rounded-xl p-4 flex items-start gap-2.5">
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  Results are heuristic analysis based on board texture, not exact solver output. Actual GTO strategy depends on range interactions and other factors. Combine with solver verification for best results.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
