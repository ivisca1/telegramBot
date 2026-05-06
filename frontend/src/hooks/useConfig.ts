import { useState, useEffect, useCallback } from 'react'
import type { Config } from '@/types'

interface UseConfigReturn {
  config: Config | null
  isLoading: boolean
  error: Error | null
  updateConfig: (updates: Partial<Config>) => Promise<void>
  refresh: () => Promise<void>
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<Config | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/config')
      if (!response.ok) throw new Error('Failed to fetch config')
      const data = await response.json()
      setConfig(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch config'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const updateConfig = useCallback(async (updates: Partial<Config>) => {
    try {
      const response = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update config')
      const updated = await response.json()
      setConfig(updated)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update config'))
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchConfig()
  }, [fetchConfig])

  return {
    config,
    isLoading,
    error,
    updateConfig,
    refresh,
  }
}
