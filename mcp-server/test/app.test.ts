import { afterEach, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'

const app = createApp(loadConfig({ MCP_PUBLIC_URL: 'http://127.0.0.1:3001/mcp', REPREST_API_BASE_URL: 'http://127.0.0.1:8787', MCP_ALLOWED_ORIGINS: '' }))
afterEach(() => app.close())

it('publishes resource metadata without exposing any account credentials', async () => {
  const response = await app.fetch(new Request('http://127.0.0.1:3001/.well-known/oauth-protected-resource/mcp'))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ resource: 'http://127.0.0.1:3001/mcp', authorization_servers: ['http://127.0.0.1:8787/api/auth'], scopes_supported: ['training:read', 'plans:write', 'offline_access'] })
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})
it('challenges unauthenticated clients with OAuth discovery and denies untrusted browser origins', async () => {
  const request = () => new Request('http://127.0.0.1:3001/mcp', { method: 'POST' })
  const response = await app.fetch(request())
  expect(response.status).toBe(401)
  expect(response.headers.get('WWW-Authenticate')).toContain('resource_metadata=')
  const untrusted = request()
  untrusted.headers.set('Origin', 'https://untrusted.example')
  expect((await app.fetch(untrusted)).status).toBe(403)
})
it('rejects query-string credentials and unsupported session methods', async () => {
  expect((await app.fetch(new Request('http://127.0.0.1:3001/mcp?access_token=secret', { method: 'POST' }))).status).toBe(400)
  expect((await app.fetch(new Request('http://127.0.0.1:3001/mcp'))).status).toBe(405)
})
it('requires HTTPS for public URLs and rejects credential-bearing configuration', () => {
  expect(() => loadConfig({ MCP_PUBLIC_URL: 'http://public.example/mcp', REPREST_API_BASE_URL: 'https://api.example' })).toThrow(/HTTPS/)
  expect(() => loadConfig({ MCP_PUBLIC_URL: 'https://user:secret@example.com/mcp', REPREST_API_BASE_URL: 'https://api.example' })).toThrow(/credentials/)
})
