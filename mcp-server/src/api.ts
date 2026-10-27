import { z } from 'zod'
import { historyPageSchema, stateSchema, versionSchema } from './schemas.js'

export class ToolError extends Error {
  constructor(readonly code: string, message: string, readonly retryable = false,
    readonly outcome?: { saved: boolean | null; verified: boolean }) { super(message) }
}

const guidance: Record<string, string> = {
  VERSION_CONFLICT: 'Data changed. Restart analytics at offset 0 without version, then pin the returned version. For raw reads or another write, read the latest program version and review differences.',
  NO_DATA: 'No synced history exists. Ask the user to Sync in the Represt application.',
  SYNC_REQUIRED: 'Ask the user to Sync in Represt before editing plans.',
  OAUTH_INVALID_TOKEN: 'Reconnect and authorize Represt again.',
  OAUTH_INSUFFICIENT_SCOPE: 'Authorize training:read and plans:write before editing.',
}

export class ReprestApi {
  constructor(private baseUrl: string, private token: string, private fetcher: typeof fetch = fetch) {}

  async request<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
    const started = performance.now()
    let response: Response
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: body === undefined ? 'GET' : 'PUT', redirect: 'manual',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
      })
    } catch {
      throw new ToolError(body === undefined ? 'UPSTREAM_UNAVAILABLE' : 'WRITE_OUTCOME_UNKNOWN',
        body === undefined ? 'Represt is unavailable. Retry the read.' : 'The write response was lost. Read the program before retrying; the save may have completed.',
        body === undefined, body === undefined ? undefined : { saved: null, verified: false })
    }
    const value: unknown = await response.json().catch(() => null)
    const elapsedMs = performance.now() - started
    const upstreamTiming = response.headers.get('Server-Timing') ?? ''
    const serverMs = Number(/(?:^|,\s*)account;dur=([\d.]+)/.exec(upstreamTiming)?.[1])
    console.log(JSON.stringify({ event: 'mcp_upstream_performance', path: path.split('?')[0], status: response.status,
      requestId: response.headers.get('X-Request-Id'), elapsedMs, upstreamServerMs: Number.isFinite(serverMs) ? serverMs : null,
      transportAndDecodeMs: Number.isFinite(serverMs) ? Math.max(0, elapsedMs - serverMs) : null }))
    if (!response.ok) {
      const code = z.object({ code: z.string() }).safeParse(value)
      const key = code.success ? code.data.code : 'UPSTREAM_ERROR'
      throw new ToolError(key, guidance[key] ?? `Represt rejected the operation (HTTP ${response.status}).`,
        body === undefined && response.status >= 500)
    }
    const result = schema.safeParse(value)
    if (!result.success) throw new ToolError('INVALID_UPSTREAM_RESPONSE', 'Represt returned an unexpected response.', false,
      body === undefined ? undefined : { saved: null, verified: false })
    return result.data
  }

  program() { return this.request('/api/account/plans', stateSchema) }
  history(query: URLSearchParams) { return this.request(`/api/account/data?${query}`, historyPageSchema) }
  save(body: unknown) {
    return this.request('/api/account/plans', z.object({ version: versionSchema, pending: z.boolean() }), body)
  }
}
