import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'

process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.CORS_ORIGIN = 'http://localhost:5173'

const { modelsRouter } = await import('../src/routes/models')

const originalFetch = global.fetch

describe('models routes', () => {
  afterEach(() => {
    global.fetch = originalFetch
    mock.restore()
  })

  test('GET /config/providers returns model list', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
            { id: 'claude-3', name: 'Claude 3', provider: 'anthropic' },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const res = await modelsRouter.request('/config/providers', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(2)
    expect(data[0].provider).toBe('openai')
  })

  test('handles object wrapper responses', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            providers: [
              {
                id: 'openai',
                models: {
                  'gpt-4': { id: 'gpt-4', name: 'GPT-4', providerID: 'openai' },
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const res = await modelsRouter.request('/config/providers', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBe(1)
    expect(data[0].id).toBe('gpt-4')
    expect(data[0].provider).toBe('openai')
  })
})
