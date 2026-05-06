import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message } from '@/types'
import { loadMessages, saveMessages, clearMessages } from '@/lib/chatStorage'

interface UseChatReturn {
  messages: Message[]
  isLoading: boolean
  error: Error | null
  send: (content: string) => Promise<void>
  abort: () => void
  clear: () => void
}

export function useChat(sessionId: string | undefined): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setMessages([])
    setError(null)
  }, [sessionId])

  // Load persisted messages when session changes
  useEffect(() => {
    if (sessionId) {
      const saved = loadMessages(sessionId)
      if (saved.length > 0) {
        setMessages(saved)
      }
    }
  }, [sessionId])

  const send = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim()) return

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      setIsLoading(true)
      setError(null)

      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const response = await fetch(`/api/session/${sessionId}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const contentType = response.headers.get('Content-Type') || ''
        
        if (contentType.includes('text/event-stream')) {
          const reader = response.body?.getReader()
          if (!reader) throw new Error('No reader available')

          const decoder = new TextDecoder()
          let assistantContent = ''
          let messageId = `assistant-${Date.now()}`

          setMessages((prev) => [
            ...prev,
            { id: messageId, role: 'assistant', content: '', timestamp: new Date().toISOString() },
          ])

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.content || data.delta || data.text) {
                    assistantContent += data.content || data.delta || data.text
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageId
                          ? { ...msg, content: assistantContent }
                          : msg
                      )
                    )
                  }
                  if (data.done || data.finish_reason) {
                    break
                  }
                } catch {
                  const text = line.slice(6).trim()
                  if (text) {
                    assistantContent += text
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageId
                          ? { ...msg, content: assistantContent }
                          : msg
                      )
                    )
                  }
                }
              }
            }
          }
        } else {
          const data = await response.json()
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.content || data.message || data.response || JSON.stringify(data),
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, assistantMessage])
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        setError(err instanceof Error ? err : new Error('Failed to send message'))
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsLoading(false)
          abortControllerRef.current = null
        }
      }
    },
    [sessionId]
  )

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Persist messages when they change (only when not streaming)
  useEffect(() => {
    if (sessionId && messages.length > 0 && !isLoading) {
      saveMessages(sessionId, messages)
    }
  }, [messages, sessionId, isLoading])

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    if (sessionId) {
      clearMessages(sessionId)
    }
  }, [sessionId])

  return { messages, isLoading, error, send, abort, clear }
}
