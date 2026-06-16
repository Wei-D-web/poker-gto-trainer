import { useTrainingStore } from '../../stores/trainingStore'
import { cn } from '../../lib/utils'
import { Check, X, ArrowRight, Clock, TrendingDown, Zap } from 'lucide-react'

export function TrainingQuiz() {
  const {
    currentQuestion,
    feedback,
    questionIndex,
    config,
    submitAnswer,
    nextQuestion,
  } = useTrainingStore()

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-neutral-500">
          <div className="w-5 h-5 rounded-full border-2 border-neutral-600 border-t-green-500 animate-spin" />
          <span className="text-sm">Loading question...</span>
        </div>
      </div>
    )
  }

  const progress = config ? ((questionIndex + 1) / config.questionCount) * 100 : 0

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-400">
            Question {questionIndex + 1} of {config?.questionCount || 0}
          </span>
          <span className="text-xs font-medium text-neutral-500">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 bg-[#0F141C] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.3)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Scenario card */}
      <div className="bg-[#0B1019] border border-[#1C2A3D] rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            'text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide',
            currentQuestion.street === 'preflop'
              ? 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/15'
              : currentQuestion.street === 'flop'
                ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/15'
                : currentQuestion.street === 'turn'
                  ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/15'
                  : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/15',
          )}>
            {currentQuestion.street}
          </span>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] text-neutral-400 font-medium ring-1 ring-white/[0.04]">
            {currentQuestion.effectiveStack}bb
          </span>
        </div>

        <h3 className="text-base font-semibold text-neutral-100 mb-4 leading-relaxed">
          {currentQuestion.description}
        </h3>

        {/* Board cards */}
        {currentQuestion.board.length > 0 && (
          <div className="flex gap-2 mb-4">
            {currentQuestion.board.map((card, i) => (
              <span
                key={i}
                className="px-3.5 py-2.5 bg-[#111723] border border-[#1C2A3D] rounded-lg text-base font-mono font-bold text-neutral-100 shadow-sm"
              >
                {card}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm text-neutral-400 flex items-center gap-1.5">
          <Zap size={13} className="text-amber-400/70" />
          What is the GTO action here?
        </p>
      </div>

      {/* Action options */}
      {!feedback && (
        <div className="grid grid-cols-2 gap-3">
          {(currentQuestion.options || [
            { label: 'Bet 33%', action: 'bet_33', isCorrect: true },
            { label: 'Bet 75%', action: 'bet_75', isCorrect: false },
            { label: 'Check', action: 'check', isCorrect: false },
            { label: 'Fold', action: 'fold', isCorrect: false },
          ]).map((option, i) => (
            <button
              key={i}
              onClick={() => submitAnswer(option.action)}
              className="group p-4 bg-[#0B1019] hover:bg-[#111723] border border-[#1C2A3D] hover:border-[#2A3B52] rounded-xl text-sm font-medium text-neutral-200 transition-all text-left hover:shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
            >
              <span className="group-hover:text-white transition-colors">{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="space-y-4 animate-slide-in-right">
          <div className={cn(
            'rounded-2xl p-5 border',
            feedback.isCorrect
              ? 'bg-emerald-500/[0.06] border-emerald-500/20'
              : 'bg-red-500/[0.06] border-red-500/20',
          )}>
            <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                feedback.isCorrect
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400',
              )}>
                {feedback.isCorrect ? <Check size={22} /> : <X size={22} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-100">
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </h4>
                {!feedback.isCorrect && (
                  <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                    <TrendingDown size={12} className="text-red-400" />
                    EV Lost: <span className="text-red-400 font-semibold">{feedback.evDifference.toFixed(2)}bb</span>
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed">{feedback.explanation}</p>
          </div>

          {/* Mistakes detail */}
          {feedback.mistakes.length > 0 && (
            <div className="bg-[#0B1019] border border-[#1C2A3D] rounded-xl p-4">
              <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                Mistake Analysis
              </h4>
              {feedback.mistakes.map((mistake, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 border-b border-[#152233] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-400">Your action:</span>
                    <span className="text-sm text-red-400 font-medium">{mistake.yourAction}</span>
                    <span className="text-xs text-neutral-600">→</span>
                    <span className="text-sm text-emerald-400 font-medium">GTO: {mistake.correctAction}</span>
                  </div>
                  <span className={cn(
                    'text-xs px-2.5 py-1 rounded-full font-semibold',
                    mistake.severity === 'major'
                      ? 'bg-red-500/10 text-red-400'
                      : mistake.severity === 'moderate'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-neutral-500/10 text-neutral-400',
                  )}>
                    -{mistake.evLost.toFixed(2)}bb
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Next button */}
          <button
            onClick={nextQuestion}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] active:scale-[0.98]"
          >
            <span>Next Question</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
