import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'

process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.CORS_ORIGIN = 'http://localhost:5173'

const { configRouter } = await import('../src/routes/config')

const originalFetch = global.fetch

describe('config routes', () => {
  beforeEach(() => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ model: 'gpt-4', agent: 'default' }), {
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

  test('GET /config returns config object', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ model: 'gpt-4', agent: 'default', temperature: 0.7 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const res = await configRouter.request('/config', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.model).toBe('gpt-4')
    expect(data.agent).toBe('default')
    expect(data.temperature).toBe(0.7)
  })

  test('PATCH /config updates config', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ model: 'claude-3', agent: 'default', temperature: 0.5 }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const res = await configRouter.request('/config', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-3', temperature: 0.5 }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.model).toBe('claude-3')
    expect(data.temperature).toBe(0.5)
  })
})
