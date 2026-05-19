import { DurableObject } from 'cloudflare:workers'
import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import type { Env } from '../types'

export interface ImportTaskState {
  status: 'pending' | 'parsing' | 'importing' | 'completed' | 'failed'
  current: number
  total: number
  message: string
  importedCount: number
  errorMessage?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ImportRequest {
  html: string
  taskId: string
  userId: number
}

interface ParsedBookmark {
  title: string
  url: string
  description?: string
  categoryName?: string
}

export class ImportTaskDO extends DurableObject {
  private db: D1Database
  private taskId: string | null
  private userId: number | null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.db = env.DB
    this.taskId = null
    this.userId = null
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/start') {
      const body = await request.json<ImportRequest>()
      this.taskId = body.taskId
      this.userId = body.userId
      this.ctx.waitUntil(this.startImport(body))
      return Response.json({ success: true, taskId: body.taskId })
    }

    if (request.method === 'GET' && url.pathname === '/progress') {
      const state = await this.ctx.storage.get<ImportTaskState>('task')
      if (!state) return Response.json(null, { status: 404 })
      return Response.json(state)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  private async startImport(request: ImportRequest): Promise<void> {
    const state: ImportTaskState = {
      status: 'parsing',
      current: 0,
      total: 0,
      message: '正在解析HTML...',
      importedCount: 0,
      errorMessage: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await this.updateState(state)
    await this.flushToD1(state)

    try {
      const bookmarks = this.parseHtml(request.html)
      const total = bookmarks.length

      state.status = 'parsing'
      state.current = 0
      state.total = total
      state.message = `发现 ${total} 个链接，准备导入...`
      state.updatedAt = new Date().toISOString()
      await this.updateState(state)
      await this.flushToD1(state)

      const categoryCache = new Map<string, number>()
      let importedCount = 0
      let lastFlush = 0

      for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i]
        let categoryId: number | null = null

        if (bookmark.categoryName) {
          if (categoryCache.has(bookmark.categoryName)) {
            categoryId = categoryCache.get(bookmark.categoryName)!
          } else {
            const existing = await this.db
              .prepare('SELECT id FROM categories WHERE name = ? AND user_id = ?')
              .bind(bookmark.categoryName, this.userId)
              .first<{ id: number }>()

            if (existing) {
              categoryId = existing.id
            } else {
              const result = await this.db
                .prepare('INSERT INTO categories (name, user_id, created_at) VALUES (?, ?, ?)')
                .bind(bookmark.categoryName, this.userId, new Date().toISOString())
                .run()
              categoryId = result.meta.last_row_id as number
            }
            categoryCache.set(bookmark.categoryName, categoryId)
          }
        }

        try {
          await this.db
            .prepare(
              'INSERT OR IGNORE INTO bookmarks (title, url, description, category_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .bind(
              bookmark.title,
              bookmark.url,
              bookmark.description || null,
              categoryId,
              this.userId,
              new Date().toISOString(),
              new Date().toISOString()
            )
            .run()
          importedCount++
        } catch (err) {
          console.error('跳过重复或无效书签:', bookmark.title, err instanceof Error ? err.message : String(err))
        }

        state.status = i === 0 ? 'importing' : state.status
        state.current = importedCount
        state.total = total
        state.message = `正在导入: ${i + 1}/${total}`
        state.importedCount = importedCount
        state.updatedAt = new Date().toISOString()

        const now = Date.now()
        if (now - lastFlush >= 2000) {
          await this.updateState(state)
          await this.flushToD1(state)
          lastFlush = now
        }
      }

      await this.updateState(state)
      await this.flushToD1(state)

      const now = new Date().toISOString()
      state.status = 'completed'
      state.message = `成功导入 ${importedCount} 个书签`
      state.completedAt = now
      state.updatedAt = now
      await this.updateState(state)
      await this.flushToD1(state)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      state.status = 'failed'
      state.message = '导入失败'
      state.errorMessage = errorMessage
      state.updatedAt = new Date().toISOString()
      await this.updateState(state)
      await this.flushToD1(state)
    }
  }

  private async updateState(state: ImportTaskState): Promise<void> {
    await this.ctx.storage.put('task', state)
  }

  private async flushToD1(state: ImportTaskState): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO import_tasks (id, status, current, total, message, imported_count, error_message, created_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           current = excluded.current,
           total = excluded.total,
           message = excluded.message,
           imported_count = excluded.imported_count,
           error_message = excluded.error_message,
           updated_at = excluded.updated_at,
           completed_at = excluded.completed_at`
      )
      .bind(
        this.taskId,
        state.status,
        state.current,
        state.total,
        state.message,
        state.importedCount,
        state.errorMessage || null,
        state.createdAt,
        state.updatedAt,
        state.completedAt || null,
      )
      .run()
  }

  private parseHtml(html: string): ParsedBookmark[] {
    const bookmarks: ParsedBookmark[] = []
    const $ = cheerio.load(html)

    const firstDl = $('dl').first()
    if (firstDl.length > 0) {
      this.parseDlBlock($, firstDl, null, bookmarks)
    } else {
      $('a').each((_, el) => {
        const $el = $(el)
        const url = $el.attr('href')
        const title = $el.text().trim()
        if (url && title && !url.startsWith('javascript:')) {
          bookmarks.push({ title, url })
        }
      })
    }

    return bookmarks
  }

  private parseDlBlock(
    $: cheerio.CheerioAPI,
    dl: cheerio.Cheerio<Element>,
    parentCategoryName: string | null,
    result: ParsedBookmark[]
  ): void {
    dl.children().each((_, child) => {
      const tagName = child.tagName?.toLowerCase()
      if (!tagName) return

      if (tagName === 'dt') {
        const $child = $(child)
        const h3 = $child.find('h3').first()
        const a = $child.find('a').first()

        if (h3.length > 0) {
          const categoryName = h3.text().trim()
          if (!categoryName) return

          const childDl = $child.find('dl').first()
          if (childDl.length > 0) {
            this.parseDlBlock($, childDl, categoryName, result)
          }
        } else if (a.length > 0) {
          const url = a.attr('href')
          const title = a.text().trim()
          if (url && title && !url.startsWith('javascript:')) {
            result.push({ title, url, categoryName: parentCategoryName || undefined })
          }
        }
      } else if (tagName === 'p') {
        this.parseDlBlock($, $(child), parentCategoryName, result)
      }
    })
  }
}
