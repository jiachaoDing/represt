import type { PermissionState } from '@capacitor/core'

export type RestTimerNotificationInput = {
  exerciseId: string
  exerciseName: string
  restEndsAt: string | null
}

export type ExactAlarmPermission = 'granted' | 'denied' | 'unknown'

export type LocalReminderStatus = {
  isNative: boolean
  isLocalNotificationsAvailable: boolean
  displayPermission: PermissionState | 'unknown'
  isDisplayPermissionGranted: boolean
  exactAlarmPermission: ExactAlarmPermission
  hasTriedRestTimerChannel: boolean
  isRestTimerChannelReady: boolean
  restTimerChannelImportance: number | null
  restTimerChannelVibration: boolean | null
  restTimerChannelSound: string | null
  isStrongReminderAvailable: boolean
  isStrongReminderChannelReady: boolean
  strongReminderCanScheduleExactAlarms: boolean | null
  strongReminderCanUseFullScreenIntent: boolean | null
  strongReminderChannelSound: string | null
}

export type RestTimerScheduleResult = {
  scheduled: boolean
  reason?: 'invalid-time' | 'permission-denied' | 'plugin-unavailable'
  exactAlarmPermission: ExactAlarmPermission
}

export type RestTimerPermissionPrepareResult = {
  displayPermission: PermissionState | 'unknown'
  exactAlarmPermission: ExactAlarmPermission
}
