import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { jwt } from 'hono/jwt'
import { bookmarkRoutes } from './routes/bookmarks'
import { categoryRoutes } from './routes/categories'
import { urlRoutes } from './routes/url'
import { authRoutes } from './routes/auth'
import { requireAuth } from './middleware/auth'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// Only enable logger in development for better production performance
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT === 'development') {
    return logger()(c, next)
  }
  return next()
})

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Disposition'],
}))

// Cache GET requests at edge for 60 seconds
app.use('/api/bookmarks', async (c, next) => {
  if (c.req.method === 'GET') {
    await next()
    if (c.res.status === 200) {
      c.res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    }
  } else {
    return next()
  }
})

app.use('/api/categories', async (c, next) => {
  if (c.req.method === 'GET') {
    await next()
    if (c.res.status === 200) {
      c.res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
    }
  } else {
    return next()
  }
})

app.get('/', (c) => c.json({ name: 'yaji-bookmarks', version: '1.0.0' }))

// Auth routes (no auth required)
app.route('/api/auth', authRoutes)

// Protected routes (require authentication)
app.use('/api/bookmarks/*', requireAuth)
app.use('/api/categories/*', requireAuth)
app.use('/api/url/title', requireAuth)

app.route('/api/bookmarks', bookmarkRoutes)
app.route('/api/categories', categoryRoutes)
app.route('/api/url', urlRoutes)

export default app
