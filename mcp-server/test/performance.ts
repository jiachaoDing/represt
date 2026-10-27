import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { startHarness } from './harness.js'
import { connectUser, registerUser } from './oauth-client.js'
import { performanceFixture } from './performance-fixture.js'
import { prepareBaseline } from './performance-baseline.js'
import { createApp } from '../src/app.js'

const baseline = await prepareBaseline()
const oldApp = (await import(pathToFileURL(resolve(baseline.mcpDir, 'src/app.ts')).href)).createApp as typeof createApp
const fixture = performanceFixture()
const repeats = Number(process.env.BENCH_REPEATS ?? 5)
type Sample = { calls: number; elapsedMs: number; serverMs: number; transportAndProtocolMs: number; responseBytes: number; upstreamCalls: number; upstreamBytes: number }
const output: Record<string, Record<string, Sample>> = {}
const evidence: Record<string, unknown> = {}

for (const mode of ['before', 'after'] as const) {
  let upstreamCalls = 0; let upstreamBytes = 0
  const harness = await startHarness({ workerDir: mode === 'before' ? baseline.workerDir : undefined,
    appFactory: (config) => (mode === 'before' ? oldApp : createApp)({ ...config, fetch: async (input, init) => {
      const response = await fetch(input, init)
      const bytes = (await response.clone().arrayBuffer()).byteLength
      upstreamCalls++; upstreamBytes += bytes
      return response
    } }) })
  let client: Client | undefined
  let connected: Awaited<ReturnType<typeof connectUser>> | undefined
  try {
    const user = await registerUser(harness.apiBase)
    const upload = await fetch(`${harness.apiBase}/api/account/sync`, { method: 'POST',
      headers: { Authorization: `Bearer ${user.token}`, Origin: harness.apiBase, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 0, operationId: crypto.randomUUID(), backup: fixture }) })
    assert.equal(upload.status, 200)
    connected = await connectUser(harness.mcpUrl, harness.apiBase, user)
    let responseBytes = 0; let authMs = 0
    client = new Client({ name: 'represt-performance', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(harness.mcpUrl), { authProvider: connected.provider,
      fetch: async (input, init) => {
        const response = await fetch(input, init)
        const body = await response.arrayBuffer()
        responseBytes += body.byteLength
        authMs += Number(/mcp_auth;dur=([\d.]+)/.exec(response.headers.get('Server-Timing') ?? '')?.[1] ?? 0)
        return new Response(body.byteLength ? body : null, { status: response.status, headers: response.headers })
      } }))
    const listed = await client.listTools()
    assert.equal(listed.tools.length, mode === 'before' ? 5 : 3)
    let calls = 0; let toolMs = 0
    const call = async (name: string, args: Record<string, unknown> = {}) => {
      calls++
      const result = await client!.callTool({ name, arguments: args })
      assert(!result.isError, JSON.stringify(result.structuredContent))
      toolMs += Number((result._meta?.performance as { toolMs?: number })?.toolMs ?? 0)
      return result.structuredContent!.data as Record<string, any>
    }
    const analytics = (query: string, from: string, to: string, extra = {}) => call('query_training_analytics', {
      query, from, to, limit: 100, ...(mode === 'before' ? { version: 1 } : {}), ...extra })
    const raw = async (table: string, from: string, to: string) => {
      const records: any[] = []; let offset: number | null = 0
      while (offset !== null) {
        const page = await call('read_training_history', { table, from, to, version: 1, offset, limit: 1000 })
        records.push(...page.records); offset = page.nextOffset
      }
      return records
    }
    const scenarios: Record<string, () => Promise<unknown>> = {
      today: async () => {
        if (mode === 'after') {
          const result = await analytics('workout_summary', '2026-10-26', '2026-10-26')
          const item = result.items[0]
          assert.equal(item.completion.rate, 17 / 18)
          return { sets: item.exercises.flatMap((e: any) => e.sets).sort((a: any, b: any) => a.id.localeCompare(b.id)),
            previousSets: item.exercises.flatMap((e: any) => e.previous?.sets ?? []).sort((a: any, b: any) => a.id.localeCompare(b.id)),
            previousDate: item.previous.date, targetSets: item.completion.knownTargetSets }
        }
        const today = await raw('workoutSessions', '2026-10-26', '2026-10-26')
        const targets = await raw('sessionPlanItems', '2026-10-26', '2026-10-26')
        const exercises = await raw('performedExercises', '2026-10-26', '2026-10-26')
        const sets = await raw('setRecords', '2026-10-26', '2026-10-26')
        const history = await raw('workoutSessions', '2025-01-01', '2026-10-25')
        const previous = history.filter((s) => s.plannedPlanId === today[0].plannedPlanId).sort((a, b) => b.sessionDateKey.localeCompare(a.sessionDateKey))[0]
        await raw('sessionPlanItems', previous.sessionDateKey, previous.sessionDateKey)
        const previousExercises = await raw('performedExercises', previous.sessionDateKey, previous.sessionDateKey)
        const previousSets = await raw('setRecords', previous.sessionDateKey, previous.sessionDateKey)
        const project = (values: any[], exercises: any[]) => {
          const byId = new Map(exercises.map((e) => [e.id, e]))
          return values.map((s) => ({ id: s.id, performedExerciseId: s.performedExerciseId,
          planItemId: byId.get(s.performedExerciseId)?.planItemId ?? null, setNumber: s.setNumber, completedAt: s.completedAt,
          weightKg: s.weightKg, reps: s.reps, durationSeconds: s.durationSeconds, distanceMeters: s.distanceMeters })).sort((a, b) => a.id.localeCompare(b.id))
        }
        return { sets: project(sets, exercises), previousSets: project(previousSets, previousExercises),
          previousDate: previous.sessionDateKey, targetSets: targets.reduce((sum, p) => sum + p.targetSets, 0) }
      },
      weekComparison: async () => {
        const current = await analytics('overview', '2026-10-19', '2026-10-25', mode === 'after' ? { compare: 'previous_period' } : {})
        const previous = mode === 'after' ? current.comparison : await analytics('overview', '2026-10-12', '2026-10-18')
        return { current: current.summary, previous: previous.summary }
      },
      trend: async () => {
        const result = await analytics('volume', '2026-08-01', '2026-10-26', { bucket: 'week' })
        return { summary: result.summary, items: result.items, total: result.total }
      },
    }
    output[mode] = {}
    for (const [name, scenario] of Object.entries(scenarios)) {
      const samples: Sample[] = []
      // One warmup excludes OAuth/JWKS startup; every measured baseline includes its old prerequisites.
      for (let run = -1; run < repeats; run++) {
        calls = 0; toolMs = 0; authMs = 0; responseBytes = 0; upstreamCalls = 0; upstreamBytes = 0
        const start = performance.now()
        if (mode === 'before') { await call('get_training_guide'); await call('get_training_program') }
        const result = await scenario()
        const elapsedMs = performance.now() - start
        if (mode === 'before') evidence[name] = result
        else if (name === 'weekComparison') {
          const expected = evidence[name] as any
          // overview adds plan/empty-session metadata; period comparisons intentionally return metric totals only.
          for (const key of ['sessions', 'trainingDays', 'completedSets', 'reps', 'durationSeconds', 'weightRepsKg']) {
            assert.equal((result as any).current[key], expected.current[key]); assert.equal((result as any).previous[key], expected.previous[key])
          }
        } else assert.deepEqual(result, evidence[name])
        if (run >= 0) samples.push({ calls, elapsedMs, serverMs: authMs + toolMs,
          transportAndProtocolMs: Math.max(0, elapsedMs - authMs - toolMs), responseBytes, upstreamCalls, upstreamBytes })
      }
      const median = (key: keyof Sample) => samples.map((s) => s[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)]
      output[mode][name] = Object.fromEntries(Object.keys(samples[0]).map((k) => [k, median(k as keyof Sample)])) as Sample
    }
  } finally { await client?.close(); await connected?.client.close(); await harness.close() }
}
const report = { environment: 'Windows loopback HTTP; Node MCP SDK; Miniflare D1/R2; real OAuth PKCE; no artificial latency',
  method: 'Median of 5 warm samples (BENCH_REPEATS overrides); before=tracked HEAD plus timings only; serverMs=live auth + tool work; residual includes protocol, serialization and loopback, not pure Internet RTT',
  commits: baseline.commits, repeats, fixture: { sessions: fixture.tables.workoutSessions.length,
    sets: fixture.tables.setRecords.length, bytes: Buffer.byteLength(JSON.stringify(fixture)) }, correctness: 'PASS all scenarios', results: output }
await writeFile(resolve('.wrangler/performance-results.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
