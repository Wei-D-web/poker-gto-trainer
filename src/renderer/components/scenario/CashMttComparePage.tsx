/**
 * Cash vs MTT 策略对比页面
 *
 * 选择同一场景（位置 + 码量 + 翻牌），同时展示 Cash 和 MTT 的 GTO 策略，
 * 直观对比两者在不同 game type 下的策略差异。
 *
 * 三种视图模式：
 * 1. Side by Side — 左右并列 RangeMatrix
 * 2. Difference Heatmap — 差分热力图
 * 3. Concept Explainer — 概念解释 + 关键差异分析
 */

import { useState, useMemo } from 'react'
import { RangeMatrix } from '../matrix/RangeMatrix'
import { MatrixLegend } from '../matrix/MatrixLegend'
import { useScenarioStore } from '../../stores/scenarioStore'
import { POSITION_LABELS, type Position, type ComboKey } from '@shared/types/poker'
import type { ComboStrategy } from '@shared/types/strategy'
import { cn } from '../../lib/utils'
import {
  GitCompare, TrendingUp, Shield, Coins, DollarSign, Target,
  ChevronDown, ChevronUp, Zap, Loader2,
} from 'lucide-react'

// ============================================================
// Preset scenarios — 经典对比场景
// ============================================================

const PRESET_SCENARIOS = [
  { label: 'A72r — A高干燥', board: ['Ah', '7d', '2c'], desc: '经典高频小额 cbet' },
  { label: 'KQ5tt — 高张双色', board: ['Kh', 'Qd', '5h'], desc: '中等频率，选择性 cbet' },
  { label: 'JT9tt — 极湿连接', board: ['Jh', 'Td', '9h'], desc: '低频大尺度，范围劣势' },
  { label: 'QQ5r — 公对干燥', board: ['Qh', 'Qd', '5c'], desc: '极高频率，范围+坚果优势' },
  { label: 'A53r — Wheel面', board: ['Ah', '5d', '3c'], desc: '带A低张，混合策略' },
  { label: '742r — 低张干面', board: ['7h', '4d', '2c'], desc: '范围劣势，防守为主' },
]

export function CashMttComparePage() {
  const { gameType: currentGameType, heroPosition, villainPosition, stackDepth } = useScenarioStore()

  // === State ===
  const [board, setBoard] = useState<string[]>(['Ah', '7d', '2c'])
  const [pos, setPos] = useState<Position>(3)
  const [vsPos, setVsPos] = useState<Position>(5)
  const [stack, setStack] = useState(100)
  const [ante, setAnte] = useState(0.1) // 10% ante for MTT

  const [cashResult, setCashResult] = useState<any>(null)
  const [tournamentResult, setTournamentResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'side-by-side' | 'difference' | 'concepts'>('side-by-side')
  const [selectedCombo, setSelectedCombo] = useState<ComboKey | null>(null)
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null)

  // === Load comparison ===
  const loadComparison = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.strategy.compareCashMtt({
        board,
        heroPosition: pos,
        villainPosition: vsPos,
        stackDepth: stack,
        ante,
      })
      setCashResult(result.cash)
      setTournamentResult(result.tournament)
    } catch (err) {
      console.error('Failed to load comparison:', err)
    } finally {
      setLoading(false)
    }
  }

  // === Convert to matrix combos ===
  const cashCombos = useMemo(() => {
    if (!cashResult) return null
    return cashResult.combos.map((c: any) => ({
      comboKey: c.comboKey,
      actions: c.actions.map((a: any) => ({ action: a.action, frequency: a.frequency, ev: a.ev })),
      equity: c.equity,
      weight: c.weight,
      ev: c.equity * c.weight * 0.1,
    }))
  }, [cashResult])

  const mttCombos = useMemo(() => {
    if (!tournamentResult) return null
    return tournamentResult.combos.map((c: any) => ({
      comboKey: c.comboKey,
      actions: c.actions.map((a: any) => ({ action: a.action, frequency: a.frequency, ev: a.ev })),
      equity: c.equity,
      weight: c.weight,
      ev: c.equity * c.weight * 0.1,
    }))
  }, [tournamentResult])

  // === Diff combos ===
  const diffCombos = useMemo(() => {
    if (!cashCombos || !mttCombos) return null
    return cashCombos.map((comboA: any, i: number) => {
      const comboB = mttCombos[i]
      // Diff on cbet frequency
      const getFreq = (c: any) => {
        const betAction = c.actions?.find((a: any) => a.action.startsWith('bet'))
        return betAction?.frequency || 0
      }
      const diff = getFreq(comboA) - getFreq(comboB)
      return {
        comboKey: comboA.comboKey,
        actions: [{ action: diff > 0.05 ? 'more_cash' : diff < -0.05 ? 'more_mtt' : 'same', frequency: Math.abs(diff), ev: diff }],
        equity: 0,
        weight: Math.abs(diff),
        ev: diff,
      }
    })
  }, [cashCombos, mttCombos])

  // === Selected combo detail ===
  const selectedDetail = useMemo(() => {
    if (!selectedCombo || !cashResult || !tournamentResult) return null
    const cashCombo = cashResult.combos.find((c: any) => c.comboKey === selectedCombo)
    const mttCombo = tournamentResult.combos.find((c: any) => c.comboKey === selectedCombo)
    if (!cashCombo || !mttCombo) return null

    const cashAction = cashCombo.actions.find((a: any) => a.action.startsWith('bet'))
    const mttAction = mttCombo.actions.find((a: any) => a.action.startsWith('bet'))
    const cashCheck = cashCombo.actions.find((a: any) => a.action === 'check')
    const mttCheck = mttCombo.actions.find((a: any) => a.action === 'check')

    const diff = (cashAction?.frequency || 0) - (mttAction?.frequency || 0)

    let reason = ''
    if (cashCombo.handType.includes('draw') || cashCombo.handType === 'air') {
      reason = diff > 0.05
        ? 'Cash 中诈唬频率更高（无 ICM 压力，可以更激进地半诈唬）'
        : diff < -0.05
          ? 'MTT 中诈唬更少（ICM 压力下保护生命值更重要）'
          : '策略相似'
    } else if (cashCombo.handType.includes('pair') || cashCombo.handType === 'set') {
      reason = diff > 0.05
        ? 'Cash 中价值下注频率更高（线性范围，thin value）'
        : diff < -0.05
          ? 'MTT 中更倾向 check/trap（保护手牌，极化范围）'
          : '策略相似'
    }

    return { cashCombo, mttCombo, cashAction, mttAction, cashCheck, mttCheck, diff, reason }
  }, [selectedCombo, cashResult, tournamentResult])

  // === Concept explanations ===
  const CONCEPTS = [
    {
      id: 'linear-vs-polarized',
      title: '线性范围 vs 极化范围',
      icon: TrendingUp,
      cashDesc: 'Cash: 线性范围 — value 和 bluff 使用相似的尺度（33%-50%-75%），最大化所有手牌的 EV。',
      mttDesc: 'MTT: 极化范围 — value 用大尺度（75-100%），bluff 用小尺度（33%），降低 ICM 风险。',
      example: 'BTN vs BB on A72r: Cash cbet range 包含 middle pair + air；MTT 更集中于 top pair + strong draws。',
    },
    {
      id: 'range-advantage-vs-icm',
      title: '范围优势 vs ICM 压力',
      icon: Shield,
      cashDesc: 'Cash: 翻前加注者在干燥面有大范围优势 → 高频小额 cbet (~72%)。无生存压力。',
      mttDesc: 'MTT: ICM 压力降低整体 cbet 频率 (~65%)。失败不仅损失筹码，还损失比赛生命值。',
      example: '相同 A72r 面：Cash 72% cbet, MTT ~65% cbet。MTT player 需要更谨慎。',
    },
    {
      id: 'value-driven-vs-survival',
      title: '价值导向 vs 生存导向',
      icon: DollarSign,
      cashDesc: 'Cash: 每一个 +EV 决策都直接转化为利润。深码时可以玩更 tricky（设陷阱、慢打）。',
      mttDesc: 'MTT: 不是所有 +cEV 决策都是 +$EV。接近泡沫期时，避免接近零 EV 的高波动决策。',
      example: 'Cash 中可以 thin value bet middle pair；MTT 中 check 保护筹码可能更优。',
    },
    {
      id: 'implied-odds-vs-reverse-implied',
      title: '隐含赔率 vs 反隐含赔率',
      icon: Coins,
      cashDesc: 'Cash: 深码（>150bb）时隐含赔率巨大。Suited connectors、small pairs 的价值显著上升。',
      mttDesc: 'MTT: 浅码（<30bb）时反隐含赔率严重。小对子失去 set-mining 价值，high cards 上升。',
      example: 'Cash 200bb: 65s 在 BTN 开池 65%；MTT 25bb: 65s 多弃牌，A2s 开池频率上升。',
    },
    {
      id: 'ante-effect',
      title: 'Ante 效应（仅 MTT）',
      icon: Zap,
      cashDesc: 'Cash: 无 ante，底池 = 1.5bb。BB 防守压力较小。',
      mttDesc: 'MTT: 有 ante（通常 0.1bb），底池 = 2.3bb。BB 防守更宽，开池有额外动力。',
      example: 'MTT ante 0.1bb: BB 防守范围 +5-8%。开池偷盲 EV 上升（底池更大）。',
    },
  ]

  // === Stats summary ===
  const stats = useMemo(() => {
    if (!cashResult || !tournamentResult) return null
    const cashInRange = cashResult.combos.filter((c: any) => c.weight > 0.05).length
    const mttInRange = tournamentResult.combos.filter((c: any) => c.weight > 0.05).length
    return {
      cashCbet: Math.round(cashResult.overallCbetFreq * 100),
      mttCbet: Math.round(tournamentResult.overallCbetFreq * 100),
      cashSizing: cashResult.recommendedSizing,
      mttSizing: tournamentResult.recommendedSizing,
      cashInRange,
      mttInRange,
      rangeDiff: cashInRange - mttInRange,
    }
  }, [cashResult, tournamentResult])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header px-6 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <GitCompare size={18} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Cash vs MTT 策略对比</h2>
            <p className="text-xs text-neutral-500">同一场景下，现金局与锦标赛的 GTO 策略差异分析</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Position</span>
            <select
              value={pos}
              onChange={e => setPos(Number(e.target.value) as Position)}
              className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50"
            >
              {([0, 1, 2, 3, 4, 5] as Position[]).map(p => (
                <option key={p} value={p}>{POSITION_LABELS[p]}</option>
              ))}
            </select>
            <span className="text-xs text-neutral-600">vs</span>
            <select
              value={vsPos}
              onChange={e => setVsPos(Number(e.target.value) as Position)}
              className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50"
            >
              {([0, 1, 2, 3, 4, 5] as Position[]).filter(p => p !== pos).map(p => (
                <option key={p} value={p}>{POSITION_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block mb-1">Stack</span>
            <select
              value={stack}
              onChange={e => setStack(Number(e.target.value))}
              className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50"
            >
              {[10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200].map(d => (
                <option key={d} value={d}>{d}bb</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block mb-1">MTT Ante</span>
            <select
              value={ante}
              onChange={e => setAnte(Number(e.target.value))}
              className="bg-[#0F141C] border border-[#1C2A3D] rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500/50"
            >
              {[0, 0.05, 0.1, 0.125, 0.15, 0.2].map(a => (
                <option key={a} value={a}>{a > 0 ? `${Math.round(a * 100)}% bb` : '无'}</option>
              ))}
            </select>
          </div>
          <div className="pt-[18px]">
            <button
              onClick={loadComparison}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-500/8 hover:bg-indigo-500/12 text-indigo-400 rounded-lg transition-colors border border-indigo-500/15 disabled:opacity-40 flex items-center gap-1.5"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Target size={13} />}
              {loading ? '分析中...' : '对比分析'}
            </button>
          </div>
        </div>

        {/* Preset scenarios */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {PRESET_SCENARIOS.map(s => (
            <button
              key={s.label}
              onClick={() => setBoard(s.board)}
              className={cn(
                'px-2.5 py-1 text-[11px] rounded-md transition-all border',
                board.join('') === s.board.join('')
                  ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                  : 'bg-[#0F141C] border-[#1C2A3D] text-neutral-500 hover:text-neutral-300 hover:border-neutral-600',
              )}
              title={s.desc}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Current board display */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Board:</span>
          <div className="flex gap-1.5">
            {board.map((card, i) => (
              <span key={i} className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold font-mono border',
                card[1] === 'h' || card[1] === 'd' ? 'text-red-400 border-red-500/20 bg-red-500/5' : 'text-neutral-300 border-[#1C2A3D] bg-[#0F141C]',
              )}>
                {card[0]}{card[1] === 'h' ? '♥' : card[1] === 'd' ? '♦' : card[1] === 'c' ? '♣' : '♠'}
              </span>
            ))}
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 mt-3 bg-[#0F141C] rounded-lg p-0.5 w-fit ring-1 ring-white/[0.03]">
          {([
            { id: 'side-by-side' as const, label: '并列对比' },
            { id: 'difference' as const, label: '差分热力' },
            { id: 'concepts' as const, label: '概念解释' },
          ]).map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md font-medium transition-all',
                viewMode === mode.id ? 'bg-indigo-500/12 text-indigo-400' : 'text-neutral-500 hover:text-neutral-300',
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!cashResult || !tournamentResult ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-neutral-800/20 flex items-center justify-center">
              <GitCompare size={36} className="opacity-15" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1">选择场景后点击"对比分析"</p>
              <p className="text-xs text-neutral-700">将展示 Cash 和 MTT 在同一场景下的策略差异</p>
            </div>
          </div>
        ) : viewMode === 'concepts' ? (
          // === Concept Explainer View ===
          <div className="max-w-3xl mx-auto space-y-4">
            {stats && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                <StatCard label="Cash c-bet" value={`${stats.cashCbet}%`} sub={stats.cashSizing} color="emerald" />
                <StatCard label="MTT c-bet" value={`${stats.mttCbet}%`} sub={stats.mttSizing} color="purple" />
                <StatCard label="Cash 范围" value={`${stats.cashInRange}`} sub="combos" color="emerald" />
                <StatCard label="MTT 范围" value={`${stats.mttInRange}`} sub={`${stats.rangeDiff > 0 ? '+' : ''}${stats.rangeDiff}`} color="purple" />
              </div>
            )}
            <h3 className="text-sm font-semibold text-neutral-300 mb-3">核心策略差异概念</h3>
            {CONCEPTS.map(concept => {
              const ConceptIcon = concept.icon
              const isExpanded = expandedConcept === concept.id
              return (
                <div key={concept.id} className="bg-[#090D14] rounded-xl border border-[#152233] overflow-hidden">
                  <button
                    onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <ConceptIcon size={16} className="text-indigo-400" />
                    </div>
                    <span className="text-sm font-medium text-neutral-200 flex-1">{concept.title}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3 animate-fade-in">
                      <div className="bg-emerald-500/[0.04] rounded-lg p-3 border border-emerald-500/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-400">Cash</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">{concept.cashDesc}</p>
                      </div>
                      <div className="bg-purple-500/[0.04] rounded-lg p-3 border border-purple-500/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-xs font-semibold text-purple-400">MTT (Tournament)</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">{concept.mttDesc}</p>
                      </div>
                      <div className="bg-amber-500/[0.04] rounded-lg p-3 border border-amber-500/10">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-semibold text-amber-400">示例</span>
                        </div>
                        <p className="text-xs text-neutral-400 leading-relaxed">{concept.example}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : viewMode === 'difference' && diffCombos ? (
          // === Diff Heatmap View ===
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/70" />
                <span className="text-xs text-neutral-400">Cash 频率更高</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-purple-500/70" />
                <span className="text-xs text-neutral-400">MTT 频率更高</span>
              </div>
            </div>
            <div className="bg-[#090D14] p-4 rounded-2xl border border-[#152233]">
              <RangeMatrix
                combos={diffCombos}
                selectedCombo={selectedCombo}
                hoveredCombo={null}
                onSelectCombo={setSelectedCombo}
                onHoverCombo={() => {}}
                size="comfortable"
              />
            </div>
            {/* Selected combo diff detail */}
            {selectedDetail && selectedDetail.diff !== 0 && (
              <div className="mt-4 p-3 bg-[#090D14] rounded-xl border border-[#152233] max-w-md">
                <p className="text-xs font-semibold text-neutral-300 mb-1">{selectedCombo} — {selectedDetail.cashCombo.handType}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400">Cash: {selectedDetail.cashAction?.action || 'check'} @ {Math.round((selectedDetail.cashAction?.frequency || selectedDetail.cashCheck?.frequency || 0) * 100)}%</span>
                  <span className="text-neutral-600">→</span>
                  <span className="text-purple-400">MTT: {selectedDetail.mttAction?.action || 'check'} @ {Math.round((selectedDetail.mttAction?.frequency || selectedDetail.mttCheck?.frequency || 0) * 100)}%</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">{selectedDetail.reason}</p>
              </div>
            )}
          </div>
        ) : cashCombos && mttCombos ? (
          // === Side by Side View ===
          <div>
            {stats && (
              <div className="grid grid-cols-4 gap-3 mb-6 max-w-xl mx-auto">
                <StatCard label="Cash c-bet" value={`${stats.cashCbet}%`} sub={`sizing: ${stats.cashSizing}`} color="emerald" />
                <StatCard label="MTT c-bet" value={`${stats.mttCbet}%`} sub={`sizing: ${stats.mttSizing}`} color="purple" />
                <StatCard label="差异" value={`${stats.cashCbet - stats.mttCbet > 0 ? '+' : ''}${stats.cashCbet - stats.mttCbet}%`} sub="cbet频率" color="amber" />
                <StatCard label="Sizing模式" value={stats.cashSizing === stats.mttSizing ? "相同" : "不同"} sub="Cash vs MTT" color={stats.cashSizing === stats.mttSizing ? "neutral" : "amber"} />
              </div>
            )}
            <div className="flex gap-8 justify-center items-start">
              <div>
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-semibold text-emerald-400">
                    Cash — {POSITION_LABELS[pos]} vs {POSITION_LABELS[vsPos]} ({stack}bb)
                  </h3>
                </div>
                <div className="bg-[#090D14] p-4 rounded-2xl border border-emerald-500/15">
                  <RangeMatrix
                    combos={cashCombos}
                    selectedCombo={selectedCombo}
                    hoveredCombo={null}
                    onSelectCombo={setSelectedCombo}
                    onHoverCombo={() => {}}
                    size="compact"
                  />
                </div>
              </div>
              <div className="flex items-center justify-center pt-24">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <GitCompare size={18} className="text-indigo-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <h3 className="text-sm font-semibold text-purple-400">
                    MTT — {POSITION_LABELS[pos]} vs {POSITION_LABELS[vsPos]} ({stack}bb{ante > 0 ? `, ante ${Math.round(ante * 100)}%` : ''})
                  </h3>
                </div>
                <div className="bg-[#090D14] p-4 rounded-2xl border border-purple-500/15">
                  <RangeMatrix
                    combos={mttCombos}
                    selectedCombo={selectedCombo}
                    hoveredCombo={null}
                    onSelectCombo={setSelectedCombo}
                    onHoverCombo={() => {}}
                    size="compact"
                  />
                </div>
              </div>
            </div>
            {/* Selected combo detail */}
            {selectedDetail && (
              <div className="mt-6 p-4 bg-[#090D14] rounded-xl border border-[#152233] max-w-lg mx-auto">
                <p className="text-sm font-semibold text-neutral-300 mb-2">{selectedCombo} — {selectedDetail.cashCombo.handType}</p>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-emerald-400 font-semibold">Cash</span>
                    <div className="text-neutral-400">bet: {Math.round((selectedDetail.cashAction?.frequency || 0) * 100)}%</div>
                    <div className="text-neutral-400">check: {Math.round((selectedDetail.cashCheck?.frequency || 0) * 100)}%</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-purple-400 font-semibold">MTT</span>
                    <div className="text-neutral-400">bet: {Math.round((selectedDetail.mttAction?.frequency || 0) * 100)}%</div>
                    <div className="text-neutral-400">check: {Math.round((selectedDetail.mttCheck?.frequency || 0) * 100)}%</div>
                  </div>
                </div>
                {selectedDetail.reason && (
                  <p className="text-xs text-neutral-500 mt-3 leading-relaxed border-t border-[#152233] pt-3">{selectedDetail.reason}</p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Stats card component */
function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500/15 bg-emerald-500/[0.04]',
    purple: 'border-purple-500/15 bg-purple-500/[0.04]',
    amber: 'border-amber-500/15 bg-amber-500/[0.04]',
    neutral: 'border-[#152233] bg-[#0F141C]',
  }
  const textColorMap: Record<string, string> = {
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
    neutral: 'text-neutral-400',
  }
  return (
    <div className={cn('rounded-xl p-3 border', colorMap[color] || colorMap.neutral)}>
      <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={cn('text-lg font-bold', textColorMap[color] || textColorMap.neutral)}>{value}</div>
      <div className="text-[10px] text-neutral-600">{sub}</div>
    </div>
  )
}
