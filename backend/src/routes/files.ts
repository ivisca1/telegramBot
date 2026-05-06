import { Hono } from 'hono'
import { proxyRequest } from '../middleware/proxy'

const router = new Hono()

router.get('/file', (c) => proxyRequest(c, '/file'))
router.get('/file/content', (c) => proxyRequest(c, '/file/content'))

export { router as filesRouter }
