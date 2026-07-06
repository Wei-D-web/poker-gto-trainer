import type { ActionLabel } from '../types/strategy'

// ============================================================
// Action Labels — GTO Wizard 标准配色
// ============================================================

export const ACTION_LABELS: ActionLabel[] = [
  // GTO Wizard Poker Arena 标准配色：
  // 🔵 Fold=蓝  🟢 Check/Call=绿  🟠 Bet小=浅橙→Bet中=橙→Bet大=红  🔴 Raise=红  ⚫ All-in=深红
  { id: 'fold', shortLabel: 'F', fullLabel: 'Fold', type: 'fold', color: '#3B82F6' },
  { id: 'check', shortLabel: 'X', fullLabel: 'Check', type: 'check', color: '#22C55E' },
  { id: 'call', shortLabel: 'C', fullLabel: 'Call', type: 'call', color: '#16A34A' },
  // Bet sizing gradient: orange → red (越大越深)
  { id: 'bet_25', shortLabel: 'B25', fullLabel: 'Bet 25%', type: 'bet', color: '#E8A010' },
  { id: 'bet_33', shortLabel: 'B33', fullLabel: 'Bet 33%', type: 'bet', color: '#F59E0B' },
  { id: 'bet_50', shortLabel: 'B50', fullLabel: 'Bet 50%', type: 'bet', color: '#F97316' },
  { id: 'bet_66', shortLabel: 'B66', fullLabel: 'Bet 66%', type: 'bet', color: '#EA580C' },
  { id: 'bet_75', shortLabel: 'B75', fullLabel: 'Bet 75%', type: 'bet', color: '#DC2626' },
  { id: 'bet_100', shortLabel: 'B100', fullLabel: 'Bet 100%', type: 'bet', color: '#C81E1E' },
  { id: 'bet_125', shortLabel: 'B125', fullLabel: 'Bet 125%', type: 'bet', color: '#B91C1C' },
  { id: 'bet_150', shortLabel: 'B150', fullLabel: 'Bet 150%', type: 'bet', color: '#A41818' },
  { id: 'bet_200', shortLabel: 'B200', fullLabel: 'Bet 200%', type: 'bet', color: '#991B1B' },
  // Raise sizing: red (越大越深)
  { id: 'raise_2x', shortLabel: 'R2x', fullLabel: 'Raise 2x', type: 'raise', color: '#EF4444' },
  { id: 'raise_2.5x', shortLabel: 'R2.5x', fullLabel: 'Raise 2.5x', type: 'raise', color: '#DC2626' },
  { id: 'raise_3x', shortLabel: 'R3x', fullLabel: 'Raise 3x', type: 'raise', color: '#C81E1E' },
  { id: 'raise_4x', shortLabel: 'R4x', fullLabel: 'Raise 4x', type: 'raise', color: '#991B1B' },
  // All-in: deepest red
  { id: 'all_in', shortLabel: 'AI', fullLabel: 'All In', type: 'all_in', color: '#881818' },
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

/**
 * GTO Wizard 标准热力图颜色方案
 * 在暗色背景下保持足够对比度和视觉区分度
 *   0% → Empty (#0F141F)
 *   ~25% → Green (#0B5C33)
 *   ~50% → Yellow-Green (#3B8C3B)
 *   ~70% → Gold (#B8860B)
 *   ~85% → Orange (#D4650A)
 *   ~100% → Red (#C0392B)
 */
export const FREQUENCY_COLORS = {
  empty: '#0F141F',
  low: '#0B5C33',
  midLow: '#3B8C3B',
  mid: '#B8860B',
  midHigh: '#D4650A',
  high: '#C0392B',
}
