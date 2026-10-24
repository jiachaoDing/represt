import { createAccountDashboardUrl } from './account-api'
import type { AccountSession } from './account-types'

export async function openAccountDashboard(session: AccountSession, language: string) {
  // Reserve the tab during the click so asynchronous authentication does not trigger popup blocking.
  const tab = window.open('about:blank', '_blank')
  if (tab) tab.opener = null
  try {
    const url = await createAccountDashboardUrl(session, language)
    if (tab && !tab.closed) tab.location.replace(url)
    else window.location.assign(url)
  } catch (error) {
    tab?.close()
    throw error
  }
}
