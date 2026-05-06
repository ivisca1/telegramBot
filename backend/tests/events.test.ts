import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'

process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.CORS_ORIGIN = 'http://localhost:5173'

const { eventsRouter } = await import('../src/routes/events')

const originalFetch = global.fetch

describe('events routes', () => {
  afterEach(() => {
    global.fetch = originalFetch
    mock.restore()
  })

  test('GET /event proxies to OpenCode and returns events', async () => {
    let calledUrl = ''
    global.fetch = mock((url: string) => {
      calledUrl = url
      return Promise.resolve(
        new Response(JSON.stringify([{ type: 'session_update', data: {} }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    })
    const res = await eventsRouter.request('/event', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(calledUrl).toBe('http://localhost:9999/event')
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].type).toBe('session_update')
  })

  test('SSE event stream headers set properly', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: update\ndata: {}\n\n'))
        controller.close()
      },
    })
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(stream, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      ),
    )
    const res = await eventsRouter.request('/event', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('Connection')).toBe('keep-alive')
    const reader = (res.body as ReadableStream).getReader()
    const { value } = await reader.read()
    const text = new TextDecoder().decode(value)
    expect(text).toContain('event: update')
  })
})
