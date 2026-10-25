import { expect, it } from 'vitest'
import { exportJWK, generateKeyPair, SignJWT } from 'jose'
import { createApp } from '../src/app.js'

it('validates signature, issuer, audience, expiry, scope and live authorization before serving MCP', async () => {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA')
  const jwk = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'EdDSA' }
  let active = true
  let upstreamCalls = 0
  const app = createApp({ publicUrl: new URL('https://mcp.test/mcp'), apiBase: 'https://api.test', issuer: 'https://api.test/api/auth',
    jwksUrl: new URL('https://api.test/api/auth/jwks'), allowedOrigins: [], fetch: async (input) => {
      const url = String(input)
      if (url.endsWith('/jwks')) return Response.json({ keys: [jwk] })
      expect(url).toBe('https://api.test/api/account/oauth-status')
      upstreamCalls++
      return Response.json({ active }, { status: active ? 200 : 401 })
    } })
  const sign = (overrides: Record<string, unknown> = {}) => new SignJWT({ sub: 'user', iss: 'https://api.test/api/auth',
    aud: 'https://mcp.test/mcp', exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000),
    sid: 'session', azp: 'client', scope: 'training:read', ...overrides }).setProtectedHeader({ alg: 'EdDSA', kid: 'test-key' }).sign(privateKey)
  const call = (token: string, method = 'tools/list') => app.fetch(new Request('https://mcp.test/mcp', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'test', method, params: method === 'tools/call' ? { name: 'update_training_program', arguments: {} } : {} }),
  }))
  try {
    for (const claims of [{ iss: 'https://attacker.test' }, { aud: 'https://other.test/mcp' }, { exp: 1 }]) {
      expect((await call(await sign(claims))).status).toBe(401)
    }
    const valid = await sign()
    const parts = valid.split('.')
    parts[2] = (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1)
    expect((await call(parts.join('.'))).status).toBe(401)
    expect(upstreamCalls).toBe(0)
    expect((await call(await sign({ scope: 'plans:write' }))).status).toBe(403)
    const listed = await call(valid)
    expect(listed.status, await listed.clone().text()).toBe(200)
    expect((await call(valid, 'tools/call')).status).toBe(403)
    active = false
    expect((await call(valid)).status).toBe(401)
    expect((await call(valid, 'server/discover')).status).toBe(401)
  } finally { await app.close() }
})
