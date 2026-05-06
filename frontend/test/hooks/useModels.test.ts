import { renderHook, waitFor } from '@testing-library/react'
import { useModels } from '@/hooks/useModels'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('useModels', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('loads models on mount (GET /api/config/providers)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify([
      { id: 'gpt-4', name: 'GPT-4', provider: 'openai' }
    ])))
    const { result } = renderHook(() => useModels())

    await waitFor(() => {
      expect(result.current.models).toHaveLength(1)
      expect(result.current.models[0].name).toBe('GPT-4')
    })
    expect(fetch).toHaveBeenCalledWith('/api/config/providers')
  })

  it('handles wrapped response {providers: [...]}', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      providers: [{ id: 'm1', name: 'M1', provider: 'p1' }]
    })))
    const { result } = renderHook(() => useModels())

    await waitFor(() => {
      expect(result.current.models).toHaveLength(1)
    })
  })

  it('handles fetch error gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    const { result } = renderHook(() => useModels())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('starts with isLoading true', () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}))
    const { result } = renderHook(() => useModels())
    expect(result.current.isLoading).toBe(true)
  })
})
