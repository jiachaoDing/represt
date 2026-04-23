import { formatDuration, getRestTimerSnapshot, getRestTimerState } from './rest-timer'
import type { SessionExercise, SessionExerciseStatus, SessionStatus } from '../models/types'

export function getSessionStatusLabel(status: SessionStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

export function getExerciseStatusLabel(status: SessionExerciseStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

export function getExerciseRestLabel(exercise: SessionExercise, now: number) {
  if (exercise.status === 'completed') {
    return '已完成'
  }

  return getRestTimerSnapshot(getRestTimerState(exercise), now).label
}

export function getCurrentSetDurationLabel(startedAt: string | null, now: number) {
  if (!startedAt) {
    return '00:00'
  }

  const startedAtMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedAtMs)) {
    return '00:00'
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAtMs) / 1000))
  return formatDuration(elapsedSeconds)
}

export function getSessionDurationSeconds(
  startedAt: string | null,
  endedAt: string | null,
  now: number,
) {
  if (!startedAt) {
    return null
  }

  const startedAtMs = new Date(startedAt).getTime()
  const endedAtMs = endedAt ? new Date(endedAt).getTime() : now

  if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs)) {
    return null
  }

  return Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000))
}

export function getWeightLabel(weightKg: number | null) {
  return weightKg === null ? '未补录' : `${weightKg} kg`
}

export function getRepsLabel(reps: number | null) {
  return reps === null ? '未补录' : `${reps} 次`
}
