import { cn } from '../../lib/utils'
import { ChevronRight, Home } from 'lucide-react'
import type { Street } from '@shared/types/poker'

interface BreadcrumbStep {
  label: string
  street: Street
  isActive: boolean
  onClick: () => void
}

interface ActionPathBreadcrumbProps {
  steps: BreadcrumbStep[]
  className?: string
}

export function ActionPathBreadcrumb({ steps, className }: ActionPathBreadcrumbProps) {
  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      <button
        onClick={steps[0]?.onClick}
        className="p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
        title="Reset to preflop"
      >
        <Home size={14} />
      </button>

      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          <ChevronRight size={12} className="text-neutral-700" />
          <button
            onClick={step.onClick}
            className={cn(
              'px-2 py-1 text-xs rounded-md font-medium transition-all whitespace-nowrap',
              step.isActive
                ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50'
            )}
          >
            {/* Street indicator */}
            <span className={cn(
              'inline-block w-1.5 h-1.5 rounded-full mr-1.5',
              step.street === 'preflop' && 'bg-purple-400',
              step.street === 'flop' && 'bg-green-400',
              step.street === 'turn' && 'bg-amber-400',
              step.street === 'river' && 'bg-red-400',
            )} />
            {step.label}
          </button>
        </div>
      ))}

      {steps.length === 0 && (
        <span className="text-xs text-neutral-600">Preflop</span>
      )}
    </div>
  )
}

/** Generate breadcrumb steps from a simple action path description */
export function generateBreadcrumbSteps(
  street: string,
  heroPosition: string,
  villainPosition: string,
  actions: string[],
  onNavigate: (index: number) => void
): BreadcrumbStep[] {
  const steps: BreadcrumbStep[] = [
    {
      label: `${heroPosition} opens 2.5bb`,
      street: 'preflop',
      isActive: street === 'preflop' && actions.length === 0,
      onClick: () => onNavigate(0),
    },
  ]

  for (let i = 0; i < actions.length; i++) {
    const isLastAction = i === actions.length - 1
    // Use actual currentStreet for the active step; distribute earlier steps across streets
    const stepStreet: Street = isLastAction
      ? (street as Street)
      : i === 0 ? 'preflop'
      : i <= 2 ? 'flop'
      : i <= 4 ? 'turn' : 'river'

    steps.push({
      label: actions[i],
      street: stepStreet,
      isActive: isLastAction,
      onClick: () => onNavigate(i + 1),
    })
  }

  return steps
}
