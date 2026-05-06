import { renderHook, act, waitFor } from '@testing-library/react'
import { useConfig } from '@/hooks/useConfig'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('useConfig', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('loads config on mount (GET /api/config)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      model: 'gpt-4', agent: 'default'
    })))
    const { result } = renderHook(() => useConfig())

    await waitFor(() => {
      expect(result.current.config?.model).toBe('gpt-4')
    })
    expect(fetch).toHaveBeenCalledWith('/api/config')
  })

  it('updates config (PATCH /api/config)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ model: 'old', agent: 'default' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ model: 'new-model', agent: 'default' })))
    const { result } = renderHook(() => useConfig())

    await waitFor(() => expect(result.current.config?.model).toBe('old'))

    await act(async () => { await result.current.updateConfig({ model: 'new-model' }) })

    expect(fetch).toHaveBeenCalledWith('/api/config', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ model: 'new-model' }),
    }))
    expect(result.current.config?.model).toBe('new-model')
  })

  it('handles fetch error gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useConfig())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('sets isLoading during fetch', () => {
    vi.mocked(fetch).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve(new Response('{}')), 100))
    )
    const { result } = renderHook(() => useConfig())
    expect(result.current.isLoading).toBe(true)
  })

  it('refresh fetches latest config', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ model: 'm1', agent: 'a1' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ model: 'm2', agent: 'a2' })))
    const { result } = renderHook(() => useConfig())

    await waitFor(() => expect(result.current.config?.model).toBe('m1'))

    await act(async () => { await result.current.refresh() })

    expect(result.current.config?.model).toBe('m2')
  })
})
