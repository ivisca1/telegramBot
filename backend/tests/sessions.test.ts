import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'

process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.CORS_ORIGIN = 'http://localhost:5173'

const { sessionsRouter } = await import('../src/routes/sessions')

const originalFetch = global.fetch

describe('sessions routes', () => {
  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
    mock.restore()
  })

  test('GET /sessions forwards to OpenCode and returns session list', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { id: 's1', name: 'Session 1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const res = await sessionsRouter.request('/sessions', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].id).toBe('s1')
  })

  test('POST /session creates a new session', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: 's2',
            name: 'New Session',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const res = await sessionsRouter.request('/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New Session' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('s2')
    expect(data.name).toBe('New Session')
  })

  test('DELETE /session/:id returns 204', async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 204, headers: { 'content-type': 'application/json' } })),
    )
    const res = await sessionsRouter.request('/session/s1', { method: 'DELETE' })
    expect(res.status).toBe(204)
  })
})
