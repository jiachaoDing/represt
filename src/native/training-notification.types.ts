import type { PermissionState } from '@capacitor/core'

export type RestTimerNotificationInput = {
  exerciseId: string
  exerciseName: string
  restEndsAt: string | null
}

export type QuickTimerNotificationInput = {
  endsAt: number | null
  isPaused?: boolean
  path?: string
  remainingMs?: number
  totalSeconds?: number
}

export type LocalReminderStatus = {
  isNative: boolean
  isNotificationPermissionAvailable: boolean
  displayPermission: PermissionState | 'unknown'
  isDisplayPermissionGranted: boolean
  isTimerForegroundServiceAvailable: boolean
  isTimerForegroundChannelReady: boolean
  timerForegroundChannelImportance: number | null
  timerForegroundChannelLockscreenVisibility: number | null
  isIgnoringBatteryOptimizations: boolean | null
  canScheduleExactAlarms: boolean | null
  isExactAlarmPermissionGranted: boolean | null
}

export type RestTimerScheduleResult = {
  scheduled: boolean
  reason?: 'invalid-time' | 'permission-denied' | 'plugin-unavailable'
}

export type RestTimerPermissionPrepareResult = {
  displayPermission: PermissionState | 'unknown'
}
