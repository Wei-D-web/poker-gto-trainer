import { useEffect, useCallback } from 'react'

type KeyHandler = (e: KeyboardEvent) => void

interface Shortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  handler: KeyHandler
  description: string
}

/**
 * Register global keyboard shortcuts.
 * Returns a list of registered shortcuts for display in settings.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true
        const metaMatch = shortcut.meta ? e.metaKey : true
        const shiftMatch = shortcut.shift ? e.shiftKey : true
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

        if (ctrlMatch && metaMatch && shiftMatch && keyMatch) {
          e.preventDefault()
          shortcut.handler(e)
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

/** Default app shortcuts */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    key: '1',
    description: '策略浏览器 Strategy Explorer',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'explore' } })),
  },
  {
    key: '2',
    description: '训练模式 Training Mode',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'training' } })),
  },
  {
    key: '3',
    description: '范围编辑器 Range Editor',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'editor' } })),
  },
  {
    key: '4',
    description: '范围对比 Range Compare',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'compare' } })),
  },
  {
    key: '5',
    description: '手牌历史 Hand History',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'history' } })),
  },
  {
    key: '6',
    description: '手牌分析器 Hand Analyzer',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'analyzer' } })),
  },
  {
    key: '7',
    description: '高级分析 Advanced Analysis',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'advanced' } })),
  },
  {
    key: '8',
    description: 'ICM 计算器 ICM Calculator',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'icm' } })),
  },
  {
    key: '9',
    description: '转牌河牌 Turn & River',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'turnriver' } })),
  },
  {
    key: '0',
    description: '多人底池 Multi-way Pot',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'multiway' } })),
  },
  {
    key: 'r',
    ctrl: true,
    description: '对局复盘教练 Session Review',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'review' } })),
  },
  {
    key: '/',
    description: '使用说明 Guide',
    handler: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'guide' } })),
  },
  {
    key: 'b',
    ctrl: true,
    description: '收起侧边栏 Toggle Sidebar',
    handler: () => window.dispatchEvent(new CustomEvent('toggle-sidebar')),
  },
]
