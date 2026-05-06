import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'

process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.CORS_ORIGIN = 'http://localhost:5173'

const { filesRouter } = await import('../src/routes/files')

const originalFetch = global.fetch

describe('files routes', () => {
  afterEach(() => {
    global.fetch = originalFetch
    mock.restore()
  })

  test('GET /file lists files in workspace', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { path: '/src', name: 'src', type: 'directory' },
            { path: '/src/index.ts', name: 'index.ts', type: 'file', size: 1024 },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )
    const res = await filesRouter.request('/file', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].type).toBe('directory')
    expect(data[1].size).toBe(1024)
  })

  test('GET /file/content returns file contents', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ path: '/src/index.ts', content: 'console.log("hello")' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const res = await filesRouter.request('/file/content', { method: 'GET' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.content).toBe('console.log("hello")')
  })
})
