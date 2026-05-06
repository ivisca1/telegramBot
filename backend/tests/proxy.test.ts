import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { Hono } from 'hono'

process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.CORS_ORIGIN = 'http://localhost:5173'

const { proxyRequest } = await import('../src/middleware/proxy')

const originalFetch = global.fetch

function makeApp(path = '/proxy') {
  const app = new Hono()
  app.get(path, (c) => proxyRequest(c, path))
  app.post(path, (c) => proxyRequest(c, path))
  return app
}

describe('proxyRequest', () => {
  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-target': 'opencode' },
        }),
      ),
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
    mock.restore()
  })

  test('forwards GET with correct URL', async () => {
    let calledUrl = ''
    global.fetch = mock((url: string) => {
      calledUrl = url
      return Promise.resolve(new Response(JSON.stringify({ ok: true })))
    })
    const app = makeApp()
    await app.request('http://localhost:3001/proxy')
    expect(calledUrl).toBe('http://localhost:9999/proxy')
  })

  test('adds auth header when OPENCODE_API_KEY or OPENCODE_PASSWORD set', async () => {
    let authHeader = ''
    global.fetch = mock((url: string, init: RequestInit) => {
      authHeader = (init.headers as Headers).get('Authorization') ?? ''
      return Promise.resolve(new Response(JSON.stringify({ ok: true })))
    })
    const app = makeApp()
    await app.request('http://localhost:3001/proxy')
    expect(authHeader).not.toBe('')
  })

  test('returns 503 JSON when fetch throws', async () => {
    global.fetch = mock(() => Promise.reject(new Error('connection refused')))
    const app = makeApp()
    const res = await app.request('http://localhost:3001/proxy')
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).toEqual({ error: 'OpenCode server unreachable' })
  })

  test('strips hop-by-hop headers from upstream request', async () => {
    let sentHeaders: Headers | null = null
    global.fetch = mock((url: string, init: RequestInit) => {
      sentHeaders = init.headers as Headers
      return Promise.resolve(new Response(JSON.stringify({ ok: true })))
    })
    const app = makeApp()
    await app.request('http://localhost:3001/proxy', {
      headers: {
        host: 'evil.com',
        connection: 'keep-alive',
        'x-custom': 'should-pass',
      },
    })
    expect(sentHeaders?.get('host')).toBeNull()
    expect(sentHeaders?.get('connection')).toBeNull()
    expect(sentHeaders?.get('x-custom')).toBe('should-pass')
  })

  test('adds CORS headers to response', async () => {
    const app = makeApp()
    const res = await app.request('http://localhost:3001/proxy')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
