import type { Message } from '@/types'

const STORAGE_PREFIX = 'opencode_msgs_'
const MAX_MESSAGES = 100

export function loadMessages(sessionId: string): Message[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_MESSAGES) : []
  } catch {
    return []
  }
}

export function saveMessages(sessionId: string, messages: Message[]): void {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES)
    localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(trimmed))
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function clearMessages(sessionId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`)
  } catch {
    // ignore
  }
}
