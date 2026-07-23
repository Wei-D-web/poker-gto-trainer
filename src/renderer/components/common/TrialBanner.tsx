/**
 * TrialBanner — 试用期倒计时横幅
 *
 * 14 天试用期间显示在 App 顶部。试用期开放入门版功能。
 * 最后 3 天变橙/红色制造紧迫感。
 */
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Clock, ArrowRight, X } from 'lucide-react'

export function TrialBanner() {
  const { trialDaysLeft, tier } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // 已激活用户不显示
  if (tier !== 'free') return null
  // 试用未开始或已过期不显示
  if (trialDaysLeft <= 0) return null
  if (dismissed) return null

  const isUrgent = trialDaysLeft <= 3
  const isWarning = trialDaysLeft <= 7

  const bgClass = isUrgent
    ? 'bg-red-500/10 border-red-500/20'
    : isWarning
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-emerald-500/10 border-emerald-500/20'

  const textClass = isUrgent
    ? 'text-red-400'
    : isWarning
      ? 'text-amber-400'
      : 'text-emerald-400'

  const handleUpgrade = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { route: 'premium' } }))
  }

  return (
    <div className={`flex items-center justify-between px-4 py-2 border-b ${bgClass} transition-colors`}>
      <div className="flex items-center gap-2">
        <Clock size={14} className={textClass} />
        <span className="text-xs text-neutral-300">
          免费试用还剩{' '}
          <b className={textClass}>{trialDaysLeft}</b>
          {' '}天 · 可试用入门版全部功能 · 到期后需付费
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleUpgrade}
          className={`
            flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all
            ${isUrgent
              ? 'bg-red-500 text-white hover:bg-red-400'
              : isWarning
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }
          `}
        >
          升级解锁 <ArrowRight size={12} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-white/5 text-neutral-600 hover:text-neutral-400 transition-colors"
          aria-label="关闭"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
