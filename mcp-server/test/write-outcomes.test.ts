import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { afterEach, expect, it } from 'vitest'
import { ReprestApi } from '../src/api.js'
import { updateProgram } from '../src/program.js'

let stop: (() => Promise<void>) | undefined
afterEach(async () => { await stop?.() })
async function faultServer(handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const server = createServer(handler)
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No address')
  stop = () => new Promise<void>((done) => { server.close(() => done()); server.closeAllConnections() })
  return new ReprestApi(`http://127.0.0.1:${address.port}`, 'isolated-test-token')
}
const state = { version: 1, pending: false, syncedAt: '2026-10-01T00:00:00Z', plans: {
  plans: [{ id: 'a', name: 'a', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', exercises: [] }], cycle: null,
} }
const update = { expectedVersion: 1, confirmedByUser: true as const, userInstruction: 'Rename a to b.', plans: [{ id: 'a', name: 'b' }] }
const json = (response: ServerResponse, body: unknown, status = 200) => {
  response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body))
}

it('reports uncertain write outcomes when a connection closes after a write request', async () => {
  let writes = 0
  const api = await faultServer((request, response) => {
    if (request.method === 'PUT') { writes++; request.socket.destroy() }
    else json(response, state)
  })
  await expect(updateProgram(api, update)).rejects.toMatchObject({ code: 'WRITE_OUTCOME_UNKNOWN', retryable: false, outcome: { saved: null, verified: false } })
  expect(writes).toBe(1)
})
it('reports saved but unverified if read-back fails, without resending the write', async () => {
  let writes = 0
  const api = await faultServer((request, response) => {
    if (request.method === 'PUT') { writes++; json(response, { version: 2, pending: true }) }
    else json(response, writes ? { code: 'DATA_UNAVAILABLE' } : state, writes ? 503 : 200)
  })
  await expect(updateProgram(api, update)).rejects.toMatchObject({ code: 'READBACK_FAILED', outcome: { saved: true, verified: false } })
  expect(writes).toBe(1)
})
it('reports concurrent changes after saving and never overwrites them automatically', async () => {
  let writes = 0
  const api = await faultServer((request, response) => {
    if (request.method === 'PUT') { writes++; json(response, { version: 2, pending: true }) }
    else json(response, writes ? { ...state, version: 3 } : state)
  })
  await expect(updateProgram(api, update)).rejects.toMatchObject({ code: 'READBACK_MISMATCH', outcome: { saved: true, verified: false } })
  expect(writes).toBe(1)
})
