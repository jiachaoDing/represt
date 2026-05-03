import { useCallback, useSyncExternalStore } from 'react'

import {
  cancelQuickTimerForegroundNotification,
  startQuickTimerForegroundNotification,
} from '../native/training-notifications'

export const QUICK_TIMER_OPTIONS = [180, 90, 60, 30] as const

export type QuickTimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export type QuickTimerState = {
  endsAt: number | null
  isFinishAcknowledged: boolean
  optionSeconds: number[]
  remainingMs: number
  selectedSeconds: number
  status: QuickTimerStatus
}

type StoredQuickTimerState = Partial<Omit<QuickTimerState, 'optionSeconds' | 'selectedSeconds'>> & {
  optionSeconds?: unknown
  selectedSeconds?: unknown
}

const STORAGE_KEY = 'trainre:exercise-quick-timer'
const DEFAULT_SECONDS = QUICK_TIMER_OPTIONS[0]
const listeners = new Set<() => void>()

function normalizeSeconds(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(5999, Math.max(1, Math.round(value)))
    : fallback
}

function getStoredOptionSeconds(value: unknown) {
  if (!Array.isArray(value) || value.length !== QUICK_TIMER_OPTIONS.length) {
    return [...QUICK_TIMER_OPTIONS]
  }

  return value.map((option, index) => normalizeSeconds(option, QUICK_TIMER_OPTIONS[index]))
}

function getFallbackState(): QuickTimerState {
  return {
    endsAt: null,
    isFinishAcknowledged: true,
    optionSeconds: [...QUICK_TIMER_OPTIONS],
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
    const optionSeconds = getStoredOptionSeconds(stored.optionSeconds)
    const selectedSeconds = normalizeSeconds(stored.selectedSeconds, optionSeconds[0])
    const remainingMs = Math.max(0, stored.remainingMs ?? selectedSeconds * 1000)

    if (stored.status === 'running' && stored.endsAt) {
      const nextRemainingMs = Math.max(0, stored.endsAt - Date.now())
      return {
        endsAt: nextRemainingMs > 0 ? stored.endsAt : null,
        isFinishAcknowledged: nextRemainingMs > 0 ? stored.isFinishAcknowledged === true : false,
        optionSeconds,
        remainingMs: nextRemainingMs,
        selectedSeconds,
        status: nextRemainingMs > 0 ? 'running' : 'finished',
      }
    }

    return {
      endsAt: null,
      isFinishAcknowledged: stored.status === 'finished' ? stored.isFinishAcknowledged === true : true,
      optionSeconds,
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

  const selectSeconds = useCallback((seconds: number) => {
    const nextSeconds = normalizeSeconds(seconds, quickTimerState.optionSeconds[0])

    emitQuickTimerState({
      endsAt: null,
      isFinishAcknowledged: true,
      optionSeconds: quickTimerState.optionSeconds,
      remainingMs: nextSeconds * 1000,
      selectedSeconds: nextSeconds,
      status: 'idle',
    })
    void cancelQuickTimerForegroundNotification()
  }, [])

  const updateOptionSeconds = useCallback((index: number, seconds: number) => {
    const previousOption = quickTimerState.optionSeconds[index]
    const nextSeconds = normalizeSeconds(seconds, previousOption ?? DEFAULT_SECONDS)
    const nextOptionSeconds = quickTimerState.optionSeconds.map((option, optionIndex) =>
      optionIndex === index ? nextSeconds : option,
    )
    const shouldUpdateSelected = previousOption === quickTimerState.selectedSeconds
    const selectedSeconds = shouldUpdateSelected ? nextSeconds : quickTimerState.selectedSeconds

    emitQuickTimerState({
      ...quickTimerState,
      optionSeconds: nextOptionSeconds,
      remainingMs:
        shouldUpdateSelected && quickTimerState.status !== 'running'
          ? selectedSeconds * 1000
          : quickTimerState.remainingMs,
      selectedSeconds,
    })
  }, [])

  const start = useCallback(() => {
    const currentRemainingMs =
      quickTimerState.status === 'running' && quickTimerState.endsAt
        ? Math.max(0, quickTimerState.endsAt - Date.now())
        : quickTimerState.remainingMs
    const nextRemainingMs = currentRemainingMs > 0 ? currentRemainingMs : quickTimerState.selectedSeconds * 1000

    const endsAt = Date.now() + nextRemainingMs

    emitQuickTimerState({
      ...quickTimerState,
      endsAt,
      isFinishAcknowledged: false,
      remainingMs: nextRemainingMs,
      status: 'running',
    })
    void startQuickTimerForegroundNotification({ endsAt })
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
    void cancelQuickTimerForegroundNotification()
  }, [])

  const reset = useCallback(() => {
    emitQuickTimerState({
      ...quickTimerState,
      endsAt: null,
      isFinishAcknowledged: true,
      remainingMs: quickTimerState.selectedSeconds * 1000,
      status: 'idle',
    })
    void cancelQuickTimerForegroundNotification()
  }, [])

  const finish = useCallback(() => {
    emitQuickTimerState({
      ...quickTimerState,
      endsAt: null,
      isFinishAcknowledged: false,
      remainingMs: 0,
      status: 'finished',
    })
  }, [])

  const acknowledgeFinish = useCallback(() => {
    const hasElapsed =
      quickTimerState.status === 'finished' ||
      (quickTimerState.status === 'running' &&
        quickTimerState.endsAt !== null &&
        quickTimerState.endsAt <= Date.now())

    if (!hasElapsed) {
      return
    }

    emitQuickTimerState({
      ...quickTimerState,
      endsAt: null,
      isFinishAcknowledged: true,
      remainingMs: 0,
      status: 'finished',
    })
    void cancelQuickTimerForegroundNotification()
  }, [])

  return {
    acknowledgeFinish,
    finish,
    pause,
    reset,
    selectSeconds,
    start,
    state,
    updateOptionSeconds,
  }
}
