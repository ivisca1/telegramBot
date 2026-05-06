// Integration test: start backend + mock opencode, make real HTTP requests

// Start mock OpenCode server
const mockOpencode = Bun.serve({
  port: 9999,
  async fetch(req) {
    const url = new URL(req.url)
    
    // Check auth header
    const auth = req.headers.get('Authorization')
    console.log('[MOCK]', req.method, url.pathname, auth ? '✓ auth' : '✗ no auth')
    
    if (url.pathname === '/sessions') {
      return new Response(JSON.stringify([{id:'1',name:'Test',created_at:'2024-01-01',updated_at:'2024-01-01'}]), {
        headers: { 'content-type': 'application/json' }
      })
    }
    
    if (url.pathname === '/session') {
      return new Response(JSON.stringify({id:'2',name:'New',created_at:'2024-01-01',updated_at:'2024-01-01'}), {
        headers: { 'content-type': 'application/json' }
      })
    }
    
    if (url.pathname === '/config') {
      return new Response(JSON.stringify({model:'gpt-4',agent:'default'}), {
        headers: { 'content-type': 'application/json' }
      })
    }
    
    if (url.pathname === '/config/providers') {
      return new Response(JSON.stringify([{id:'gpt-4',name:'GPT-4',provider:'openai'}]), {
        headers: { 'content-type': 'application/json' }
      })
    }
    
    if (url.pathname === '/event') {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"type":"ping"}\n\n'))
          setTimeout(() => controller.close(), 100)
        }
      })
      return new Response(stream, {
        headers: { 'content-type': 'text/event-stream' }
      })
    }
    
    if (url.pathname.startsWith('/session/') && url.pathname.endsWith('/message')) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"content":"hello"}\n\n'))
          setTimeout(() => controller.close(), 100)
        }
      })
      return new Response(stream, {
        headers: { 'content-type': 'text/event-stream' }
      })
    }
    
    return new Response('Not found', { status: 404 })
  }
})

console.log('Mock OpenCode on localhost:9999')

// Set env BEFORE importing backend (it reads env at module load)
process.env.OPENCODE_URL = 'http://localhost:9999'
process.env.OPENCODE_PASSWORD = 'testpass'
process.env.PORT = '3456'
process.env.CORS_ORIGIN = 'http://localhost:5173'

// Import backend — this will start the server
await import('./src/index.ts')

// Wait for server to start
await new Promise(r => setTimeout(r, 500))

const base = 'http://localhost:3456'

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log('✓', name)
  } catch (e: any) {
    console.log('✗', name, '-', e.message)
    process.exitCode = 1
  }
}

await test('GET /api/sessions', async () => {
  const res = await fetch(`${base}/api/sessions`)
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('not array')
})

await test('POST /api/session', async () => {
  const res = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test' })
  })
  if (res.status !== 200) throw new Error(`status ${res.status}`)
})

await test('GET /api/config', async () => {
  const res = await fetch(`${base}/api/config`)
  if (res.status !== 200) throw new Error(`status ${res.status}`)
})

await test('GET /api/config/providers', async () => {
  const res = await fetch(`${base}/api/config/providers`)
  if (res.status !== 200) throw new Error(`status ${res.status}`)
})

await test('GET /api/event (SSE)', async () => {
  const res = await fetch(`${base}/api/event`)
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  const ct = res.headers.get('content-type')
  if (!ct?.includes('text/event-stream')) throw new Error(`bad ct: ${ct}`)
})

await test('POST /api/session/123/message (SSE)', async () => {
  const res = await fetch(`${base}/api/session/123/message`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: 'hi' })
  })
  if (res.status !== 200) throw new Error(`status ${res.status}`)
  const ct = res.headers.get('content-type')
  if (!ct?.includes('text/event-stream')) throw new Error(`bad ct: ${ct}`)
})

await test('CORS headers present', async () => {
  const res = await fetch(`${base}/api/sessions`)
  const cors = res.headers.get('access-control-allow-origin')
  if (!cors) throw new Error('missing CORS')
})

await test('OPTIONS /api/sessions (preflight)', async () => {
  const res = await fetch(`${base}/api/sessions`, { method: 'OPTIONS' })
  if (res.status !== 204) throw new Error(`status ${res.status}`)
  const cors = res.headers.get('access-control-allow-origin')
  if (!cors) throw new Error('missing CORS on OPTIONS')
})

console.log('\nDone.')
mockOpencode.stop()
process.exit(process.exitCode || 0)
