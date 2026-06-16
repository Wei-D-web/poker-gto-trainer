import { useTrainingStore } from '../../stores/trainingStore'
import { cn } from '../../lib/utils'
import { Trophy, TrendingUp, Target, AlertTriangle, RotateCcw, BarChart3 } from 'lucide-react'

export function TrainingResults() {
  const { results, resetSession, config } = useTrainingStore()

  const totalQuestions = results.length
  const correctAnswers = results.filter(r => r.feedback.isCorrect).length
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
  const totalEVLost = results.reduce((sum, r) => sum + r.feedback.evDifference, 0)
  const avgEVLost = totalQuestions > 0 ? totalEVLost / totalQuestions : 0

  const mistakesByType: Record<string, number> = {}
  for (const result of results) {
    for (const mistake of result.feedback.mistakes) {
      const key = `${mistake.yourAction} → ${mistake.correctAction}`
      mistakesByType[key] = (mistakesByType[key] || 0) + 1
    }
  }
  const sortedMistakes = Object.entries(mistakesByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const getGrade = (acc: number) => {
    if (acc >= 90) return { label: 'A+', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
    if (acc >= 80) return { label: 'A', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' }
    if (acc >= 70) return { label: 'B', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' }
    if (acc >= 60) return { label: 'C', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' }
    if (acc >= 50) return { label: 'D', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' }
    return { label: 'F', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' }
  }

  const grade = getGrade(accuracy)

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Grade display */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 border border-amber-500/15">
          <Trophy size={36} className="text-amber-400" />
        </div>
        <div className={cn('text-6xl font-black mb-2 tracking-tighter', grade.color)}>{grade.label}</div>
        <p className="text-sm text-neutral-400 font-medium">Session Complete</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
          <Target size={14} className="mx-auto mb-1.5 text-blue-400" />
          <div className="text-xl font-bold text-neutral-200">{totalQuestions}</div>
          <div className="text-[9px] text-neutral-500 mt-0.5">Questions</div>
        </div>
        <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
          <TrendingUp size={14} className="mx-auto mb-1.5 text-emerald-400" />
          <div className="text-xl font-bold text-neutral-200">{accuracy.toFixed(0)}%</div>
          <div className="text-[9px] text-neutral-500 mt-0.5">Accuracy</div>
        </div>
        <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
          <AlertTriangle size={14} className="mx-auto mb-1.5 text-amber-400" />
          <div className="text-xl font-bold text-neutral-200">{totalEVLost.toFixed(1)}</div>
          <div className="text-[9px] text-neutral-500 mt-0.5">EV Lost (bb)</div>
        </div>
        <div className="bg-[#090D14] border border-[#152233] rounded-xl p-4 text-center">
          <BarChart3 size={14} className="mx-auto mb-1.5 text-purple-400" />
          <div className="text-xl font-bold text-neutral-200">{avgEVLost.toFixed(2)}</div>
          <div className="text-[9px] text-neutral-500 mt-0.5">Avg / Question</div>
        </div>
      </div>

      {/* Weak areas */}
      {sortedMistakes.length > 0 && (
        <div className="bg-[#090D14] border border-[#152233] rounded-2xl p-5">
          <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-400" />
            Common Mistakes
          </h4>
          <div className="space-y-2.5">
            {sortedMistakes.map(([pattern, count], i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-sm text-neutral-300 font-mono">{pattern}</span>
                <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                  <div className="flex-1 h-1.5 bg-[#0F141C] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (count / totalQuestions) * 200)}%` }} />
                  </div>
                  <span className="text-[10px] text-neutral-500 w-7 text-right font-medium">{count}x</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button onClick={resetSession}
          className="flex-1 py-3 bg-[#0B1019] hover:bg-[#0F141C] text-neutral-300 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 border border-[#1C2A3D]">
          <RotateCcw size={15} />
          New Session
        </button>
      </div>
    </div>
  )
}
