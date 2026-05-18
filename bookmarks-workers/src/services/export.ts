import type { D1Database } from '@cloudflare/workers-types'

interface BookmarkRow {
  id: number
  title: string
  url: string
  description: string | null
  category_id: number | null
  click_count: number
  created_at: string
  updated_at: string
  last_clicked_at: string | null
}

interface CategoryRow {
  id: number
  name: string
  color: string
  created_at: string
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toEpochSeconds(isoString: string | null): number {
  if (!isoString) return Math.floor(Date.now() / 1000)
  return Math.floor(new Date(isoString).getTime() / 1000)
}

export async function exportBookmarks(
  db: D1Database,
  ids?: number[]
): Promise<string> {
  let bookmarks: BookmarkRow[]
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',')
    const { results } = await db
      .prepare(`SELECT * FROM bookmarks WHERE id IN (${placeholders}) ORDER BY category_id, created_at`)
      .bind(...ids)
      .all<BookmarkRow>()
    bookmarks = results || []
  } else {
    const { results } = await db
      .prepare('SELECT * FROM bookmarks ORDER BY category_id, created_at')
      .all<BookmarkRow>()
    bookmarks = results || []
  }

  const { results: catResults } = await db
    .prepare('SELECT * FROM categories')
    .all<CategoryRow>()
  const categories = catResults || []

  const categoryMap = new Map<number, string>()
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name)
  }

  const grouped = new Map<number | null, BookmarkRow[]>()
  for (const bm of bookmarks) {
    const key = bm.category_id
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(bm)
  }

  const now = Math.floor(Date.now() / 1000)

  const lines: string[] = []
  lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
  lines.push('<!-- This is an automatically generated file.')
  lines.push('      It will be read and overwritten.')
  lines.push('      DO NOT EDIT! -->')
  lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">')
  lines.push('<TITLE>Bookmarks</TITLE>')
  lines.push('<H1>Bookmarks</H1>')
  lines.push('<DL><p>')
  lines.push(`    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}" PERSONAL_TOOLBAR_FOLDER="true">书签栏</H3>`)
  lines.push('    <DL><p>')

  for (const [categoryId, catBookmarks] of grouped) {
    if (categoryId === null) continue

    const categoryName = categoryMap.get(categoryId) || '未分类'
    lines.push(`        <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${escapeHtml(categoryName)}</H3>`)
    lines.push('        <DL><p>')

    for (const bm of catBookmarks) {
      const addDate = toEpochSeconds(bm.created_at)
      const lastClick = bm.last_clicked_at ? ` LAST_CLICK="${toEpochSeconds(bm.last_clicked_at)}"` : ''
      const clickCount = bm.click_count > 0 ? ` CLICK_COUNT="${bm.click_count}"` : ''
      lines.push(`           <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${addDate}"${lastClick}${clickCount}>${escapeHtml(bm.title)}</A>`)
    }

    lines.push('        </DL><p>')
  }

  const uncategorized = grouped.get(null)
  if (uncategorized && uncategorized.length > 0) {
    lines.push(`        <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">未分类</H3>`)
    lines.push('        <DL><p>')

    for (const bm of uncategorized) {
      const addDate = toEpochSeconds(bm.created_at)
      const lastClick = bm.last_clicked_at ? ` LAST_CLICK="${toEpochSeconds(bm.last_clicked_at)}"` : ''
      const clickCount = bm.click_count > 0 ? ` CLICK_COUNT="${bm.click_count}"` : ''
      lines.push(`           <DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${addDate}"${lastClick}${clickCount}>${escapeHtml(bm.title)}</A>`)
    }

    lines.push('        </DL><p>')
  }

  lines.push('    </DL><p>')
  lines.push('</DL><p>')

  return lines.join('\n')
}
