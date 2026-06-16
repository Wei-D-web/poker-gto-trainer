import { useTrainingStore } from '../../stores/trainingStore'
import { TrainingConfigPanel } from './TrainingConfigPanel'
import { TrainingQuiz } from './TrainingQuiz'
import { TrainingResults } from './TrainingResults'
import { Target } from 'lucide-react'

export function TrainingPage() {
  const sessionState = useTrainingStore((s) => s.sessionState)
  const resetSession = useTrainingStore((s) => s.resetSession)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Target size={18} className="text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-200">Training Mode</h2>
            <p className="text-xs text-neutral-500">Practice GTO decision-making with instant feedback</p>
          </div>
          {sessionState !== 'idle' && (
            <button
              onClick={resetSession}
              className="px-3 py-1.5 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-neutral-200 rounded-lg transition-all border border-white/[0.04]"
            >
              Back to Setup
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {sessionState === 'idle' && <TrainingConfigPanel />}
        {sessionState === 'active' && <TrainingQuiz />}
        {sessionState === 'completed' && <TrainingResults />}
      </div>
    </div>
  )
}
