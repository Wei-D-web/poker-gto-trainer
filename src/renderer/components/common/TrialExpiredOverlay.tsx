/**
 * TrialExpiredOverlay — 试用到期付费墙
 *
 * 三档定价:
 *   入门版 ¥19.99/月 — 基础训练
 *   专业版 ¥49.99/月 — 全部 26 模块 + AI Coach
 *   终身版 ¥400 买断 — 永久使用
 */
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LS_PRICES, redirectToCheckout } from '../../lib/lemon-squeezy'
import { Lock, ArrowRight, Crown, RefreshCw, Key } from 'lucide-react'
import { track } from '../../services/analytics'

export function TrialExpiredOverlay() {
  const { user, activateLicense, tier } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [licenseKey, setLicenseKey] = useState('')
  const [activating, setActivating] = useState(false)
  const [activateMsg, setActivateMsg] = useState('')

  if (tier !== 'free') return null

  const go = async (priceId: string, plan: string) => {
    if (!priceId) return
    setLoading(plan)
    setError('')
    track('trial_expired_upgrade', { plan })
    const r = await redirectToCheckout(priceId, plan === 'lifetime' ? 'lifetime' : 'pro', user?.email)
    if (r.error) setError(r.error)
    setLoading(null)
  }

  const handleActivate = async () => {
    if (!licenseKey.trim()) return
    setActivating(true)
    setActivateMsg('')
    const r = await activateLicense(licenseKey)
    setActivateMsg(r.success ? '✅ 激活成功！正在刷新...' : `❌ ${r.message}`)
    if (r.success) setTimeout(() => window.location.reload(), 800)
    setActivating(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4 animate-scale-in">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/15">
          <Lock size={24} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-100 mb-1">免费试用已结束</h2>
          <p className="text-sm text-neutral-500">14 天试用期已到。选择一个方案，继续训练。</p>
        </div>

        <div className="grid gap-2.5">
          {/* Starter ¥19.99/mo */}
          <button onClick={() => go(LS_PRICES.starterMonthly, 'starter')} disabled={loading === 'starter'}
            className="w-full text-left bg-[#090D14] border border-[#152233] hover:border-cyan-500/30 rounded-xl p-3.5 transition-all group">
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-bold text-neutral-200">入门版 · 月付</div><div className="text-[10px] text-neutral-500">17 个基础模块</div></div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-neutral-100">¥19.99</span><span className="text-[11px] text-neutral-500">/月</span>
                {loading === 'starter' ? <RefreshCw size={13} className="animate-spin text-neutral-400" /> : <ArrowRight size={13} className="text-neutral-600 group-hover:text-cyan-400 transition-colors" />}
              </div>
            </div>
          </button>

          {/* Pro ¥49.99/mo */}
          <button onClick={() => go(LS_PRICES.proMonthly, 'pro')} disabled={loading === 'pro'}
            className="w-full text-left bg-[#090D14] border border-blue-500/20 hover:border-blue-500/40 rounded-xl p-3.5 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">推荐</div>
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-bold text-neutral-200">专业版 · 月付</div><div className="text-[10px] text-neutral-500">全部 26 模块 + AI Coach</div></div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-blue-400">¥49.99</span><span className="text-[11px] text-neutral-500">/月</span>
                {loading === 'pro' ? <RefreshCw size={13} className="animate-spin text-neutral-400" /> : <ArrowRight size={13} className="text-neutral-600 group-hover:text-blue-400 transition-colors" />}
              </div>
            </div>
          </button>

          {/* Pro Yearly ¥399/yr */}
          <button onClick={() => go(LS_PRICES.proYearly, 'pro')} disabled={loading === 'pro'}
            className="w-full text-left bg-[#090D14] border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-3.5 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div><div className="text-sm font-bold text-neutral-200">专业版 · 年付</div><div className="text-[10px] text-neutral-500">全部功能 + 优先支持</div></div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">省 ¥200</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-emerald-400">¥399</span><span className="text-[11px] text-neutral-500">/年</span>
                {loading === 'pro' ? <RefreshCw size={13} className="animate-spin text-neutral-400" /> : <ArrowRight size={13} className="text-neutral-600 group-hover:text-emerald-400 transition-colors" />}
              </div>
            </div>
          </button>

          {/* Lifetime ¥400 */}
          <button onClick={() => go(LS_PRICES.lifetime, 'lifetime')} disabled={loading === 'lifetime'}
            className="w-full text-left bg-gradient-to-r from-amber-500/[0.05] to-orange-500/[0.05] border border-amber-500/20 hover:border-amber-500/40 rounded-xl p-3.5 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div><div className="text-sm font-bold text-amber-400">终身版 · 买断</div><div className="text-[10px] text-neutral-500">一次购买 · 永久使用</div></div>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold">最划算</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black text-amber-400">¥400</span><span className="text-[11px] text-neutral-500">买断</span>
                {loading === 'lifetime' ? <RefreshCw size={13} className="animate-spin text-amber-400" /> : <Crown size={13} className="text-amber-400" />}
              </div>
            </div>
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="border-t border-[#152233] pt-3">
          {!showKeyInput ? (
            <button onClick={() => setShowKeyInput(true)} className="flex items-center gap-1 mx-auto text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
              <Key size={12} /> 已有激活码？点此输入
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="text" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} placeholder="PGTO-XXXX-XXXX-XXXX" maxLength={19}
                  className="flex-1 bg-[#090D14] border border-[#152233] rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 font-mono" />
                <button onClick={handleActivate} disabled={activating || !licenseKey.trim()}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors">
                  {activating ? '验证中...' : '激活'}
                </button>
              </div>
              {activateMsg && <p className={`text-xs ${activateMsg.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{activateMsg}</p>}
            </div>
          )}
        </div>

        <div className="border-t border-[#152233] pt-2">
          <a href="https://wei-d-web.github.io/poker-gto-trainer/" target="_blank" rel="noopener noreferrer"
            className="block w-full text-center py-2 rounded-lg bg-[#0F141C] hover:bg-[#151B28] border border-[#1C2A3D] hover:border-[#2A3B52] text-xs text-neutral-400 hover:text-neutral-200 transition-all">
            💬 微信/支付宝购买卡密
          </a>
        </div>
        <p className="text-[10px] text-neutral-700">安全支付由 Lemon Squeezy 提供 · 可随时取消</p>
      </div>
    </div>
  )
}
