import type { TFunction } from 'i18next'

import { formatDuration, getRestTimerSnapshot, getRestTimerState } from './rest-timer'
import type { ScheduleExerciseDetail } from '../db/sessions'

type ExerciseHeroState = 'completed' | 'counting' | 'ready' | 'resting'

export type ExerciseHeroData = {
  label: string
  restRemainingRatio?: number
  state: ExerciseHeroState
  supporting: string
  value: string
}

export function getExerciseHeroTone(state: ExerciseHeroState) {
  if (state === 'resting') {
    return 'text-[var(--tertiary)]'
  }

  if (state === 'completed' || state === 'ready') {
    return 'text-[var(--primary)]'
  }

  return 'text-[var(--on-surface)]'
}

export function getExerciseHeroData(
  detail: ScheduleExerciseDetail | null,
  now: number,
  t: TFunction,
): ExerciseHeroData | null {
  if (!detail) {
    return null
  }

  const restSnapshot = getRestTimerSnapshot(getRestTimerState(detail.exercise), now)

  if (restSnapshot.status === 'running') {
    const restTotalMs = Math.max(1, detail.exercise.restSeconds * 1000)

    return {
      label: t('exercise.resting'),
      restRemainingRatio: Math.min(1, Math.max(0, restSnapshot.remainingMs / restTotalMs)),
      state: 'resting',
      supporting: '',
      value: formatDuration(restSnapshot.remainingSeconds),
    }
  }

  if (detail.exercise.completedSets >= detail.exercise.targetSets) {
    return {
      label: t('exercise.completed'),
      state: 'completed',
      supporting: '',
      value: `${detail.exercise.targetSets}/${detail.exercise.targetSets}`,
    }
  }

  if (restSnapshot.status === 'ready') {
    return {
      label: t('exercise.ready'),
      state: 'ready',
      supporting: '',
      value: '00:00',
    }
  }

  return {
    label: t('exercise.pending'),
    state: 'counting',
    supporting: '',
    value: t('exercise.currentSet', { setNumber: detail.exercise.completedSets + 1 }),
  }
}
