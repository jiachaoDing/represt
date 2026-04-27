import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useBackLinkState } from '../../hooks/useRouteBack'

export function SettingsButton() {
  const { t } = useTranslation()
  const backLinkState = useBackLinkState()

  return (
    <Link
      to="/settings"
      state={backLinkState}
      viewTransition
      className="flex h-11 w-11 items-center justify-center text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
      aria-label={t('settings.title')}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-1.02-1.56 1.7 1.7 0 0 0-1.89.34l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.07A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 3.6 1.7 1.7 0 0 0 10 2.07V2a2 2 0 1 1 4 0v.07A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.07A1.7 1.7 0 0 0 19.4 15Z" />
      </svg>
    </Link>
  )
}
