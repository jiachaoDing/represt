import type { PermissionState } from '@capacitor/core'

export type RestTimerNotificationInput = {
  exerciseId: string
  exerciseName: string
  restEndsAt: string | null
}

export type QuickTimerNotificationInput = {
  endsAt: number | null
  isPaused?: boolean
  remainingMs?: number
  totalSeconds?: number
}

export type LocalReminderStatus = {
  isNative: boolean
  isLocalNotificationsAvailable: boolean
  displayPermission: PermissionState | 'unknown'
  isDisplayPermissionGranted: boolean
  isTimerForegroundServiceAvailable: boolean
  isTimerForegroundChannelReady: boolean
  timerForegroundChannelImportance: number | null
  isIgnoringBatteryOptimizations: boolean | null
}

export type RestTimerScheduleResult = {
  scheduled: boolean
  reason?: 'invalid-time' | 'permission-denied' | 'plugin-unavailable'
}

export type RestTimerPermissionPrepareResult = {
  displayPermission: PermissionState | 'unknown'
}
