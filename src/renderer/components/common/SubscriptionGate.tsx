/**
 * Subscription Gate — Tier-based feature access control
 *
 * Free tier: basic features only (explore, training, compare, editor, history, charts, playground, guide, settings, account)
 * Pro/Lifetime: all features unlocked
 */
import { type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { STRIPE_PRICES, redirectToCheckout } from '../../lib/stripe'
import { cn } from '../../lib/utils'
import { Lock, Zap, Crown, ArrowRight, RefreshCw } from 'lucide-react'
import { useState } from 'react'

/**
 * List of premium feature IDs (require Pro or Lifetime subscription).
 * Everything NOT in this list is available for free.
 */
export const PREMIUM_FEATURES = new Set([
  'analytics',
  'equitytrainer',
  'battle',
  'cashmttcompare',
  'exploitadvisor',
  'analyzer',
  'advanced',
  'turnriver',
  'multiway',
  'tools',
  'spots',
  'icm',
])

/**
 * Check if a feature requires a paid subscription.
 */
export function isPremiumFeature(featureId: string): boolean {
  return PREMIUM_FEATURES.has(featureId)
}

/**
 * Check if the current tier can access a feature.
 */
export function canAccessFeature(tier: string, featureId: string): boolean {
  if (tier === 'pro' || tier === 'lifetime' || tier === 'developer') return true
  return !isPremiumFeature(featureId)
}

/**
 * Wraps premium features. Shows upgrade prompt for free users on both web AND desktop.
 */
export function SubscriptionGate({ children, feature }: { children: ReactNode; feature?: string }) {
  const { tier } = useAuth()

  // Pro, lifetime, or developer: always allow
  if (tier === 'pro' || tier === 'lifetime' || tier === 'developer') return <>{children}</>

  // Free tier: check if this is a premium feature
  if (feature && isPremiumFeature(feature)) {
    return <UpgradePrompt feature={feature} />
  }

  // If no feature specified, allow (gate is optional)
  return <>{children}</>
}

/**
 * Premium tier badge for display in nav/header
 */
export function TierBadge() {
  const { tier } = useAuth()

  const config = {
    free: { label: '免费版', color: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20' },
    pro: { label: '专业版', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    lifetime: { label: '终身版', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    developer: { label: '🔑 开发者', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  }

  const c = config[tier as keyof typeof config] || config.free
  return (
    <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-semibold border', c.bg, c.color)}>
      {c.label}
    </span>
  )
}

/**
 * Upgrade prompt displayed to free users trying to access premium features.
 */
export function UpgradePrompt({ feature }: { feature?: string }) {
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const featureNames: Record<string, string> = {
    analytics: '数据分析',
    equitytrainer: '胜率训练',
    battle: 'Range Battle',
    cashmttcompare: 'Cash vs MTT',
    exploitadvisor: '剥削顾问',
    analyzer: '手牌分析器',
    advanced: '高级分析',
    turnriver: '转牌河牌分析',
    multiway: '多人底池',
    tools: '工具箱',
    spots: '收藏夹',
    icm: 'ICM 计算器',
  }

  const featureName = feature ? featureNames[feature] || feature : '此功能'

  const handleUpgrade = async (priceId: string, tier: 'pro' | 'lifetime') => {
    if (!priceId) return
    setLoading(tier)
    setError('')
    const result = await redirectToCheckout(priceId, tier, user?.email)
    if (result.error) setError(result.error)
    setLoading(null)
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-5 animate-scale-in">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto border border-amber-500/15">
          <Lock size={28} className="text-amber-400" />
        </div>

        {/* Message */}
        <div>
          <h3 className="text-base font-bold text-neutral-200 mb-1">升级到专业版</h3>
          <p className="text-sm text-neutral-500">
            「{featureName}」是<b className="text-amber-400">专业版</b>功能
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-3">
          {/* Pro Monthly */}
          <button
            onClick={() => handleUpgrade(STRIPE_PRICES.proMonthly, 'pro')}
            disabled={loading === 'pro'}
            className="w-full text-left bg-[#090D14] border border-[#152233] hover:border-blue-500/30 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-neutral-200">专业版 · 月付</div>
                <div className="text-[10px] text-neutral-500">全部功能 + 无限使用</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-neutral-100">$29.99</span>
                <span className="text-xs text-neutral-500">/月</span>
                {loading === 'pro' ? (
                  <RefreshCw size={14} className="animate-spin text-neutral-400" />
                ) : (
                  <ArrowRight size={14} className="text-neutral-600 group-hover:text-blue-400 transition-colors" />
                )}
              </div>
            </div>
          </button>

          {/* Pro Yearly */}
          <button
            onClick={() => handleUpgrade(STRIPE_PRICES.proYearly, 'pro')}
            disabled={loading === 'pro'}
            className="w-full text-left bg-[#090D14] border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-bold text-neutral-200">专业版 · 年付</div>
                  <div className="text-[10px] text-neutral-500">月付全部 + 优先新功能</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">省 $140</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-400">$219</span>
                <span className="text-xs text-neutral-500">/年</span>
                {loading === 'pro' ? (
                  <RefreshCw size={14} className="animate-spin text-neutral-400" />
                ) : (
                  <ArrowRight size={14} className="text-neutral-600 group-hover:text-emerald-400 transition-colors" />
                )}
              </div>
            </div>
          </button>

          {/* Lifetime */}
          <button
            onClick={() => handleUpgrade(STRIPE_PRICES.lifetime, 'lifetime')}
            disabled={loading === 'lifetime'}
            className="w-full text-left bg-gradient-to-r from-amber-500/[0.05] to-orange-500/[0.05] border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-bold text-amber-400">终身版 · 买断</div>
                  <div className="text-[10px] text-neutral-500">一次购买 · 永久使用</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">最划算</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-amber-400">$299</span>
                <span className="text-xs text-neutral-500">买断</span>
                {loading === 'lifetime' ? (
                  <RefreshCw size={14} className="animate-spin text-amber-400" />
                ) : (
                  <Crown size={14} className="text-amber-400" />
                )}
              </div>
            </div>
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <p className="text-[10px] text-neutral-600">
          7 天免费试用 · 随时取消 · 安全支付由 Stripe 提供
        </p>
      </div>
    </div>
  )
}
