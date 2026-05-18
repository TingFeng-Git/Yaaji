import { DurableObject } from 'cloudflare:workers'
import type { Env } from '../types'

export interface ImportTaskState {
  status: 'pending' | 'processing' | 'completed' | 'failed'
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
}

interface ParsedBookmark {
  title: string
  url: string
  description?: string
  categoryName?: string
}

export class ImportTaskDO extends DurableObject {
  private db: D1Database

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.db = env.DB
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/start') {
      const body = await request.json<ImportRequest>()
      await this.startImport(body)
      return Response.json({ success: true, taskId: body.taskId })
    }

    if (request.method === 'GET' && url.pathname === '/progress') {
      const progress = await this.getProgress()
      return Response.json(progress)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  private async startImport(request: ImportRequest): Promise<void> {
    const { html } = request

    await this.updateState({
      status: 'processing',
      current: 0,
      total: 0,
      message: '正在解析HTML...',
      importedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    try {
      const bookmarks = this.parseHtml(html)
      const total = bookmarks.length

      await this.updateState({
        status: 'processing',
        current: 10,
        total,
        message: `发现 ${total} 个链接，准备导入...`,
        importedCount: 0,
      })

      const categoryCache = new Map<string, number>()
      let importedCount = 0

      for (let i = 0; i < bookmarks.length; i++) {
        const bookmark = bookmarks[i]
        let categoryId: number | null = null

        if (bookmark.categoryName) {
          if (categoryCache.has(bookmark.categoryName)) {
            categoryId = categoryCache.get(bookmark.categoryName)!
          } else {
            const existing = await this.db
              .prepare('SELECT id FROM categories WHERE name = ?')
              .bind(bookmark.categoryName)
              .first<{ id: number }>()

            if (existing) {
              categoryId = existing.id
            } else {
              const result = await this.db
                .prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)')
                .bind(bookmark.categoryName, new Date().toISOString())
                .run()
              categoryId = result.meta.last_row_id as number
            }
            categoryCache.set(bookmark.categoryName, categoryId)
          }
        }

        try {
          await this.db
            .prepare(
              'INSERT OR IGNORE INTO bookmarks (title, url, description, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .bind(
              bookmark.title,
              bookmark.url,
              bookmark.description || null,
              categoryId,
              new Date().toISOString(),
              new Date().toISOString()
            )
            .run()
          importedCount++
        } catch (err) {
          console.error('跳过重复或无效书签:', bookmark.title, err instanceof Error ? err.message : String(err))
        }

        const progress = 10 + Math.floor(((i + 1) / total) * 85)
        await this.updateState({
          status: 'processing',
          current: Math.min(progress, 95),
          total,
          message: `正在导入: ${i + 1}/${total}`,
          importedCount,
        })
      }

      const now = new Date().toISOString()
      await this.updateState({
        status: 'completed',
        current: 100,
        total,
        message: `成功导入 ${importedCount} 个书签`,
        importedCount,
        completedAt: now,
        updatedAt: now,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await this.updateState({
        status: 'failed',
        current: 0,
        total: 0,
        message: '导入失败',
        importedCount: 0,
        errorMessage,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  private parseHtml(html: string): ParsedBookmark[] {
    const bookmarks: ParsedBookmark[] = []

    const dlBlockPattern = /<DT><H3[^>]*>(.*?)<\/H3>\s*<DL><p>([\s\S]*?)<\/DL><p>/gi
    let dlMatch: RegExpExecArray | null

    const topLevelLinks = this.extractLinks(html)
    bookmarks.push(...topLevelLinks)

    while ((dlMatch = dlBlockPattern.exec(html)) !== null) {
      const categoryName = this.cleanHtml(dlMatch[1])
      const blockContent = dlMatch[2]
      const links = this.extractLinks(blockContent, categoryName)
      bookmarks.push(...links)
    }

    if (bookmarks.length === 0) {
      const linkPattern = /<A\s+HREF="([^"]*)"[^>]*>(.*?)<\/A>/gi
      let linkMatch: RegExpExecArray | null
      while ((linkMatch = linkPattern.exec(html)) !== null) {
        const url = linkMatch[1]
        const title = this.cleanHtml(linkMatch[2])
        if (url && title && !url.startsWith('javascript:')) {
          bookmarks.push({ title, url })
        }
      }
    }

    return bookmarks
  }

  private extractLinks(html: string, categoryName?: string): ParsedBookmark[] {
    const links: ParsedBookmark[] = []
    const linkPattern = /<DT><A\s+HREF="([^"]*)"[^>]*>(.*?)<\/A>/gi
    let match: RegExpExecArray | null

    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1]
      const title = this.cleanHtml(match[2])
      if (url && title && !url.startsWith('javascript:')) {
        links.push({ title, url, categoryName })
      }
    }

    return links
  }

  private cleanHtml(text: string): string {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
  }

  private async updateState(partial: Partial<ImportTaskState>): Promise<void> {
    const current = await this.ctx.storage.get<ImportTaskState>('task')
    const updated: ImportTaskState = {
      status: 'pending',
      current: 0,
      total: 0,
      message: '',
      importedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...current,
      ...partial,
    }
    await this.ctx.storage.put('task', updated)
  }

  async getProgress(): Promise<ImportTaskState | null> {
    return (await this.ctx.storage.get<ImportTaskState>('task')) ?? null
  }
}
