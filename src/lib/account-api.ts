import { getPlanShareApiBaseUrl } from './plan-share-api'
import type { AccountCloudState, AccountSession, AccountSyncState } from './account-types'
import type { FullDataBackup } from './full-data-backup'

const sessionKey = 'trainre.accountSession.v1'

export class AccountApiError extends Error {
  readonly code: string
  constructor(code: string) { super(code); this.code = code }
}

export function readAccountSession(): AccountSession | null {
  try { localStorage.removeItem('trainre.accountAiAccess.v1') } catch { /* Cleanup must not block account sign-in. */ }
  try {
    const value = JSON.parse(localStorage.getItem(sessionKey) ?? 'null') as AccountSession | null
    return value && typeof value.token === 'string' && typeof value.user?.id === 'string' &&
      typeof value.user.email === 'string' ? value : null
  } catch { return null }
}

async function request<T>(path: string, method: string, body?: unknown, session?: AccountSession): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${getPlanShareApiBaseUrl()}${path}`, { method, credentials: 'omit',
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch { throw new AccountApiError('NETWORK') }
  const data = await response.json().catch(() => null) as T & { code?: string }
  if (!response.ok) throw new AccountApiError(data?.code ?? (response.status === 401 ? 'UNAUTHORIZED' : 'REQUEST_FAILED'))
  if (!data) throw new AccountApiError('INVALID_RESPONSE')
  return data
}

export async function signInAccount(email: string, password: string, register: boolean) {
  const result = await request<AccountSession>(`/api/auth/${register ? 'sign-up' : 'sign-in'}/email`, 'POST', {
    email: email.trim(), password, ...(register ? { name: email.trim().split('@')[0] } : {}),
  })
  if (!result.token || !result.user?.id) throw new AccountApiError('INVALID_RESPONSE')
  const session: AccountSession = { token: result.token, user: { id: result.user.id, email: result.user.email } }
  localStorage.setItem(sessionKey, JSON.stringify(session))
  return session
}

export async function signOutAccount(session: AccountSession) {
  try { await request('/api/auth/sign-out', 'POST', {}, session) }
  finally { localStorage.removeItem(sessionKey) }
}

export function fetchAccountPlans(session: AccountSession) {
  return request<AccountCloudState>('/api/account/plans', 'GET', undefined, session)
}

export function fetchAccountData(session: AccountSession, version: number) {
  return request<{ version: number; syncedAt: string; backup: FullDataBackup }>(`/api/account/data?version=${version}`, 'GET', undefined, session)
}

export function uploadAccountData(session: AccountSession, pending: NonNullable<AccountSyncState['pending']>) {
  return request<{ version: number; syncedAt: string }>('/api/account/sync', 'POST', {
    version: pending.version, operationId: pending.operationId, backup: pending.backup,
  }, session)
}

export function getAccountMcpUrl() { return `${getPlanShareApiBaseUrl()}/mcp` }

export function getAccountDashboardUrl() { return `${getPlanShareApiBaseUrl()}/account` }

export async function createAccountDashboardUrl(session: AccountSession, language: string) {
  const { token } = await request<{ token: string }>('/api/auth/one-time-token/generate', 'GET', undefined, session)
  if (!token) throw new AccountApiError('INVALID_RESPONSE')
  const url = new URL(getAccountDashboardUrl())
  url.searchParams.set('lang', language)
  url.hash = new URLSearchParams({ login: token }).toString()
  return url.toString()
}
