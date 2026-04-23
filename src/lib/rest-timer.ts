import type { RestTimerState } from '../models/types'

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getRestTimerSnapshot(timer: RestTimerState, now = Date.now()) {
  if (timer.status === 'idle' || !timer.endsAt) {
    return {
      status: 'idle' as const,
      remainingSeconds: 0,
      label: '未启动',
    }
  }

  const remainingMs = new Date(timer.endsAt).getTime() - now

  if (remainingMs <= 0) {
    return {
      status: 'ready' as const,
      remainingSeconds: 0,
      label: '可继续下一组',
    }
  }

  const remainingSeconds = Math.ceil(remainingMs / 1000)

  return {
    status: 'running' as const,
    remainingSeconds,
    label: `剩余 ${formatDuration(remainingSeconds)}`,
  }
}
