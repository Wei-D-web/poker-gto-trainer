/**
 * AICoachPage — standalone AI Coach chat page
 *
 * General poker GTO Q&A. For board-specific analysis, use
 * the AI Coach panel inside StrategyExplorer (context-aware).
 */
import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Sparkles, Lightbulb } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function AICoachPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      if (window.electronAPI?.aiCoach?.send) {
        const history = messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
        const res = await window.electronAPI.aiCoach.send({ message: text, history })
        if (res.text) {
          setMessages(prev => [...prev, { role: 'assistant', content: res.text, timestamp: new Date().toISOString() }])
        } else if (res.error) {
          setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${res.error}`, timestamp: new Date().toISOString() }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'AI Coach 需要在桌面应用中运行。Web 版暂不支持。', timestamp: new Date().toISOString() }])
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ 请求失败: ${e.message}`, timestamp: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const suggestions = [
    '什么是 GTO 策略？',
    'BTN vs BB 3bet 范围怎么构建？',
    '翻牌圈 c-bet 频率多少合适？',
    '如何应对紧弱对手？',
  ]

  return (
    <div className="flex flex-col h-full bg-[#05080C]">
      <div className="px-6 py-4 border-b border-[#152233] flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Bot size={18} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-neutral-200">AI 教练</h2>
          <p className="text-[10px] text-neutral-500">DeepSeek V4 · GTO 策略问答</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
              <Sparkles size={24} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-300 mb-1">GTO 策略 AI 助手</h3>
              <p className="text-xs text-neutral-500">基于 DeepSeek V4，解答你的扑克策略问题</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 hover:bg-violet-500/20 transition-colors">
                  <Lightbulb size={11} />{s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={13} className="text-violet-400" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/20 text-neutral-200'
                : 'bg-[#090D14] border border-[#152233] text-neutral-300'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Bot size={13} className="text-violet-400" />
            </div>
            <div className="bg-[#090D14] border border-[#152233] rounded-xl px-4 py-3">
              <Loader2 size={16} className="animate-spin text-violet-400" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="px-6 py-4 border-t border-[#152233] shrink-0">
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="输入你的扑克问题..." disabled={loading}
            className="flex-1 bg-[#090D14] border border-[#152233] rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50" />
          <button onClick={send} disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white transition-colors">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
