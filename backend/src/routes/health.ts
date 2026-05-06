import { Hono } from 'hono'

const { OPENCODE_URL = 'http://localhost:4098', OPENCODE_API_KEY = '' } = process.env

const router = new Hono()

router.get('/health/live', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

router.get('/health/ready', async (c) => {
  try {
    const headers: Record<string, string> = {}
    if (OPENCODE_API_KEY) headers['Authorization'] = `Bearer ${OPENCODE_API_KEY}`
    const res = await fetch(`${OPENCODE_URL}/config`, {
      signal: AbortSignal.timeout(5000),
      headers,
    })
    if (res.ok) {
      return c.json({ status: 'ready', upstream: 'connected' })
    }
    return c.json({ status: 'not_ready', upstream: `HTTP ${res.status}` }, 503)
  } catch (err) {
    return c.json({ status: 'not_ready', upstream: 'unreachable' }, 503)
  }
})

export default router
