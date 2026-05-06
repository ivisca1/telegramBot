import { renderHook, waitFor, act } from '@testing-library/react'
import { useRealtime } from '@/hooks/useRealtime'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

let mockEventSourceInstance: MockEventSource | null = null

class MockEventSource {
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  url: string
  readyState: number = MockEventSource.CONNECTING
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  constructor(url: string) {
    this.url = url
    mockEventSourceInstance = this
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN
      this.onopen?.()
    }, 0)
  }

  close() {
    this.readyState = MockEventSource.CLOSED
  }
}

describe('useRealtime', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockEventSourceInstance = null
    globalThis.EventSource = MockEventSource as any
  })

  afterEach(() => {
    mockEventSourceInstance = null
  })

  it('connects to /api/event on mount', async () => {
    const { result } = renderHook(() => useRealtime())

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
    expect(mockEventSourceInstance?.url).toBe('/api/event')
  })

  it('events array starts empty', async () => {
    const { result } = renderHook(() => useRealtime())

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    expect(result.current.events).toEqual([])
    expect(result.current.lastEvent).toBeNull()
  })

  it('sets error and disconnects on EventSource error', async () => {
    const { result } = renderHook(() => useRealtime())

    await waitFor(() => expect(result.current.isConnected).toBe(true))

    act(() => {
      mockEventSourceInstance?.onerror?.(new Event('error'))
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })

  it('closes EventSource on unmount', () => {
    const closeSpy = vi.fn()
    class CloseSpyEventSource extends MockEventSource {
      close() {
        closeSpy()
        super.close()
      }
    }
    globalThis.EventSource = CloseSpyEventSource as any

    const { unmount } = renderHook(() => useRealtime())
    unmount()

    expect(closeSpy).toHaveBeenCalled()
  })

  it('clears reconnect timeout on unmount', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    class ErrorEventSource {
      onopen: (() => void) | null = null
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: (() => void) | null = null
      url: string
      close() {}

      constructor(url: string) {
        this.url = url
        setTimeout(() => this.onerror?.(), 0)
      }
    }

    globalThis.EventSource = ErrorEventSource as any

    const { unmount } = renderHook(() => useRealtime())

    await new Promise(r => setTimeout(r, 50))
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
