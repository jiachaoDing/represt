import { formatDuration, getRestTimerSnapshot, getRestTimerState } from './rest-timer'
import type { SessionExerciseDetail } from '../db/sessions'

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
  detail: SessionExerciseDetail | null,
  now: number,
): ExerciseHeroData | null {
  if (!detail) {
    return null
  }

  const restSnapshot = getRestTimerSnapshot(getRestTimerState(detail.exercise), now)

  if (restSnapshot.status === 'running') {
    const restTotalMs = Math.max(1, detail.exercise.restSeconds * 1000)

    return {
      label: '休息中',
      restRemainingRatio: Math.min(1, Math.max(0, restSnapshot.remainingMs / restTotalMs)),
      state: 'resting',
      supporting: '倒计时结束后继续下一组。',
      value: formatDuration(restSnapshot.remainingSeconds),
    }
  }

  if (detail.exercise.completedSets >= detail.exercise.targetSets) {
    return {
      label: '动作完成',
      state: 'completed',
      supporting: '已达到目标组数。',
      value: `${detail.exercise.targetSets}/${detail.exercise.targetSets}`,
    }
  }

  if (restSnapshot.status === 'ready') {
    return {
      label: '可继续下一组',
      state: 'ready',
      supporting: '休息已结束。',
      value: '00:00',
    }
  }

  return {
    label: '待完成当前组',
    state: 'counting',
    supporting: '点击按钮记录当前组。',
    value: `第 ${detail.exercise.completedSets + 1} 组`,
  }
}
