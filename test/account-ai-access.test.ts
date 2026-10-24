import { afterEach, expect, it, vi } from 'vitest'
import { createInstance } from 'i18next'
import { createAccountAiAccess, getAccountAiAccess, revokeAccountAiAccess } from '../src/lib/account-api'
import zh from '../src/locales/zh-CN/common'
import en from '../src/locales/en/common'

afterEach(() => { vi.unstubAllGlobals() })

it('uses the signed-in session only to create and revoke scoped AI access', async () => {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json({ token: 'rr_ai_temporary', expiresAt: '2026-10-25T00:00:00Z' }))
  vi.stubGlobal('fetch', fetchMock)
  const session = { token: 'owner-session', user: { id: 'u', email: 'user@example.test' } }
  expect((await createAccountAiAccess(session)).token).toBe('rr_ai_temporary')
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/account\/ai-access$/)
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'omit', body: '{}', headers: { Authorization: 'Bearer owner-session' } })
  await getAccountAiAccess(session)
  expect(fetchMock.mock.calls[1][1].method).toBe('GET')
  await revokeAccountAiAccess(session)
  expect(fetchMock.mock.calls[2][1].method).toBe('DELETE')
})

it('copies self-contained instructions with the temporary token and 12-hour expiry in both languages', async () => {
  const i18n = createInstance()
  await i18n.init({ lng: 'zh-CN', resources: { 'zh-CN': { common: zh }, en: { common: en } }, defaultNS: 'common', interpolation: { escapeValue: false } })
  for (const language of ['zh-CN', 'en']) {
    await i18n.changeLanguage(language)
    const instructions = i18n.t('accountSync.aiText', { url: 'https://share.represt.app/api/account/guide', token: 'rr_ai_temporary', expiresAt: '2026-10-25T00:00:00Z', dashboard: 'https://share.represt.app/account' })
    expect(instructions).toContain('Authorization: Bearer rr_ai_temporary')
    expect(instructions).toContain('2026-10-25T00:00:00Z')
    expect(instructions).toContain('12')
    expect(instructions).not.toContain('{{')
    expect(instructions).not.toContain('owner-session')
  }
})
