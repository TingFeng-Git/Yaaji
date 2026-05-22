import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '../types'
import { sign, verify } from 'hono/jwt'

const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

const DEFAULT_JWT_SECRET = 'yaji-bookmarks-jwt-secret-change-in-production'
const TOKEN_EXPIRY = '7d'

// 密码哈希（本地开发用简单哈希，生产应使用 bcrypt/argon2）
function hashPassword(password: string, secret: string): string {
  return btoa(password + ':' + secret.slice(0, 16))
}

function comparePassword(password: string, hash: string, secret: string): boolean {
  return hash === btoa(password + ':' + secret.slice(0, 16))
}

// 注册
authRoutes.post('/register', async (c) => {
  const JWT_SECRET = c.env.JWT_SECRET || DEFAULT_JWT_SECRET
  const { username, password } = await c.req.json()

  if (!username || !password) {
    return c.json({ error: '用户名和密码不能为空' }, 400)
  }

  if (username.length < 3 || username.length > 20) {
    return c.json({ error: '用户名长度应为 3-20 个字符' }, 400)
  }

  if (password.length < 6) {
    return c.json({ error: '密码长度至少 6 个字符' }, 400)
  }

  const db = c.env.DB

  // 检查用户名是否已存在
  const existing = await db
    .prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number }>()

  if (existing) {
    return c.json({ error: '用户名已存在' }, 409)
  }

  const passwordHash = hashPassword(password, JWT_SECRET)
  const now = new Date().toISOString()

  const result = await db
    .prepare(
      'INSERT INTO users (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)'
    )
    .bind(username, passwordHash, now, now)
    .run()

  const userId = result.meta.last_row_id as number

  // 生成 JWT
  const token = await sign({ userId, username }, JWT_SECRET)

  return c.json({
    message: '注册成功',
    user: { id: userId, username },
    token,
  })
})

// 登录
authRoutes.post('/login', async (c) => {
  const JWT_SECRET = c.env.JWT_SECRET || DEFAULT_JWT_SECRET
  const { username, password } = await c.req.json()

  if (!username || !password) {
    return c.json({ error: '用户名和密码不能为空' }, 400)
  }

  const db = c.env.DB

  const user = await db
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number; username: string; password_hash: string }>()

  if (!user || !comparePassword(password, user.password_hash, JWT_SECRET)) {
    return c.json({ error: '用户名或密码错误' }, 401)
  }

  const token = await sign({ userId: user.id, username: user.username }, JWT_SECRET)

  return c.json({
    message: '登录成功',
    user: { id: user.id, username: user.username },
    token,
  })
})

// 登出（简化为无操作，JWT 无状态）
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: '未授权' }, 401)
  }

  return c.json({ message: '登出成功' })
})

// 获取当前用户信息
authRoutes.get('/me', async (c) => {
  const JWT_SECRET = c.env.JWT_SECRET || DEFAULT_JWT_SECRET
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return c.json({ error: '未授权' }, 401)
  }

  try {
    const payload = await verify(token, JWT_SECRET, 'HS256')
    const db = c.env.DB

    const user = await db
      .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
      .bind((payload as any).userId)
      .first<{ id: number; username: string; created_at: string }>()

    if (!user) {
      return c.json({ error: '用户不存在' }, 404)
    }

    return c.json({ user })
  } catch {
    return c.json({ error: 'Token 无效或已过期' }, 401)
  }
})

export { authRoutes }
