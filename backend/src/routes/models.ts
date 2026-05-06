import { Hono } from 'hono'
import { proxyRequest } from '../middleware/proxy'

const router = new Hono()

router.get('/config/providers', async (c) => {
  const response = await proxyRequest(c, '/config/providers')
  if (!response.ok) return response

  try {
    const data = await response.json()

    // Flatten providers[].models into a flat array of {id, name, provider}
    let models: Array<{id: string, name: string, provider: string}> = []

    if (Array.isArray(data)) {
      models = data
    } else if (data && typeof data === 'object') {
      const providers = data.providers || data.models || []
      if (Array.isArray(providers)) {
        for (const provider of providers) {
          if (provider.models && typeof provider.models === 'object') {
            for (const [modelId, modelData] of Object.entries(provider.models)) {
              const m = modelData as any
              models.push({
                id: m.id || modelId,
                name: m.name || modelId,
                provider: m.providerID || provider.id || '',
              })
            }
          }
        }
      }
    }

    return c.json(models)
  } catch {
    // If transformation fails, return original response
    return response
  }
})

export { router as modelsRouter }
