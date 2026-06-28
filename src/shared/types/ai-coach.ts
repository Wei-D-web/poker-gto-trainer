// ============================================================
// AI Coach Types — shared between main & renderer processes
// ============================================================

/** A single message in the AI coach conversation */
export interface CoachMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO 8601
}

/** Request to send a message to the AI coach */
export interface CoachSendRequest {
  message: string
  /** Optional: existing conversation history for context */
  history?: CoachMessage[]
}

/** Response from the AI coach */
export interface CoachSendResponse {
  text: string
  sessionId: string
  usage?: {
    input: number
    output: number
    total: number
  }
  durationMs: number
  error?: string
}
