import { useCallback, useSyncExternalStore } from 'react'

export const QUICK_TIMER_OPTIONS = [180, 90, 60, 30] as const

export type QuickTimerSeconds = (typeof QUICK_TIMER_OPTIONS)[number]
export type QuickTimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export type QuickTimerState = {
  endsAt: number | null
  remainingMs: number
  selectedSeconds: QuickTimerSeconds
  status: QuickTimerStatus
}

type StoredQuickTimerState = Partial<Omit<QuickTimerState, 'selectedSeconds'>> & {
  selectedSeconds?: unknown
}

const STORAGE_KEY = 'trainre:exercise-quick-timer'
const DEFAULT_SECONDS = QUICK_TIMER_OPTIONS[0]
const listeners = new Set<() => void>()

function getStoredSelectedSeconds(value: unknown): QuickTimerSeconds {
  return typeof value === 'number' && (QUICK_TIMER_OPTIONS as readonly number[]).includes(value)
    ? value as QuickTimerSeconds
    : DEFAULT_SECONDS
}

function getFallbackState(): QuickTimerState {
  return {
    endsAt: null,
    remainingMs: DEFAULT_SECONDS * 1000,
    selectedSeconds: DEFAULT_SECONDS,
    status: 'idle',
  }
}

function readStoredState(): QuickTimerState {
  if (typeof window === 'undefined') {
    return getFallbackState()
  }

  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY)
    if (!rawValue) {
      return getFallbackState()
    }

    const stored = JSON.parse(rawValue) as StoredQuickTimerState
    const selectedSeconds = getStoredSelectedSeconds(stored.selectedSeconds)
    const remainingMs = Math.max(0, stored.remainingMs ?? selectedSeconds * 1000)

    if (stored.status === 'running' && stored.endsAt) {
      const nextRemainingMs = Math.max(0, stored.endsAt - Date.now())
      return {
        endsAt: nextRemainingMs > 0 ? stored.endsAt : null,
        remainingMs: nextRemainingMs,
        selectedSeconds,
        status: nextRemainingMs > 0 ? 'running' : 'finished',
      }
    }

    return {
      endsAt: null,
      remainingMs,
      selectedSeconds,
      status: stored.status === 'paused' || stored.status === 'finished' ? stored.status : 'idle',
    }
  } catch {
    return getFallbackState()
  }
}

let quickTimerState = readStoredState()

function writeStoredState(nextState: QuickTimerState) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
}

function emitQuickTimerState(nextState: QuickTimerState) {
  quickTimerState = nextState
  writeStoredState(nextState)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return quickTimerState
}

export function useQuickTimer() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const selectSeconds = useCallback((seconds: QuickTimerSeconds) => {
    emitQuickTimerState({
      endsAt: null,
      remainingMs: seconds * 1000,
      selectedSeconds: seconds,
      status: 'idle',
    })
  }, [])

  const start = useCallback(() => {
    const currentRemainingMs =
      quickTimerState.status === 'running' && quickTimerState.endsAt
        ? Math.max(0, quickTimerState.endsAt - Date.now())
        : quickTimerState.remainingMs
    const nextRemainingMs = currentRemainingMs > 0 ? currentRemainingMs : quickTimerState.selectedSeconds * 1000

    emitQuickTimerState({
      ...quickTimerState,
      endsAt: Date.now() + nextRemainingMs,
      remainingMs: nextRemainingMs,
      status: 'running',
    })
  }, [])

  const pause = useCallback(() => {
    if (quickTimerState.status !== 'running' || !quickTimerState.endsAt) {
      return
    }

    emitQuickTimerState({
      ...quickTimerState,
      endsAt: null,
      remainingMs: Math.max(0, quickTimerState.endsAt - Date.now()),
      status: 'paused',
    })
  }, [])

  const reset = useCallback(() => {
    emitQuickTimerState({
      ...quickTimerState,
      endsAt: null,
      remainingMs: quickTimerState.selectedSeconds * 1000,
      status: 'idle',
    })
  }, [])

  const finish = useCallback(() => {
    emitQuickTimerState({
      ...quickTimerState,
      endsAt: null,
      remainingMs: 0,
      status: 'finished',
    })
  }, [])

  return {
    finish,
    pause,
    reset,
    selectSeconds,
    start,
    state,
  }
}
