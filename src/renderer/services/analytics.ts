/**
 * Analytics — lightweight event tracking for conversion funnel.
 *
 * Events are logged to:
 *   1. console.log (for dev debugging)
 *   2. localStorage (events array, max 1000)
 *
 * Future: can be upgraded to Supabase INSERT into analytics_events table.
 */

// ── Event types ──

export type AnalyticsEvent =
  // Landing page
  | 'landing_page_viewed'
  | 'landing_demo_clicked'
  | 'landing_download_clicked'
  | 'landing_pricing_viewed'
  // Web demo
  | 'web_demo_entered'
  | 'web_demo_upgrade_clicked'
  | 'web_demo_download_clicked'
  | 'web_demo_exited'
  // Web login
  | 'web_login_started'
  | 'web_login_completed'
  | 'web_signup_started'
  // Post-login
  | 'web_postlogin_shown'
  | 'web_postlogin_download_clicked'
  | 'web_postlogin_browser_clicked'
  | 'web_postlogin_dismissed'
  // Desktop nudge
  | 'web_desktop_nudge_shown'
  | 'web_desktop_nudge_download_clicked'
  | 'web_desktop_nudge_closed'
  // Upgrade
  | 'upgrade_prompt_shown'
  | 'upgrade_checkout_started'
  | 'upgrade_checkout_completed'
  | 'upgrade_checkout_error'
  // Desktop
  | 'desktop_app_opened'
  | 'desktop_welcome_started'
  | 'desktop_welcome_completed'
  | 'desktop_welcome_skipped'
  // General
  | 'feature_viewed'
  | 'session_started'

// ── Event payload ──

export interface AnalyticsPayload {
  event: AnalyticsEvent
  timestamp: number
  /** Feature route if applicable */
  feature?: string
  /** Additional metadata */
  meta?: Record<string, string | number | boolean>
  /** Session ID for grouping events */
  sessionId?: string
}

// ── Storage ──

const STORAGE_KEY = 'pokergto_analytics_events'
const MAX_EVENTS = 1000
const SESSION_KEY = 'pokergto_analytics_session'

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    return `sess_${Date.now()}`
  }
}

// ── Track ──

let sessionId: string | null = null

export function track(
  event: AnalyticsEvent,
  meta?: Record<string, string | number | boolean>,
): void {
  if (!sessionId) {
    sessionId = getSessionId()
  }

  const payload: AnalyticsPayload = {
    event,
    timestamp: Date.now(),
    sessionId,
    meta,
  }

  // Console log for debugging (dev builds only)
  if (import.meta.env.DEV || import.meta.env.VITE_POKERGTO_DEV_BUILD === 'true') {
    const emoji = EVENT_EMOJI[event] || '📊'
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
    console.debug(`[Analytics] ${emoji} ${event}${metaStr}`)
  }

  // Persist to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const events: AnalyticsPayload[] = raw ? JSON.parse(raw) : []
    events.push(payload)

    // Trim to max
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

// ── Emoji map for console readability ──

const EVENT_EMOJI: Partial<Record<AnalyticsEvent, string>> = {
  landing_page_viewed: '🏠',
  landing_demo_clicked: '🎯',
  landing_download_clicked: '⬇️',
  web_demo_entered: '👁️',
  web_demo_upgrade_clicked: '⭐',
  web_demo_download_clicked: '💻',
  web_demo_exited: '🚪',
  web_login_started: '🔑',
  web_login_completed: '✅',
  web_postlogin_shown: '📢',
  web_postlogin_download_clicked: '💾',
  web_postlogin_browser_clicked: '🌐',
  web_desktop_nudge_shown: '🖥️',
  web_desktop_nudge_download_clicked: '📥',
  upgrade_prompt_shown: '💰',
  upgrade_checkout_started: '💳',
  desktop_app_opened: '🖥️',
  desktop_welcome_completed: '🎉',
  session_started: '🚀',
}

// ── Get all events (for debugging / export) ──

export function getEvents(): AnalyticsPayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ── Clear events ──

export function clearEvents(): void {
  localStorage.removeItem(STORAGE_KEY)
}
