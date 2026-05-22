import { MiddlewareHandler } from 'hono'
import { verify } from 'hono/jwt'

const DEFAULT_JWT_SECRET = 'yaji-bookmarks-jwt-secret-change-in-production'

export const requireAuth: MiddlewareHandler<{
  Variables: { userId: number; username: string }
}> = async (c, next) => {
  const JWT_SECRET = c.env.JWT_SECRET || DEFAULT_JWT_SECRET
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return c.json({ error: '未授权，请先登录' }, 401)
  }

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256')
    c.set('userId', (payload as any).userId)
    c.set('username', (payload as any).username)
    await next()
  } catch {
    return c.json({ error: 'Token 无效或已过期' }, 401)
  }
}
