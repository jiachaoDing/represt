import { expect, it, vi } from 'vitest'
import { ReprestApi } from '../src/api.js'
import { queryTrainingAnalytics } from '../src/analytics.js'
import { trainingFixture, query } from './analytics-fixture.js'

it('reads one complete immutable snapshot at the requested version and returns no raw tables', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(trainingFixture()))
  const result = await queryTrainingAnalytics(new ReprestApi('https://api.example', 'test-token', fetcher), query())
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(fetcher.mock.calls[0][0]).toBe('https://api.example/api/account/data?version=7')
  expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'GET', redirect: 'manual', headers: { Authorization: 'Bearer test-token' } })
  expect(result.summary).toMatchObject({ completedSets: 9 })
  expect(result).not.toHaveProperty('backup')
  expect(result).not.toHaveProperty('tables')
})

it.each([
  { code: 'NO_DATA', status: 404 }, { code: 'VERSION_CONFLICT', status: 409 },
  { code: 'OAUTH_INVALID_TOKEN', status: 401 }, { code: 'DATA_UNAVAILABLE', status: 503 },
])('preserves upstream $code failures instead of returning zero training', async ({ code, status }) => {
  const api = new ReprestApi('https://api.example', 'test-token', async () => Response.json({ code }, { status }))
  await expect(queryTrainingAnalytics(api, query())).rejects.toMatchObject({ code })
})

it.each(['missing_table', 'unsupported_version', 'invalid_timestamp', 'wrong_version'])(
  'rejects %s snapshot metadata without returning a partial successful aggregate', async (fault) => {
    const snapshot = trainingFixture()
    if (fault === 'missing_table') Reflect.deleteProperty(snapshot.backup.tables, 'performedExercises')
    if (fault === 'unsupported_version') Object.assign(snapshot.backup, { schemaVersion: 2 })
    if (fault === 'invalid_timestamp') snapshot.syncedAt = 'not a timestamp'
    if (fault === 'wrong_version') snapshot.version = 8
    const api = new ReprestApi('https://api.example', 'test-token', async () => Response.json(snapshot))
    await expect(queryTrainingAnalytics(api, query())).rejects.toMatchObject({
      code: fault === 'wrong_version' ? 'VERSION_CONFLICT' : 'INVALID_UPSTREAM_RESPONSE',
    })
  },
)
