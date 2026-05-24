export async function onRequest(context) {
  const { request, env } = context

  try {
    const workerResponse = await env.API_WORKER.fetch(request)
    return workerResponse
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message,
      hasWorker: !!env.API_WORKER,
      url: request.url,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
