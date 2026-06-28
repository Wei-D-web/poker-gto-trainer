/**
 * DemoBanner — shown at top of app when in demo mode.
 * Lets users exit demo and return to the login page.
 */
import { useState, useEffect } from 'react'
import { LogOut, Eye } from 'lucide-react'

const DEMO_KEY = 'pokergto_demo_mode'

export function DemoBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(localStorage.getItem(DEMO_KEY) === '1')
  }, [])

  const handleExit = () => {
    localStorage.removeItem(DEMO_KEY)
    // Also clear post-login key so returning user sees normal flow
    localStorage.removeItem('pokergto_post_login_dismissed')
    window.location.reload()
  }

  if (!visible) return null

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-amber-500/8 border-b border-amber-500/15 text-[11px]">
      <Eye size={11} className="text-amber-400/60 shrink-0" />
      <span className="text-amber-200/70 font-medium tracking-wide">演示模式</span>
      <span className="text-amber-500/40">·</span>
      <span className="text-neutral-500">部分功能不可用（AI 教练、云端同步）</span>
      <span className="text-amber-500/40">·</span>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 text-amber-400/70 hover:text-amber-300 transition-colors font-medium ml-2"
      >
        <LogOut size={10} />
        退出演示
      </button>
    </div>
  )
}
