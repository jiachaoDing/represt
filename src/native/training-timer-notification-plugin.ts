import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type TrainingTimerType = 'rest' | 'quick'

export type TrainingTimerNotificationStatus = {
  available: boolean
  channelId: string
  channelReady: boolean
  channelImportance: number | null
  isIgnoringBatteryOptimizations: boolean
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
}

export type TrainingTimerNotificationPlugin = {
  status: () => Promise<TrainingTimerNotificationStatus>
  startTimerNotification: (
    input: TrainingTimerNotificationInput,
  ) => Promise<{ started: boolean; reason?: string }>
  cancelTimerNotification: (input: { id: number }) => Promise<void>
  isIgnoringBatteryOptimizations: () => Promise<{ isIgnoringBatteryOptimizations: boolean }>
  openBatteryOptimizationSettings: () => Promise<void>
  requestIgnoreBatteryOptimization: () => Promise<void>
  consumeLaunchPath: () => Promise<{ path?: string | null; timerType?: TrainingTimerType | null }>
  addListener: (
    eventName: 'trainingTimerNotificationTapped',
    listenerFunc: (event: { path?: string | null; timerType?: TrainingTimerType | null }) => void,
  ) => Promise<PluginListenerHandle>
}

export const TrainingTimerNotification =
  registerPlugin<TrainingTimerNotificationPlugin>('TrainingTimerNotification')
