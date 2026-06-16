/**
 * LicenseActivation — 卡密激活组件
 *
 * Used in the Account page and as a standalone modal.
 * Accepts PGTO-XXXX-XXXX-XXXX format keys and activates via Supabase Edge Function.
 */
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { formatKeyForDisplay, isTypingDevKey, normalizeKeyInput } from '../../../shared/utils/license'
import { cn } from '../../lib/utils'
import { Key, Loader2, CheckCircle, AlertCircle, Crown, Zap } from 'lucide-react'

interface Props {
  onActivated?: (tier: string) => void
  compact?: boolean // compact mode for sidebar/account page
}

export function LicenseActivation({ onActivated, compact }: Props) {
  const { user, tier, isWeb, activateLicense } = useAuth()
  const [keyInput, setKeyInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; tier?: string } | null>(null)

  const handleActivate = async () => {
    const rawInput = normalizeKeyInput(keyInput)

    // Dev key bypass (no login required) — accepts multiple formats
    if (isTypingDevKey(keyInput) || rawInput === 'PGTODEVADMINKEY') {
      setLoading(true)
      const res = await activateLicense('PGTO-DEV-ADMIN-KEY')
      setResult({ success: res.success, message: res.message, tier: res.tier })
      onActivated?.(res.tier || 'developer')
      setLoading(false)
      return
    }

    if (rawInput.length < 12) {
      setResult({ success: false, message: '请输入完整卡密 (格式: PGTO-XXXX-XXXX-XXXX)' })
      return
    }

    if (!user) {
      setResult({ success: false, message: '请先登录后再激活卡密 (开发者密钥无需登录)' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formattedKey = formatKeyForDisplay(rawInput)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''

      if (!supabaseUrl) {
        // Offline mode — validate locally via HMAC
        const res = await activateLicense(formattedKey)
        setResult({ success: res.success, message: res.message, tier: res.tier })
        onActivated?.(res.tier || 'pro')
        return
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/validate-license-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          key: formattedKey,
          userId: user.id,
          email: user.email || '',
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({ success: true, message: data.message || '激活成功！', tier: data.tier })
        onActivated?.(data.tier)
      } else {
        setResult({ success: false, message: data.message || '激活失败' })
      }
    } catch (e) {
      setResult({ success: false, message: '网络错误，请检查网络连接后重试' })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleActivate()
  }

  // Already developer
  if (tier === 'developer') {
    return (
      <div className={cn('rounded-xl p-5', compact ? 'bg-neutral-900/50' : 'bg-emerald-500/10 border border-emerald-500/30')}>
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="font-bold text-emerald-300">🔑 开发者模式</div>
            <div className="text-sm text-emerald-400/70">全权限已解锁 · 所有功能无限制</div>
          </div>
        </div>
      </div>
    )
  }

  // Already premium
  if (tier === 'lifetime') {
    return (
      <div className={cn('rounded-xl p-5', compact ? 'bg-neutral-900/50' : 'bg-amber-500/10 border border-amber-500/30')}>
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-amber-400" />
          <div>
            <div className="font-bold text-amber-300">终身会员</div>
            <div className="text-sm text-amber-400/70">您已拥有全部功能，永久有效</div>
          </div>
        </div>
      </div>
    )
  }

  if (tier === 'pro') {
    return (
      <div className={cn('rounded-xl p-5', compact ? 'bg-neutral-900/50' : 'bg-blue-500/10 border border-blue-500/30')}>
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-blue-400" />
          <div>
            <div className="font-bold text-blue-300">Pro 会员</div>
            <div className="text-sm text-blue-400/70">全部功能已解锁</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      compact
        ? 'p-4 bg-neutral-900/50 border-neutral-800'
        : 'p-6 bg-neutral-900/30 border-neutral-700',
    )}>
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <Key className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-neutral-200">激活卡密</h3>
        {isWeb && (
          <span className="text-xs text-neutral-500 ml-auto">已登录: {user?.email}</span>
        )}
      </div>

      {/* Input + button */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={keyInput}
          onChange={e => setKeyInput(formatKeyForDisplay(e.target.value))}
          onKeyDown={handleKeyDown}
          placeholder="PGTO-XXXX-XXXX-XXXX"
          maxLength={25}
          disabled={loading}
          className={cn(
            'flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg',
            'text-neutral-200 font-mono text-sm placeholder-neutral-600',
            'focus:outline-none focus:border-cyan-500/50 transition-colors',
            loading && 'opacity-50',
          )}
        />
        <button
          onClick={handleActivate}
          disabled={loading || (keyInput.length < 15 && !isTypingDevKey(keyInput))}
          className={cn(
            'px-6 py-2.5 rounded-lg font-semibold text-sm transition-all',
            (keyInput.length >= 15 || isTypingDevKey(keyInput)) && !loading
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/20'
              : 'bg-neutral-800 text-neutral-600 cursor-not-allowed',
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            '激活'
          )}
        </button>
      </div>

      {/* Auto-format hint */}
      {keyInput.length > 0 && (
        <p className="text-xs text-neutral-600 mb-2">
          输入自动格式化，无需手动输入横线
        </p>
      )}

      {/* Result message */}
      {result && (
        <div className={cn(
          'flex items-start gap-2 p-3 rounded-lg text-sm',
          result.success
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border border-red-500/30 text-red-300',
        )}>
          {result.success ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {/* Help text */}
      <p className="mt-3 text-xs text-neutral-600 leading-relaxed">
        购买卡密后在此输入激活。支持微信/支付宝付款，
        <a href="#" onClick={(e) => { e.preventDefault(); window.open('https://pokergto.app/buy') }}
           className="text-cyan-400 hover:underline mx-0.5">
          点此购买
        </a>
      </p>
    </div>
  )
}

/**
 * Get auth headers for Edge Function call
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  const headers: Record<string, string> = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  }

  try {
    if ((window as any).electronAPI?.auth?.getSession) {
      const session = await (window as any).electronAPI.auth.getSession()
      if (session?.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.session.access_token}`
      }
    }
  } catch {}

  return headers
}
