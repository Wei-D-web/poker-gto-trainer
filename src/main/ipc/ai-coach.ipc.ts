import { ipcMain } from 'electron'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CoachSendRequest, CoachSendResponse } from '../../shared/types/ai-coach'

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

/**
 * 系统提示词 — 扑克 GTO 教练人设（替代 OpenClaw poker-bro agent 的 persona）
 */
const SYSTEM_PROMPT = `你是 PokerGTO Trainer 内置的 AI 策略教练「巴哥」，一位精通 GTO（博弈论最优策略）的德州扑克专家。

你的职责：
- 用中文（简体）解释 GTO 策略，语言通俗但有专业深度
- 分析玩家可能拿到的范围、赔率、坚果优势、位置优势
- 给出可执行的建议（跟注/加注/弃牌），并说明 GTO 理由和剥削性偏离（exploit）时机
- 回答关于翻前范围、翻后打法、ICM、牌桌动态的问题
- 引用具体数字（底池赔率百分比、范围占比）时确保计算准确

风格：
- 简洁直接，每次回答不超过 300 字（除非用户要求详细分析）
- 用扑克术语时给出中文解释
- 不确定时明确说明「这是近似 GTO 估计」，不要编造精确数字`

/**
 * 从项目根目录 .env 读取 DEEPSEEK_API_KEY。
 * 桌面版打包后 .env 随应用分发（extraResources/data），key 由用户配置。
 */
function loadDeepSeekKey(): string {
  try {
    const envPath = join(__dirname, '..', '..', '..', '.env')
    const content = readFileSync(envPath, 'utf-8')
    const match = content.match(/^DEEPSEEK_API_KEY=(.+)$/m)
    if (match) return match[1].trim().replace(/^["']|["']$/g, '')
  } catch {
    /* .env 不存在则回退 process.env */
  }
  return process.env.DEEPSEEK_API_KEY || ''
}

/**
 * 直连 DeepSeek Chat Completions API（OpenAI 兼容格式）。
 * 移除 OpenClaw CLI 依赖 — 买家只需联网，无需安装任何本地工具。
 */
async function callDeepSeek(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<CoachSendResponse> {
  const startTime = Date.now()
  const apiKey = loadDeepSeekKey()

  if (!apiKey) {
    return {
      text: '',
      sessionId: '',
      durationMs: 0,
      error: '未配置 DEEPSEEK_API_KEY，请在应用目录 .env 中设置',
    }
  }

  // 60 秒超时保护（deepseek-chat 通常 5-20 秒返回）
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        text: '',
        sessionId: '',
        durationMs: Date.now() - startTime,
        error: `DeepSeek API 返回 ${res.status}: ${body.slice(0, 300)}`,
      }
    }

    const data = await res.json()
    const text: string = data?.choices?.[0]?.message?.content || '(无响应)'
    const usage = data?.usage

    return {
      text,
      sessionId: `deepseek-${Date.now()}`,
      usage: usage
        ? {
            input: usage.prompt_tokens ?? 0,
            output: usage.completion_tokens ?? 0,
            total: (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
          }
        : undefined,
      durationMs: Date.now() - startTime,
    }
  } catch (error: any) {
    return {
      text: '',
      sessionId: '',
      durationMs: Date.now() - startTime,
      error: `DeepSeek 调用失败: ${error.name === 'AbortError' ? '请求超时（60s）' : error.message}`,
    }
  } finally {
    clearTimeout(timer)
  }
}

export function registerAiCoachIpc(): void {
  ipcMain.handle(
    'ai-coach:send',
    (_event, params: CoachSendRequest): Promise<CoachSendResponse> => {
      const { message } = params

      if (!message || message.trim().length === 0) {
        return Promise.resolve({
          text: '',
          sessionId: '',
          durationMs: 0,
          error: 'Message is required',
        })
      }

      // 拼接对话历史（保留最近 6 轮），映射为 API messages
      const history: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (params.history && params.history.length > 0) {
        for (const m of params.history.slice(-12)) {
          if (m.role === 'user' || m.role === 'assistant') {
            history.push({ role: m.role, content: m.content })
          }
        }
      }
      history.push({ role: 'user', content: message })

      return callDeepSeek(history)
    }
  )

  ipcMain.handle('ai-coach:health', () => {
    // 健康检查：仅确认 API key 已配置（不发起付费请求）
    const ok = Boolean(loadDeepSeekKey())
    return { ok, agentId: DEEPSEEK_MODEL }
  })
}
