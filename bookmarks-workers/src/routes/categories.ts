import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '../types'

export const categoryRoutes = new Hono<{ Bindings: Env; Variables: { userId: number; username: string } }>()

categoryRoutes.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

categoryRoutes.get('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  try {
    const { results } = await db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all()
    return c.json(results)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

categoryRoutes.get('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')

  const category = await db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').bind(id, userId).first()

  if (!category) {
    return c.json({ error: `Category not found with id: ${id}` }, 404)
  }

  return c.json(category)
})

categoryRoutes.post('/', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const body = await c.req.json<{ name: string; color?: string }>()

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Category name is required' }, 400)
  }

  const name = body.name.trim()
  const color = body.color?.trim() || '#667eea'

  const result = await db.prepare(
    'INSERT INTO categories (name, color, user_id) VALUES (?, ?, ?) RETURNING *'
  ).bind(name, color, userId).first()

  return c.json(result, 201)
})

categoryRoutes.put('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json<{ name: string; color?: string }>()

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Category name is required' }, 400)
  }

  const existing = await db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!existing) {
    return c.json({ error: `Category not found with id: ${id}` }, 404)
  }

  const name = body.name.trim()
  const color = body.color?.trim() || '#667eea'

  const result = await db.prepare(
    'UPDATE categories SET name = ?, color = ? WHERE id = ? AND user_id = ? RETURNING *'
  ).bind(name, color, id, userId).first()

  return c.json(result)
})

categoryRoutes.post('/batch-delete', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const ids = await c.req.json<number[]>()

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'IDs array is required' }, 400)
  }

  const placeholders = ids.map(() => '?').join(', ')
  const hasBookmark = await db.prepare(
    `SELECT id FROM bookmarks WHERE category_id IN (${placeholders}) AND user_id = ? LIMIT 1`
  ).bind(...ids, userId).first()
  if (hasBookmark) {
    return c.json({ error: '该分类下存在数据，无法删除' }, 400)
  }

  const stmt = db.prepare(`DELETE FROM categories WHERE id IN (${placeholders}) AND user_id = ?`).bind(...ids, userId)
  await stmt.run()

  return c.body(null, 204)
})

categoryRoutes.delete('/empty', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')

  await db.prepare('PRAGMA foreign_keys = ON').run()

  const result = await db.prepare(`
    DELETE FROM categories WHERE id IN (
      SELECT c.id FROM categories c
      LEFT JOIN bookmarks b ON c.id = b.category_id AND b.user_id = ?
      WHERE c.user_id = ? AND b.id IS NULL
    )
  `).bind(userId, userId).run()

  const deletedCount = result.meta?.changes || 0

  return c.json({ deletedCount })
})

categoryRoutes.delete('/:id', async (c) => {
  const db = c.env.DB
  const userId = c.get('userId')
  const id = c.req.param('id')

  const existing = await db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!existing) {
    return c.json({ error: `Category not found with id: ${id}` }, 404)
  }

  const hasBookmark = await db.prepare('SELECT id FROM bookmarks WHERE category_id = ? AND user_id = ? LIMIT 1').bind(id, userId).first()
  if (hasBookmark) {
    return c.json({ error: '该分类下存在数据，无法删除' }, 400)
  }

  await db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').bind(id, userId).run()

  return c.body(null, 204)
})
