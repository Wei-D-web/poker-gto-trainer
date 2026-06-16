/**
 * Account & Subscription Management Page
 *
 * Shows current subscription tier, status, and provides actions for
 * upgrading, managing billing, and canceling.
 */
import { useState } from 'react'
import { useAuth, type SubscriptionTier } from '../../contexts/AuthContext'
import { STRIPE_PRICES, redirectToCheckout, redirectToCustomerPortal } from '../../lib/stripe'
import { cn } from '../../lib/utils'
import { LicenseActivation } from './LicenseActivation'
import {
  User, Mail, Crown, Zap, CreditCard, Calendar, AlertCircle,
  ExternalLink, Clock, Check, RefreshCw, LogOut, Shield,
} from 'lucide-react'

const TIER_INFO: Record<SubscriptionTier, {
  label: string
  labelEn: string
  color: string
  bg: string
  border: string
  icon: typeof Crown
}> = {
  lifetime: {
    label: '终身版',
    labelEn: 'Lifetime',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: Crown,
  },
  pro: {
    label: '专业版',
    labelEn: 'Pro',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Zap,
  },
  free: {
    label: '免费版',
    labelEn: 'Free',
    color: 'text-neutral-400',
    bg: 'bg-neutral-500/10',
    border: 'border-neutral-500/20',
    icon: User,
  },
  developer: {
    label: '🔑 开发者',
    labelEn: 'Developer',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: Crown,
  },
}

export function AccountPage() {
  const { user, tier, signOut, isWeb } = useAuth()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const tierInfo = TIER_INFO[tier]
  const TierIcon = tierInfo.icon

  const handleUpgrade = async (planTier: 'pro' | 'lifetime', priceId: string) => {
    if (!priceId) {
      setError('Stripe price ID not configured. Check environment variables.')
      return
    }
    setActionLoading(planTier)
    setError('')
    try {
      const result = await redirectToCheckout(priceId, planTier, user?.email)
      if (result.error) setError(result.error)
    } catch (e: any) {
      setError(e.message)
    }
    setActionLoading(null)
  }

  const handleManageBilling = async () => {
    setActionLoading('portal')
    setError('')
    try {
      const result = await redirectToCustomerPortal()
      if (result.error) setError(result.error)
    } catch (e: any) {
      setError(e.message)
    }
    setActionLoading(null)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Shield size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">账户管理</h2>
            <p className="text-xs text-neutral-500">Account & Subscription</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto space-y-6">
        {/* Current Tier Card */}
        <div className={cn('rounded-2xl border p-6', tierInfo.border, tierInfo.bg)}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', tierInfo.bg, tierInfo.border)}>
                <TierIcon size={22} className={tierInfo.color} />
              </div>
              <div>
                <div className={cn('text-lg font-bold', tierInfo.color)}>{tierInfo.label}</div>
                <div className="text-xs text-neutral-500">{tierInfo.labelEn} Plan</div>
              </div>
            </div>
            {tier === 'free' ? (
              <div className="text-xs px-3 py-1 rounded-full bg-neutral-700/30 text-neutral-400">
                免费使用
              </div>
            ) : (
              <div className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                <Check size={10} /> Active
              </div>
            )}
          </div>

          {/* User Info */}
          {user && (
            <div className="space-y-2 mt-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Mail size={12} className="text-neutral-500" />
                {user.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Clock size={12} className="text-neutral-500" />
                Joined {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Upgrade Options (show for free users) */}
        {tier === 'free' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              升级方案 Upgrade Plans
            </h3>

            <div className="grid gap-3">
              {/* Pro Monthly */}
              <PricingCard
                title="专业版 · 月付"
                titleEn="Pro Monthly"
                price="$29.99"
                period="/月"
                features={[
                  '全部 GTO 策略浏览器',
                  'Cash vs MTT 对比分析',
                  '对手剥削顾问',
                  '每日训练 (Daily Drills)',
                  '手牌历史导出 (JSON/CSV)',
                  '进度追踪',
                ]}
                highlighted={true}
                loading={actionLoading === 'pro'}
                onClick={() => handleUpgrade('pro', STRIPE_PRICES.proMonthly)}
              />

              {/* Pro Yearly */}
              <PricingCard
                title="专业版 · 年付"
                titleEn="Pro Yearly"
                price="$219"
                period="/年"
                badge="省 $140"
                features={[
                  '月付版全部功能',
                  '优先新功能体验',
                  '专属 Discord 频道',
                ]}
                loading={actionLoading === 'pro-yearly'}
                onClick={() => handleUpgrade('pro', STRIPE_PRICES.proYearly)}
              />

              {/* Lifetime */}
              <PricingCard
                title="终身版"
                titleEn="Lifetime"
                price="$299"
                period="买断"
                badge="最划算"
                features={[
                  '全部专业版功能',
                  '终身免费更新',
                  '无订阅过期风险',
                  '专属终身版徽章',
                ]}
                lifetime
                loading={actionLoading === 'lifetime'}
                onClick={() => handleUpgrade('lifetime', STRIPE_PRICES.lifetime)}
              />
            </div>

            <p className="text-[10px] text-neutral-600 text-center">
              7 天免费试用 · 随时取消 · 安全支付由 Stripe 提供
            </p>
          </div>
        )}

        {/* License Key Activation (for WeChat/Alipay users) */}
        <LicenseActivation />

        {/* Pro/Lifetime Actions */}
        {tier !== 'free' && (
          <div className="space-y-3">
            <button
              onClick={handleManageBilling}
              disabled={actionLoading === 'portal'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0F141C] hover:bg-[#151B28] border border-[#1C2A3D] hover:border-[#2A3B52] rounded-xl text-sm font-semibold text-neutral-300 transition-all"
            >
              {actionLoading === 'portal' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <CreditCard size={14} />
              )}
              管理账单 Manage Billing
              <ExternalLink size={11} className="text-neutral-600" />
            </button>

            <p className="text-[10px] text-neutral-600 text-center">
              由 Stripe 安全处理 · 可随时取消续订
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/15 rounded-lg px-4 py-3">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        {/* Sign Out (web only) */}
        {isWeb && user && (
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-transparent hover:bg-red-500/5 border border-transparent hover:border-red-500/15 rounded-xl text-xs text-neutral-500 hover:text-red-400 transition-all"
          >
            <LogOut size={12} />
            退出登录 Sign Out
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Individual pricing tier card
 */
function PricingCard({
  title, titleEn, price, period, features, badge, highlighted, lifetime, loading, onClick,
}: {
  title: string
  titleEn: string
  price: string
  period: string
  features: string[]
  badge?: string
  highlighted?: boolean
  lifetime?: boolean
  loading?: boolean
  onClick: () => void
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-5 transition-all',
      highlighted
        ? 'border-amber-500/30 bg-amber-500/[0.03]'
        : 'border-[#152233] bg-[#090D14]',
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold text-neutral-200">{title}</div>
          <div className="text-[10px] text-neutral-500">{titleEn}</div>
        </div>
        <div className="text-right">
          <div className={cn('text-xl font-black', lifetime ? 'text-amber-400' : 'text-neutral-100')}>
            {price}
          </div>
          <div className="text-[10px] text-neutral-500">{period}</div>
        </div>
      </div>

      {/* Features list */}
      <ul className="space-y-1.5 mb-4">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-400">
            <Check size={11} className="text-emerald-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        disabled={loading}
        className={cn(
          'w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
          lifetime
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-[0_2px_16px_rgba(245,158,11,0.15)]'
            : highlighted
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-[#0F141C] hover:bg-[#151B28] text-neutral-300 border border-[#1C2A3D]',
          'disabled:opacity-50',
        )}
      >
        {loading ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <Zap size={14} />
        )}
        {lifetime ? '立即购买 Buy Now' : '订阅 Subscribe'}
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 ml-1">
            {badge}
          </span>
        )}
      </button>
    </div>
  )
}
