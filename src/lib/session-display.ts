import { getRestTimerSnapshot, getRestTimerState } from './rest-timer'
import type { SessionExercise, SessionStatus } from '../models/types'

export type DerivedExerciseStatus = 'pending' | 'active' | 'completed'

export function getSessionStatusLabel(status: SessionStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

export function deriveExerciseStatus(
  exercise: Pick<SessionExercise, 'completedSets' | 'targetSets'> & Partial<Pick<SessionExercise, 'restEndsAt'>>,
): DerivedExerciseStatus {
  if (exercise.completedSets >= exercise.targetSets) {
    const restEndsAtMs = exercise.restEndsAt ? new Date(exercise.restEndsAt).getTime() : 0
    if (restEndsAtMs > Date.now()) {
      return 'active'
    }

    return 'completed'
  }

  if (exercise.completedSets > 0) {
    return 'active'
  }

  return 'pending'
}

export function getExerciseStatusLabel(status: DerivedExerciseStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

export function getExerciseRestLabel(exercise: SessionExercise, now: number) {
  if (deriveExerciseStatus(exercise) === 'completed') {
    return '已完成'
  }

  return getRestTimerSnapshot(getRestTimerState(exercise), now).label
}

export function getCompletedAtLabel(completedAt: string) {
  const completedAtDate = new Date(completedAt)
  if (Number.isNaN(completedAtDate.getTime())) {
    return '时间未知'
  }

  return completedAtDate.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getWeightLabel(weightKg: number | null) {
  return weightKg === null ? '未补录' : `${weightKg} kg`
}

export function getRepsLabel(reps: number | null) {
  return reps === null ? '未补录' : `${reps} 次`
}
