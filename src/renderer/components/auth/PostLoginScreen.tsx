/**
 * PostLoginScreen — shown once after login to guide users toward the desktop app.
 * Only appears on web (not in Electron), and only once unless re-login.
 */
import { useState, useEffect } from 'react'
import { Monitor, ExternalLink, Download, X, Sparkles } from 'lucide-react'
import { track } from '../../services/analytics'

interface Props {
  onContinue: () => void
}

const STORAGE_KEY = 'pokergto_post_login_dismissed'

function detectOS(): 'mac' | 'win' | 'linux' {
  if (typeof navigator === 'undefined') return 'mac'
  const ua = navigator.userAgent
  if (ua.includes('Win')) return 'win'
  if (ua.includes('Linux') && !ua.includes('Android')) return 'linux'
  return 'mac'
}

const DOWNLOAD_URL = '/poker-gto-trainer/download.html'

export function PostLoginScreen({ onContinue }: Props) {
  const [showDownload, setShowDownload] = useState(false)
  const [detectedOS, setDetectedOS] = useState<'mac' | 'win' | 'linux'>('mac')

  useEffect(() => {
    setDetectedOS(detectOS())
  }, [])

  const handleContinue = () => {
    // Remember user prefers browser
    localStorage.setItem(STORAGE_KEY, 'browser')
    track('web_postlogin_browser_clicked')
    onContinue()
  }

  const handleDownload = () => {
    // Remember user wants desktop
    localStorage.setItem(STORAGE_KEY, 'desktop')
    track('web_postlogin_download_clicked')
    setShowDownload(true)
  }

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'dismissed')
    track('web_postlogin_dismissed')
    onContinue()
  }

  if (showDownload) {
    return (
      <div className="min-h-screen bg-[#05080C] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(16,185,129,0.06)_0%,transparent_60%)]" />

        <div className="w-full max-w-lg relative z-10 text-center space-y-8 animate-scale-in">
          {/* Icon */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 blur-xl" />
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/15 flex items-center justify-center">
              <Download size={36} className="text-emerald-400" />
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-white">下载 PokerGTO 桌面版</h2>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm mx-auto">
              桌面版拥有完整的训练体验：本地求解器引擎、离线使用、
              更大的牌桌视图，以及更流畅的键盘快捷键操作。
              <br />
              <span className="text-emerald-400/80">⚡ 桌面版比浏览器版快 10x — 本地 CFR 求解器 vs 云端计算</span>
            </p>
          </div>

          {/* Download cards — OS-aware ordering */}
          <div className="grid gap-3 max-w-xs mx-auto">
            {/* Primary: detected OS */}
            <a
              href={DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-[0_4px_24px_rgba(16,185,129,0.2)] group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Download size={18} />
              </div>
              <div className="text-left">
                <div className="font-bold">
                  {detectedOS === 'mac' ? 'macOS 版本' : detectedOS === 'win' ? 'Windows 版本' : 'Linux 版本'}
                  <span className="text-emerald-200/70 font-normal text-[10px] ml-1.5">推荐</span>
                </div>
                <div className="text-xs text-emerald-200/70">
                  {detectedOS === 'mac' ? 'Apple Silicon · Intel' : detectedOS === 'win' ? 'Windows 10 / 11' : 'AppImage · deb'}
                </div>
              </div>
              <ExternalLink size={14} className="ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* Secondary: other OS */}
            {detectedOS !== 'mac' && (
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-neutral-300 font-medium text-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Monitor size={18} />
                </div>
                <div className="text-left">
                  <div className="font-medium">macOS 版本</div>
                  <div className="text-xs text-neutral-500">Apple Silicon · Intel</div>
                </div>
                <ExternalLink size={14} className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
            {detectedOS !== 'win' && (
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-neutral-300 font-medium text-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Monitor size={18} />
                </div>
                <div className="text-left">
                  <div className="font-medium">Windows 版本</div>
                  <div className="text-xs text-neutral-500">Windows 10 / 11</div>
                </div>
                <ExternalLink size={14} className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />
              </a>
            )}
          </div>

          {/* Continue in browser anyway */}
          <button
            onClick={handleContinue}
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors underline-offset-4 hover:underline"
          >
            在浏览器中继续
          </button>

          <p className="text-[10px] text-neutral-700">
            桌面版支持离线训练 · 本地求解器引擎 · 键盘快捷键
          </p>
        </div>
      </div>
    )
  }

  // ── Main choice screen ──
  return (
    <div className="min-h-screen bg-[#05080C] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(16,185,129,0.06)_0%,transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(59,130,246,0.04)_0%,transparent_40%)]" />

      {/* Floating */}
      <div className="absolute top-1/4 left-[15%] w-20 h-20 bg-emerald-500/[0.03] rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/3 right-[15%] w-24 h-24 bg-blue-500/[0.03] rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-neutral-600 hover:text-neutral-400 transition-all z-20"
      >
        <X size={16} />
      </button>

      <div className="w-full max-w-sm relative z-10 animate-scale-in">
        {/* Success icon */}
        <div className="text-center mb-8 space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)] animate-glow-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={32} className="text-emerald-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white">登录成功！</h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              你已经成功登录 PokerGTO Trainer。
              <br />
              想要最好的训练体验，试试桌面版 App。
            </p>
          </div>
        </div>

        {/* Choice buttons */}
        <div className="space-y-3">
          {/* Download Desktop */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm transition-all shadow-[0_4px_24px_rgba(16,185,129,0.15)] hover:shadow-[0_4px_32px_rgba(16,185,129,0.25)] group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
            <div className="text-left flex-1">
              <div className="font-bold">下载桌面版 App</div>
              <div className="text-xs text-emerald-200/70">macOS / Windows · 完整训练体验</div>
            </div>
          </button>

          {/* Continue in Browser */}
          <button
            onClick={handleContinue}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-neutral-300 font-medium text-sm transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
              <Monitor size={18} />
            </div>
            <div className="text-left flex-1">
              <div className="font-medium">在浏览器中继续</div>
              <div className="text-xs text-neutral-500">无需下载，即开即用</div>
            </div>
          </button>
        </div>

        {/* Features comparison */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.04] p-3 space-y-2">
            <div className="flex items-center gap-1.5">
              <Monitor size={12} className="text-neutral-500" />
              <span className="text-[10px] font-medium text-neutral-500">浏览器版</span>
            </div>
            <ul className="space-y-1.5">
              {['翻前范围训练', '基础手牌分析', 'AI 教练聊天'].map(f => (
                <li key={f} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500/30 shrink-0" />
                  <span className="text-[11px] text-neutral-400">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/10 p-3 space-y-2 bg-emerald-500/[0.02]">
            <div className="flex items-center gap-1.5">
              <Download size={12} className="text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-300">桌面版</span>
            </div>
            <ul className="space-y-1.5">
              {['全部训练模式', '本地求解器引擎', '离线使用', '键盘快捷键', '大屏牌桌视图'].map(f => (
                <li key={f} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400/50 shrink-0" />
                  <span className="text-[11px] text-neutral-300">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
