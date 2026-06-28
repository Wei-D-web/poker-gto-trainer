/**
 * DemoBanner — shown at top of app when in demo mode.
 * Lets users exit demo and return to the login page.
 */
import { useState } from 'react'
import { LogOut, Eye } from 'lucide-react'

const DEMO_KEY = 'pokergto_demo_mode'

function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function DemoBanner() {
  // Check synchronously on first render — no flicker
  const [visible] = useState(() => isDemoMode())

  const handleExit = () => {
    localStorage.removeItem(DEMO_KEY)
    localStorage.removeItem('pokergto_post_login_dismissed')
    window.location.href = '/poker-gto-trainer/app/'
  }

  if (!visible) return null

  return (
    <div
      className="relative z-[100] flex items-center justify-center gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] shrink-0"
      role="alert"
    >
      <Eye size={11} className="text-amber-400/60 shrink-0" />
      <span className="text-amber-200/80 font-semibold tracking-wide">演示模式</span>
      <span className="text-amber-500/30">·</span>
      <span className="text-neutral-400">部分功能不可用（AI 教练、云端同步）</span>
      <span className="text-amber-500/30">·</span>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all font-semibold ml-2"
      >
        <LogOut size={10} />
        退出演示
      </button>
    </div>
  )
}
