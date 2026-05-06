import { Hono } from 'hono'
import { proxyRequest } from '../middleware/proxy'

const router = new Hono()

router.get('/event', (c) => proxyRequest(c, '/event'))

export { router as eventsRouter }
