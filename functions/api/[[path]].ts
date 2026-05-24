export async function onRequest(context) {
  const { request, env } = context
  return env.API_WORKER.fetch(request)
}
