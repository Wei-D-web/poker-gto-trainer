import { useBluffCatcherStore } from '../../stores/bluffCatcherStore'
import { cn } from '../../lib/utils'
import { Target, Check, X, TrendingUp, RotateCcw, Shield, Zap } from 'lucide-react'

/**
 * River Bluff Catcher Training Page
 *
 * Training module for river bluff-catching decisions.
 * Flow: Setup → Quiz → Results
 */

// ============================================================
// Setup Screen
// ============================================================

function SetupScreen() {
  const count = useBluffCatcherStore((s) => s.count)
  const setCount = useBluffCatcherStore((s) => s.setCount)
  const difficulty = useBluffCatcherStore((s) => s.difficulty)
  const setDifficulty = useBluffCatcherStore((s) => s.setDifficulty)
  const startQuiz = useBluffCatcherStore((s) => s.startQuiz)

  const DIFFICULTIES: { key: 'beginner' | 'intermediate' | 'advanced'; label: string; desc: string }[] = [
    { key: 'beginner', label: '初级', desc: '纯call/纯fold场景，大尺度下注' },
    { key: 'intermediate', label: '中级', desc: '混合策略+阻断牌分析' },
    { key: 'advanced', label: '高级', desc: '小尺度+混合频率+overbet' },
  ]

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Shield size={18} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">River Bluff Catcher</h2>
            <p className="text-xs text-neutral-500">河牌 bluff catching 决策训练</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <Shield size={48} className="text-orange-400/40 mx-auto" />

          <div>
            <h3 className="text-lg font-bold text-neutral-200 mb-2">河牌 Bluff Catcher 训练</h3>
            <p className="text-sm text-neutral-500 mb-1">
              对手在河牌下注，你持中等牌力 — call 还是 fold？
            </p>
            <p className="text-xs text-neutral-600">
              训练你的 MDF 直觉、阻断牌分析、尺度判断力
            </p>
          </div>

          {/* Question count */}
          <div>
            <span className="text-xs text-neutral-500 mb-2 block">题目数量</span>
            <div className="flex items-center gap-3 justify-center">
              {[5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg font-semibold transition-all',
                    count === n
                      ? 'bg-orange-500/12 text-orange-400 ring-1 ring-orange-500/25'
                      : 'bg-[#0F141C] text-neutral-500 hover:text-neutral-300',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <span className="text-xs text-neutral-500 mb-2 block">难度</span>
            <div className="flex gap-2 justify-center">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDifficulty(d.key)}
                  className={cn(
                    'flex-1 p-3 rounded-xl border transition-all text-left max-w-[120px]',
                    difficulty === d.key
                      ? 'border-orange-500/30 bg-orange-500/8 ring-1 ring-orange-500/20'
                      : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]',
                  )}
                >
                  <div className="text-xs font-semibold text-neutral-200">{d.label}</div>
                  <div className="text-[10px] text-neutral-600 mt-0.5 leading-relaxed">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startQuiz}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-sm shadow-[0_2px_16px_rgba(249,115,22,0.2)] hover:shadow-[0_4px_24px_rgba(249,115,22,0.3)] transition-all"
          >
            Start Training
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Quiz Screen
// ============================================================

function QuizScreen() {
  const questions = useBluffCatcherStore((s) => s.questions)
  const currentIndex = useBluffCatcherStore((s) => s.currentIndex)
  const answers = useBluffCatcherStore((s) => s.answers)
  const submitAnswer = useBluffCatcherStore((s) => s.submitAnswer)
  const nextQuestion = useBluffCatcherStore((s) => s.nextQuestion)
  const reset = useBluffCatcherStore((s) => s.reset)

  const q = questions[currentIndex]
  if (!q) return null

  const currentAnswer = answers[currentIndex]
  const hasAnswered = !!currentAnswer
  const progress = Math.round((currentIndex / questions.length) * 100)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Shield size={18} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-neutral-200">
                Bluff Catcher #{currentIndex + 1}/{questions.length}
              </h2>
              <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden max-w-[120px]">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <button
            onClick={reset}
            className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            退出
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Scenario description */}
          <div className="bg-[#0A0E14] border border-white/[0.04] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-orange-500/10 text-orange-400 rounded">
                River Decision
              </span>
              <span className="text-[10px] text-neutral-600">
                Pot: {q.scenario.potSize}BB · Bet: {q.scenario.betSize}BB · Stack: 100BB
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-neutral-500">Board</span>
                <div className="flex gap-1.5 mt-1">
                  {q.scenario.board.map((card: string, i: number) => {
                    const isRiver = i === 4
                    const suitChar = card[card.length - 1]
                    const rankChar = card[0]
                    const isRed = suitChar === 'h' || suitChar === 'd'
                    return (
                      <div
                        key={i}
                        className={cn(
                          'w-10 h-14 rounded-lg border flex flex-col items-center justify-center text-xs font-bold',
                          isRed ? 'text-red-400 border-red-500/20 bg-red-500/5' : 'text-neutral-200 border-white/10 bg-white/[0.02]',
                          isRiver && 'ring-1 ring-amber-500/40',
                        )}
                      >
                        <span>{rankChar}</span>
                        <span className="text-[10px]">{suitChar === 'h' ? '♥' : suitChar === 'd' ? '♦' : suitChar === 's' ? '♤' : '♧'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-neutral-500">Your Hand</span>
                <div className="flex gap-1.5 mt-1">
                  <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-bold font-mono">
                    {q.scenario.heroHand.toUpperCase()}
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-400 mt-3 leading-relaxed bg-[#06080C] rounded-lg p-3 border border-white/[0.02]">
                {q.scenario.description}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {!hasAnswered ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => submitAnswer('call')}
                className="p-5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 hover:bg-emerald-500/12 hover:border-emerald-500/30 transition-all group"
              >
                <div className="text-lg font-bold text-emerald-400 group-hover:text-emerald-300">Call</div>
                <div className="text-[11px] text-neutral-500 mt-1">我认为他在 bluff</div>
              </button>
              <button
                onClick={() => submitAnswer('fold')}
                className="p-5 rounded-xl bg-red-500/8 border border-red-500/20 hover:bg-red-500/12 hover:border-red-500/30 transition-all group"
              >
                <div className="text-lg font-bold text-red-400 group-hover:text-red-300">Fold</div>
                <div className="text-[11px] text-neutral-500 mt-1">我不做 hero call</div>
              </button>
            </div>
          ) : (
            /* Feedback card */
            <div
              className={cn(
                'rounded-xl p-5 space-y-4 border',
                currentAnswer.isCorrect
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/20',
              )}
            >
              {/* Result header */}
              <div className="flex items-center gap-3">
                {currentAnswer.isCorrect ? (
                  <>
                    <Check size={20} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">正确答案！</span>
                  </>
                ) : (
                  <>
                    <X size={20} className="text-red-400" />
                    <span className="text-sm font-semibold text-red-400">
                      错误 — 应该 {q.scenario.solution.correctAction === 'call' ? 'Call' : 'Fold'}
                    </span>
                  </>
                )}
                <span className="text-[10px] text-neutral-600 ml-auto">
                  MDF: {(q.scenario.solution.mdf * 100).toFixed(0)}%
                </span>
              </div>

              {/* Explanation */}
              <p className="text-xs text-neutral-300 leading-relaxed">
                {q.scenario.solution.explanation}
              </p>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2">
                <DetailItem label="牌力" value={q.scenario.solution.handStrength} />
                <DetailItem label="决策类型" value={
                  q.scenario.solution.decisionType === 'pure_call' ? '纯 Call' :
                  q.scenario.solution.decisionType === 'pure_fold' ? '纯 Fold' :
                  `混合 (${((q.scenario.solution.mixedFreq ?? 0) * 100).toFixed(0)}% call)`
                } />
                <DetailItem label="EV(call)" value={`${q.scenario.solution.evCall > 0 ? '+' : ''}${q.scenario.solution.evCall} BB`} />
                <DetailItem label="所需胜率" value={`${q.scenario.solution.requiredEquity}%`} />
              </div>

              {/* Blockers info */}
              {(q.scenario.solution.blockersValue.length > 0 || q.scenario.solution.blockersBluff.length > 0) && (
                <div className="bg-[#06080C] rounded-lg p-3 space-y-1.5">
                  {q.scenario.solution.blockersValue.length > 0 && (
                    <div className="text-[11px]">
                      <span className="text-emerald-400 font-semibold">Block 价值: </span>
                      <span className="text-neutral-400">{q.scenario.solution.blockersValue.join(', ')}</span>
                    </div>
                  )}
                  {q.scenario.solution.blockersBluff.length > 0 && (
                    <div className="text-[11px]">
                      <span className="text-red-400 font-semibold">Block 诈唬: </span>
                      <span className="text-neutral-400">{q.scenario.solution.blockersBluff.join(', ')}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-neutral-600 mt-1">
                    💡 {q.scenario.solution.blockersValue.length > 0 ? 'Block 价值牌 → 倾向 call' : 'Block 诈唬牌 → 倾向 fold'}
                  </div>
                </div>
              )}

              {/* Next button */}
              <button
                onClick={nextQuestion}
                className="w-full py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 text-sm font-semibold transition-all"
              >
                {currentIndex + 1 >= questions.length ? '查看结果' : '下一题 →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#06080C] rounded-lg p-2.5">
      <div className="text-[10px] text-neutral-600 mb-0.5">{label}</div>
      <div className="text-xs text-neutral-300 font-medium">{value}</div>
    </div>
  )
}

// ============================================================
// Results Screen
// ============================================================

function ResultsScreen() {
  const correctCount = useBluffCatcherStore((s) => s.correctCount)
  const answers = useBluffCatcherStore((s) => s.answers)
  const reset = useBluffCatcherStore((s) => s.reset)

  const total = answers.length
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Training Results</h2>
            <p className="text-xs text-neutral-500">河牌 Bluff Catcher 训练完成</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Score card */}
          <div className="bg-[#0A0E14] border border-white/[0.04] rounded-xl p-6 text-center">
            <div className="text-6xl font-bold mb-2">
              <span className={accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-amber-400' : 'text-red-400'}>
                {accuracy}%
              </span>
            </div>
            <div className="text-sm text-neutral-400">
              {correctCount}/{total} 正确
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              {accuracy >= 80
                ? '🃏 Not bad. 你的河牌决策有料。'
                : accuracy >= 60
                  ? '😑 还可以，但还有很多 leak。多练阻断牌分析。'
                  : accuracy >= 40
                    ? '🤓 一半对一半错 — 典型鱼的水平。回去看 MDF 概念。'
                    : '🃏 你确定你在打扑克不是在打麻将？Fold pre next time.'}
            </div>
          </div>

          {/* Answer review */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-300">逐题回顾</h3>
            {answers.map((a, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg p-4 border',
                  a.isCorrect ? 'bg-emerald-500/3 border-emerald-500/10' : 'bg-red-500/3 border-red-500/10',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-neutral-600">#{i + 1}</span>
                  <span className="text-xs font-mono font-bold text-neutral-200">
                    {a.question.scenario.heroHand.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    on {a.question.scenario.board.join(' ')}
                  </span>
                  {a.isCorrect ? (
                    <Check size={14} className="text-emerald-400 ml-auto" />
                  ) : (
                    <X size={14} className="text-red-400 ml-auto" />
                  )}
                </div>
                <div className="text-[11px] text-neutral-500 flex gap-4">
                  <span>你的选择: <span className={a.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{a.selectedAction}</span></span>
                  <span>正确答案: <span className="text-emerald-400">{a.question.scenario.solution.correctAction}</span></span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                  {a.question.scenario.solution.explanation}
                </p>
              </div>
            ))}
          </div>

          {/* Retry */}
          <div className="text-center pb-6">
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={14} />
              再来一轮
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main Page Dispatcher
// ============================================================

export function BluffCatcherPage() {
  const phase = useBluffCatcherStore((s) => s.phase)

  if (phase === 'quiz') return <QuizScreen />
  if (phase === 'results') return <ResultsScreen />
  return <SetupScreen />
}
