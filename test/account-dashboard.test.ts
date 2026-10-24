import { afterEach, expect, it, vi } from 'vitest'
import { createAccountDashboardUrl } from '../src/lib/account-api'
import { openAccountDashboard } from '../src/lib/account-dashboard'

const session = { token: 'private-app-session', user: { id: 'u', email: 'user@example.test' } }
afterEach(() => { vi.unstubAllGlobals() })

it('puts only the single-use ticket in the fragment and preserves the app language', async () => {
  const fetchMock = vi.fn(async () => Response.json({ token: 'single-use-ticket' }))
  vi.stubGlobal('fetch', fetchMock)
  const url = new URL(await createAccountDashboardUrl(session, 'en'))
  expect(url.pathname).toBe('/account')
  expect(url.searchParams.get('lang')).toBe('en')
  expect(new URLSearchParams(url.hash.slice(1)).get('login')).toBe('single-use-ticket')
  expect(url.toString()).not.toContain(session.token)
  expect(fetchMock.mock.calls[0]).toMatchObject([
    expect.stringMatching(/\/api\/auth\/one-time-token\/generate$/),
    { method: 'GET', credentials: 'omit', headers: { Authorization: `Bearer ${session.token}` } },
  ])
})

it('opens a tab during the click and removes its opener before requesting a ticket', async () => {
  const tab = { opener: {}, closed: false, location: { replace: vi.fn() }, close: vi.fn() }
  const open = vi.fn(() => tab)
  vi.stubGlobal('window', { open })
  vi.stubGlobal('fetch', vi.fn(async () => {
    expect(open).toHaveBeenCalledWith('about:blank', '_blank')
    expect(tab.opener).toBeNull()
    return Response.json({ token: 'single-use-ticket' })
  }))
  await openAccountDashboard(session, 'zh-CN')
  expect(tab.location.replace).toHaveBeenCalledWith(expect.stringContaining('#login=single-use-ticket'))
})

it('uses the current tab when popups are blocked and closes a blank tab on authentication failure', async () => {
  const assign = vi.fn()
  vi.stubGlobal('window', { open: () => null, location: { assign } })
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ token: 'single-use-ticket' })))
  await openAccountDashboard(session, 'zh-CN')
  expect(assign).toHaveBeenCalledWith(expect.stringContaining('#login=single-use-ticket'))
  const close = vi.fn()
  vi.stubGlobal('window', { open: () => ({ opener: {}, close }) })
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ code: 'UNAUTHORIZED' }, { status: 401 })))
  await expect(openAccountDashboard(session, 'zh-CN')).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  expect(close).toHaveBeenCalledOnce()
})
