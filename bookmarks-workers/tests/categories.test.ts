import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index'
import { createMockDB, MockD1Database } from './helpers/mock-db'

function env(db: MockD1Database) {
  return { DB: db as unknown as D1Database, ENVIRONMENT: 'test', CORS_ORIGIN: '*' }
}

describe('Category API', () => {
  let db: MockD1Database

  beforeEach(() => {
    db = createMockDB()
  })

  describe('GET /categories', () => {
    it('should return empty array when no categories exist', async () => {
      const res = await app.request('/categories', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })

    it('should return all categories', async () => {
      db.seed('categories', [
        { id: 1, name: 'Tech', color: '#ff0000', created_at: '2024-01-01' },
        { id: 2, name: 'News', color: '#00ff00', created_at: '2024-01-02' },
      ])

      const res = await app.request('/categories', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveLength(2)
    })
  })

  describe('GET /categories/:id', () => {
    it('should return 404 for non-existent category', async () => {
      const res = await app.request('/categories/999', {}, env(db))
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('Category not found')
    })

    it('should return the category when it exists', async () => {
      db.seed('categories', [
        { id: 1, name: 'Tech', color: '#ff0000', created_at: '2024-01-01' },
      ])

      const res = await app.request('/categories/1', {}, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Tech')
      expect(data.color).toBe('#ff0000')
    })
  })

  describe('POST /categories', () => {
    it('should create a category', async () => {
      const res = await app.request('/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Category', color: '#abc123' }),
      }, env(db))
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.name).toBe('New Category')
      expect(data.color).toBe('#abc123')
    })

    it('should use default color when not provided', async () => {
      const res = await app.request('/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'No Color' }),
      }, env(db))
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.color).toBe('#667eea')
    })

    it('should return 400 when name is empty', async () => {
      const res = await app.request('/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      }, env(db))
      expect(res.status).toBe(400)
    })

    it('should return 400 when name is whitespace only', async () => {
      const res = await app.request('/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '   ' }),
      }, env(db))
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /categories/:id', () => {
    it('should return 404 for non-existent category', async () => {
      const res = await app.request('/categories/999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      }, env(db))
      expect(res.status).toBe(404)
    })

    it('should return 400 when name is empty', async () => {
      db.seed('categories', [
        { id: 1, name: 'Old', color: '#000', created_at: '2024-01-01' },
      ])

      const res = await app.request('/categories/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      }, env(db))
      expect(res.status).toBe(400)
    })

    it('should update an existing category', async () => {
      db.seed('categories', [
        { id: 1, name: 'Old', color: '#000', created_at: '2024-01-01' },
      ])

      const res = await app.request('/categories/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated', color: '#fff' }),
      }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.name).toBe('Updated')
      expect(data.color).toBe('#fff')
    })
  })

  describe('DELETE /categories/:id', () => {
    it('should return 404 for non-existent category', async () => {
      const res = await app.request('/categories/999', { method: 'DELETE' }, env(db))
      expect(res.status).toBe(404)
    })

    it('should delete an existing category', async () => {
      db.seed('categories', [
        { id: 1, name: 'ToDelete', color: '#000', created_at: '2024-01-01' },
      ])

      const res = await app.request('/categories/1', { method: 'DELETE' }, env(db))
      expect(res.status).toBe(204)
      expect(db.getAll('categories')).toHaveLength(0)
    })
  })

  describe('POST /categories/batch-delete', () => {
    it('should return 400 for empty array', async () => {
      const res = await app.request('/categories/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      }, env(db))
      expect(res.status).toBe(400)
    })

    it('should delete multiple categories', async () => {
      db.seed('categories', [
        { id: 1, name: 'A', color: '#000', created_at: '2024-01-01' },
        { id: 2, name: 'B', color: '#000', created_at: '2024-01-02' },
        { id: 3, name: 'C', color: '#000', created_at: '2024-01-03' },
      ])

      const res = await app.request('/categories/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([1, 3]),
      }, env(db))
      expect(res.status).toBe(204)
      expect(db.getAll('categories')).toHaveLength(1)
    })
  })

  describe('DELETE /categories/empty', () => {
    it('should delete categories with no bookmarks', async () => {
      db.seed('categories', [
        { id: 1, name: 'Empty', color: '#000', created_at: '2024-01-01' },
        { id: 2, name: 'HasBookmarks', color: '#000', created_at: '2024-01-02' },
      ])
      db.seed('bookmarks', [
        { id: 1, title: 'B', url: 'https://b.com', description: '', category_id: 2, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
      ])

      const res = await app.request('/categories/empty', { method: 'DELETE' }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.deletedCount).toBe(1)
      expect(db.getAll('categories')).toHaveLength(1)
      expect(db.getAll('categories')[0].name).toBe('HasBookmarks')
    })

    it('should return 0 when no empty categories', async () => {
      db.seed('categories', [
        { id: 1, name: 'Full', color: '#000', created_at: '2024-01-01' },
      ])
      db.seed('bookmarks', [
        { id: 1, title: 'B', url: 'https://b.com', description: '', category_id: 1, click_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01', last_clicked_at: null },
      ])

      const res = await app.request('/categories/empty', { method: 'DELETE' }, env(db))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.deletedCount).toBe(0)
    })
  })
})
