import { afterEach, expect, it, vi } from 'vitest'
import { getAccountMcpUrl, readAccountSession } from '../src/lib/account-api'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('opens the MCP page on the configured service origin without credentials', () => {
  vi.stubEnv('VITE_PLAN_SHARE_API_BASE_URL', 'https://share.example.test/')
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  expect(getAccountMcpUrl()).toBe('https://share.example.test/mcp')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('clears cached AI credentials while preserving the existing account session', () => {
  const session = { token: 'account-session', user: { id: 'user', email: 'user@example.test' } }
  const values = new Map([
    ['trainre.accountAiAccess.v1', JSON.stringify({ token: 'temporary-secret' })],
    ['trainre.accountSession.v1', JSON.stringify(session)],
  ])
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key) })
  expect(readAccountSession()).toEqual(session)
  expect(values.has('trainre.accountAiAccess.v1')).toBe(false)
  expect(values.has('trainre.accountSession.v1')).toBe(true)
})

it('can still read a signed-in account when storage cleanup is blocked', () => {
  const session = { token: 'account-session', user: { id: 'user', email: 'user@example.test' } }
  vi.stubGlobal('localStorage', {
    getItem: () => JSON.stringify(session), removeItem: () => { throw new Error('read-only storage') },
  })
  expect(readAccountSession()).toEqual(session)
})
