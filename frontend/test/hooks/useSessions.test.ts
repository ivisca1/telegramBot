import { renderHook, act, waitFor } from '@testing-library/react'
import { useSessions } from '@/hooks/useSessions'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('useSessions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('loads sessions on mount (GET /api/sessions)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([
      { id: '1', name: 'Session 1', created_at: '2024-01-01', updated_at: '2024-01-01' }
    ])))
    const { result } = renderHook(() => useSessions())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
      expect(result.current.sessions[0].name).toBe('Session 1')
    })
    expect(fetch).toHaveBeenCalledWith('/api/sessions')
  })

  it('handles wrapped response {sessions: [...]}', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      sessions: [{ id: '1', name: 'S1', created_at: '', updated_at: '' }]
    })))
    const { result } = renderHook(() => useSessions())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1)
    })
  })

  it('handles fetch error gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useSessions())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('creates session (POST /api/session)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'new', name: 'New Session', created_at: '', updated_at: '' })))
    const { result } = renderHook(() => useSessions())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => { await result.current.create('New Session') })

    expect(fetch).toHaveBeenCalledWith('/api/session', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'New Session' }),
    }))
    expect(result.current.sessions).toHaveLength(1)
  })

  it('deletes session (DELETE /api/session/:id)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: '1', name: 'S1', created_at: '', updated_at: '' }])))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    const { result } = renderHook(() => useSessions())

    await waitFor(() => expect(result.current.sessions.length).toBe(1))

    await act(async () => { await result.current.remove('1') })

    expect(fetch).toHaveBeenCalledWith('/api/session/1', expect.objectContaining({ method: 'DELETE' }))
    expect(result.current.sessions).toHaveLength(0)
  })

  it('sets currentSessionId to undefined when deleting current session', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: '1', name: 'S1', created_at: '', updated_at: '' }])))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    const { result } = renderHook(() => useSessions())

    await waitFor(() => expect(result.current.sessions.length).toBe(1))

    act(() => result.current.switchSession('1'))
    await act(async () => { await result.current.remove('1') })

    expect(result.current.currentSessionId).toBeUndefined()
  })

  it('switchSession updates currentSessionId', () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([])))
    const { result } = renderHook(() => useSessions())

    act(() => result.current.switchSession('session-2'))

    expect(result.current.currentSessionId).toBe('session-2')
  })

  it('refresh re-fetches sessions', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify([])))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: '2', name: 'S2', created_at: '', updated_at: '' }])))
    const { result } = renderHook(() => useSessions())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => { await result.current.refresh() })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('2')
  })
})
