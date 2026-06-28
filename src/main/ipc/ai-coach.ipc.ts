import { ipcMain } from 'electron'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CoachSendRequest, CoachSendResponse } from '../../shared/types/ai-coach'

const AGENT_ID = 'poker-bro'
const MODEL_ID = 'deepseek/deepseek-v4-pro'

/**
 * Load .env file from project root and return key-value pairs.
 * Simple parser — avoids adding dotenv dependency.
 */
function loadEnvFile(): Record<string, string> {
  try {
    const envPath = join(__dirname, '..', '..', '..', '.env')
    const content = readFileSync(envPath, 'utf-8')
    const vars: Record<string, string> = {}

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (key && value) vars[key] = value
    }

    return vars
  } catch {
    return {}
  }
}

/**
 * Call OpenClaw agent via CLI.
 * Uses execSync — agent response typically takes 3-10 seconds.
 * Forces deepseek-v4-pro model via --model flag.
 */
function callOpenClawAgent(message: string): CoachSendResponse {
  const startTime = Date.now()
  const envVars = loadEnvFile()

  try {
    // Escape special characters for shell safety
    const escaped = message
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`')

    const cmd = `openclaw agent --agent ${AGENT_ID} --model ${MODEL_ID} --message "${escaped}" --thinking off --json`

    const stdout = execSync(cmd, {
      timeout: 120000, // 2 min timeout for pro model (slower but smarter)
      maxBuffer: 1024 * 1024, // 1MB output buffer
      encoding: 'utf-8',
      env: {
        ...process.env,
        // Pass DeepSeek API key from .env to OpenClaw
        DEEPSEEK_API_KEY: envVars.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || '',
        OPENCLAW_NO_COLOR: '1',
      },
    })

    // Parse JSON response. The CLI outputs JSON with some log lines mixed in.
    const jsonMatch = stdout.match(/\{[\s\S]*"payloads"[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        text: '',
        sessionId: '',
        durationMs: Date.now() - startTime,
        error: `Failed to parse agent response. Raw output: ${stdout.slice(0, 500)}`,
      }
    }

    const result = JSON.parse(jsonMatch[0])
    const payload = result.payloads?.[0]

    return {
      text: payload?.text || '(no response)',
      sessionId: result.meta?.agentMeta?.sessionId || '',
      usage: result.meta?.agentMeta?.usage,
      durationMs: Date.now() - startTime,
    }
  } catch (error: any) {
    const stderr = error.stderr || ''
    const stdout = error.stdout || ''
    return {
      text: '',
      sessionId: '',
      durationMs: Date.now() - startTime,
      error: `Agent call failed: ${error.message}. stderr: ${stderr.slice(0, 300)}. stdout: ${stdout.slice(0, 300)}`,
    }
  }
}

export function registerAiCoachIpc(): void {
  ipcMain.handle(
    'ai-coach:send',
    (_event, params: CoachSendRequest): CoachSendResponse => {
      const { message } = params

      if (!message || message.trim().length === 0) {
        return {
          text: '',
          sessionId: '',
          durationMs: 0,
          error: 'Message is required',
        }
      }

      // Prepend conversation history for context
      let fullMessage = message
      if (params.history && params.history.length > 0) {
        const context = params.history
          .slice(-6) // Last 3 exchanges (6 messages)
          .map((m) => `[${m.role === 'user' ? '吴总' : '巴哥'}]: ${m.content}`)
          .join('\n')
        fullMessage = `对话历史:\n${context}\n\n---\n吴总: ${message}`
      }

      return callOpenClawAgent(fullMessage)
    }
  )

  ipcMain.handle('ai-coach:health', () => {
    try {
      execSync('openclaw agents list', { timeout: 5000, encoding: 'utf-8' })
      return { ok: true, agentId: AGENT_ID }
    } catch {
      return { ok: false, agentId: AGENT_ID }
    }
  })
}
