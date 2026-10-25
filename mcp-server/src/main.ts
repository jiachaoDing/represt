import { createServer } from 'node:http'
import { hostHeaderValidation, toNodeHandler } from '@modelcontextprotocol/node'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createApp(config)
const handle = toNodeHandler(app, { maxRequestBodySize: 512 * 1024 })
const validateHost = hostHeaderValidation([config.publicUrl.hostname, '127.0.0.1', 'localhost', '[::1]'])
const port = Number(process.env.PORT ?? 3001)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT')
const server = createServer((request, response) => {
  if (!validateHost(request, response)) return
  void handle(request, response)
})
server.requestTimeout = 30000
server.headersTimeout = 10000
server.listen(port, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`Represt MCP listening on port ${port}; resource ${config.publicUrl.href}`)
})
async function shutdown() {
  await app.close()
  server.close()
  server.closeIdleConnections()
}
process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())
