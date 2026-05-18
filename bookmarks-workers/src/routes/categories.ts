import { Hono } from 'hono'
import type { Env } from '../types'

export const categoryRoutes = new Hono<{ Bindings: Env }>()

categoryRoutes.get('/', async (c) => {
  const db = c.env.DB
  try {
    const { results } = await db.prepare('SELECT * FROM categories ORDER BY created_at DESC').all()
    return c.json(results)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

categoryRoutes.get('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const category = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()

  if (!category) {
    return c.json({ error: `Category not found with id: ${id}` }, 404)
  }

  return c.json(category)
})

categoryRoutes.post('/', async (c) => {
  const db = c.env.DB
  const body = await c.req.json<{ name: string; color?: string }>()

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Category name is required' }, 400)
  }

  const name = body.name.trim()
  const color = body.color?.trim() || '#667eea'

  const result = await db.prepare(
    'INSERT INTO categories (name, color) VALUES (?, ?) RETURNING *'
  ).bind(name, color).first()

  return c.json(result, 201)
})

categoryRoutes.put('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json<{ name: string; color?: string }>()

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Category name is required' }, 400)
  }

  const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: `Category not found with id: ${id}` }, 404)
  }

  const name = body.name.trim()
  const color = body.color?.trim() || '#667eea'

  const result = await db.prepare(
    'UPDATE categories SET name = ?, color = ? WHERE id = ? RETURNING *'
  ).bind(name, color, id).first()

  return c.json(result)
})

categoryRoutes.post('/batch-delete', async (c) => {
  const db = c.env.DB
  const ids = await c.req.json<number[]>()

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'IDs array is required' }, 400)
  }

  await db.prepare('PRAGMA foreign_keys = ON').run()

  const placeholders = ids.map(() => '?').join(', ')
  const stmt = db.prepare(`DELETE FROM categories WHERE id IN (${placeholders})`).bind(...ids)
  await stmt.run()

  return c.body(null, 204)
})

categoryRoutes.delete('/empty', async (c) => {
  const db = c.env.DB

  await db.prepare('PRAGMA foreign_keys = ON').run()

  const result = await db.prepare(`
    DELETE FROM categories WHERE id IN (
      SELECT c.id FROM categories c
      LEFT JOIN bookmarks b ON c.id = b.category_id
      WHERE b.id IS NULL
    )
  `).run()

  const deletedCount = result.meta?.changes || 0

  return c.json({ deletedCount })
})

categoryRoutes.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')

  const existing = await db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
  if (!existing) {
    return c.json({ error: `Category not found with id: ${id}` }, 404)
  }

  await db.prepare('PRAGMA foreign_keys = ON').run()
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()

  return c.body(null, 204)
})
