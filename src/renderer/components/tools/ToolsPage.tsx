import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Calculator, Play, BookOpen, ChevronRight, DollarSign, Percent, TrendingUp, Target, Zap } from 'lucide-react'

type ToolTab = 'potodds' | 'replayer' | 'reference'

export function ToolsPage() {
  const [tab, setTab] = useState<ToolTab>('potodds')

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Calculator size={18} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Tools</h2>
            <p className="text-xs text-neutral-500">Quick calculators & references</p>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 bg-[#0F141C] rounded-lg p-0.5 w-fit ring-1 ring-white/[0.03]">
          {([
            { id: 'potodds' as const, icon: Percent, label: 'Pot Odds' },
            { id: 'replayer' as const, icon: Play, label: 'Hand Replayer' },
            { id: 'reference' as const, icon: BookOpen, label: 'GTO Ref' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('px-3 py-1.5 text-[11px] rounded-md font-medium transition-all flex items-center gap-1.5',
                tab === t.id ? 'bg-blue-500/12 text-blue-400' : 'text-neutral-500 hover:text-neutral-300')}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'potodds' && <PotOddsCalculator />}
        {tab === 'replayer' && <HandReplayer />}
        {tab === 'reference' && <GTOReference />}
      </div>
    </div>
  )
}

/** ===== POT ODDS & EQUITY CALCULATOR ===== */
function PotOddsCalculator() {
  const [pot, setPot] = useState(100)
  const [bet, setBet] = useState(50)
  const [callAmount, setCallAmount] = useState(50)
  const [outs, setOuts] = useState(9)
  const [street, setStreet] = useState<'flop' | 'turn'>('flop')

  const potOdds = callAmount / (pot + bet + callAmount) * 100
  const requiredEquity = potOdds
  const equityByOuts = street === 'flop' ? outs * 4 : outs * 2
  const isProfitable = equityByOuts > requiredEquity
  const impliedOddsMultiplier = 1 + (bet / Math.max(1, pot))

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Scenario</h3>

          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Pot Size (bb)</label>
            <input type="number" value={pot} onChange={e => setPot(Number(e.target.value))}
              className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50" />
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Opponent Bet (bb)</label>
            <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))}
              className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50" />
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Amount to Call (bb)</label>
            <input type="number" value={callAmount} onChange={e => setCallAmount(Number(e.target.value))}
              className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50" />
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Outs</label>
            <input type="number" value={outs} onChange={e => setOuts(Number(e.target.value))} min={0} max={25}
              className="w-full bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50" />
          </div>

          <div>
            <label className="text-[10px] text-neutral-500 block mb-1">Street</label>
            <div className="flex gap-1">
              {(['flop', 'turn'] as const).map(s => (
                <button key={s} onClick={() => setStreet(s)}
                  className={cn('flex-1 py-1.5 text-xs rounded-lg font-medium transition-all',
                    street === s ? 'bg-blue-500/12 text-blue-400 ring-1 ring-blue-500/25' : 'bg-[#0F141C] text-neutral-500')}>
                  {s === 'flop' ? 'Flop (×4)' : 'Turn (×2)'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick scenarios */}
          <div className="flex gap-1 flex-wrap">
            <span className="text-[9px] text-neutral-600 self-center">Quick:</span>
            {[
              { l: '½ pot', p: 100, b: 50 },
              { l: '¾ pot', p: 100, b: 75 },
              { l: 'Pot', p: 100, b: 100 },
              { l: 'FD', o: 9 },
              { l: 'OESD', o: 8 },
              { l: 'Gutshot', o: 4 },
            ].map(q => (
              <button key={q.l} onClick={() => {
                if (q.p !== undefined) { setPot(q.p); setBet(q.b!); setCallAmount(q.b!) }
                if (q.o !== undefined) setOuts(q.o)
              }}
                className="px-2 py-0.5 text-[9px] bg-[#0F141C] hover:bg-[#151B28] text-neutral-500 rounded transition-colors">
                {q.l}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Results</h3>

          <div className="grid gap-3">
            <ResultCard icon={Percent} label="Pot Odds" value={`${Math.round(potOdds)}%`}
              sub={`Need to win ${Math.round(requiredEquity)}% of the time`} color="text-blue-400" />

            <ResultCard icon={Target} label="Your Equity" value={`~${equityByOuts}%`}
              sub={`${outs} outs × ${street === 'flop' ? 4 : 2} rule`} color="text-amber-400" />

            <ResultCard icon={isProfitable ? TrendingUp : TrendingUp} label="Decision"
              value={isProfitable ? '✅ Call is +EV' : '❌ Fold'}
              sub={isProfitable ? `Equity ${equityByOuts}% > required ${Math.round(requiredEquity)}%` : `Need ${Math.round(requiredEquity - equityByOuts)}% more equity`}
              color={isProfitable ? 'text-emerald-400' : 'text-red-400'} />

            <ResultCard icon={DollarSign} label="Implied Odds Multiplier"
              value={`${impliedOddsMultiplier.toFixed(1)}×`}
              sub="Effective stack needed for implied odds" color="text-purple-400" />

            <ResultCard icon={Zap} label="Rule of 4 & 2"
              value={street === 'flop' ? `${outs} × 4 = ${outs * 4}%` : `${outs} × 2 = ${outs * 2}%`}
              sub="Approximate equity to hit by river" color="text-neutral-400" />
          </div>

          <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-xs text-neutral-400 leading-relaxed">
            <b className="text-neutral-200">How to use:</b> Input the pot size, opponent's bet, and your outs.
            If your equity exceeds the required equity (pot odds), calling is +EV.
            The Rule of 4&2 gives approximate equity: multiply outs by 4 on the flop (two cards to come), by 2 on the turn (one card to come).
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className={color} />
        <span className="text-[10px] text-neutral-500 font-medium">{label}</span>
      </div>
      <div className={cn('text-xl font-bold', color)}>{value}</div>
      <div className="text-[10px] text-neutral-600 mt-0.5">{sub}</div>
    </div>
  )
}

/** ===== HAND REPLAYER ===== */
function HandReplayer() {
  const [hands, setHands] = useState<any[]>([])
  const [selectedHand, setSelectedHand] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState(0)

  const loadHands = async () => {
    try {
      const r = await window.electronAPI.handHistory.list({ limit: 20 })
      setHands(r.hands)
      setLoaded(true)
    } catch { /*empty*/ }
  }

  if (!loaded) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <Play size={40} className="text-neutral-600 mx-auto opacity-30" />
        <p className="text-sm text-neutral-400">Replay imported hands step by step</p>
        <button onClick={loadHands}
          className="px-4 py-2 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/15 text-blue-400 rounded-xl transition-colors">
          Load Hands
        </button>
      </div>
    )
  }

  if (hands.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <Play size={40} className="text-neutral-600 mx-auto opacity-30" />
        <p className="text-sm text-neutral-400">No hand histories imported yet</p>
        <p className="text-xs text-neutral-600">Import hands in Hand History (⌘5) first</p>
      </div>
    )
  }

  if (selectedHand) {
    const actions = typeof selectedHand.actions === 'string' ? JSON.parse(selectedHand.actions || '[]') : (selectedHand.actions || [])
    const currentActions = actions.slice(0, step + 1)
    const boardCards = selectedHand.board || []

    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectedHand(null); setStep(0) }}
            className="text-xs text-neutral-500 hover:text-neutral-300">← Back</button>
        </div>

        <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-neutral-200">{selectedHand.heroHand?.join(' ') || '??'}</span>
              <span className="text-xs text-neutral-500 ml-2">vs opponent</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400">
              {selectedHand.potSize}bb pot
            </span>
          </div>

          {/* Board */}
          {boardCards.length > 0 && (
            <div className="flex gap-2">
              {boardCards.map((c: string, i: number) => (
                <span key={i} className="px-3 py-2 bg-[#0F141C] border border-[#1C2A3D] rounded-lg text-sm font-mono font-bold text-neutral-100">
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Actions timeline */}
          <div className="space-y-1">
            {actions.map((a: any, i: number) => (
              <div key={i} className={cn(
                'px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all',
                i === step ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' :
                i <= step ? 'bg-white/[0.02] text-neutral-400' : 'text-neutral-700',
              )}>
                <span className="w-12 text-[10px] font-medium">{a.street}</span>
                <span className="w-10 text-[10px]">{a.actor === 'hero' ? '我' : '对手'}</span>
                <ChevronRight size={10} />
                <span>{a.action?.replace(/_/g, ' ') || a.action}</span>
                {a.amount > 0 && <span className="text-neutral-500">{a.amount}bb</span>}
              </div>
            ))}
          </div>

          {/* Step controls */}
          <div className="flex items-center gap-2 justify-center pt-2">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
              className="px-3 py-1.5 text-xs bg-[#0F141C] text-neutral-400 rounded-lg disabled:opacity-30 hover:bg-[#151B28] transition-colors">
              ← Prev
            </button>
            <span className="text-[10px] text-neutral-600">{step + 1} / {actions.length}</span>
            <button onClick={() => setStep(Math.min(actions.length - 1, step + 1))} disabled={step >= actions.length - 1}
              className="px-3 py-1.5 text-xs bg-[#0F141C] text-neutral-400 rounded-lg disabled:opacity-30 hover:bg-[#151B28] transition-colors">
              Next →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto grid gap-2">
      {hands.map((h: any) => (
        <button key={h.id} onClick={() => { setSelectedHand(h); setStep(0) }}
          className="text-left bg-[#090D14] border border-[#152233] rounded-xl p-4 hover:border-[#2A3B52] transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-neutral-200 font-mono font-bold">{h.heroHand?.join(' ') || '??'}</span>
              <span className="text-xs text-neutral-500 ml-2">{h.board?.length > 0 ? h.board.join(' ') : 'Preflop'}</span>
            </div>
            <div>
              {h.analyzed ? (
                <span className={cn('text-xs font-bold', h.grade?.startsWith('A') ? 'text-emerald-400' : 'text-amber-400')}>
                  {h.grade}
                </span>
              ) : (
                <span className="text-[10px] text-neutral-600">Not analyzed</span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

/** ===== GTO QUICK REFERENCE ===== */
const GTO_SECTIONS = [
  {
    title: 'C-Bet Frequencies by Board Texture',
    icon: Target,
    color: 'text-blue-400',
    items: [
      { texture: 'A-high dry (A72r)', freq: '65-75%', sizing: '33% pot', note: 'Range advantage + nut advantage → high frequency small sizing' },
      { texture: 'Broadway heavy (KQ2r)', freq: '55-65%', sizing: '33-50%', note: 'Moderate advantage, mix sizes for polarized range' },
      { texture: 'Paired (QQ3r)', freq: '70-80%', sizing: '33%', note: 'Very high frequency — paired boards favor preflop raiser' },
      { texture: 'Wet/Connected (JT9tt)', freq: '40-50%', sizing: '50-75%', note: 'Lower frequency, larger sizing to charge draws' },
      { texture: 'Monotone (Kh9h4h)', freq: '45-55%', sizing: '33-50%', note: 'Moderate frequency, range check flushes without a heart' },
      { texture: 'Low dry (742r)', freq: '70-80%', sizing: '33%', note: 'Missed boards favor aggressor heavily → high c-bet' },
      { texture: 'Ace-high wet (AT3tt)', freq: '55-65%', sizing: '50%', note: 'Ace hits both ranges, moderate c-bet with equity' },
      { texture: 'Double Broadway (KJ6r)', freq: '60-70%', sizing: '33-50%', note: 'Broadway heavy means more connected to both ranges' },
    ],
  },
  {
    title: '3-Bet & 4-Bet Sizing',
    icon: Zap,
    color: 'text-amber-400',
    items: [
      { texture: '3-bet IP vs EP open', freq: '3× the open', sizing: '~9-10bb @ 100bb', note: 'Linear range: JJ+, AK, AQs, KQs, some A5s-A3s bluffs' },
      { texture: '3-bet OOP (SB vs BTN)', freq: '4× the open', sizing: '~11-12bb @ 100bb', note: 'Larger OOP to reduce positional disadvantage' },
      { texture: '4-bet IP', freq: '2.2× the 3-bet', sizing: '~22bb @ 100bb', note: 'Polarized: QQ+, AK for value, A5s/A4s as bluffs' },
      { texture: 'Cold 4-bet', freq: '2.5× the 3-bet', sizing: '~25bb @ 100bb', note: 'Extremely strong: KK+, sometimes AKs/QQ' },
      { texture: '3-bet short stack (30bb)', freq: '3× + all-in possible', sizing: '~8bb (1/4 stack)', note: 'Commitment threshold: if 3-bet >30% stack, consider jam' },
    ],
  },
  {
    title: 'Preflop Range Guidelines (100bb Cash)',
    icon: TrendingUp,
    color: 'text-emerald-400',
    items: [
      { texture: 'UTG RFI', freq: '~16%', sizing: '2.5bb', note: '88+, ATs+, KJs+, AQo+, KQo' },
      { texture: 'MP RFI', freq: '~20%', sizing: '2.5bb', note: '66+, A9s+, KTs+, QJs+, AJo+, KQo' },
      { texture: 'CO RFI', freq: '~26%', sizing: '2.5bb', note: '55+, A5s+, K9s+, QTs+, JTs, ATo+, KJo+' },
      { texture: 'BTN RFI', freq: '~40%', sizing: '2.5bb', note: '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 98s+, most offsuit broadways' },
      { texture: 'SB RFI', freq: '~35%', sizing: '3bb', note: 'Similar to BTN but larger sizing (OOP postflop)' },
      { texture: 'BB vs BTN defend', freq: '~40-50%', sizing: 'N/A', note: 'Wide defend: most suited, pairs, broadways. Fold bottom 50%' },
    ],
  },
]

function GTOReference() {
  const [expanded, setExpanded] = useState<number | null>(0)

  return (
    <div className="max-w-2xl mx-auto space-y-3 animate-fade-in">
      <p className="text-xs text-neutral-500 mb-2">GTO strategy guidelines based on solver outputs. Use as a quick reference, not exact prescriptions.</p>

      {GTO_SECTIONS.map((section, si) => {
        const Icon = section.icon
        return (
          <div key={si} className="bg-[#090D14] border border-[#152233] rounded-xl overflow-hidden">
            <button onClick={() => setExpanded(expanded === si ? null : si)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors">
              <Icon size={15} className={section.color} />
              <span className="text-sm font-semibold text-neutral-200 flex-1">{section.title}</span>
              <ChevronRight size={13} className={cn('text-neutral-600 transition-transform', expanded === si && 'rotate-90')} />
            </button>

            {expanded === si && (
              <div className="px-4 pb-4 border-t border-[#152233] animate-fade-in">
                <div className="divide-y divide-[#152233]/50">
                  {section.items.map((item, ii) => (
                    <div key={ii} className="py-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-neutral-300">{item.texture}</span>
                        <div className="flex items-center gap-2">
                          {item.freq && <span className="text-[10px] text-amber-400 font-semibold">{item.freq}</span>}
                          {item.sizing && <span className="text-[10px] text-blue-400 font-mono">{item.sizing}</span>}
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-500 leading-relaxed">{item.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
