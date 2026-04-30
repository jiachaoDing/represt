import type { RestTimerState } from '../models/types'

type RestTimerExercise = {
  id: string
  lastCompletedAt: string | null
  restEndsAt: string | null
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getRestEndsAt(startedAt: string, restSeconds: number) {
  const startedAtMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedAtMs)) {
    return null
  }

  return new Date(startedAtMs + Math.max(0, restSeconds) * 1000).toISOString()
}

export function getRestTimerState(
  exercise: Pick<RestTimerExercise, 'id' | 'lastCompletedAt' | 'restEndsAt'>,
) {
  if (!exercise.lastCompletedAt || !exercise.restEndsAt) {
    return {
      exerciseId: exercise.id,
      status: 'idle' as const,
      startedAt: null,
      endsAt: null,
    } satisfies RestTimerState
  }

  return {
    exerciseId: exercise.id,
    status: 'running' as const,
    startedAt: exercise.lastCompletedAt,
    endsAt: exercise.restEndsAt,
  } satisfies RestTimerState
}

export function getRestTimerSnapshot(timer: RestTimerState, now = Date.now()) {
  if (timer.status === 'idle' || !timer.endsAt) {
    return {
      status: 'idle' as const,
      remainingSeconds: 0,
      remainingMs: 0,
      label: 'idle',
    }
  }

  const remainingMs = new Date(timer.endsAt).getTime() - now

  if (remainingMs <= 0) {
    return {
      status: 'ready' as const,
      remainingSeconds: 0,
      remainingMs: 0,
      label: 'ready',
    }
  }

  const remainingSeconds = Math.ceil(remainingMs / 1000)

  return {
    status: 'running' as const,
    remainingSeconds,
    remainingMs,
    label: `remaining ${formatDuration(remainingSeconds)}`,
  }
}
