import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@/types'
import { clearMessages } from '@/lib/chatStorage'

interface UseSessionsReturn {
  sessions: Session[]
  currentSessionId?: string
  isLoading: boolean
  error: Error | null
  create: (name?: string) => Promise<Session | void>
  remove: (id: string) => Promise<void>
  switchSession: (id: string) => void
  refresh: () => Promise<void>
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/sessions')
      if (!response.ok) throw new Error('Failed to fetch sessions')
      const data = await response.json()
      setSessions(Array.isArray(data) ? data : data.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const create = useCallback(async (name?: string) => {
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error('Failed to create session')
      const session = await response.json()
      setSessions((prev) => [...prev, session])
      setCurrentSessionId(session.id)
      return session
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create session'))
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/session/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete session')
      clearMessages(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (currentSessionId === id) {
        setCurrentSessionId(undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete session'))
    }
  }, [currentSessionId])

  const switchSession = useCallback((id: string) => {
    setCurrentSessionId(id)
  }, [])

  const refresh = useCallback(async () => {
    await fetchSessions()
  }, [fetchSessions])

  return {
    sessions,
    currentSessionId,
    isLoading,
    error,
    create,
    remove,
    switchSession,
    refresh,
  }
}
