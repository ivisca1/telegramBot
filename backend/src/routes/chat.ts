import { Hono } from 'hono'

const {
  OPENCODE_URL = 'http://localhost:4098',
  OPENCODE_API_KEY = '',
  OPENCODE_PASSWORD = '',
  CORS_ORIGIN = 'http://localhost:5173',
  NODE_ENV = '',
  BUN_ENV = '',
} = process.env

const isTest = NODE_ENV === 'test' || BUN_ENV === 'test'

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'proxy-authorization',
  'proxy-authenticate',
  'upgrade',
])

const router = new Hono()

router.post('/session/:id/message', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))

  // Transform frontend format {content: "hello"} to OpenCode format {parts: [{type: "text", text: "hello"}]}
  const openCodeBody = {
    parts: Array.isArray(body.parts)
      ? body.parts
      : [{ type: 'text' as const, text: body.content || '' }],
  }

  const headers = new Headers(c.req.raw.headers)
  headers.set('Content-Type', 'application/json')
  for (const key of HOP_BY_HOP) {
    headers.delete(key)
  }

  if (OPENCODE_API_KEY) {
    headers.set('Authorization', `Bearer ${OPENCODE_API_KEY}`)
  } else if (OPENCODE_PASSWORD) {
    const encoded = Buffer.from(`opencode:${OPENCODE_PASSWORD}`).toString('base64')
    headers.set('Authorization', `Basic ${encoded}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000)
  if (c.req.raw.signal) {
    if (c.req.raw.signal.aborted) { controller.abort() }
    c.req.raw.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(`${OPENCODE_URL}/session/${id}/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify(openCodeBody),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const contentType = response.headers.get('Content-Type') || ''

    if (contentType.includes('text/event-stream')) {
      const responseHeaders = new Headers()
      responseHeaders.set('Content-Type', 'text/event-stream')
      responseHeaders.set('Cache-Control', 'no-cache')
      responseHeaders.set('Connection', 'keep-alive')
      responseHeaders.set('Access-Control-Allow-Origin', CORS_ORIGIN)
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      responseHeaders.set('Access-Control-Allow-Credentials', 'true')

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    }

    if (!response.ok) return response
    const data = await response.json()

    const parts = data?.parts ?? data?.data?.parts
    if (parts && Array.isArray(parts)) {
      let content = ''
      for (const part of parts) {
        if (part.type === 'text' && part.text) {
          content += part.text
        }
      }

      const sseData = `data: ${JSON.stringify({ content, done: true })}\n\n`
      return new Response(sseData, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': CORS_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    }

    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', 'application/json')
    responseHeaders.set('Access-Control-Allow-Origin', CORS_ORIGIN)
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    responseHeaders.set('Access-Control-Allow-Credentials', 'true')

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (!isTest) {
      console.error(JSON.stringify({
        level: 'error',
        source: 'chat-proxy',
        upstream: OPENCODE_URL,
        endpoint: `/session/${id}/message`,
        method: 'POST',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      }))
    }
    const errorHeaders = new Headers({ 'Content-Type': 'application/json' })
    errorHeaders.set('Access-Control-Allow-Origin', CORS_ORIGIN)
    errorHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    errorHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    errorHeaders.set('Access-Control-Allow-Credentials', 'true')
    return new Response(JSON.stringify({ error: 'OpenCode server unreachable' }), {
      status: 503,
      headers: errorHeaders,
    })
  }
})

export { router as chatRouter }
