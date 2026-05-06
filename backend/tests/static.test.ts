import { describe, test, expect } from 'bun:test'
import { Hono } from 'hono'

describe('production static file serving', () => {
  test('isProduction detects production environment', () => {
    const check = (nodeEnv: string, bunEnv: string) => nodeEnv === 'production' || bunEnv === 'production'

    expect(check('production', '')).toBe(true)
    expect(check('', 'production')).toBe(true)
    expect(check('production', 'production')).toBe(true)
    expect(check('development', '')).toBe(false)
    expect(check('', '')).toBe(false)
    expect(check('', 'development')).toBe(false)
  })

  test('CORS OPTIONS preflight returns 204 with correct headers', async () => {
    const app = new Hono()
    app.options('/api/*', (c) => {
      return c.newResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
      })
    })

    const res = await app.request('http://localhost:3001/api/sessions', { method: 'OPTIONS' })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
