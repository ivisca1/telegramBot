import { useState, useEffect, useCallback, useRef } from 'react'
import type { SSEEvent } from '@/types'

interface UseRealtimeReturn {
  events: SSEEvent[]
  isConnected: boolean
  error: Error | null
  lastEvent: SSEEvent | null
}

export function useRealtime(): UseRealtimeReturn {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/event')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
      reconnectAttemptsRef.current = 0
    }

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        const event: SSEEvent = {
          type: e.type || 'message',
          data,
        }
        setEvents((prev) => [...prev.slice(-100), event])
      } catch {
        const event: SSEEvent = {
          type: e.type || 'message',
          data: { raw: e.data },
        }
        setEvents((prev) => [...prev.slice(-100), event])
      }
    }

    eventSource.onerror = () => {
      setError(new Error('SSE connection error'))
      setIsConnected(false)
      eventSource.close()
      eventSourceRef.current = null

      const attempt = reconnectAttemptsRef.current
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000)
      reconnectAttemptsRef.current = attempt + 1

      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }

    return eventSource
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [connect])

  const lastEvent = events.length > 0 ? events[events.length - 1] : null

  return {
    events,
    isConnected,
    error,
    lastEvent,
  }
}
