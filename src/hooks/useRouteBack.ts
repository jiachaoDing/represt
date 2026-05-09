import { useLocation } from 'react-router-dom'

type BackNavigationState = {
  backTo: string
  backState?: unknown
}

function buildLocationPath({
  hash,
  pathname,
  search,
}: Pick<Location, 'hash' | 'pathname' | 'search'>) {
  return `${pathname}${search}${hash}`
}

function isInternalPath(value: string) {
  return value.startsWith('/') && !value.startsWith('//')
}

function readBackNavigation(state: unknown): BackNavigationState | null {
  if (!state || typeof state !== 'object' || !('backTo' in state)) {
    return null
  }

  const backTo = state.backTo
  if (typeof backTo !== 'string' || !isInternalPath(backTo)) {
    return null
  }

  const backState = 'backState' in state ? state.backState : undefined
  return backState === undefined ? { backTo } : { backTo, backState }
}

export function useBackLinkState(): BackNavigationState {
  const location = useLocation()

  return {
    backTo: buildLocationPath(location),
    backState: location.state ?? undefined,
  }
}

export function useResolvedBackTo(fallbackTo?: string) {
  const location = useLocation()
  const stateBackNavigation = readBackNavigation(location.state)

  if (stateBackNavigation) {
    return stateBackNavigation
  }

  return fallbackTo ? { backTo: fallbackTo } : null
}
