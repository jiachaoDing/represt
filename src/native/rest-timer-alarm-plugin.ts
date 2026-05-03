import { registerPlugin } from '@capacitor/core'

export type RestTimerAlarmStatus = {
  available: boolean
  channelId: string
  canScheduleExactAlarms: boolean
  canUseFullScreenIntent: boolean
  channelReady: boolean
  channelImportance: number | null
  channelVibration: boolean | null
  channelSound: string | null
}

export type RestTimerAlarmPlugin = {
  status: () => Promise<RestTimerAlarmStatus>
  schedule: (input: {
    id: number
    title: string
    body: string
    triggerAt: number
    path?: string
  }) => Promise<{ scheduled: boolean; canScheduleExactAlarms?: boolean }>
  cancel: (input: { id: number }) => Promise<void>
  openExactAlarmSettings: () => Promise<void>
  openChannelSettings: () => Promise<void>
}

export const RestTimerAlarm = registerPlugin<RestTimerAlarmPlugin>('RestTimerAlarm')
