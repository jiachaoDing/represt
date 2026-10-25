import assert from 'node:assert/strict'
import { auth, Client, StreamableHTTPClientTransport, UnauthorizedError,
  type OAuthClientProvider, type OAuthClientInformationMixed, type OAuthClientInformationContext,
  type OAuthTokens, type OAuthDiscoveryState } from '@modelcontextprotocol/client'

export class TestOAuthProvider implements OAuthClientProvider {
  readonly redirectUrl = 'http://127.0.0.1:9876/callback'
  readonly clientMetadata
  readonly clients = new Map<string, OAuthClientInformationMixed>()
  storedTokens?: OAuthTokens
  private verifier?: string
  private discovery?: OAuthDiscoveryState
  authorizationUrl?: URL
  expectedState?: string
  constructor(scopes: string) {
    this.clientMetadata = { client_name: 'Represt integration client', redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: 'none' as const, application_type: 'native' as const,
      grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: scopes }
  }
  clientInformation(ctx?: OAuthClientInformationContext) { return ctx ? this.clients.get(ctx.issuer) : undefined }
  saveClientInformation(value: OAuthClientInformationMixed, ctx?: OAuthClientInformationContext) { if (ctx) this.clients.set(ctx.issuer, value) }
  tokens() { return this.storedTokens }
  saveTokens(tokens: OAuthTokens) { this.storedTokens = tokens }
  state() { this.expectedState = crypto.randomUUID(); return this.expectedState }
  redirectToAuthorization(url: URL) { this.authorizationUrl = url }
  saveCodeVerifier(value: string) { this.verifier = value }
  codeVerifier() { assert(this.verifier); return this.verifier }
  discoveryState() { return this.discovery }
  saveDiscoveryState(value: OAuthDiscoveryState) { this.discovery = value }
}

export async function registerUser(apiBase: string) {
  const email = `${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID() + 'Aa1!'
  const response = await fetch(`${apiBase}/api/auth/sign-up/email`, {
    method: 'POST', headers: { Origin: apiBase, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'MCP integration test' }),
  })
  assert.equal(response.status, 200)
  const account = await response.json() as { token: string; user: { id: string } }
  return { ...account, email, password }
}

export async function connectUser(mcpUrl: string, apiBase: string, user: Awaited<ReturnType<typeof registerUser>>, scopes = 'training:read plans:write offline_access', provider = new TestOAuthProvider(scopes)) {
  const client = new Client({ name: 'represt-real-sdk-test', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider: provider })
  await assert.rejects(client.connect(transport), UnauthorizedError)
  assert(provider.authorizationUrl)
  // A browser navigation requests HTML; API-style fetches receive a JSON redirect.
  await auth(provider, { serverUrl: mcpUrl, scope: scopes, forceReauthorization: true })
  const authorization = await fetch(provider.authorizationUrl, { redirect: 'manual', headers: { Accept: 'text/html' } })
  assert([200, 302].includes(authorization.status))
  const target = authorization.status === 302 ? authorization.headers.get('Location')! : (await authorization.json() as { url: string }).url
  const loginUrl = new URL(target, apiBase)
  assert.equal((await fetch(loginUrl)).status, 200)
  const signin = await fetch(`${apiBase}/api/auth/sign-in/email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: apiBase },
    body: JSON.stringify({ email: user.email, password: user.password, oauth_query: loginUrl.search.slice(1) }),
  })
  assert.equal(signin.status, 200)
  const cookie = signin.headers.getSetCookie().map((s) => s.split(';')[0]).join('; ')
  const signed = await signin.json() as { url: string }
  const consentUrl = new URL(signed.url, apiBase)
  assert.equal((await fetch(consentUrl, { headers: { Cookie: cookie } })).status, 200)
  const consent = await fetch(`${apiBase}/api/auth/oauth2/consent`, {
    method: 'POST', headers: { Cookie: cookie, Origin: apiBase, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accept: true, scope: scopes, oauth_query: consentUrl.search.slice(1) }),
  })
  assert.equal(consent.status, 200)
  const allowed = await consent.json() as { url: string }
  const redirect = new URL(allowed.url)
  assert.equal(redirect.searchParams.get('state'), provider.expectedState)
  await transport.finishAuth(redirect.searchParams)
  await client.close()
  const connected = new Client({ name: 'represt-real-sdk-test', version: '1.0.0' })
  const connectedTransport = new StreamableHTTPClientTransport(new URL(mcpUrl), { authProvider: provider })
  await connected.connect(connectedTransport)
  return { client: connected, transport: connectedTransport, provider, cookie }
}
