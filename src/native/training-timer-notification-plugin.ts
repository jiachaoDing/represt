import { registerPlugin, type PermissionState, type PluginListenerHandle } from '@capacitor/core'

export type TrainingTimerType = 'rest' | 'quick'
export type TrainingTimerLaunchAction = 'completeSet' | 'quickTimerToggle' | 'quickTimerRepeat'

export type TrainingTimerNotificationLaunch = {
  path?: string | null
  timerType?: TrainingTimerType | null
  launchAction?: TrainingTimerLaunchAction | null
  exerciseId?: string | null
}

export type TrainingTimerNotificationStatus = {
  available: boolean
  channelId: string
  channelReady: boolean
  channelImportance: number | null
  channelLockscreenVisibility: number | null
  isIgnoringBatteryOptimizations: boolean
  canScheduleExactAlarms: boolean
  isExactAlarmPermissionGranted: boolean
}

export type TrainingTimerDisplayPermissionResult = {
  display: PermissionState
}

export type TrainingTimerNotificationInput = {
  id: number
  timerType: TrainingTimerType
  title: string
  body: string
  finishedTitle: string
  finishedBody: string
  endsAt: number
  path?: string
  playFinalBeeps?: boolean
  repeatFinishAlertInBackground?: boolean
  beepVolume?: number
  isPaused?: boolean
  remainingMs?: number
  totalSeconds?: number
}

export type TrainingTimerNotificationPlugin = {
  status: () => Promise<TrainingTimerNotificationStatus>
  checkDisplayPermission: () => Promise<TrainingTimerDisplayPermissionResult>
  requestDisplayPermission: () => Promise<TrainingTimerDisplayPermissionResult>
  startTimerNotification: (
    input: TrainingTimerNotificationInput,
  ) => Promise<{ started: boolean; reason?: string }>
  cancelTimerNotification: (input: { id: number }) => Promise<void>
  isIgnoringBatteryOptimizations: () => Promise<{ isIgnoringBatteryOptimizations: boolean }>
  openBatteryOptimizationSettings: () => Promise<void>
  openExactAlarmSettings: () => Promise<void>
  openTimerChannelSettings: () => Promise<void>
  requestIgnoreBatteryOptimization: () => Promise<void>
  consumeLaunchPath: () => Promise<TrainingTimerNotificationLaunch>
  addListener: (
    eventName: 'trainingTimerNotificationTapped',
    listenerFunc: (event: TrainingTimerNotificationLaunch) => void,
  ) => Promise<PluginListenerHandle>
}

export const TrainingTimerNotification =
  registerPlugin<TrainingTimerNotificationPlugin>('TrainingTimerNotification')
