import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { createMockDB, MockD1Database, createTestToken } from './helpers/mock-db'

function env(db: MockD1Database) {
  return { DB: db as unknown as D1Database, ENVIRONMENT: 'test', CORS_ORIGIN: '*', JWT_SECRET: 'yaji-bookmarks-jwt-secret-change-in-production' }
}

async function authHeaders(userId = 1) {
  const token = await createTestToken({ userId, username: 'testuser' })
  return { Authorization: `Bearer ${token}` }
}

describe('Auth API', () => {
  let db: MockD1Database

  beforeEach(() => {
    db = createMockDB()
  })

  describe('GET /api/auth/me', () => {
    it('should return user with camelCase createdAt field', async () => {
      db.seed('users', [
        { id: 1, username: 'testuser', password_hash: 'hash', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ])

      const res = await app.request('/api/auth/me', { headers: await authHeaders() }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user.createdAt).toBe('2024-01-01')
      expect(data.user.id).toBe(1)
      expect(data.user.username).toBe('testuser')
    })

    it('should not include user_id or password_hash in response', async () => {
      db.seed('users', [
        { id: 1, username: 'testuser', password_hash: 'hash', created_at: '2024-01-01', updated_at: '2024-01-01' },
      ])

      const res = await app.request('/api/auth/me', { headers: await authHeaders() }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.user.user_id).toBeUndefined()
      expect(data.user.password_hash).toBeUndefined()
    })

    it('should return 401 without token', async () => {
      const res = await app.request('/api/auth/me', {}, env(db))
      expect(res.status).toBe(401)
    })
  })
})
