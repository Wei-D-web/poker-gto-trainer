/**
 * DemoBanner + Floating exit button — impossible-to-miss exit from demo mode.
 * Top banner + fixed bottom-right floating pill.
 */
import { LogOut, Eye } from 'lucide-react'

const DEMO_KEY = 'pokergto_demo_mode'

function isDemo(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === '1' } catch { return false }
}

function exitDemo() {
  localStorage.removeItem(DEMO_KEY)
  localStorage.removeItem('pokergto_post_login_dismissed')
  window.location.href = '/poker-gto-trainer/app/'
}

export function DemoBanner() {
  if (!isDemo()) return null

  return (
    <>
      {/* Top banner */}
      <div
        className="relative z-[100] flex items-center justify-center gap-2.5 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] shrink-0"
        role="alert"
      >
        <Eye size={11} className="text-amber-400 shrink-0" />
        <span className="text-amber-200/80 font-semibold tracking-wide">演示模式</span>
        <span className="text-amber-500/30">·</span>
        <span className="text-neutral-400">部分功能不可用</span>
        <span className="text-amber-500/30">·</span>
        <button
          onClick={exitDemo}
          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300 hover:text-amber-200 transition-all font-semibold text-[11px]"
        >
          退出演示
        </button>
      </div>

      {/* Fixed floating pill — impossible to miss */}
      <div className="fixed bottom-5 right-5 z-[200] animate-pulse-subtle">
        <button
          onClick={exitDemo}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-500/90 hover:bg-amber-500 text-black font-bold text-xs shadow-[0_4px_24px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_32px_rgba(245,158,11,0.5)] transition-all active:scale-95"
        >
          <LogOut size={12} />
          退出演示
        </button>
      </div>
    </>
  )
}
