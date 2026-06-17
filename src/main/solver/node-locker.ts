/**
 * Node Locking Engine
 *
 * Allows locking specific hand combos to specific actions,
 * then re-computes the strategy for unlocked hands to see
 * how GTO adjusts when opponent deviates.
 */

import type { ComboKey, CardString } from '../../shared/types/poker'
import { generateAllCombos } from '../../shared/utils/combo-utils'

export type LockAction = 'fold' | 'check' | 'call' | 'bet_small' | 'bet_medium' | 'bet_large' | 'raise'

export interface NodeLock {
  comboKey: ComboKey
  action: LockAction
  frequency: number // 0-1, how locked-in the action is
}

export interface LockResult {
  originalStrategy: Record<ComboKey, StrategyEntry>
  lockedCombos: NodeLock[]
  adjustedStrategy: Record<ComboKey, StrategyEntry>
  adjustments: AdjustmentDetail[]
  summary: LockSummary
}

export interface StrategyEntry {
  comboKey: ComboKey
  actions: Array<{ action: string; frequency: number; ev: number }>
  isLocked: boolean
}

interface AdjustmentDetail {
  comboKey: ComboKey
  originalAction: string
  adjustedAction: string
  frequencyChange: number
  reason: string
}

interface LockSummary {
  totalLocked: number
  affectedCombos: number
  strategyShift: string       // "更激进" / "更保守" / "无明显变化"
  overallEVChange: number
  description: string
}

/**
 * Apply node locks and compute adjusted strategy.
 * This simulates how GTO adjusts when certain hands are forced to specific actions.
 */
export function applyNodeLocks(
  baseStrategy: Record<ComboKey, { actions: Array<{ action: string; frequency: number; ev: number }>; equity: number; weight: number }>,
  locks: NodeLock[],
  board: CardString[],
  isIP: boolean
): LockResult {
  const allCombos = generateAllCombos()
  const originalStrategy: Record<ComboKey, StrategyEntry> = {}
  const adjustedStrategy: Record<ComboKey, StrategyEntry> = {}
  const adjustments: AdjustmentDetail[] = []
  const lockSet = new Map<ComboKey, NodeLock>()
  for (const lock of locks) {
    lockSet.set(lock.comboKey, lock)
  }

  // Build original strategy entries
  for (const combo of allCombos) {
    const base = baseStrategy[combo.key]
    const actions = base?.actions?.length ? base.actions : [{ action: 'fold', frequency: 1, ev: 0 }]
    originalStrategy[combo.key] = {
      comboKey: combo.key,
      actions: actions.map(a => ({ ...a })),
      isLocked: lockSet.has(combo.key),
    }
  }

  // Determine overall lock direction (compute once, outside the loop)
  // Call is passive in poker — it doesn't pressure the opponent
  const hasLocks = locks.length > 0
  const aggressiveCount = locks.filter(l => l.action !== 'fold' && l.action !== 'check' && l.action !== 'call').length
  const passiveCount = locks.filter(l => l.action === 'fold' || l.action === 'check' || l.action === 'call').length
  // Use > for direction (50/50 tie = no clear direction, defaults neutral)
  const locksAreAggressive = hasLocks && aggressiveCount > passiveCount
  const locksArePassive = hasLocks && passiveCount > aggressiveCount

  // Build adjusted strategy
  for (const combo of allCombos) {
    const base = baseStrategy[combo.key]
    const lock = lockSet.get(combo.key)

    if (lock) {
      // Locked combo: force the locked action
      const lockActionName = lockActionToName(lock.action)
      adjustedStrategy[combo.key] = {
        comboKey: combo.key,
        actions: [{ action: lockActionName, frequency: Math.max(0.01, lock.frequency), ev: 0 }],
        isLocked: true,
      }
    } else {
      // Unlocked combo: adjust based on lock effects
      const origActions = base?.actions?.length ? base.actions : [{ action: 'fold', frequency: 1, ev: 0 }]
      const origPrimary = origActions.reduce((best, a) => a.frequency > best.frequency ? a : best, origActions[0])

      let adjustedActions = origActions.map(a => ({ ...a }))

      if (locksAreAggressive) {
        // More value in range → unlockeds can bluff more
        for (const a of adjustedActions) {
          if (a.action === 'check') {
            a.frequency = Math.max(0, a.frequency - 0.08)
            a.ev -= 0.02
          }
          if (a.action.includes('bet')) {
            a.frequency = Math.min(1, a.frequency + 0.06)
            a.ev += 0.01
          }
        }
      } else if (locksArePassive) {
        // Lots of folds → unlockeds need to be more selective
        for (const a of adjustedActions) {
          if (a.action.includes('bet')) {
            a.frequency = Math.max(0, a.frequency - 0.05)
            a.ev -= 0.01
          }
          if (a.action === 'check') {
            a.frequency = Math.min(1, a.frequency + 0.05)
          }
        }
      }

      // Normalize
      const total = adjustedActions.reduce((s, a) => s + Math.max(0, a.frequency), 0)
      if (total > 0) {
        for (const a of adjustedActions) {
          a.frequency = Math.round((Math.max(0, a.frequency) / total) * 100) / 100
        }
      }

      adjustedStrategy[combo.key] = {
        comboKey: combo.key,
        actions: adjustedActions,
        isLocked: false,
      }

      // Track significant adjustments
      const newPrimary = adjustedActions.reduce((best, a) => a.frequency > best.frequency ? a : best, adjustedActions[0])
      if (newPrimary.action !== origPrimary.action && origPrimary.frequency > 0.3) {
        adjustments.push({
          comboKey: combo.key,
          originalAction: origPrimary.action,
          adjustedAction: newPrimary.action,
          frequencyChange: Math.round(Math.abs(newPrimary.frequency - origPrimary.frequency) * 100),
          reason: locksAreAggressive
            ? '锁定偏进攻 → 可增加诈唬频率'
            : '锁定偏被动 → 需要更选择性的价值下注',
        })
      }
    }
  }

  // Summary
  const affectedCombos = adjustments.length
  const strategyShift = locksAreAggressive ? '更激进' : locksArePassive ? '更保守' : '无明显变化'

  // Generate description
  const lockDescriptions = locks.map(l => {
    const actionLabel = lockActionLabel(l.action)
    return `${l.comboKey}→${actionLabel}(${Math.round(l.frequency * 100)}%)`
  }).join(', ')

  const summary: LockSummary = {
    totalLocked: locks.length,
    affectedCombos,
    strategyShift,
    overallEVChange: locksAreAggressive ? 0.05 : locksArePassive ? -0.03 : 0,
    description: `锁定: ${lockDescriptions}。${affectedCombos > 0
      ? `影响了 ${affectedCombos} 个手牌的频率分布。整体策略${strategyShift}。`
      : '未显著影响其他手牌的GTO策略。'}`
  }

  return {
    originalStrategy,
    lockedCombos: locks,
    adjustedStrategy,
    adjustments: adjustments.slice(0, 10), // top 10
    summary,
  }
}

function lockActionToName(action: LockAction): string {
  switch (action) {
    case 'fold': return 'fold'
    case 'check': return 'check'
    case 'call': return 'call'
    case 'bet_small': return 'bet_33'
    case 'bet_medium': return 'bet_50'
    case 'bet_large': return 'bet_75'
    case 'raise': return 'raise_3x'
    default: return 'check'
  }
}

function lockActionLabel(action: LockAction): string {
  switch (action) {
    case 'fold': return '弃牌'
    case 'check': return '过牌'
    case 'call': return '跟注'
    case 'bet_small': return '小注'
    case 'bet_medium': return '中注'
    case 'bet_large': return '大注'
    case 'raise': return '加注'
    default: return action
  }
}
