import { Hono } from 'hono'
import { proxyRequest } from '../middleware/proxy'

function safeDate(val: unknown): string {
  try { const d = val !== null && val !== undefined ? new Date(val as number) : null; return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : '' } catch { return '' }
}

const router = new Hono()

router.get('/sessions', async (c) => {
  const response = await proxyRequest(c, '/session')
  if (!response.ok) return response

  try {
    const data = await response.json()

    // Transform OpenCode sessions to frontend format
    // OpenCode: [{id, slug, title, time: {created, updated}, ...}]
    // Frontend: [{id, name, created_at, updated_at}]
    const sessions = Array.isArray(data) ? data : (data.sessions || [])
    const transformed = sessions.map((s: any) => ({
      id: s.id || '',
      name: s.title || s.slug || s.name || '',
      created_at: safeDate(s.time?.created) || s.created_at || '',
      updated_at: safeDate(s.time?.updated) || s.updated_at || '',
      model: s.model,
      agent: s.agent,
    }))

    return c.json(transformed)
  } catch (err) {
    if (process.env.NODE_ENV !== 'test' && process.env.BUN_ENV !== 'test') console.error('[sessions] transform failed:', err)
    return c.json({ error: 'Failed to parse sessions' }, 500)
  }
})

router.post('/session', (c) => proxyRequest(c, '/session'))

router.delete('/session/:id', (c) => proxyRequest(c, `/session/${c.req.param('id')}`))

export { router as sessionsRouter }
