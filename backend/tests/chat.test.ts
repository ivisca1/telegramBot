import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'

process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.CORS_ORIGIN = 'http://localhost:5173'

const { chatRouter } = await import('../src/routes/chat')

const originalFetch = global.fetch

describe('chat routes', () => {
  afterEach(() => {
    global.fetch = originalFetch
    mock.restore()
  })

  test('POST /session/:id/message forwards message to OpenCode', async () => {
    let calledUrl = ''
    global.fetch = mock((url: string) => {
      calledUrl = url
      return Promise.resolve(
        new Response(JSON.stringify({ role: 'assistant', content: 'Hello!' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    })
    const res = await chatRouter.request('/session/s1/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hi' }),
    })
    expect(res.status).toBe(200)
    expect(calledUrl).toBe('http://localhost:9999/session/s1/message')
    const data = await res.json()
    expect(data.content).toBe('Hello!')
  })

  test('SSE streaming: content-type set to text/event-stream and body is streamed', async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"content":"hello"}\n\n'))
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
    const res = await chatRouter.request('/session/s1/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hi' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('Connection')).toBe('keep-alive')
    expect(res.body).toBeTruthy()
    const reader = (res.body as ReadableStream).getReader()
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    const text = new TextDecoder().decode(value)
    expect(text).toContain('hello')
  })

  test('non-SSE response returns JSON normally', async () => {
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ role: 'assistant', content: 'OK' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    const res = await chatRouter.request('/session/s1/message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hi' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/json')
    const data = await res.json()
    expect(data.content).toBe('OK')
  })
})
