import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { chatRouter } from '../routes/chat'

const BASE = 'http://localhost'

// Bun's Mock<typeof fetch> lacks `preconnect` in newer type defs.
// Cast through unknown so the result satisfies `typeof fetch` at the
// assignment site while still exposing .mockResolvedValue etc.
function mockFetch() {
  return mock() as unknown as typeof fetch & ReturnType<typeof mock>
}

describe('chat proxy', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch()
  })

  afterEach(() => {
    delete process.env.OPENCODE_PASSWORD
  })

  function route(path: string) {
    return `${BASE}${path}`
  }

  function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('extracts content from top-level parts in json response', async () => {
    const mockData = {
      parts: [{ type: 'text', text: 'Hello world' }],
      info: { role: 'assistant' },
    }
    globalThis.fetch = mockFetch().mockResolvedValue(jsonResponse(mockData))

    const req = new Request(route('/session/abc-123/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)
    expect(res.status).toBe(200)

    const text = await res.text()
    const sseLine = text.trim()
    expect(sseLine).toStartWith('data: ')
    const parsed = JSON.parse(sseLine.slice(6))
    expect(parsed).toEqual({ content: 'Hello world', done: true })
  })

  it('extracts content from nested data.parts in json response', async () => {
    const mockData = {
      data: {
        parts: [{ type: 'text', text: 'Nested response' }],
      },
      info: { role: 'assistant' },
    }
    globalThis.fetch = mockFetch().mockResolvedValue(jsonResponse(mockData))

    const req = new Request(route('/session/abc-123/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    const text = await res.text()
    const parsed = JSON.parse(text.trim().slice(6))
    expect(parsed.content).toBe('Nested response')
    expect(parsed.done).toBe(true)
  })

  it('concatenates multiple text parts into one content string', async () => {
    const mockData = {
      parts: [
        { type: 'text', text: 'Part one. ' },
        { type: 'text', text: 'Part two.' },
      ],
    }
    globalThis.fetch = mockFetch().mockResolvedValue(jsonResponse(mockData))

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    const text = await res.text()
    const parsed = JSON.parse(text.trim().slice(6))
    expect(parsed.content).toBe('Part one. Part two.')
  })

  it('skips non-text parts when extracting content', async () => {
    const mockData = {
      parts: [
        { type: 'text', text: 'Only text' },
        { type: 'image', url: 'http://example.com/img.png' },
      ],
    }
    globalThis.fetch = mockFetch().mockResolvedValue(jsonResponse(mockData))

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    const text = await res.text()
    const parsed = JSON.parse(text.trim().slice(6))
    expect(parsed.content).toBe('Only text')
  })

  it('returns 503 when OpenCode is unreachable', async () => {
    globalThis.fetch = mockFetch().mockRejectedValue(new Error('connection refused'))

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('OpenCode server unreachable')
  })

  it('aborts and returns 503 on timeout', async () => {
    globalThis.fetch = mockFetch().mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'))

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('OpenCode server unreachable')
  })

  it('passes through SSE responses directly', async () => {
    const sseBody = 'data: {"content":"streaming","done":false}\n\ndata: {"content":"done","done":true}\n\n'
    globalThis.fetch = mockFetch().mockResolvedValue(
      new Response(sseBody, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    )

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    const body = await res.text()
    expect(body).toBe(sseBody)
  })

  it('forwards non-SSE, non-parts JSON responses as-is', async () => {
    const mockData = { result: 'ok', id: 42 }
    globalThis.fetch = mockFetch().mockResolvedValue(jsonResponse(mockData))

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/json')
    const body = await res.json()
    expect(body).toEqual(mockData)
  })

  it('transforms {content} to {parts} format when sending', async () => {
    let sentBody: unknown = null
    globalThis.fetch = mockFetch().mockImplementation(async (_url: string, opts: RequestInit) => {
      sentBody = JSON.parse(opts.body as string)
      return jsonResponse({ result: 'ok' })
    })

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hello there' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await chatRouter.fetch(req)

    expect(sentBody).toEqual({
      parts: [{ type: 'text', text: 'hello there' }],
    })
  })

  it('passes through existing parts format without re-wrapping', async () => {
    let sentBody: unknown = null
    globalThis.fetch = mockFetch().mockImplementation(async (_url: string, opts: RequestInit) => {
      sentBody = JSON.parse(opts.body as string)
      return jsonResponse({ result: 'ok' })
    })

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({
        parts: [{ type: 'text', text: 'already formatted' }],
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    await chatRouter.fetch(req)

    expect(sentBody).toEqual({
      parts: [{ type: 'text', text: 'already formatted' }],
    })
  })

  it('returns empty content when parts array is empty', async () => {
    globalThis.fetch = mockFetch().mockResolvedValue(jsonResponse({ parts: [] }))

    const req = new Request(route('/session/abc/message'), {
      method: 'POST',
      body: JSON.stringify({ content: 'hi' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await chatRouter.fetch(req)

    const text = await res.text()
    const parsed = JSON.parse(text.trim().slice(6))
    expect(parsed.content).toBe('')
    expect(parsed.done).toBe(true)
  })
})
