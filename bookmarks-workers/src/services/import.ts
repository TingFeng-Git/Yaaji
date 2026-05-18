import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import type { Element } from 'domhandler'

export interface ImportProgress {
  id: string
  status: string
  current: number
  total: number
  message: string
  percent: number
}

export interface ImportResult {
  success: boolean
  taskId: string
  imported: number
  message: string
}

export async function initImportTable(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS import_tasks (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      current INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      message TEXT DEFAULT '',
      imported_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

export async function createImportTask(db: D1Database): Promise<string> {
  const taskId = crypto.randomUUID()

  await db
    .prepare('INSERT INTO import_tasks (id, status, current, total, message) VALUES (?, ?, ?, ?, ?)')
    .bind(taskId, 'pending', 0, 0, '等待导入...')
    .run()

  return taskId
}

async function updateProgress(
  db: D1Database,
  taskId: string,
  current: number,
  total: number,
  status: string,
  message: string
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE import_tasks SET status = ?, current = ?, total = ?, message = ?, updated_at = ? WHERE id = ?')
    .bind(status, current, total, message, now, taskId)
    .run()
}

async function completeTask(
  db: D1Database,
  taskId: string,
  imported: number,
  message: string
): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE import_tasks SET status = ?, current = 100, total = 100, message = ?, imported_count = ?, updated_at = ? WHERE id = ?')
    .bind('completed', message, imported, now, taskId)
    .run()
}

async function failTask(db: D1Database, taskId: string, error: string): Promise<void> {
  const now = new Date().toISOString()
  await db
    .prepare('UPDATE import_tasks SET status = ?, message = ?, updated_at = ? WHERE id = ?')
    .bind('failed', error, now, taskId)
    .run()
}

export async function getImportProgress(db: D1Database, taskId: string): Promise<ImportProgress | null> {
  const row = await db
    .prepare('SELECT * FROM import_tasks WHERE id = ?')
    .bind(taskId)
    .first<ImportProgress>()

  if (!row) return null

  return {
    id: row.id,
    status: row.status,
    current: row.current,
    total: row.total,
    message: row.message,
    percent: row.total > 0 ? Math.round((row.current * 100) / row.total) : 0,
  }
}

async function findOrCreateCategory(
  db: D1Database,
  categoryName: string,
  categoryMap: Map<string, number>
): Promise<number> {
  const cached = categoryMap.get(categoryName)
  if (cached !== undefined) return cached

  const existing = await db
    .prepare('SELECT id FROM categories WHERE name = ?')
    .bind(categoryName)
    .first()

  if (existing) {
    categoryMap.set(categoryName, existing.id as number)
    return existing.id as number
  }

  const now = new Date().toISOString()
  const result = await db
    .prepare('INSERT INTO categories (name, color, created_at) VALUES (?, ?, ?)')
    .bind(categoryName, '#667eea', now)
    .run()

  const newId = result.meta.last_row_id
  categoryMap.set(categoryName, newId)
  return newId
}

function countLinks($: CheerioAPI): number {
  return $('a').length
}

async function processDL(
  db: D1Database,
  $: CheerioAPI,
  dl: cheerio.Cheerio<Element>,
  parentCategoryId: number | null,
  categoryMap: Map<string, number>,
  depth: number,
  taskId: string,
  importedCount: number,
  totalLinks: number
): Promise<number> {
  if (depth > 10 || !dl.length) return importedCount

  const children = dl.children()

  for (const child of children) {
    const tagName = child.tagName?.toLowerCase()
    if (!tagName) continue

    if (tagName === 'dt') {
      const $child = $(child)
      const h3 = $child.find('h3').first()
      const a = $child.find('a').first()

      if (h3.length > 0) {
        const categoryName = h3.text().trim()
        if (!categoryName) continue

        const categoryId = await findOrCreateCategory(db, categoryName, categoryMap)

        const childDl = $child.find('dl').first()
        if (childDl.length > 0) {
          importedCount = await processDL(
            db, $, childDl, categoryId, categoryMap, depth + 1,
            taskId, importedCount, totalLinks
          )
        }
      } else if (a.length > 0) {
        const title = a.text().trim()
        const url = a.attr('href')

        if (url && title) {
          const now = new Date().toISOString()
          try {
            await db
              .prepare(
                'INSERT INTO bookmarks (title, url, description, category_id, click_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
              )
              .bind(title, url, null, parentCategoryId, 0, now, now)
              .run()
            importedCount++
          } catch (err) {
            console.error('跳过重复书签:', title, url, err instanceof Error ? err.message : String(err))
          }

          if (importedCount % 10 === 0 || importedCount === totalLinks) {
            const progress = Math.min(30 + Math.round((importedCount * 70) / Math.max(totalLinks, 1)), 99)
            await updateProgress(
              db, taskId, progress, 100, 'importing',
              `正在导入: ${importedCount}/${totalLinks}`
            )
          }
        }
      }
    } else if (tagName === 'p') {
      importedCount = await processDL(
        db, $, $(child), parentCategoryId, categoryMap, depth,
        taskId, importedCount, totalLinks
      )
    }
  }

  return importedCount
}

export async function importBookmarks(
  db: D1Database,
  html: string,
  taskId: string
): Promise<ImportResult> {
  try {
    await initImportTable(db)

    await updateProgress(db, taskId, 0, 100, 'uploading', '正在读取文件...')

    await updateProgress(db, taskId, 10, 100, 'parsing', '正在解析HTML...')

    const $ = cheerio.load(html)
    const totalLinks = countLinks($)

    await updateProgress(
      db, taskId, 20, 100, 'parsing',
      `发现 ${totalLinks} 个链接，准备导入...`
    )

    const categoryMap = new Map<string, number>()
    let imported = 0

    const firstDl = $('dl').first()

    if (firstDl.length > 0) {
      imported = await processDL(
        db, $, firstDl, null, categoryMap, 0,
        taskId, imported, totalLinks
      )
    } else {
      const links = $('a')
      for (const link of links) {
        const $link = $(link)
        const title = $link.text().trim()
        const url = $link.attr('href')

        if (url && title) {
          const now = new Date().toISOString()
          try {
            await db
              .prepare(
                'INSERT INTO bookmarks (title, url, description, category_id, click_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
              )
              .bind(title, url, null, null, 0, now, now)
              .run()
            imported++
          } catch (err) {
            console.error('跳过重复书签:', title, url, err instanceof Error ? err.message : String(err))
          }

          if (imported % 10 === 0) {
            const progress = Math.min(30 + Math.round((imported * 70) / Math.max(totalLinks, 1)), 99)
            await updateProgress(
              db, taskId, progress, 100, 'importing',
              `正在导入: ${imported}/${totalLinks}`
            )
          }
        }
      }
    }

    await completeTask(db, taskId, imported, `成功导入 ${imported} 个书签`)

    return {
      success: true,
      taskId,
      imported,
      message: `成功导入 ${imported} 个书签`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await failTask(db, taskId, message)
    return {
      success: false,
      taskId,
      imported: 0,
      message: `导入失败: ${message}`,
    }
  }
}
