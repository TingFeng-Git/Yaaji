export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  // Default to the actual Workers deployment URL (auto-build won't read wrangler.toml)
  const targetUrl = env.WORKERS_API_URL || 'https://yaaji-bookmarks.1650937065.workers.dev'
  const target = `${targetUrl}${url.pathname}${url.search}`

  // Clone headers to avoid "Headers object is not iterable" error
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    // Skip hop-by-hop headers that shouldn't be forwarded
    if (!['connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer'].includes(key.toLowerCase())) {
      headers.set(key, value)
    }
  }

  const proxyRequest = new Request(target, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    duplex: 'half', // Required for streaming body in fetch
  })

  const response = await fetch(proxyRequest)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}
