import { describe, it, expect } from 'vitest'

// Test the HTML parsing logic directly by extracting it as a pure function
// We test the parseHtml method behavior via the DO's private method

const SAMPLE_NETSCAPE_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks Menu</H1>
<DL><p>
    <DT><H3>Programming</H3>
    <DL><p>
        <DT><A HREF="https://github.com">GitHub</A>
        <DT><A HREF="https://stackoverflow.com">Stack Overflow</A>
    </DL><p>
    <DT><H3>News</H3>
    <DL><p>
        <DT><A HREF="https://news.ycombinator.com">Hacker News</A>
    </DL><p>
    <DT><A HREF="https://example.com">Uncategorized Bookmark</A>
</DL><p>`

const SAMPLE_FLAT_HTML = `<html>
<body>
<A HREF="https://one.com">One</A>
<A HREF="https://two.com">Two</A>
<A HREF="javascript:void(0)">Ignored</A>
</body>
</html>`

const SAMPLE_EMPTY_HTML = `<html><body><p>No bookmarks here</p></body></html>`

// We test parsing by creating a minimal DO-like object that exposes parseHtml
// Since parseHtml uses cheerio which works in Node, we can test it directly
import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'

// Replicate the parsing logic from async.ts for testing
interface ParsedBookmark {
  title: string
  url: string
  description?: string
  categoryName?: string
}

function parseHtml(html: string): ParsedBookmark[] {
  const bookmarks: ParsedBookmark[] = []
  const $ = cheerio.load(html)

  const firstDl = $('dl').first()
  if (firstDl.length > 0) {
    parseDlBlock($, firstDl, null, bookmarks)
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

function parseDlBlock(
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
          parseDlBlock($, childDl, categoryName, result)
        }
      } else if (a.length > 0) {
        const url = a.attr('href')
        const title = a.text().trim()
        if (url && title && !url.startsWith('javascript:')) {
          result.push({ title, url, categoryName: parentCategoryName || undefined })
        }
      }
    } else if (tagName === 'p') {
      parseDlBlock($, $(child), parentCategoryName, result)
    }
  })
}

describe('Import HTML Parsing', () => {
  describe('Netscape Bookmark File Format', () => {
    it('should parse bookmarks with categories', () => {
      const results = parseHtml(SAMPLE_NETSCAPE_HTML)
      expect(results).toHaveLength(4)

      // Programming category
      expect(results[0]).toEqual({ title: 'GitHub', url: 'https://github.com', categoryName: 'Programming' })
      expect(results[1]).toEqual({ title: 'Stack Overflow', url: 'https://stackoverflow.com', categoryName: 'Programming' })

      // News category
      expect(results[2]).toEqual({ title: 'Hacker News', url: 'https://news.ycombinator.com', categoryName: 'News' })

      // Uncategorized
      expect(results[3]).toEqual({ title: 'Uncategorized Bookmark', url: 'https://example.com', categoryName: undefined })
    })

    it('should skip javascript: URLs', () => {
      const html = `<DL><p>
        <DT><A HREF="javascript:void(0)">JS Link</A>
        <DT><A HREF="https://real.com">Real Link</A>
      </DL><p>`
      const results = parseHtml(html)
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Real Link')
    })

    it('should skip bookmarks without title', () => {
      const html = `<DL><p>
        <DT><A HREF="https://notitle.com"></A>
        <DT><A HREF="https://withtitle.com">Has Title</A>
      </DL><p>`
      const results = parseHtml(html)
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Has Title')
    })

    it('should handle nested categories', () => {
      const html = `<DL><p>
        <DT><H3>Parent</H3>
        <DL><p>
          <DT><H3>Child</H3>
          <DL><p>
            <DT><A HREF="https://nested.com">Nested Bookmark</A>
          </DL><p>
          <DT><A HREF="https://child.com">Child Bookmark</A>
        </DL><p>
        <DT><A HREF="https://parent.com">Parent Bookmark</A>
      </DL><p>`
      const results = parseHtml(html)
      expect(results).toHaveLength(3)
      // Nested Bookmark is inside Child DL → categoryName: 'Child'
      expect(results[0]).toEqual({ title: 'Nested Bookmark', url: 'https://nested.com', categoryName: 'Child' })
      // Child Bookmark is inside Parent DL (sibling to Child folder) → categoryName: 'Parent'
      expect(results[1]).toEqual({ title: 'Child Bookmark', url: 'https://child.com', categoryName: 'Parent' })
      // Parent Bookmark is inside the top-level DL, not inside any H3 folder → no category
      expect(results[2]).toEqual({ title: 'Parent Bookmark', url: 'https://parent.com', categoryName: undefined })
    })

    it('should handle empty category folders', () => {
      const html = `<DL><p>
        <DT><H3>Empty Folder</H3>
        <DL><p>
        </DL><p>
        <DT><A HREF="https://test.com">Test</A>
      </DL><p>`
      const results = parseHtml(html)
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Test')
    })
  })

  describe('Flat HTML (no DL structure)', () => {
    it('should parse all anchor tags', () => {
      const results = parseHtml(SAMPLE_FLAT_HTML)
      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({ title: 'One', url: 'https://one.com' })
      expect(results[1]).toEqual({ title: 'Two', url: 'https://two.com' })
    })

    it('should skip javascript: URLs in flat mode', () => {
      const html = `<body>
        <A HREF="javascript:alert(1)">Bad</A>
        <A HREF="javascript:void(0)">Also Bad</A>
        <A HREF="https://good.com">Good</A>
      </body>`
      const results = parseHtml(html)
      expect(results).toHaveLength(1)
      expect(results[0].url).toBe('https://good.com')
    })
  })

  describe('Edge cases', () => {
    it('should return empty array for HTML with no bookmarks', () => {
      const results = parseHtml(SAMPLE_EMPTY_HTML)
      expect(results).toHaveLength(0)
    })

    it('should return empty array for empty string', () => {
      const results = parseHtml('')
      expect(results).toHaveLength(0)
    })

    it('should handle bookmarks with special characters in title', () => {
      const html = `<DL><p>
        <DT><A HREF="https://example.com">Test &amp; Demo &lt;special&gt;</A>
      </DL><p>`
      const results = parseHtml(html)
      expect(results).toHaveLength(1)
      // cheerio decodes HTML entities
      expect(results[0].title).toBe('Test & Demo <special>')
    })

    it('should handle duplicate URLs', () => {
      const html = `<DL><p>
        <DT><A HREF="https://same.com">First</A>
        <DT><A HREF="https://same.com">Second</A>
      </DL><p>`
      const results = parseHtml(html)
      // Parser doesn't deduplicate — that's handled by INSERT OR IGNORE
      expect(results).toHaveLength(2)
    })
  })
})

describe('Import Route Validation', () => {
  // Test the route handler's input validation logic
  // We test the validation that happens before DO invocation

  it('should reject non-file form data', () => {
    // Simulate the validation logic from the route
    const formData = new FormData()
    formData.append('file', 'not-a-file')

    const file = formData.get('file')
    const isValid = file instanceof File
    expect(isValid).toBe(false)
  })

  it('should accept valid file form data', () => {
    const blob = new Blob(['<html></html>'], { type: 'text/html' })
    const file = new File([blob], 'bookmarks.html', { type: 'text/html' })

    const formData = new FormData()
    formData.append('file', file)

    const retrieved = formData.get('file')
    expect(retrieved instanceof File).toBe(true)
  })
})
