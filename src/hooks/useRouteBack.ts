import { useLocation } from 'react-router-dom'

type BackNavigationState = {
  backTo: string
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

function readBackTo(state: unknown) {
  if (!state || typeof state !== 'object' || !('backTo' in state)) {
    return null
  }

  const backTo = state.backTo
  return typeof backTo === 'string' && isInternalPath(backTo) ? backTo : null
}

export function useBackLinkState(): BackNavigationState {
  const location = useLocation()

  return {
    backTo: buildLocationPath(location),
  }
}

export function useResolvedBackTo(fallbackTo?: string) {
  const location = useLocation()
  const stateBackTo = readBackTo(location.state)

  return stateBackTo ?? fallbackTo
}
