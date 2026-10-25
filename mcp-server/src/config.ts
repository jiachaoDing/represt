export type Config = { publicUrl: URL; apiBase: string; issuer: string; jwksUrl: URL; allowedOrigins: string[]; fetch?: typeof fetch }
export function trustedUrl(value: string, label: string) {
  const url = new URL(value)
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
    throw new Error(`${label} must be HTTPS (or loopback HTTP), without credentials, query or fragment`)
  }
  return url
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (!env.MCP_PUBLIC_URL || !env.REPREST_API_BASE_URL) throw new Error('Set MCP_PUBLIC_URL and REPREST_API_BASE_URL')
  const publicUrl = trustedUrl(env.MCP_PUBLIC_URL, 'MCP_PUBLIC_URL')
  const api = trustedUrl(env.REPREST_API_BASE_URL, 'REPREST_API_BASE_URL')
  if (api.pathname !== '/') throw new Error('REPREST_API_BASE_URL must be an origin')
  const issuer = `${api.origin}/api/auth`
  return {
    publicUrl, apiBase: api.origin, issuer, jwksUrl: new URL(`${issuer}/jwks`),
    allowedOrigins: [publicUrl.origin, ...(env.MCP_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean).map((s) => new URL(s).origin) ?? [])],
  }
}
