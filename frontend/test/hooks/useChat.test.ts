import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '@/hooks/useChat'
import { vi, describe, it, expect, beforeEach } from 'vitest'

function createSSEResponse(messages: string[]) {
  const encoder = new TextEncoder()
  let index = 0
  const stream = new ReadableStream({
    pull(controller) {
      if (index < messages.length) {
        controller.enqueue(encoder.encode(`data: ${messages[index]}\n\n`))
        index++
      } else {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('useChat', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns empty messages, not loading, no error when no sessionId', () => {
      const { result } = renderHook(() => useChat(undefined))
      expect(result.current.messages).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('has return type with send, abort, clear functions', () => {
      const { result } = renderHook(() => useChat('session-1'))
      expect(typeof result.current.send).toBe('function')
      expect(typeof result.current.abort).toBe('function')
      expect(typeof result.current.clear).toBe('function')
    })
  })

  describe('send()', () => {
    it('does not send when sessionId is undefined', async () => {
      const { result } = renderHook(() => useChat(undefined))
      await act(async () => { await result.current.send('test') })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('does not send empty content', async () => {
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('  ') })
      expect(fetch).not.toHaveBeenCalled()
    })

    it('calls POST /api/session/:id/message with correct body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ content: 'reply' })))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hello') })
      expect(fetch).toHaveBeenCalledWith(
        '/api/session/session-1/message',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'hello' }),
        })
      )
    })

    it('adds user message to messages array', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ content: 'reply' })))
      const { result } = renderHook(() => useChat('session-1'))
      act(() => { result.current.send('hello') })
      await waitFor(() => {
        expect(result.current.messages.some((m) => m.role === 'user' && m.content === 'hello')).toBe(true)
      })
    })

    it('sets isLoading true during request', async () => {
      vi.mocked(fetch).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify({ content: 'ok' }))), 50))
      )
      const { result } = renderHook(() => useChat('session-1'))
      act(() => { result.current.send('hello') })
      await waitFor(() => expect(result.current.isLoading).toBe(true))
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('handles non-SSE JSON response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ content: 'reply content' })))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hello') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toContain('reply content')
    })
  })

  describe('SSE streaming', () => {
    it('parses JSON SSE data and appends assistant message', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(createSSEResponse(['{"content":"Hello"}']))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toBe('Hello')
    })

    it('handles plain text SSE data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(createSSEResponse(['plain text response']))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toContain('plain text response')
    })

    it('accumulates multiple SSE events in order', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        createSSEResponse(['{"content":"Part1"}', '{"content":"Part2"}', '{"content":"Part3"}'])
      )
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      await waitFor(() => {
        const assistant = result.current.messages.find((m) => m.role === 'assistant')
        expect(assistant?.content).toBe('Part1Part2Part3')
      })
    })
  })

  describe('abort', () => {
    it('aborts the fetch request when abort() is called', async () => {
      let aborted = false
      vi.mocked(fetch).mockImplementationOnce((_url, options) => {
        const signal = (options as any)?.signal as AbortSignal
        signal?.addEventListener('abort', () => { aborted = true })
        return new Promise((resolve) => setTimeout(() => resolve(new Response('ok')), 1000))
      })
      const { result } = renderHook(() => useChat('session-1'))
      act(() => { result.current.send('hello') })
      act(() => { result.current.abort() })
      await waitFor(() => expect(aborted).toBe(true))
    })

    it('sets isLoading to false after abort', async () => {
      vi.mocked(fetch).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response('ok')), 1000))
      )
      const { result } = renderHook(() => useChat('session-1'))
      act(() => { result.current.send('hello') })
      act(() => { result.current.abort() })
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })
  })

  describe('error handling', () => {
    it('sets error on fetch rejection', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hello') })
      expect(result.current.error).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })

    it('does not set error on abort', async () => {
      let signal: AbortSignal | undefined
      vi.mocked(fetch).mockImplementationOnce((_url, options) => {
        signal = (options as any)?.signal
        return new Promise((resolve) => setTimeout(() => resolve(new Response('ok')), 1000))
      })
      const { result } = renderHook(() => useChat('session-1'))
      act(() => { result.current.send('hello') })
      act(() => { result.current.abort() })
      // The fetch promise will reject with AbortError, but hook should ignore it
      await waitFor(() => expect(result.current.error).toBeNull())
    })
  })

  describe('clear', () => {
    it('clears all messages', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ content: 'reply' })))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hello') })
      await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0))
      act(() => { result.current.clear() })
      expect(result.current.messages).toEqual([])
    })
  })

  describe('session change', () => {
    it('clears messages when sessionId changes', async () => {
      const { result, rerender } = renderHook(
        ({ id }) => useChat(id),
        { initialProps: { id: 'session-1' as string | undefined } }
      )
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ content: 'msg1' })))
      await act(async () => { await result.current.send('hi') })
      await waitFor(() => expect(result.current.messages.length).toBeGreaterThan(0))
      rerender({ id: 'session-2' })
      await waitFor(() => expect(result.current.messages).toEqual([]))
    })
  })

  describe('abort during streaming', () => {
    it('stops stream processing when abort is called', async () => {
      let controller: AbortController | null = null

      vi.mocked(fetch).mockImplementationOnce((_url, options) => {
        controller = (options as any)?.signal as AbortController

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async pull(ctrl) {
            await new Promise(r => setTimeout(r, 50))
            if (controller?.signal.aborted) {
              ctrl.close()
              return
            }
            ctrl.enqueue(encoder.encode('data: {"content":"chunk"}\n\n'))
            ctrl.close()
          }
        })
        return Promise.resolve(new Response(stream, {
          headers: { 'content-type': 'text/event-stream' }
        }))
      })

      const { result } = renderHook(() => useChat('session-1'))

      act(() => { result.current.send('hello') })

      await new Promise(r => setTimeout(r, 20))

      act(() => { result.current.abort() })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe('double send', () => {
    it('cancels previous request when sending again during streaming', async () => {
      let firstAborted = false

      vi.mocked(fetch)
        .mockImplementationOnce((_url, options) => {
          const signal = (options as any)?.signal
          signal?.addEventListener('abort', () => { firstAborted = true })
          return new Promise(resolve => setTimeout(() =>
            resolve(new Response(JSON.stringify({ content: 'first' }))), 500
          ))
        })
        .mockImplementationOnce(() => {
          return Promise.resolve(new Response(JSON.stringify({ content: 'second' })))
        })

      const { result } = renderHook(() => useChat('session-1'))

      act(() => { result.current.send('first') })
      await new Promise(r => setTimeout(r, 50))
      act(() => { result.current.send('second') })

      await waitFor(() => {
        expect(firstAborted).toBe(true)
      })

      await waitFor(() => {
        expect(result.current.messages.some(m => m.content === 'second')).toBe(true)
      })
    })
  })

 describe('localStorage persistence', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('does not save to localStorage during loading', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      vi.mocked(fetch).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() =>
          resolve(new Response(JSON.stringify({ content: 'ok' }))), 100
        ))
      )

      const { result } = renderHook(() => useChat('session-1'))
      act(() => { result.current.send('hello') })

      // Should not call localStorage.setItem while loading
      await new Promise(r => setTimeout(r, 20))
      expect(setItemSpy).not.toHaveBeenCalled()

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Should have saved once after loading completes
      expect(setItemSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('localStorage edge cases', () => {
    let originalLocalStorage: Storage

    beforeEach(() => {
      originalLocalStorage = window.localStorage
      vi.restoreAllMocks()
    })

    afterEach(() => {
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      })
    })

    it('handles QuotaExceededError gracefully', async () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })

      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ content: 'ok' })))
      const { result } = renderHook(() => useChat('session-1'))

      await act(async () => { await result.current.send('test') })

      expect(result.current.error).toBeNull()
      setItem.mockRestore()
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('opencode_msgs_session-1', 'not-json')

      const { result } = renderHook(() => useChat('session-1'))

      expect(result.current.messages).toEqual([])
    })

    it('enforces 100 message limit', async () => {
      const manyMessages = Array.from({ length: 150 }, (_, i) => ({
        id: `msg-${i}`,
        role: 'user' as const,
        content: `message ${i}`,
        timestamp: new Date().toISOString(),
      }))
      localStorage.setItem('opencode_msgs_session-1', JSON.stringify(manyMessages))

      const { result } = renderHook(() => useChat('session-1'))

      await waitFor(() => {
        expect(result.current.messages.length).toBeLessThanOrEqual(100)
      })
    })

    it('does not leak messages between sessions', async () => {
      localStorage.setItem('opencode_msgs_session-A', JSON.stringify([
        { id: '1', role: 'user', content: 'A', timestamp: '' }
      ]))
      localStorage.setItem('opencode_msgs_session-B', JSON.stringify([
        { id: '2', role: 'user', content: 'B', timestamp: '' }
      ]))

      const { result: resultA } = renderHook(() => useChat('session-A'))
      await waitFor(() => expect(resultA.current.messages.some(m => m.content === 'A')).toBe(true))

      const { result: resultB } = renderHook(() => useChat('session-B'))
      await waitFor(() => expect(resultB.current.messages.some(m => m.content === 'B')).toBe(true))

      expect(resultA.current.messages.some(m => m.content === 'B')).toBe(false)
    })
  })

  describe('load persisted messages', () => {
    it('loads previously saved messages from localStorage', () => {
      const savedMessages = [
        { id: '1', role: 'user' as const, content: 'hello', timestamp: '2024-01-01' },
        { id: '2', role: 'assistant' as const, content: 'hi', timestamp: '2024-01-01' },
      ]
      localStorage.setItem('opencode_msgs_session-persist', JSON.stringify(savedMessages))

      const { result } = renderHook(() => useChat('session-persist'))
      expect(result.current.messages).toEqual(savedMessages)
    })
  })

  describe('HTTP error', () => {
    it('sets error on non-ok response status', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hello') })
      expect(result.current.error?.message).toContain('404')
    })
  })

  describe('SSE done event', () => {
    it('stops processing on done event', async () => {
      const encoder = new TextEncoder()
      let pulls = 0
      const events = [
        '{"content":"hello"}',
        '{"content":" world","done":true}',
      ]
      const stream = new ReadableStream({
        pull(controller) {
          if (pulls < events.length) {
            controller.enqueue(encoder.encode(`data: ${events[pulls]}\n\n`))
            pulls++
          } else {
            controller.close()
          }
        },
      })
      vi.mocked(fetch).mockResolvedValueOnce(new Response(stream, {
        headers: { 'content-type': 'text/event-stream' },
      }))

      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toBe('hello world')
    })
  })

  describe('unmount cleanup', () => {
    it('aborts in-flight request on unmount', async () => {
      let aborted = false

      vi.mocked(fetch).mockImplementationOnce((_url, options) => {
        const signal = (options as any)?.signal
        signal?.addEventListener('abort', () => { aborted = true })
        return new Promise(resolve => setTimeout(() =>
          resolve(new Response(JSON.stringify({ content: 'ok' }))), 1000
        ))
      })

      const { result, unmount } = renderHook(() => useChat('session-1'))

      act(() => { result.current.send('hello') })

      unmount()

      await waitFor(() => {
        expect(aborted).toBe(true)
      })
    })
  })

  describe('AbortError in catch', () => {
    it('does not set error when fetch rejects with AbortError', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => {
        const abortError = new Error('The operation was aborted')
        abortError.name = 'AbortError'
        return Promise.reject(abortError)
      })
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hello') })
      expect(result.current.error).toBeNull()
    })
  })

  describe('non-Error thrown', () => {
    it('wraps non-Error thrown values in an Error object', async () => {
      vi.mocked(fetch).mockRejectedValueOnce('string error')
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hello') })
      expect(result.current.error).toBeTruthy()
      expect(result.current.error?.message).toContain('Failed to send message')
    })
  })

  describe('abort() edge cases', () => {
    it('is safe to call abort when no request is in flight', () => {
      const { result } = renderHook(() => useChat('session-1'))
      expect(() => result.current.abort()).not.toThrow()
    })
  })

  describe('clear() edge cases', () => {
    it('clears safely without sessionId', () => {
      const { result } = renderHook(() => useChat(undefined))
      expect(() => result.current.clear()).not.toThrow()
      expect(result.current.messages).toEqual([])
    })
  })

  describe('non-SSE response formats', () => {
    it('handles response with message field', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ message: 'via message' })))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toContain('via message')
    })

    it('handles response with response field', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ response: 'via response' })))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toContain('via response')
    })

    it('serializes unexpected response structure to JSON', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ unexpected: 'fallback' })))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toContain('unexpected')
      expect(assistant?.content).toContain('fallback')
    })
  })

  describe('SSE delta field', () => {
    it('parses delta field from SSE data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(createSSEResponse(['{"delta":"incremental"}']))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toBe('incremental')
    })
  })

  describe('SSE text field', () => {
    it('parses text field from SSE data', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(createSSEResponse(['{"text":"raw text"}']))
      const { result } = renderHook(() => useChat('session-1'))
      await act(async () => { await result.current.send('hi') })
      const assistant = result.current.messages.find((m) => m.role === 'assistant')
      expect(assistant?.content).toBe('raw text')
    })
  })
})
