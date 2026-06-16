import type { ActionLabel } from '../types/strategy'

// ============================================================
// Action Labels — standardized action display
// ============================================================

export const ACTION_LABELS: ActionLabel[] = [
  { id: 'fold', shortLabel: 'F', fullLabel: 'Fold', type: 'fold', color: '#6B7280' },
  { id: 'check', shortLabel: 'X', fullLabel: 'Check', type: 'check', color: '#3B82F6' },
  { id: 'call', shortLabel: 'C', fullLabel: 'Call', type: 'call', color: '#10B981' },
  { id: 'bet_25', shortLabel: 'B25', fullLabel: 'Bet 25%', type: 'bet', color: '#F59E0B' },
  { id: 'bet_33', shortLabel: 'B33', fullLabel: 'Bet 33%', type: 'bet', color: '#F59E0B' },
  { id: 'bet_50', shortLabel: 'B50', fullLabel: 'Bet 50%', type: 'bet', color: '#F97316' },
  { id: 'bet_66', shortLabel: 'B66', fullLabel: 'Bet 66%', type: 'bet', color: '#EF4444' },
  { id: 'bet_75', shortLabel: 'B75', fullLabel: 'Bet 75%', type: 'bet', color: '#EF4444' },
  { id: 'bet_100', shortLabel: 'B100', fullLabel: 'Bet 100%', type: 'bet', color: '#DC2626' },
  { id: 'bet_125', shortLabel: 'B125', fullLabel: 'Bet 125%', type: 'bet', color: '#B91C1C' },
  { id: 'bet_150', shortLabel: 'B150', fullLabel: 'Bet 150%', type: 'bet', color: '#991B1B' },
  { id: 'bet_200', shortLabel: 'B200', fullLabel: 'Bet 200%', type: 'bet', color: '#7F1D1D' },
  { id: 'raise_2x', shortLabel: 'R2x', fullLabel: 'Raise 2x', type: 'raise', color: '#8B5CF6' },
  { id: 'raise_2.5x', shortLabel: 'R2.5x', fullLabel: 'Raise 2.5x', type: 'raise', color: '#7C3AED' },
  { id: 'raise_3x', shortLabel: 'R3x', fullLabel: 'Raise 3x', type: 'raise', color: '#6D28D9' },
  { id: 'raise_4x', shortLabel: 'R4x', fullLabel: 'Raise 4x', type: 'raise', color: '#5B21B6' },
  { id: 'all_in', shortLabel: 'AI', fullLabel: 'All In', type: 'all_in', color: '#EC4899' },
]

export const ACTION_LABEL_MAP: Record<string, ActionLabel> = {}
for (const label of ACTION_LABELS) {
  ACTION_LABEL_MAP[label.id] = label
}

export function getActionLabel(id: string): ActionLabel {
  return ACTION_LABEL_MAP[id] ?? {
    id,
    shortLabel: id,
    fullLabel: id,
    type: 'bet',
    color: '#9CA3AF',
  }
}

/** Default colors for frequency heatmap on range matrix */
export const FREQUENCY_COLORS = {
  empty: '#1F2937',  // 0% — dark background
  low: '#064E3B',    // ~25% — dark green
  medium: '#047857', // ~50% — medium green
  high: '#F59E0B',   // ~75% — amber
  max: '#DC2626',    // 100% — red
}
