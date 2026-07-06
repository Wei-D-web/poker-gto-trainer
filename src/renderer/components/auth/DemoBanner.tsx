/**
 * DemoBanner + Floating exit button — rich demo mode indicator.
 *
 * Top banner: shows demo status + CTA buttons (upgrade, download desktop).
 * Fixed bottom-right floating pill: exit demo.
 */
import { useState } from 'react'
import { LogOut, Eye, Download, Zap } from 'lucide-react'
import { LS_PRICES, redirectToCheckout } from '../../lib/lemon-squeezy'
import { useAuth } from '../../contexts/AuthContext'
import { track } from '../../services/analytics'

const DEMO_KEY = 'pokergto_demo_mode'
const RECORDING_KEY = 'pokergto_recording_mode'
const BANNER_DISMISSED_KEY = 'pokergto_demo_banner_dismissed'

function isDemo(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === '1' } catch { return false }
}

function isRecording(): boolean {
  try { return localStorage.getItem(RECORDING_KEY) === '1' } catch { return false }
}

function exitDemo() {
  localStorage.removeItem(DEMO_KEY)
  localStorage.removeItem('pokergto_post_login_dismissed')
  window.location.href = '/poker-gto-trainer/app/'
}

export function DemoBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(BANNER_DISMISSED_KEY) === '1' } catch { return false }
  })
  const [upgradeLoading, setUpgradeLoading] = useState(false)

  if (!isDemo() || isRecording()) return null

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1')
    setDismissed(true)
  }

  const handleUpgrade = async () => {
    setUpgradeLoading(true)
    track('web_demo_upgrade_clicked')
    await redirectToCheckout(LS_PRICES.proMonthly, 'pro', user?.email)
    setUpgradeLoading(false)
  }

  const handleDownload = () => {
    track('web_demo_download_clicked')
    window.open('https://github.com/Wei-D-web/poker-gto-trainer/releases/latest', '_blank')
  }

  return (
    <>
      {/* Top banner */}
      {!dismissed && (
        <div
          className="relative z-[100] flex items-center justify-center gap-3 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] shrink-0"
          role="alert"
        >
          <Eye size={11} className="text-amber-400 shrink-0" />
          <span className="text-amber-200/80 font-semibold tracking-wide">演示模式</span>
          <span className="text-amber-500/30">·</span>
          <span className="text-neutral-400 hidden sm:inline">体验受限 · 预填了 BTN vs BB 的示例数据</span>

          {/* Spacer */}
          <span className="flex-1 hidden sm:block" />

          {/* CTA buttons */}
          <button
            onClick={handleUpgrade}
            disabled={upgradeLoading}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300 hover:text-emerald-200 transition-all font-semibold text-[11px] flex items-center gap-1"
          >
            <Zap size={10} />
            {upgradeLoading ? '跳转中...' : '升级专业版'}
          </button>

          <button
            onClick={handleDownload}
            className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 hover:text-blue-200 transition-all font-semibold text-[11px] flex items-center gap-1"
          >
            <Download size={10} />
            下载桌面版
          </button>

          <button
            onClick={exitDemo}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-300 hover:text-amber-200 transition-all font-semibold text-[11px]"
          >
            退出演示
          </button>

          <button
            onClick={handleDismiss}
            className="ml-1 text-amber-500/40 hover:text-amber-400 transition-colors"
            aria-label="关闭横幅"
          >
            ✕
          </button>
        </div>
      )}

      {/* Fixed floating pill — exit demo */}
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
