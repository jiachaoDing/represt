import { getRestTimerSnapshot, getRestTimerState } from './rest-timer'
import i18n from '../i18n'
import type { SessionStatus } from '../models/types'

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
  exercise: ExerciseProgress,
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

export function getExerciseRestLabel(exercise: ExerciseRestProgress, now: number) {
  if (deriveExerciseStatus(exercise) === 'completed') {
    return i18n.t('status.completed')
  }

  return getRestTimerSnapshot(getRestTimerState(exercise), now).label
}

type ExerciseProgress = {
  completedSets: number
  targetSets: number
  restEndsAt?: string | null
}

type ExerciseRestProgress = ExerciseProgress & {
  id: string
  lastCompletedAt: string | null
  restEndsAt: string | null
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
