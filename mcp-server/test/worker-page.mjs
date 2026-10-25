import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'

const require = createRequire(resolve(process.env.REPREST_WORKER_DIR ?? '../../represt-worker', 'package.json'))
const { Miniflare, Log, LogLevel } = require('miniflare')
const base = 'https://share.represt.app'
const runtime = new Miniflare({
  log: new Log(LogLevel.ERROR),
  modules: true, scriptPath: resolve('.wrangler/landing-check/worker.js'),
  modulesRules: [{ type: 'Data', include: ['**/*.bin'] }],
  compatibilityDate: '2026-03-10',
  bindings: { MCP_PUBLIC_URL: `${base}/mcp`, REPREST_API_BASE_URL: base },
})
try {
  const page = await runtime.dispatchFetch(`${base}/mcp`, { headers: { Accept: 'text/html', 'Accept-Language': 'zh-CN' } })
  assert.equal(page.status, 200)
  assert.match(await page.text(), /让 AI 读懂你的训练/)
  const head = await runtime.dispatchFetch(`${base}/mcp`, { method: 'HEAD', headers: { Accept: 'text/html' } })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.equal((await runtime.dispatchFetch(`${base}/mcp`, { headers: { Accept: 'text/event-stream' } })).status, 405)
  const denied = await runtime.dispatchFetch(`${base}/mcp`, { method: 'POST', body: '{}' })
  assert.equal(denied.status, 401)
  assert(denied.headers.get('WWW-Authenticate').includes('resource_metadata'))
  const zip = await runtime.dispatchFetch(`${base}/mcp/downloads/represt-plugin.zip`)
  assert.equal(zip.status, 200)
  const files = unzipSync(new Uint8Array(await zip.arrayBuffer()))
  const manifest = JSON.parse(strFromU8(files['plugin.json']))
  assert.equal(manifest.homepage, `${base}/mcp`)
  const connection = JSON.parse(strFromU8(files['mcp.json']))
  assert.equal(connection.mcpServers.represt.url, `${base}/mcp`)
  console.log('PASS real Worker: browser HTML, HEAD, MCP GET/POST boundary and migrated plugin download')
} finally { await runtime.dispose() }
