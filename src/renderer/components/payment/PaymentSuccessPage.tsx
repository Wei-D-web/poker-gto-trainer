/**
 * PaymentSuccessPage — shown after LS checkout redirect.
 *
 * Polls Supabase for the assigned license key. The LS webhook assigns a key
 * from the pool asynchronously, so we poll for up to 30 seconds.
 *
 * URL: /app/?ls=success   (redirected from LS after payment)
 */
import { useState, useEffect, useRef } from 'react'
import { supabase, useAuth } from '../../contexts/AuthContext'
import { CheckCircle, Copy, Key, Loader2, AlertCircle } from 'lucide-react'

export function PaymentSuccessPage() {
  const { user, refreshTier } = useAuth()
  const [licenseKey, setLicenseKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [polling, setPolling] = useState(true)
  const attempts = useRef(0)
  const MAX_ATTEMPTS = 30 // 30 seconds

  useEffect(() => {
    if (!user?.id) {
      setError('未登录，请先登录后再查看')
      setPolling(false)
      return
    }

    // Immediately try to get the key from the profile
    const poll = async () => {
      try {
        // Check profile for license_key field
        const { data: profile } = await supabase!
          .from('profiles')
          .select('license_key, tier')
          .eq('id', user.id)
          .single()

        if (profile?.license_key) {
          setLicenseKey(profile.license_key)
          setPolling(false)
          refreshTier()
          return
        }

        // Also check order_history as fallback
        const { data: orders } = await supabase!
          .from('order_history')
          .select('license_key')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (orders?.length && orders[0].license_key) {
          setLicenseKey(orders[0].license_key)
          setPolling(false)
          refreshTier()
          return
        }

        attempts.current++
        if (attempts.current >= MAX_ATTEMPTS) {
          setError('许可证密钥尚未生成。请查看您的邮箱，或联系客服。')
          setPolling(false)
        }
      } catch (e) {
        attempts.current++
        if (attempts.current >= MAX_ATTEMPTS) {
          setError('网络错误，请稍后重试或联系客服获取密钥。')
          setPolling(false)
        }
      }
    }

    poll() // first call immediately
    const interval = setInterval(poll, 1000)
    return () => clearInterval(interval)
  }, [user?.id])

  const handleCopy = async () => {
    if (!licenseKey) return
    try {
      await navigator.clipboard.writeText(licenseKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS
      const input = document.createElement('input')
      input.value = licenseKey
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#05080C] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto border border-emerald-500/20">
          {licenseKey ? (
            <CheckCircle size={40} className="text-emerald-400" />
          ) : error ? (
            <AlertCircle size={40} className="text-amber-400" />
          ) : (
            <Loader2 size={40} className="text-emerald-400 animate-spin" />
          )}
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-neutral-100">
            {licenseKey ? '支付成功！🎉' : error ? '处理中...' : '支付成功！'}
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            {licenseKey
              ? '您的 PokerGTO 激活码已就绪'
              : '正在生成您的许可证密钥，请稍候...'}
          </p>
        </div>

        {/* License Key Display */}
        {licenseKey && (
          <div className="bg-[#090D14] border border-emerald-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 justify-center text-emerald-400">
              <Key size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">您的激活码</span>
            </div>
            <div className="bg-[#0A0F18] border border-[#152233] rounded-lg px-4 py-3 font-mono text-lg tracking-widest text-neutral-100 select-all">
              {licenseKey}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle size={14} /> 已复制！
                </>
              ) : (
                <>
                  <Copy size={14} /> 复制激活码
                </>
              )}
            </button>
          </div>
        )}

        {/* Polling indicator */}
        {polling && !error && (
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
            <Loader2 size={14} className="animate-spin" />
            等待密钥生成... ({attempts.current}s)
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
            <p className="text-sm text-amber-400">{error}</p>
            <p className="text-xs text-neutral-500 mt-2">
              请微信联系 PokerGTO 客服获取帮助
            </p>
          </div>
        )}

        {/* Instructions */}
        {licenseKey && (
          <div className="text-left bg-[#090D14] border border-[#152233] rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">下一步</h4>
            <ol className="text-xs text-neutral-500 space-y-1.5 list-decimal list-inside">
              <li>复制上方的激活码</li>
              <li>打开 PokerGTO 桌面应用</li>
              <li>进入「账户」→ 输入激活码 → 点击激活</li>
              <li>激活成功后，所有功能即刻解锁</li>
            </ol>
          </div>
        )}

        {/* Back to app */}
        <a
          href="/app/"
          className="block text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          ← 返回 PokerGTO
        </a>
      </div>
    </div>
  )
}
