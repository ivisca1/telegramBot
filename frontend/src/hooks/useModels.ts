import { useState, useEffect, useCallback } from 'react'
import type { Model } from '@/types'

interface UseModelsReturn {
  models: Model[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/config/providers')
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      
      const modelList: Model[] = Array.isArray(data)
        ? data
        : data.models || data.providers || []
      
      setModels(modelList)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch models'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const refresh = useCallback(async () => {
    await fetchModels()
  }, [fetchModels])

  return {
    models,
    isLoading,
    error,
    refresh,
  }
}
