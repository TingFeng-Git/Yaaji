import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { createMockDB, MockD1Database } from './helpers/mock-db'

function env(db: MockD1Database) {
  return { DB: db as unknown as D1Database, ENVIRONMENT: 'test', CORS_ORIGIN: '*' }
}

describe('Bookmark API', () => {
  let db: MockD1Database

  beforeEach(() => {
    db = createMockDB()
  })

  describe('GET /api/bookmarks', () => {
    it('should return empty array when no bookmarks exist', async () => {
      const res = await app.request('/api/bookmarks', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })

    it('should return all bookmarks', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'Test 1', url: 'https://a.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
        { id: 2, title: 'Test 2', url: 'https://b.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-02', updated_at: '2024-01-02', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(2)
    })

    it('should filter by categoryId', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'Cat 1', url: 'https://a.com', description: '', category_id: 1, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
        { id: 2, title: 'Cat 2', url: 'https://b.com', description: '', category_id: 2, click_count: 0, created_at: '2024-01-02', updated_at: '2024-01-02', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks?categoryId=1', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].categoryId).toBe(1)
    })
  })

  describe('GET /api/bookmarks/recent', () => {
    it('should return recently clicked bookmarks', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'Recent', url: 'https://a.com', description: '', category_id: null, click_count: 5, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: '2024-06-01' },
        { id: 2, title: 'Old', url: 'https://b.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-02', updated_at: '2024-01-02', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks/recent', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(1)
      expect(data[0].title).toBe('Recent')
    })
  })

  describe('GET /api/bookmarks/check-url', () => {
    it('should return exists: false for unknown URL', async () => {
      const res = await app.request('/api/bookmarks/check-url?url=https://unknown.com', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.exists).toBe(false)
      expect(data.bookmark).toBeNull()
    })

    it('should return exists: true for known URL', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'Known', url: 'https://known.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks/check-url?url=https://known.com', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.exists).toBe(true)
      expect(data.bookmark).toBeTruthy()
    })

    it('should return exists: false when no url param', async () => {
      const res = await app.request('/api/bookmarks/check-url', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.exists).toBe(false)
    })
  })

  describe('GET /api/bookmarks/:id', () => {
    it('should return 404 for non-existent bookmark', async () => {
      const res = await app.request('/api/bookmarks/999', {}, env(db))
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Bookmark not found')
    })

    it('should return the bookmark when it exists', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'Test', url: 'https://test.com', description: 'desc', category_id: null, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks/1', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.title).toBe('Test')
      expect(data.url).toBe('https://test.com')
    })
  })

  describe('POST /api/bookmarks', () => {
    it('should create a bookmark', async () => {
      const res = await app.request('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New', url: 'https://new.com' }),
      }, env(db))
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.title).toBe('New')
      expect(data.url).toBe('https://new.com')
      expect(data.id).toBeDefined()
    })

    it('should return 400 when title is missing', async () => {
      const res = await app.request('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://new.com' }),
      }, env(db))
      expect(res.status).toBe(400)
    })

    it('should return 400 when url is missing', async () => {
      const res = await app.request('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New' }),
      }, env(db))
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/bookmarks/:id', () => {
    it('should return 404 for non-existent bookmark', async () => {
      const res = await app.request('/api/bookmarks/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      }, env(db))
      expect(res.status).toBe(404)
    })

    it('should update an existing bookmark', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'Old', url: 'https://old.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.title).toBe('Updated')
    })
  })

  describe('DELETE /api/bookmarks/:id', () => {
    it('should return 404 for non-existent bookmark', async () => {
      const res = await app.request('/api/bookmarks/999', { method: 'DELETE' }, env(db))
      expect(res.status).toBe(404)
    })

    it('should delete an existing bookmark', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'ToDelete', url: 'https://del.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks/1', { method: 'DELETE' }, env(db))
      expect(res.status).toBe(204)
      expect(db.getAll('bookmarks')).toHaveLength(0)
    })
  })

  describe('POST /api/bookmarks/:id/click', () => {
    it('should return 404 for non-existent bookmark', async () => {
      const res = await app.request('/api/bookmarks/999/click', { method: 'POST' }, env(db))
      expect(res.status).toBe(404)
    })

    it('should increment click count', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'Click', url: 'https://click.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks/1/click', { method: 'POST' }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.clickCount).toBe(1)
      expect(data.lastClickedAt).toBeTruthy()
    })
  })

  describe('POST /api/bookmarks/batch-delete', () => {
    it('should return 400 for empty array', async () => {
      const res = await app.request('/api/bookmarks/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      }, env(db))
      expect(res.status).toBe(400)
    })

    it('should delete multiple bookmarks', async () => {
      db.seed('bookmarks', [
        { id: 1, title: 'A', url: 'https://a.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
        { id: 2, title: 'B', url: 'https://b.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-02', updated_at: '2024-01-02', last_clicked_at: null },
        { id: 3, title: 'C', url: 'https://c.com', description: '', category_id: null, click_count: 0, created_at: '2024-01-03', updated_at: '2024-01-03', last_clicked_at: null },
      ])

      const res = await app.request('/api/bookmarks/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([1, 3]),
      }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(db.getAll('bookmarks')).toHaveLength(1)
    })
  })
})
