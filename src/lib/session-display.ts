import { getRestTimerSnapshot, getRestTimerState } from './rest-timer'
import i18n from '../i18n'
import type { SessionExercise, SessionStatus } from '../models/types'

export type DerivedExerciseStatus = 'pending' | 'active' | 'completed'

export function getSessionStatusLabel(status: SessionStatus) {
  if (status === 'active') {
    return i18n.t('status.active')
  }

  if (status === 'completed') {
    return i18n.t('status.completed')
  }

  return i18n.t('status.pending')
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
    return i18n.t('status.active')
  }

  if (status === 'completed') {
    return i18n.t('status.completed')
  }

  return i18n.t('status.pending')
}

export function getExerciseRestLabel(exercise: SessionExercise, now: number) {
  if (deriveExerciseStatus(exercise) === 'completed') {
    return i18n.t('status.completed')
  }

  return getRestTimerSnapshot(getRestTimerState(exercise), now).label
}

export function getCompletedAtLabel(completedAt: string, locale = 'zh-CN') {
  const completedAtDate = new Date(completedAt)
  if (Number.isNaN(completedAtDate.getTime())) {
    return i18n.t('common.unknownTime')
  }

  return completedAtDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getWeightLabel(weightKg: number | null) {
  return weightKg === null ? i18n.t('exercise.missingRecord') : i18n.t('common.kg', { value: weightKg })
}

export function getRepsLabel(reps: number | null) {
  return reps === null ? i18n.t('exercise.missingRecord') : i18n.t('common.reps', { value: reps })
}
