import { afterEach, expect, it, vi } from 'vitest'
import { uploadAccountData } from '../src/lib/account-api'
import { buildAccountDelta, describeAccountSnapshot } from '../src/lib/account-sync-data'
import type { AccountSyncState } from '../src/lib/account-types'
import { backupTableNames, type FullDataBackup } from '../src/lib/full-data-backup'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

function backup(): FullDataBackup {
  return { app: 'represt', schemaVersion: 1, exportedAt: '2026-10-25T01:00:00Z', localStorage: {},
    tables: Object.fromEntries(backupTableNames.map((name) => [name, []])) as FullDataBackup['tables'] }
}

it('sends only the delta over HTTP while keeping the full pending backup on the device', async () => {
  vi.stubEnv('VITE_PLAN_SHARE_API_BASE_URL', 'https://share.example.test')
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ version: 2, syncedAt: '2026-10-25T01:00:00Z' })))
  vi.stubGlobal('fetch', fetchMock)
  const pending: NonNullable<AccountSyncState['pending']> = {
    operationId: crypto.randomUUID(), version: 1, backup: backup(), target: { plans: [], cycle: null }, expectedLocalSignature: '',
    delta: { baseSnapshotVersion: 1, changes: { schemaVersion: 1, exportedAt: '2026-10-25T01:00:00Z',
      tables: { setRecords: { upserts: [{ id: 'set-1', reps: 10 }], deletes: [] } } } },
  }
  const session = { token: 'session-secret', user: { id: 'user-1', email: 'test@example.test' } }
  await uploadAccountData(session, pending)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toBe('https://share.example.test/api/account/sync')
  expect(options.headers.Authorization).toBe('Bearer session-secret')
  const body = JSON.parse(options.body)
  expect(body).toEqual({ operationId: pending.operationId, version: 1, baseSnapshotVersion: 1, delta: pending.delta!.changes })
  expect(body).not.toHaveProperty('backup')
  expect(body).not.toHaveProperty('target')
  expect(options.body).not.toContain(session.token)
  delete pending.delta
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ version: 2, syncedAt: '2026-10-25T01:00:00Z' })))
  await uploadAccountData(session, pending)
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ operationId: pending.operationId, version: 1, backup: pending.backup })
})

it('keeps a one-record update small even with a large, reordered history', async () => {
  const initial = backup()
  initial.tables.setRecords = Array.from({ length: 3000 }, (_, i) => ({ id: `set-${i}`, sessionId: `session-${i}`,
    performedExerciseId: `exercise-${i}`, setNumber: 1, weightKg: 60, reps: 8, completedAt: '2026-10-24T10:00:00Z' }))
  const baseline = await describeAccountSnapshot(initial, 1)
  const next = structuredClone(initial)
  next.tables.setRecords.reverse()
  next.tables.setRecords[0] = { ...(next.tables.setRecords[0] as object), reps: 10 }
  const delta = buildAccountDelta(next, await describeAccountSnapshot(next, 1), baseline)
  expect(delta.tables.setRecords?.upserts).toHaveLength(1)
  expect(delta.tables.setRecords?.deletes).toEqual([])
  expect(JSON.stringify(delta).length).toBeLessThan(JSON.stringify(next).length / 100)
  expect(JSON.stringify(baseline)).not.toContain('completedAt')
})
