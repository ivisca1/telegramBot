import { Hono } from 'hono'
import { proxyRequest } from '../middleware/proxy'

const {
  OPENCODE_URL = "http://localhost:4098",
  OPENCODE_API_KEY = "",
  OPENCODE_PASSWORD = "",
} = process.env;

const router = new Hono()

router.get('/config', async (c) => {
  const headers: Record<string, string> = {}
  if (OPENCODE_API_KEY) {
    headers['Authorization'] = `Bearer ${OPENCODE_API_KEY}`
  } else if (OPENCODE_PASSWORD) {
    const encoded = Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString('base64')
    headers['Authorization'] = `Basic ${encoded}`
  }

  try {
    const res = await fetch(`${OPENCODE_URL}/config`, { headers, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return proxyRequest(c, '/config')
    const data = await res.json()

    const agentObj = data.agent
    const agentKeys = typeof agentObj === 'object' && agentObj !== null
      ? Object.keys(agentObj)
      : []

    const transformed = {
      ...data,
      agent: agentKeys.length > 0 ? agentKeys[0] : (typeof data.agent === 'string' ? data.agent : ''),
      agents: agentKeys,
    }

    return c.json(transformed)
  } catch {
    return proxyRequest(c, '/config')
  }
})

router.patch('/config', (c) => proxyRequest(c, '/config'))

export { router as configRouter }
