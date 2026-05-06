import { lazy, Suspense } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

const PrimaryTabPanels = lazy(() =>
  import('../layout/PrimaryTabPanels').then((module) => ({ default: module.PrimaryTabPanels })),
)

function getPrimaryTabIndex(pathname: string) {
  if (pathname === '/') {
    return 0
  }

  if (pathname === '/plans') {
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
  const content = isPrimaryPath(location.pathname) ? (
    <Suspense fallback={null}>
      <PrimaryTabPanels />
    </Suspense>
  ) : (
    outlet
  )

  return (
    <div className="scrollbar-hide h-full overflow-x-hidden overflow-y-auto bg-[var(--surface)]">
      {content}
    </div>
  )
}
