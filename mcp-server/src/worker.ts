import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { renderLandingPage } from './landing-page.js'
import pluginArchive from '../assets/represt-plugin.bin'

type WorkerEnv = { MCP_PUBLIC_URL: string; REPREST_API_BASE_URL: string; MCP_ALLOWED_ORIGINS?: string; REPREST_API?: { fetch(request: Request): Promise<Response> } }
let application: ReturnType<typeof createApp> | undefined

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url)
    const endpoint = new URL(env.MCP_PUBLIC_URL)
    if (['GET', 'HEAD'].includes(request.method) && url.pathname === endpoint.pathname && request.headers.get('Accept')?.includes('text/html')) {
      const page = renderLandingPage(request, endpoint.href)
      return request.method === 'HEAD' ? new Response(null, { headers: page.headers }) : page
    }
    if (['GET', 'HEAD'].includes(request.method) && url.pathname === `${endpoint.pathname}/downloads/represt-plugin.zip`) {
      return new Response(request.method === 'HEAD' ? null : pluginArchive, { headers: {
        'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="represt-plugin.zip"',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      } })
    }
    if (request.method === 'POST' && request.body) {
      const reader = request.body.getReader()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let size = 0
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 512 * 1024) {
          await reader.cancel()
          return Response.json({ error: 'request_too_large' }, { status: 413 })
        }
        chunks.push(new Uint8Array(value))
      }
      request = new Request(request, { body: new Blob(chunks) })
    }
    application ??= createApp({
      ...loadConfig({ MCP_PUBLIC_URL: env.MCP_PUBLIC_URL, REPREST_API_BASE_URL: env.REPREST_API_BASE_URL, MCP_ALLOWED_ORIGINS: env.MCP_ALLOWED_ORIGINS }),
      fetch: env.REPREST_API ? (input, init) => env.REPREST_API!.fetch(new Request(input, init)) : undefined,
    })
    return application.fetch(request)
  },
}
