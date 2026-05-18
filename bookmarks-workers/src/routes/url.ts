import { Hono } from 'hono'

export const urlRoutes = new Hono()

const TIMEOUT = 5000
const MAX_CONTENT_LENGTH = 1024 * 1024

urlRoutes.get('/title', async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json({ title: null, error: 'url parameter is required' }, 400)
  }

  let targetUrl = url.trim()
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT),
    })

    if (!response.ok) {
      return c.json({ title: null })
    }

    const contentType = response.headers.get('content-type')
    if (contentType && !contentType.includes('text/html')) {
      return c.json({ title: null })
    }

    const reader = response.body?.getReader()
    if (!reader) {
      return c.json({ title: null })
    }

    const chunks: Uint8Array[] = []
    let totalBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (value) {
        totalBytes += value.length
        if (totalBytes > MAX_CONTENT_LENGTH) {
          reader.cancel()
          break
        }
        chunks.push(value)
      }
    }

    const decoder = new TextDecoder('utf-8')
    const html = decoder.decode(concatUint8Arrays(chunks))
    const title = extractTitle(html)

    return c.json({ title: title || null })
  } catch (err) {
    return c.json({ title: null })
  }
})

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

function extractTitle(html: string): string | null {
  if (!html) return null

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) {
    let title = titleMatch[1].trim()
    title = title.replace(/\s+/g, ' ')
    title = htmlEntityDecode(title)
    return title
  }

  const ogTitleMatch = html.match(
    /<meta\s+property="og:title"\s+content="([^"]+)"/i
  )
  if (ogTitleMatch) {
    let title = ogTitleMatch[1].trim()
    title = htmlEntityDecode(title)
    return title
  }

  return null
}

function htmlEntityDecode(text: string): string {
  if (!text) return text
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
