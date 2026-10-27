import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'node:http'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'

type Database = { prepare(sql: string): { run(): Promise<unknown> } }
type WorkerRuntime = { ready: Promise<URL>; getD1Database(name: string): Promise<Database>; dispose(): Promise<void> }

export async function startHarness(options: { workerDir?: string; appFactory?: typeof createApp } = {}) {
  const worker = resolve(options.workerDir ?? process.env.REPREST_WORKER_DIR ?? '../../represt-worker')
  const require = createRequire(resolve(worker, 'package.json'))
  const { Miniflare, Log, LogLevel } = require('miniflare') as {
    Miniflare: new (options: Record<string, unknown>) => WorkerRuntime;
    Log: new (level: number) => unknown; LogLevel: { ERROR: number };
  }
  const bundleDir = resolve(worker, '.wrangler/mcp-integration-bundle')
  execFileSync(process.execPath, [resolve(require.resolve('wrangler/package.json'), '../bin/wrangler.js'), 'deploy', '--dry-run', '--outdir', bundleDir], {
    cwd: worker, stdio: 'pipe', timeout: 60000,
  })
  let handler: ReturnType<typeof toNodeHandler> | undefined
  const server = createServer((request, response) => {
    if (!handler) { response.writeHead(503); response.end(); return }
    void handler(request, response)
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No MCP port')
  const mcpUrl = `http://127.0.0.1:${address.port}/mcp`
  const styleModules = (await readdir(bundleDir)).filter((file) => file.endsWith('.css'))
    .map((file) => ({ type: 'Text', path: resolve(bundleDir, file) }))
  const runtime = new Miniflare({
    modules: [{ type: 'ESModule', path: resolve(bundleDir, 'index.js') }, ...styleModules], modulesRoot: bundleDir,
    compatibilityDate: '2026-03-10', compatibilityFlags: ['nodejs_compat'],
    host: '127.0.0.1', port: 0, log: new Log(LogLevel.ERROR),
    d1Databases: { DB: 'mcp-integration' }, r2Buckets: { ACCOUNT_DATA: 'account', ANDROID_RELEASES: 'android' },
    bindings: { BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(), MCP_RESOURCE_URL: mcpUrl },
  })
  try {
    const apiBase = (await runtime.ready).origin
    const db = await runtime.getD1Database('DB')
    for (const file of (await readdir(resolve(worker, 'migrations'))).filter((s) => s.endsWith('.sql')).sort()) {
      for (const statement of (await readFile(resolve(worker, 'migrations', file), 'utf8')).split(';').filter((s) => s.trim())) {
        await db.prepare(statement).run()
      }
    }
    const app = (options.appFactory ?? createApp)(loadConfig({ MCP_PUBLIC_URL: mcpUrl, REPREST_API_BASE_URL: apiBase }))
    handler = toNodeHandler(app, { maxRequestBodySize: 512 * 1024 })
    return { apiBase, mcpUrl, db, async close() {
      await app.close()
      await new Promise<void>((done) => { server.close(() => done()); server.closeAllConnections() })
      await runtime.dispose()
    } }
  } catch (error) {
    server.close()
    await runtime.dispose()
    throw error
  }
}

export function fixtureBackup() {
  const now = new Date().toISOString()
  return { app: 'represt', schemaVersion: 1, exportedAt: now, localStorage: {}, tables: {
    workoutPlans: ['push', 'pull'].map((id) => ({ id, name: id, createdAt: now, updatedAt: now })),
    planExercises: ['push', 'pull'].map((planId) => ({ id: `${planId}-exercise`, planId, name: planId, targetSets: 3, restSeconds: 90, order: 0, weightKg: 60, reps: 8 })),
    trainingCycles: [{ id: 'default', slots: [{ id: 'slot-push', planId: 'push' }, { id: 'slot-rest', planId: null }], anchorDateKey: '2026-10-01', anchorIndex: 0, updatedAt: now }],
    workoutSessions: [{ id: 'session', sessionDateKey: '2026-10-20', createdAt: now }],
    sessionPlanItems: [{ id: 'item', sessionId: 'session', planExerciseId: 'push-exercise', name: 'push' }],
    performedExercises: [{ id: 'performed', sessionId: 'session', planItemId: 'item', planExerciseId: 'push-exercise', name: 'push', measurementType: 'weightReps' }],
    setRecords: Array.from({ length: 1005 }, (_, i) => ({ id: `set-${i}`, sessionId: 'session', performedExerciseId: 'performed', setNumber: i + 1, completedAt: now, weightKg: 60, reps: 8, durationSeconds: null, distanceMeters: null })),
    exerciseProfiles: [], sharedPlanRecords: [],
  } }
}
