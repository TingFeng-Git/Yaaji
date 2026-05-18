import { Hono } from 'hono'
import type { Env } from '../types'
import { exportBookmarks } from '../services/export'
import { ImportTaskDO } from '../services/async'

export const bookmarkRoutes = new Hono<{ Bindings: Env }>()

function mapBookmark(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    categoryId: row.category_id,
    clickCount: row.click_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastClickedAt: row.last_clicked_at,
  }
}

// /recent and /check-url must be defined before /:id to avoid param capture
bookmarkRoutes.get('/recent', async (c) => {
  const db = c.env.DB
  const limit = Number(c.req.query('limit')) || 5

  const { results } = await db
    .prepare('SELECT * FROM bookmarks WHERE last_clicked_at IS NOT NULL ORDER BY last_clicked_at DESC LIMIT ?')
    .bind(limit)
    .all()

  return c.json((results || []).map(mapBookmark))
})

bookmarkRoutes.get('/check-url', async (c) => {
  const db = c.env.DB
  const url = c.req.query('url')

  if (!url) {
    return c.json({ exists: false, bookmark: null })
  }

  const row = await db
    .prepare('SELECT * FROM bookmarks WHERE url = ?')
    .bind(url)
    .first()

  if (row) {
    return c.json({ exists: true, bookmark: mapBookmark(row) })
  }
  return c.json({ exists: false, bookmark: null })
})

bookmarkRoutes.get('/', async (c) => {
  const db = c.env.DB
  const categoryId = c.req.query('categoryId')

  let query = 'SELECT * FROM bookmarks'
  const params: unknown[] = []

  if (categoryId) {
    query += ' WHERE category_id = ?'
    params.push(Number(categoryId))
  }

  query += ' ORDER BY created_at DESC'

  try {
    const stmt = params.length > 0
      ? db.prepare(query).bind(...params)
      : db.prepare(query)

    const { results } = await stmt.all()

    return c.json((results || []).map(mapBookmark))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return c.json({ error: message }, 500)
  }
})

bookmarkRoutes.get('/:id', async (c) => {
  const db = c.env.DB
  const id = Number(c.req.param('id'))

  const row = await db
    .prepare('SELECT * FROM bookmarks WHERE id = ?')
    .bind(id)
    .first()

  if (!row) {
    return c.json({ error: 'Bookmark not found' }, 404)
  }

  return c.json(mapBookmark(row))
})

bookmarkRoutes.post('/', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()

  const { title, url, description, categoryId, clickCount } = body

  if (!title || !url) {
    return c.json({ error: 'Title and URL are required' }, 400)
  }

  const now = new Date().toISOString()

  try {
    const bookmark = await db
      .prepare(
        'INSERT INTO bookmarks (title, url, description, category_id, click_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *'
      )
      .bind(title, url, description || null, categoryId || null, clickCount || 0, now, now)
      .first()

    return c.json(mapBookmark(bookmark!), 201)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'URL already exists' }, 409)
    }
    return c.json({ error: 'Failed to create bookmark' }, 500)
  }
})

bookmarkRoutes.put('/:id', async (c) => {
  const db = c.env.DB
  const id = Number(c.req.param('id'))
  const body = await c.req.json()

  const existing = await db
    .prepare('SELECT * FROM bookmarks WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: 'Bookmark not found' }, 404)
  }

  const title = body.title ?? existing.title
  const url = body.url ?? existing.url
  const description = body.description ?? existing.description
  const categoryId = body.categoryId ?? existing.category_id
  const now = new Date().toISOString()

  try {
    const updated = await db
      .prepare(
        'UPDATE bookmarks SET title = ?, url = ?, description = ?, category_id = ?, updated_at = ? WHERE id = ? RETURNING *'
      )
      .bind(title, url, description || null, categoryId || null, now, id)
      .first()

    return c.json(mapBookmark(updated!))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'URL already exists' }, 409)
    }
    return c.json({ error: 'Failed to update bookmark' }, 500)
  }
})

bookmarkRoutes.post('/:id/click', async (c) => {
  const db = c.env.DB
  const id = Number(c.req.param('id'))

  const now = new Date().toISOString()

  const updated = await db
    .prepare(
      'UPDATE bookmarks SET click_count = click_count + 1, last_clicked_at = ?, updated_at = ? WHERE id = ? RETURNING *'
    )
    .bind(now, now, id)
    .first()

  if (!updated) {
    return c.json({ error: 'Bookmark not found' }, 404)
  }

  return c.json(mapBookmark(updated))
})

bookmarkRoutes.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = Number(c.req.param('id'))

  const existing = await db
    .prepare('SELECT * FROM bookmarks WHERE id = ?')
    .bind(id)
    .first()

  if (!existing) {
    return c.json({ error: 'Bookmark not found' }, 404)
  }

  await db
    .prepare('DELETE FROM bookmarks WHERE id = ?')
    .bind(id)
    .run()

  return c.body(null, 204)
})

bookmarkRoutes.post('/batch-delete', async (c) => {
  const db = c.env.DB
  const ids: number[] = await c.req.json()

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ success: false, message: 'No IDs provided' }, 400)
  }

  const placeholders = ids.map(() => '?').join(',')

  try {
    await db
      .prepare(`DELETE FROM bookmarks WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run()

    return c.json({ success: true, message: `成功删除 ${ids.length} 个书签` })
  } catch {
    return c.json({ success: false, message: '删除失败' }, 500)
  }
})

bookmarkRoutes.post('/import', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return c.json({ error: '请选择要导入的文件' }, 400)
  }

  const html = await file.text()
  const taskId = crypto.randomUUID()

  const id = c.env.IMPORT_TASKS.idFromName(taskId)
  const stub = c.env.IMPORT_TASKS.get(id) as DurableObjectStub<ImportTaskDO>

  await stub.fetch(new Request('http://do/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, taskId }),
  }))

  return c.json({ success: true, taskId, message: '开始导入...' })
})

bookmarkRoutes.get('/import/progress', async (c) => {
  const taskId = c.req.query('taskId')

  if (!taskId) {
    return c.json({ error: 'taskId is required' }, 400)
  }

  const id = c.env.IMPORT_TASKS.idFromName(taskId)
  const stub = c.env.IMPORT_TASKS.get(id) as DurableObjectStub<ImportTaskDO>

  const response = await stub.fetch(new Request('http://do/progress'))
  const progress = await response.json() as {
    current: number
    total: number
    status: string
    message: string
  } | null

  if (!progress) {
    return c.json({ error: 'Task not found' }, 404)
  }

  return c.json({
    current: progress.current,
    total: progress.total,
    status: progress.status,
    message: progress.message,
    percent: progress.total > 0 ? Math.floor((progress.current / progress.total) * 100) : 0,
  })
})
