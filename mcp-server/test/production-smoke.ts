import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { connectUser, registerUser, TestOAuthProvider } from './oauth-client.js'
import { verifyCodex } from './codex.js'
import { fixtureBackup } from './harness.js'
import { analyticsOutput } from '../src/analytics-schema.js'

// Explicitly invoked after deployment. Only a fresh isolated account is touched.
const mcpUrl = process.env.REPREST_SMOKE_MCP_URL
const apiBase = process.env.REPREST_SMOKE_API_URL
if (!mcpUrl || !apiBase) throw new Error('Set the explicit deployed MCP URL and Represt API URL')
assert.equal(new URL(mcpUrl).protocol, 'https:')
assert.equal(new URL(apiBase).protocol, 'https:')
const user = await registerUser(apiBase)
const provider = new TestOAuthProvider('training:read')
let connection: Awaited<ReturnType<typeof connectUser>> | undefined
try {
  connection = await connectUser(mcpUrl, apiBase, user, 'training:read', provider)
  const tools = await connection.client.listTools()
  assert.equal(tools.tools.length, 3)
  const result = await connection.client.callTool({ name: 'get_training_program', arguments: {} })
  assert(!result.isError)
  const state = result.structuredContent?.data as { version: number; plans: unknown }
  assert.equal(state.version, 0)
  assert.equal(state.plans, null)
  const guide = await connection.client.callTool({ name: 'get_training_guide', arguments: {} })
  assert(!guide.isError)
  const missing = await connection.client.callTool({ name: 'query_training_analytics', arguments: {
    query: 'overview', version: 0, from: '2026-10-01', to: '2026-10-25',
  } })
  assert.equal(missing.isError, true)
  assert.equal((missing.structuredContent?.error as { code: string }).code, 'NO_DATA')
  for (const method of ['GET', 'POST', 'DELETE']) {
    const removed = await fetch(`${apiBase}/api/account/ai-access`, { method, headers: { Authorization: `Bearer ${user.token}` } })
    assert.equal(removed.status, 404)
  }
  const legacy = await fetch(`${apiBase}/api/account/data`, { headers: { Authorization: `Bearer rr_ai_${'a'.repeat(64)}` } })
  assert.equal(legacy.status, 401)
  const backup = fixtureBackup()
  backup.tables.setRecords = backup.tables.setRecords.slice(0, 3)
  const upload = await fetch(`${apiBase}/api/account/sync`, {
    method: 'POST', headers: { Authorization: `Bearer ${user.token}`, Origin: apiBase, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 0, operationId: crypto.randomUUID(), backup }),
  })
  assert.equal(upload.status, 200)
  for (const query of ['overview', 'history', 'exercise_progress', 'frequency', 'volume', 'muscle_distribution', 'personal_records', 'plateaus']) {
    const result = await connection.client.callTool({ name: 'query_training_analytics', arguments: {
      query, version: 1, from: '2026-10-01', to: '2026-10-25',
      ...(query === 'exercise_progress' ? { exerciseName: 'push' } : {}),
    } })
    assert(!result.isError, JSON.stringify(result.structuredContent))
    const data = analyticsOutput.parse(result.structuredContent?.data)
    assert.equal(data.coverage.matchedSets, 3)
    assert.equal(data.summary.sessions, 1)
    assert.equal(data.summary.weightRepsKg, 1440)
  }
  console.log('PASS public MCP: all 8 aggregate queries on an isolated 3-set snapshot, missing-data feedback, removed token endpoints and legacy-token rejection')
  const blocked = await fetch(mcpUrl, {
    method: 'POST', headers: { Authorization: `Bearer ${connection.provider.storedTokens!.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'update_training_program', arguments: {} } }),
  })
  assert.equal(blocked.status, 403)
  console.log('PASS public MCP: Represt OAuth authorization, real SDK tools/list and tools/call, read-only scope enforced')
  if (process.env.REPREST_TEST_CODEX === '1') await verifyCodex(mcpUrl, provider.storedTokens!.access_token)
} catch (error) {
  if (provider.storedTokens?.access_token) {
    const token = provider.storedTokens.access_token
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    const upstream = await fetch(`${apiBase}/api/account/plans`, { headers: { Authorization: `Bearer ${token}` } })
    console.error('OAuth diagnostics (no credentials):', { issuer: claims.iss, audience: claims.aud, scope: claims.scope, upstreamStatus: upstream.status })
  }
  throw error
} finally {
  await connection?.client.close()
  const safeId = (id: string) => { assert.match(id, /^[a-zA-Z0-9_-]+$/); return id }
  const clientIds = [...provider.clients.values()].map((c) => safeId(c.client_id))
  assert.match(user.email, /^[a-f0-9-]+@example\.test$/)
  const cleanup = clientIds.map((id) => `DELETE FROM oauthClient WHERE clientId = '${id}';`).join(' ') +
    ` DELETE FROM auth_user WHERE id = '${safeId(user.user.id)}' AND email = '${user.email}';`
  const worker = resolve(process.env.REPREST_WORKER_DIR ?? '../../represt-worker')
  const wrangler = resolve(worker, 'node_modules/wrangler/bin/wrangler.js')
  const run = (args: string[]) => promisify(execFile)(process.execPath, [wrangler, ...args], { cwd: worker, timeout: 60000 })
  const { stdout } = await run(['d1', 'execute', 'represt-share', '--remote', '--json', '--command',
    `SELECT snapshot_key FROM account_sync WHERE user_id = '${safeId(user.user.id)}';`])
  const selected = JSON.parse(stdout) as Array<{ results: Array<{ snapshot_key: string | null }> }>
  for (const { snapshot_key: key } of selected.flatMap((r) => r.results)) {
    if (!key) continue
    assert(key.startsWith(`${user.user.id}/`), 'Only this isolated account snapshot may be removed')
    await run(['r2', 'object', 'delete', `represt-account-data/${key}`, '--remote'])
  }
  await run(['d1', 'execute', 'represt-share', '--remote', '--command', cleanup])
  console.log('PASS temporary smoke snapshot, account and OAuth client removed')
}
