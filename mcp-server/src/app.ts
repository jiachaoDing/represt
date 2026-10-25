import { createRemoteJWKSet, jwtVerify, customFetch } from 'jose'
import { createMcpHandler, type AuthInfo } from '@modelcontextprotocol/server'
import { ReprestApi } from './api.js'
import { createTrainingServer } from './tools.js'
import type { Config } from './config.js'

export function createApp(config: Config) {
  const fetcher = config.fetch ?? fetch
  const jwks = createRemoteJWKSet(config.jwksUrl, { timeoutDuration: 10000, [customFetch]: fetcher })
  const metadataUrl = new URL('/.well-known/oauth-protected-resource', config.publicUrl).href
  const protocol = createMcpHandler(({ authInfo }) => createTrainingServer(
    new ReprestApi(config.apiBase, authInfo!.token, fetcher), authInfo!.scopes,
  ), { legacy: 'stateless', maxRequestBodySize: 512 * 1024 })

  function challenge(status: number, scope = 'training:read') {
    const error = status === 403 ? 'insufficient_scope' : 'invalid_token'
    return Response.json({ error, error_description: status === 403 ? 'Authorize the required scopes.' : 'Authorize Represt to use these tools.' }, {
      status, headers: { 'WWW-Authenticate': `Bearer resource_metadata="${metadataUrl}", error="${error}", scope="${scope}"` },
    })
  }

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')
    if (origin && !config.allowedOrigins.includes(origin)) return Response.json({ error: 'origin_not_allowed' }, { status: 403 })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
    if (url.pathname === '/healthz' && request.method === 'GET') return Response.json({ status: 'ok', service: 'represt-mcp' })
    if (['/.well-known/oauth-protected-resource', `/.well-known/oauth-protected-resource${config.publicUrl.pathname}`].includes(url.pathname) && request.method === 'GET') {
      return Response.json({
        resource: config.publicUrl.href, authorization_servers: [config.issuer],
        scopes_supported: ['training:read', 'plans:write', 'offline_access'], bearer_methods_supported: ['header'],
        resource_name: 'Represt training data',
      })
    }
    if (url.pathname !== config.publicUrl.pathname) return Response.json({ error: 'not_found' }, { status: 404 })
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS' } })
    if (url.searchParams.has('access_token')) return Response.json({ error: 'invalid_request' }, { status: 400 })
    const header = request.headers.get('Authorization')
    if (!header?.startsWith('Bearer ')) return challenge(401)
    const token = header.slice(7)
    let authInfo: AuthInfo
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: config.issuer, audience: config.publicUrl.href,
        algorithms: ['EdDSA', 'ES256', 'RS256'], requiredClaims: ['sub', 'exp', 'iat', 'sid', 'azp', 'scope'],
      })
      if (typeof payload.azp !== 'string' || typeof payload.scope !== 'string' || payload.cnf) return challenge(401)
      authInfo = { token, clientId: payload.azp, scopes: payload.scope.split(' '), expiresAt: payload.exp }
    } catch { return challenge(401) }
    if (!authInfo.scopes.includes('training:read')) return challenge(403)
    // Reuse Represt's session/client/consent checks; JWT validity alone does not prove an active grant.
    try {
      const status = await fetcher(`${config.apiBase}/api/account/oauth-status`, {
        headers: { Authorization: `Bearer ${token}` }, redirect: 'manual', signal: AbortSignal.timeout(10000),
      })
      if (status.status === 401) return challenge(401)
      if (status.status === 403) return challenge(403)
      if (!status.ok || (await status.json() as { active?: boolean }).active !== true) {
        return Response.json({ error: 'authorization_service_unavailable' }, { status: 503 })
      }
    } catch { return Response.json({ error: 'authorization_service_unavailable' }, { status: 503 }) }
    // The Node adapter bounds this body before this handler receives the Request.
    const body = await request.clone().json().catch(() => null) as { method?: string; params?: { name?: string } } | null
    if (body?.method === 'tools/call' && body.params?.name === 'update_training_program' && !authInfo.scopes.includes('plans:write')) {
      return challenge(403, 'training:read plans:write')
    }
    return protocol.fetch(request, { authInfo })
  }

  return {
    async fetch(request: Request) {
      const response = await route(request)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'no-store')
      headers.set('X-Content-Type-Options', 'nosniff')
      const origin = request.headers.get('Origin')
      if (origin && config.allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin)
        headers.set('Vary', 'Origin')
        headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id')
        headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Protocol-Version, MCP-Session-Id')
      }
      return new Response(response.body, { status: response.status, headers })
    },
    close: () => protocol.close(),
  }
}
