import { useLocation, useOutlet } from 'react-router-dom'

import { PrimaryTabPanels } from '../layout/PrimaryTabPanels'

function getPrimaryTabIndex(pathname: string) {
  if (pathname === '/') {
    return 0
  }

  if (pathname === '/templates') {
    return 1
  }

  if (pathname === '/summary') {
    return 2
  }

  return -1
}

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

function isPrimaryPath(pathname: string) {
  return getPrimaryTabIndex(normalizePathname(pathname)) !== -1
}

export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const content = isPrimaryPath(location.pathname) ? <PrimaryTabPanels /> : outlet

  return (
    <div className="scrollbar-hide h-full overflow-x-hidden overflow-y-auto bg-[var(--surface)]">
      {content}
    </div>
  )
}
