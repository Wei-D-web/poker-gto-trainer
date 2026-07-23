/**
 * AICoachPanel — slide-out AI strategy explanation panel.
 *
 * "🤖 AI 解说" button appears in StrategyExplorer. Click opens a chat panel
 * where the AI explains the current scenario in natural Chinese.
 *
 * Context-aware: automatically injects current position, stack depth, board,
 * and selected combo into the first message.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Bot, Send, Loader2, X, ChevronRight, Sparkles } from 'lucide-react'
import type { CoachMessage } from '@shared/types/ai-coach'
import { cn } from '../../lib/utils'

// ── Types ──

interface AICoachPanelProps {
  /** Human-readable description of current scenario */
  contextDescription: string
  /** Structured data to inject into AI prompt */
  contextData?: Record<string, unknown>
  /** Whether the panel is open */
  open: boolean
  /** Called to close the panel */
  onClose: () => void
}

// ── Component ──

export function AICoachPanel({ contextDescription, contextData, open, onClose }: AICoachPanelProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasContext, setHasContext] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  // Send initial context message automatically on first open
  useEffect(() => {
    if (open && !hasContext) {
      sendContextMessage()
    }
  }, [open])

  const sendContextMessage = useCallback(async () => {
    setHasContext(true)
    const ctxParts = [contextDescription]
    if (contextData) {
      try {
        ctxParts.push(JSON.stringify(contextData, null, 2))
      } catch { /* ignore */ }
    }
    const ctxMsg = `请基于以下场景分析 GTO 策略:\n${ctxParts.join('\n\n')}`
    await callAI(ctxMsg)
  }, [contextDescription, contextData])

  const callAI = async (message: string) => {
    setLoading(true)
    const userMsg: CoachMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      // Try Electron IPC first, fall back to web API
      let response: { text: string; error?: string }

      if (window.electronAPI?.aiCoach?.send) {
        response = await window.electronAPI.aiCoach.send({
          message,
          history: messages.length > 0 ? messages : undefined,
        })
      } else if (window.electronAPI?.aiCoach?.sendWeb) {
        response = await window.electronAPI.aiCoach.sendWeb(message)
      } else {
        // Fallback: show a helpful message about desktop requirement
        const assistantMsg: CoachMessage = {
          role: 'assistant',
          content: '🤖 AI 教练功能需要桌面版应用才能使用。桌面版内置了 DeepSeek V4 推理引擎，可以分析 GTO 策略并给出中文解说。\n\n📥 [下载桌面版](https://github.com/Wei-D-web/poker-gto-trainer/releases/latest)',
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setLoading(false)
        return
      }

      const assistantMsg: CoachMessage = {
        role: 'assistant',
        content: response.error
          ? `⚠️ AI 教练暂时不可用：${response.error}。请确保已配置 DEEPSEEK_API_KEY 环境变量。`
          : response.text || '(无响应)',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: CoachMessage = {
        role: 'assistant',
        content: `❌ 调用失败：${err.message || '未知错误'}`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    setInput('')
    callAI(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ──

  return (
    <>
      {/* Slide-out panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[380px] max-w-[90vw] z-[300] bg-[#0B1019] border-l border-[#152233] shadow-2xl flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#152233] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center">
              <Bot size={16} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-200">AI 策略教练</h3>
              <p className="text-[10px] text-neutral-500">Powered by DeepSeek V4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <Sparkles size={24} className="text-violet-400 mx-auto animate-pulse" />
              <p className="text-xs text-neutral-500">AI 正在分析当前场景...</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2 text-xs leading-relaxed',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2',
                  msg.role === 'user'
                    ? 'bg-blue-500/15 border border-blue-500/20 text-blue-100'
                    : 'bg-white/[0.03] border border-white/[0.06] text-neutral-300',
                )}
              >
                {/* Simple markdown-like rendering for code blocks */}
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.content.split('\n').length - 1 && <br />}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 text-xs">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 flex items-center gap-2 text-neutral-500">
                <Loader2 size={12} className="animate-spin" />
                AI 思考中...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#152233] shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="问 AI 关于当前策略的问题..."
              disabled={loading}
              className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-violet-500/30 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20 text-violet-400 hover:text-violet-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-[299] bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
    </>
  )
}

/**
 * Floating trigger button for AI Coach panel.
 */
export function AICoachTrigger({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  if (!visible) return null

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold text-xs shadow-[0_4px_24px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_32px_rgba(139,92,246,0.5)] transition-all active:scale-95 group"
    >
      <Bot size={16} className="group-hover:animate-bounce" />
      AI 解说
      <ChevronRight size={14} />
    </button>
  )
}
