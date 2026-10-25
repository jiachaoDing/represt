import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'

export async function verifyCodex(mcpUrl: string, accessToken: string) {
  const args = [
    'exec', '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only', '--json',
    '-c', `mcp_servers.represt.url=${JSON.stringify(mcpUrl)}`,
    '-c', 'mcp_servers.represt.bearer_token_env_var="REPREST_MCP_TEST_TOKEN"',
    '-c', 'mcp_servers.represt.enabled_tools=["get_training_program"]',
    '-c', 'apps._default.enabled=false',
    'Connection test: call mcp__represt__get_training_program from the explicitly configured MCP server named represt once and report only its returned version number. Do not use codex_apps or represt_training_mcp tools. Do not run shell commands, read files, or inspect environment variables.',
  ]
  let diagnostic = ''
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = execFile(process.env.REPREST_CODEX_BINARY ?? 'codex', args, {
      env: { ...process.env, REPREST_MCP_TEST_TOKEN: accessToken }, timeout: 180000, maxBuffer: 4 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      diagnostic = stderr.replaceAll(accessToken, '[REDACTED]').split(/\r?\n/).filter((line) => /mcp|error|handshake|startup/i.test(line)).slice(-15).join('\n')
      if (error) reject(error)
      else resolve(stdout)
    })
    child.stdin?.end()
  })
  const events = stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as {
    type?: string; error?: unknown; item?: { type?: string; server?: string; tool?: string; status?: string; error?: unknown; text?: string };
  })
  if (!events.some((e) => e.item?.type === 'mcp_tool_call' && e.item.status === 'completed')) {
    console.error('Codex connection diagnostics:', events.filter((e) => e.type === 'error' || ['mcp_tool_call', 'agent_message'].includes(e.item?.type ?? '')))
    console.error(diagnostic)
  }
  assert(events.some((e) => e.item?.type === 'mcp_tool_call' && e.item.server === 'represt' &&
    e.item.tool === 'get_training_program' && e.item.status === 'completed'), 'Codex did not complete the Represt MCP tool call')
  console.log('PASS actual Codex CLI → MCP get_training_program (OAuth-issued token via environment; no global config changes)')
}
