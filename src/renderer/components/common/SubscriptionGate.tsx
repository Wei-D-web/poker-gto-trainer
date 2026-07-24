/**
 * Subscription Gate — Tier-based feature access control
 *
 * Tiers:
 *   free      — trial-only. After trial expires, nothing works.
 *   starter   — basic features (17 modules). ¥19.99/mo ($2.99) or ¥149/yr ($19.99).
 *   pro       — all 26 modules. ¥49.99/mo ($6.99) or ¥399/yr ($49.99).
 *   lifetime  — everything forever. ¥400 ($59).
 *   developer — everything (dev builds only).
 */
import { type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LS_PRICES, redirectToCheckout } from '../../lib/lemon-squeezy'
import { cn } from '../../lib/utils'
import { Lock, Zap, Crown, ArrowRight, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { track } from '../../services/analytics'

export const PREMIUM_FEATURES = new Set([
  'analytics', 'equitytrainer', 'battle', 'cashmttcompare',
  'exploitadvisor', 'analyzer', 'tools', 'spots', 'icm',
  'aicoach',
])

export const DESKTOP_ONLY_FEATURES = new Set(['advanced', 'turnriver', 'multiway'])

export function isRunningInElectron(): boolean {
  try {
    return !!window.electronAPI?.app?.getPlatform?.() !== 'browser'
  } catch {
    const api = window.electronAPI
    return api != null && typeof api.app?.quit === 'function'
  }
}

export function isPremiumFeature(featureId: string): boolean {
  return PREMIUM_FEATURES.has(featureId)
}

export function canAccessFeature(tier: string, featureId: string): boolean {
  if (tier === 'pro' || tier === 'lifetime' || tier === 'developer') return true
  if (tier === 'starter') return !isPremiumFeature(featureId)
  return false
}

export function SubscriptionGate({ children, feature }: { children: ReactNode; feature?: string }) {
  const { tier, isTrialing } = useAuth()
  if (tier === 'pro' || tier === 'lifetime' || tier === 'developer') return <>{children}</>
  if (isTrialing) {
    if (feature && isPremiumFeature(feature)) return <UpgradePrompt feature={feature} />
    return <>{children}</>
  }
  if (tier === 'starter') {
    if (feature && isPremiumFeature(feature)) return <UpgradePrompt feature={feature} />
    return <>{children}</>
  }
  if (feature) return <UpgradePrompt feature={feature} />
  return <>{children}</>
}

export function TierBadge() {
  const { tier, isTrialing } = useAuth()
  const config = {
    free: { label: isTrialing ? '试用中' : '未激活', color: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/20' },
    starter: { label: '入门版', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    pro: { label: '专业版', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    lifetime: { label: '终身版', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    developer: { label: '开发者', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  }
  const c = config[tier as keyof typeof config] || config.free
  return <span className={cn('text-[9px] px-2 py-0.5 rounded-full font-semibold border', c.bg, c.color)}>{c.label}</span>
}

const NAMES: Record<string, string> = {
  analytics: '数据分析', equitytrainer: '胜率训练', battle: 'Range Battle',
  cashmttcompare: 'Cash vs MTT', exploitadvisor: '剥削顾问', analyzer: '手牌分析器',
  advanced: '高级分析', turnriver: '转牌河牌分析', multiway: '多人底池',
  tools: '工具箱', spots: '收藏夹', icm: 'ICM 计算器', aicoach: 'AI 教练',
}

export function UpgradePrompt({ feature }: { feature?: string }) {
  const { user, tier, isTrialing } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fname = feature ? NAMES[feature] || feature : '此功能'
  const isStarter = tier === 'starter' || isTrialing

  const go = async (priceId: string, plan: string) => {
    if (!priceId) return
    setLoading(plan)
    setError('')
    track('upgrade_checkout_started', { plan, feature: feature || 'unknown' })
    const r = await redirectToCheckout(priceId, plan === 'lifetime' ? 'lifetime' : 'pro', user?.email)
    if (r.error) { track('upgrade_checkout_error', { plan, error: r.error }); setError(r.error) }
    setLoading(null)
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-4 animate-scale-in">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${isStarter ? 'bg-amber-500/10 border-amber-500/15' : 'bg-neutral-500/10 border-neutral-500/15'}`}>
          <Lock size={24} className={isStarter ? 'text-amber-400' : 'text-neutral-400'} />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-200 mb-1">{isStarter ? '升级到专业版' : '选择方案'}</h3>
          <p className="text-sm text-neutral-500">
            {isStarter ? <>{fname} 是<b className="text-amber-400">专业版</b>功能</> : '试用已结束，选择一个方案继续使用'}
          </p>
        </div>

        <div className="grid gap-2.5">
          {/* Starter $2.99/mo */}
          <button onClick={() => go(LS_PRICES.starterMonthly, 'starter')} disabled={loading === 'starter'}
            className="w-full text-left bg-[#090D14] border border-[#152233] hover:border-cyan-500/30 rounded-xl p-3.5 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-neutral-200">入门版 · 月付</div>
                <div className="text-[10px] text-neutral-500">17 个基础模块 · 日常训练够用</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-neutral-100">¥19.99</span>
                <span className="text-[11px] text-neutral-500">/月</span>
                {loading === 'starter' ? <RefreshCw size={13} className="animate-spin text-neutral-400" /> : <ArrowRight size={13} className="text-neutral-600 group-hover:text-cyan-400 transition-colors" />}
              </div>
            </div>
          </button>

          {/* Pro $5.99/mo — highlighted */}
          <button onClick={() => go(LS_PRICES.proMonthly, 'pro')} disabled={loading === 'pro'}
            className="w-full text-left bg-[#090D14] border border-blue-500/20 hover:border-blue-500/40 rounded-xl p-3.5 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">推荐</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-neutral-200">专业版 · 月付</div>
                <div className="text-[10px] text-neutral-500">全部 26 模块 + AI Coach</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-blue-400">¥49.99</span>
                <span className="text-[11px] text-neutral-500">/月</span>
                {loading === 'pro' ? <RefreshCw size={13} className="animate-spin text-neutral-400" /> : <ArrowRight size={13} className="text-neutral-600 group-hover:text-blue-400 transition-colors" />}
              </div>
            </div>
          </button>

          {/* Pro Yearly $39.99/yr */}
          <button onClick={() => go(LS_PRICES.proYearly, 'pro')} disabled={loading === 'pro'}
            className="w-full text-left bg-[#090D14] border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-3.5 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-bold text-neutral-200">专业版 · 年付</div>
                  <div className="text-[10px] text-neutral-500">全部功能 + 优先支持</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">省 ¥200</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-emerald-400">¥399</span>
                <span className="text-[11px] text-neutral-500">/年</span>
                {loading === 'pro' ? <RefreshCw size={13} className="animate-spin text-neutral-400" /> : <ArrowRight size={13} className="text-neutral-600 group-hover:text-emerald-400 transition-colors" />}
              </div>
            </div>
          </button>

          {/* Lifetime $59 */}
          <button onClick={() => go(LS_PRICES.lifetime, 'lifetime')} disabled={loading === 'lifetime'}
            className="w-full text-left bg-gradient-to-r from-amber-500/[0.05] to-orange-500/[0.05] border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-3.5 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-bold text-amber-400">终身版 · 买断</div>
                  <div className="text-[10px] text-neutral-500">一次购买 · 永久使用</div>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">最划算</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-amber-400">¥400</span>
                <span className="text-[11px] text-neutral-500">买断</span>
                {loading === 'lifetime' ? <RefreshCw size={13} className="animate-spin text-amber-400" /> : <Crown size={13} className="text-amber-400" />}
              </div>
            </div>
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        <p className="text-[10px] text-neutral-600">14 天免费试用 · 随时取消 · 安全支付由 Lemon Squeezy 提供</p>

        <div className="border-t border-[#152233] pt-3">
          <p className="text-[10px] text-neutral-500 mb-2 text-center">也支持微信/支付宝购买卡密，购买后在「账户」页面激活</p>
          <a href="https://wei-d-web.github.io/poker-gto-trainer/" target="_blank" rel="noopener noreferrer"
            className="block w-full text-center py-2 rounded-lg bg-[#0F141C] hover:bg-[#151B28] border border-[#1C2A3D] hover:border-[#2A3B52] text-xs text-neutral-400 hover:text-neutral-200 transition-all">
            💬 微信/支付宝购买卡密
          </a>
        </div>
      </div>
    </div>
  )
}
