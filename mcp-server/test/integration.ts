import assert from 'node:assert/strict'
import { startHarness, fixtureBackup } from './harness.js'
import { connectUser, registerUser } from './oauth-client.js'
import { stateSchema, historyPageSchema } from '../src/schemas.js'
import { verifyCodex } from './codex.js'
import { auth } from '@modelcontextprotocol/client'
import { analyticsOutput } from '../src/analytics-schema.js'

const harness = await startHarness()
const clients: Array<{ close(): Promise<void> }> = []
try {
  const { apiBase, mcpUrl } = harness
  const user = await registerUser(apiBase)
  const backup = fixtureBackup()
  const upload = await fetch(`${apiBase}/api/account/sync`, {
    method: 'POST', headers: { Authorization: `Bearer ${user.token}`, Origin: apiBase, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: 0, operationId: crypto.randomUUID(), backup }),
  })
  assert.equal(upload.status, 200)
  const { client, provider } = await connectUser(mcpUrl, apiBase, user)
  clients.push(client)
  const tools = await client.listTools()
  assert.deepEqual(tools.tools.map((t) => t.name).sort(), ['get_training_guide', 'get_training_program', 'query_training_analytics', 'read_training_history', 'update_training_program'].sort())
  assert(tools.tools.every((t) => t.inputSchema && t.outputSchema))
  const guide = await client.callTool({ name: 'get_training_guide', arguments: {} })
  assert(!guide.isError)
  const guideData = guide.structuredContent?.data as { units: { weightKg: string }; transport: { type: string } }
  assert.equal(guideData.units.weightKg, 'kg')
  assert.equal(guideData.transport.type, 'MCP')
  console.log('PASS SDK OAuth discovery → DCR → login → consent → PKCE → Streamable HTTP → tools/list')

  const initial = await client.callTool({ name: 'get_training_program', arguments: {} })
  assert(!initial.isError)
  const state = stateSchema.parse(initial.structuredContent?.data)
  assert.equal(state.version, 1)
  const readSets = async (version: number) => {
    const records: unknown[] = []
    let offset: number | null = 0
    while (offset !== null) {
      const response = await client.callTool({ name: 'read_training_history', arguments: { table: 'setRecords', version, offset, limit: 400 } })
      assert(!response.isError)
      const page = historyPageSchema.parse(response.structuredContent?.data)
      records.push(...page.records)
      offset = page.nextOffset
    }
    return records
  }
  const beforeSets = await readSets(1)
  assert.equal(beforeSets.length, 1005)
  for (const query of ['overview', 'history', 'exercise_progress', 'frequency', 'volume', 'muscle_distribution', 'personal_records', 'plateaus']) {
    const response = await client.callTool({ name: 'query_training_analytics', arguments: {
      query, version: 1, from: '2026-10-01', to: '2026-10-25', limit: 1,
      ...(query === 'exercise_progress' ? { exerciseName: 'push' } : {}),
    } })
    assert(!response.isError, JSON.stringify(response.structuredContent))
    const aggregate = analyticsOutput.parse(response.structuredContent?.data)
    assert.equal(aggregate.coverage.matchedSets, 1005)
    assert.equal(aggregate.summary.weightRepsKg, 482400)
    assert.equal(aggregate.summary.sessions, 1)
    if (query === 'personal_records') {
      const best = aggregate.items[0].best as Array<{ metric: string; value: number }>
      assert.equal(best.find((b) => b.metric === 'weightKg')?.value, 60)
    }
  }
  console.log('PASS all 8 aggregate queries through OAuth MCP; full 1005-set snapshot aggregated before result pagination')
  const result = await client.callTool({ name: 'update_training_program', arguments: {
    expectedVersion: 1, confirmedByUser: true, userInstruction: 'Increase push weight to 65 kg and add a pull day after the rest day.',
    plans: [{ id: 'push', exercises: [{ id: 'push-exercise', weightKg: 65 }] }],
    cycle: { slots: [{ planId: 'push' }, { planId: null }, { planId: 'pull' }], anchorDateKey: '2026-10-01', anchorIndex: 0 },
  } })
  assert(!result.isError, JSON.stringify(result.structuredContent))
  const saved = stateSchema.parse(result.structuredContent?.data)
  assert.equal(result.structuredContent?.data && (result.structuredContent.data as { verified: boolean }).verified, true)
  assert.equal(saved.version, 2)
  assert.deepEqual(saved.plans!.plans.find((p) => p.id === 'pull'), state.plans!.plans.find((p) => p.id === 'pull'))
  assert.equal(saved.plans!.plans.find((p) => p.id === 'push')!.exercises[0].id, 'push-exercise')
  assert.equal(saved.plans!.plans.find((p) => p.id === 'push')!.exercises[0].weightKg, 65)
  const afterEdit = await client.callTool({ name: 'query_training_analytics', arguments: {
    query: 'overview', version: 2, from: '2026-10-01', to: '2026-10-25',
  } })
  assert.equal(analyticsOutput.parse(afterEdit.structuredContent?.data).summary.weightRepsKg, 482400)
  const staleAggregate = await client.callTool({ name: 'query_training_analytics', arguments: {
    query: 'overview', version: 1, from: '2026-10-01', to: '2026-10-25',
  } })
  assert.equal(staleAggregate.isError, true)
  assert.equal((staleAggregate.structuredContent?.error as { code: string }).code, 'VERSION_CONFLICT')
  assert.deepEqual(saved.plans!.cycle!.slots.slice(0, 2), state.plans!.cycle!.slots)
  assert.deepEqual(await readSets(2), beforeSets)
  const snapshot = await fetch(`${apiBase}/api/account/data?version=2`, {
    headers: { Authorization: `Bearer ${provider.storedTokens!.access_token}` },
  })
  assert.equal(snapshot.status, 200)
  assert.deepEqual((await snapshot.json() as { backup: unknown }).backup, backup)
  console.log('PASS complete pagination (1005 sets), scoped plan/cycle edit, ID preservation, read-back, unchanged history')

  const stale = await client.callTool({ name: 'update_training_program', arguments: {
    expectedVersion: 1, confirmedByUser: true, userInstruction: 'Rename push.', plans: [{ id: 'push', name: 'changed' }],
  } })
  assert.equal(stale.isError, true)
  assert.equal((stale.structuredContent?.error as { code: string }).code, 'VERSION_CONFLICT')
  const other = await registerUser(apiBase)
  const isolated = await connectUser(mcpUrl, apiBase, other, 'training:read')
  clients.push(isolated.client)
  const empty = await isolated.client.callTool({ name: 'get_training_program', arguments: {} })
  assert.equal(stateSchema.parse(empty.structuredContent?.data).plans, null)
  const isolatedAggregate = await isolated.client.callTool({ name: 'query_training_analytics', arguments: {
    query: 'overview', version: 0, from: '2026-10-01', to: '2026-10-25',
  } })
  assert.equal(isolatedAggregate.isError, true)
  assert.equal((isolatedAggregate.structuredContent?.error as { code: string }).code, 'NO_DATA')
  const forbidden = await fetch(mcpUrl, { method: 'POST', headers: {
    Authorization: `Bearer ${isolated.provider.storedTokens!.access_token}`, 'Content-Type': 'application/json',
  }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'update_training_program', arguments: {} } }) })
  assert.equal(forbidden.status, 403)
  assert.match(forbidden.headers.get('WWW-Authenticate')!, /plans:write/)
  console.log('PASS multi-user isolation, stale-write rejection and HTTP 403 scope escalation')
  assert(provider.storedTokens?.refresh_token)
  const oldRefresh = provider.storedTokens.refresh_token
  await auth(provider, { serverUrl: mcpUrl })
  assert.notEqual(provider.storedTokens.refresh_token, oldRefresh)
  assert(!(await client.callTool({ name: 'get_training_program', arguments: {} })).isError)
  const invalidSignature = provider.storedTokens.access_token.split('.')
  invalidSignature[2] = (invalidSignature[2][0] === 'a' ? 'b' : 'a') + invalidSignature[2].slice(1)
  const forged = await fetch(mcpUrl, { method: 'POST', headers: { Authorization: `Bearer ${invalidSignature.join('.')}` } })
  assert.equal(forged.status, 401)
  console.log('PASS refresh-token rotation, refreshed tool calls and forged-token rejection')
  if (process.env.REPREST_TEST_CODEX === '1') await verifyCodex(mcpUrl, provider.storedTokens.access_token)
  await harness.db.prepare(`DELETE FROM oauthConsent WHERE userId = '${user.user.id.replace(/'/g, "''")}'`).run()
  const revoked = await fetch(mcpUrl, { method: 'POST', headers: { Authorization: `Bearer ${provider.storedTokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'revoked', method: 'tools/list', params: {} }) })
  assert.equal(revoked.status, 401)
  console.log('PASS revoked consent rejected by MCP before tool discovery/execution')
} finally {
  await Promise.all(clients.map((client) => client.close()))
  await harness.close()
}
