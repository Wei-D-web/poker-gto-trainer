import { useToastStore } from '../../stores/toastStore'
import { cn } from '../../lib/utils'
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const COLOR_MAP = {
  success: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400',
  error: 'border-red-500/30 bg-red-500/8 text-red-400',
  warning: 'border-amber-500/30 bg-amber-500/8 text-amber-400',
  info: 'border-blue-500/30 bg-blue-500/8 text-blue-400',
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICON_MAP[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md animate-slide-in-right',
              COLOR_MAP[toast.type],
            )}
          >
            <Icon size={15} className="shrink-0" />
            <span className="text-xs font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
