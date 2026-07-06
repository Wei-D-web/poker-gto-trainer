/**
 * DesktopRequiredModal — shown when a web user tries to access a feature
 * that requires the desktop app (CFR solver, heavy computation).
 *
 * Unlike UpgradePrompt (paywall), this tells users they need the desktop app
 * for this specific feature. It also mentions the desktop app is FREE.
 */
import { useState, useEffect } from 'react'
import { Monitor, Download, ExternalLink, X, Cpu } from 'lucide-react'
import { cn } from '../../lib/utils'
import { track } from '../../services/analytics'

interface Props {
  featureId: string
  featureName: string
  description: string
  onClose: () => void
}

const FEATURE_DETAILS: Record<string, { name: string; desc: string }> = {
  advanced: {
    name: '高级分析 (Node Locking)',
    desc: '高级分析需要本地 CFR 求解器引擎来锁定对手手牌并重新计算策略。浏览器版无法运行此计算。',
  },
  turnriver: {
    name: '转牌河牌分析',
    desc: '转牌河牌分析需要大量牌面组合枚举，依赖本地求解器进行实时计算。浏览器版资源受限。',
  },
  multiway: {
    name: '多人底池分析',
    desc: '3-6 人底池分析需要指数级计算量，只有桌面版本地引擎能高效处理。',
  },
}

export function getDesktopRequiredInfo(featureId: string) {
  return FEATURE_DETAILS[featureId] || {
    name: featureId,
    desc: '此功能需要桌面版应用的本地计算引擎。浏览器版暂不支持。',
  }
}

/**
 * Detect which OS the user is on for the correct download link.
 */
function detectOS(): 'mac' | 'win' | 'linux' {
  if (typeof navigator === 'undefined') return 'mac'
  const ua = navigator.userAgent
  if (ua.includes('Win')) return 'win'
  if (ua.includes('Linux') && !ua.includes('Android')) return 'linux'
  return 'mac' // default to mac
}

const DOWNLOAD_URL = '/poker-gto-trainer/download.html'

const OS_LABELS: Record<string, string> = {
  mac: 'macOS',
  win: 'Windows',
  linux: 'Linux',
}

export function DesktopRequiredModal({ featureId, featureName, description, onClose }: Props) {
  const info = FEATURE_DETAILS[featureId] || { name: featureName, desc: description }
  const [os, setOs] = useState<'mac' | 'win' | 'linux'>('mac')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setOs(detectOS())
    track('web_desktop_nudge_shown', { feature: featureId })
    // Animate in
    requestAnimationFrame(() => setVisible(true))
  }, [featureId])

  const handleDownload = () => {
    track('web_desktop_nudge_download_clicked', { feature: featureId })
    window.open(DOWNLOAD_URL, '_blank')
  }

  const handleClose = () => {
    track('web_desktop_nudge_closed', { feature: featureId })
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose()
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-[300] flex items-center justify-center p-6 transition-all duration-200',
        visible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent',
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'w-full max-w-md bg-[#0A0E17] border border-neutral-800 rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300',
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4',
        )}
      >
        {/* Header accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />

        <div className="p-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-neutral-600 hover:text-neutral-400 transition-all"
          >
            <X size={14} />
          </button>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/15 flex items-center justify-center mx-auto mb-6">
            <Cpu size={24} className="text-emerald-400" />
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-xl font-bold text-white">需要桌面版</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              「<span className="text-emerald-300 font-semibold">{info.name}</span>」{info.desc}
            </p>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-[0_4px_24px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_32px_rgba(16,185,129,0.3)] group mb-3"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
            <div className="text-left flex-1">
              <div className="font-bold">
                下载桌面版
                <span className="text-emerald-200/70 font-normal text-xs ml-1.5">({OS_LABELS[os]})</span>
              </div>
              <div className="text-xs text-emerald-200/70">桌面版永久免费 · 功能完整</div>
            </div>
            <ExternalLink size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Continue in browser */}
          <button
            onClick={handleClose}
            className="w-full flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] text-neutral-400 hover:text-neutral-300 text-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center shrink-0">
              <Monitor size={18} className="text-neutral-500" />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium">在浏览器中继续浏览</div>
              <div className="text-xs text-neutral-600">回到之前的页面</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
