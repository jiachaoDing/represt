// Reconstruct tracked HEAD sources in ignored test directories; never reset either checkout.
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export async function prepareBaseline() {
  const workerRepo = resolve(process.env.REPREST_WORKER_DIR ?? '../../represt-worker')
  const mcpRepo = resolve('..')
  const workerDir = resolve(workerRepo, '.wrangler/performance-baseline')
  const mcpDir = resolve('.wrangler/performance-baseline')
  const git = (cwd: string, args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  async function copy(repo: string, prefix: string, target: string, paths: string[]) {
    const names = git(repo, ['ls-tree', '-r', '--name-only', 'HEAD', '--', ...paths]).trim().split('\n').filter(Boolean)
    for (const name of names) {
      let source = git(repo, ['show', `HEAD:${name}`])
      // Baseline instrumentation adds timings only; all business logic stays at HEAD.
      if (name === 'mcp-server/src/tools.ts') source = source
        .replace('const result = { ok: true, data: await operation() }', 'const started = performance.now(); const result = { ok: true, data: await operation() }')
        .replace('structuredContent: result }', 'structuredContent: result, _meta: { performance: { toolMs: performance.now() - started } } }')
      if (name === 'mcp-server/src/app.ts') source = source
        .replace('async function route(request: Request): Promise<Response> {', 'async function route(request: Request): Promise<Response> { const started = performance.now()')
        .replace('return protocol.fetch(request, { authInfo })', 'const authMs = performance.now() - started; const response = await protocol.fetch(request, { authInfo }); const headers = new Headers(response.headers); headers.set("Server-Timing", `mcp_auth;dur=${authMs.toFixed(2)}`); return new Response(response.body, { status: response.status, headers })')
      const file = resolve(target, name.slice(prefix.length))
      await mkdir(dirname(file), { recursive: true }); await writeFile(file, source, 'utf8')
    }
  }
  await copy(workerRepo, '', workerDir, ['src', 'migrations', 'wrangler.jsonc', 'package.json'])
  await copy(mcpRepo, 'mcp-server/', mcpDir, ['mcp-server/src', 'mcp-server/package.json'])
  return { workerDir, mcpDir, commits: { worker: git(workerRepo, ['rev-parse', 'HEAD']).trim(), mcp: git(mcpRepo, ['rev-parse', 'HEAD']).trim() } }
}
