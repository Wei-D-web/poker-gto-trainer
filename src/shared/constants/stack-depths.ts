import type { StackRange } from '../types/scenario'

export const COMMON_STACK_DEPTHS = [
  { value: 10, label: '10bb' },
  { value: 15, label: '15bb' },
  { value: 20, label: '20bb' },
  { value: 25, label: '25bb' },
  { value: 30, label: '30bb' },
  { value: 40, label: '40bb' },
  { value: 50, label: '50bb' },
  { value: 60, label: '60bb' },
  { value: 75, label: '75bb' },
  { value: 100, label: '100bb' },
  { value: 125, label: '125bb' },
  { value: 150, label: '150bb' },
  { value: 200, label: '200bb' },
]

/** GTO Wizard-like stack depth presets for quick selection */
export const STACK_DEPTH_PRESETS: StackRange[] = [
  { min: 10, max: 20, label: 'Short (10-20bb)' },
  { min: 25, max: 40, label: 'Mid-Short (25-40bb)' },
  { min: 50, max: 75, label: 'Medium (50-75bb)' },
  { min: 100, max: 100, label: '100bb' },
  { min: 125, max: 200, label: 'Deep (125-200bb)' },
] as StackRange[]

export function getClosestStackDepth(bb: number): number {
  return COMMON_STACK_DEPTHS.reduce((prev, curr) =>
    Math.abs(curr.value - bb) < Math.abs(prev.value - bb) ? curr : prev
  ).value
}
