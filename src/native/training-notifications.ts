import { LocalNotifications } from '@capacitor/local-notifications'
import type { PermissionState } from '@capacitor/core'

import { isNativeApp, isNativePluginAvailable } from './capacitor-platform'

const REST_TIMER_CHANNEL_ID = 'trainre-rest-timer'
const REST_TIMER_NOTIFICATION_GROUP = 'trainre-rest-timers'
const TEST_REST_TIMER_NOTIFICATION_ID = 910001

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
}

export type RestTimerScheduleResult = {
  scheduled: boolean
  reason?: 'invalid-time' | 'permission-denied' | 'plugin-unavailable'
  exactAlarmPermission: ExactAlarmPermission
}

let isChannelReady = false
let hasTriedRestTimerChannel = false

function getRestTimerNotificationId(exerciseId: string) {
  let hash = 0

  for (let index = 0; index < exerciseId.length; index += 1) {
    hash = (hash * 31 + exerciseId.charCodeAt(index)) | 0
  }

  return Math.abs(hash) + 10000
}

async function ensureNotificationPermission() {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return false
  }

  const currentPermission = await LocalNotifications.checkPermissions()
  if (currentPermission.display === 'granted') {
    return true
  }

  const requestedPermission = await LocalNotifications.requestPermissions()
  return requestedPermission.display === 'granted'
}

async function checkDisplayPermission(): Promise<PermissionState | 'unknown'> {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return 'unknown'
  }

  try {
    const permission = await LocalNotifications.checkPermissions()
    return permission.display
  } catch (permissionError) {
    console.warn(permissionError)
    return 'unknown'
  }
}

async function checkExactAlarmPermission(): Promise<ExactAlarmPermission> {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return 'unknown'
  }

  try {
    const setting = await LocalNotifications.checkExactNotificationSetting()
    if (setting.exact_alarm === 'granted' || setting.exact_alarm === 'denied') {
      return setting.exact_alarm
    }
  } catch (exactAlarmError) {
    console.warn(exactAlarmError)
  }

  return 'unknown'
}

async function ensureRestTimerChannel() {
  if (isChannelReady) {
    return
  }

  hasTriedRestTimerChannel = true
  try {
    await LocalNotifications.createChannel({
      id: REST_TIMER_CHANNEL_ID,
      name: '训练间歇提醒',
      description: '动作休息结束时提醒继续训练',
      // Android 8+ channel importance, sound and vibration are user-owned after first creation.
      importance: 4,
      visibility: 1,
      vibration: true,
    })

    isChannelReady = true
  } catch (channelError) {
    console.warn(channelError)
  }
}

async function getRestTimerChannelStatus() {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return {
      isReady: false,
      importance: null,
      vibration: null,
      sound: null,
    }
  }

  try {
    const result = await LocalNotifications.listChannels()
    const channel = result.channels.find(({ id }) => id === REST_TIMER_CHANNEL_ID)

    return {
      isReady: Boolean(channel) || isChannelReady,
      importance: channel?.importance ?? null,
      vibration: channel?.vibration ?? null,
      sound: typeof channel?.sound === 'string' ? channel.sound : null,
    }
  } catch (channelError) {
    console.warn(channelError)
    return {
      isReady: isChannelReady,
      importance: null,
      vibration: null,
      sound: null,
    }
  }
}

export async function getLocalReminderStatus(): Promise<LocalReminderStatus> {
  const isLocalNotificationsAvailable = isNativePluginAvailable('LocalNotifications')

  if (isLocalNotificationsAvailable) {
    await ensureRestTimerChannel()
  }

  const [displayPermission, exactAlarmPermission, channelStatus] = await Promise.all([
    checkDisplayPermission(),
    checkExactAlarmPermission(),
    getRestTimerChannelStatus(),
  ])

  return {
    isNative: isNativeApp(),
    isLocalNotificationsAvailable,
    displayPermission,
    isDisplayPermissionGranted: displayPermission === 'granted',
    exactAlarmPermission,
    hasTriedRestTimerChannel,
    isRestTimerChannelReady: channelStatus.isReady,
    restTimerChannelImportance: channelStatus.importance,
    restTimerChannelVibration: channelStatus.vibration,
    restTimerChannelSound: channelStatus.sound,
  }
}

export async function requestLocalReminderPermission() {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return 'unknown' satisfies PermissionState | 'unknown'
  }

  try {
    const permission = await LocalNotifications.requestPermissions()
    return permission.display
  } catch (permissionError) {
    console.warn(permissionError)
    return 'unknown' satisfies PermissionState | 'unknown'
  }
}

export async function openExactAlarmSettings() {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return 'unknown' satisfies ExactAlarmPermission
  }

  try {
    const setting = await LocalNotifications.changeExactNotificationSetting()
    if (setting.exact_alarm === 'granted' || setting.exact_alarm === 'denied') {
      return setting.exact_alarm
    }
  } catch (exactAlarmError) {
    console.warn(exactAlarmError)
  }

  return 'unknown' satisfies ExactAlarmPermission
}

export async function openAppNotificationSettings() {
  return {
    didOpen: false,
    message: '当前 Capacitor 插件未提供直接打开 App 通知设置的能力，请从系统设置里进入。',
  }
}

export async function cancelRestTimerNotification(exerciseId: string) {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return
  }

  await LocalNotifications.cancel({
    notifications: [{ id: getRestTimerNotificationId(exerciseId) }],
  })
}

export async function scheduleRestTimerNotification(
  input: RestTimerNotificationInput,
): Promise<RestTimerScheduleResult> {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return { scheduled: false, reason: 'plugin-unavailable', exactAlarmPermission: 'unknown' }
  }

  if (!input.restEndsAt) {
    await cancelRestTimerNotification(input.exerciseId)
    return { scheduled: false, reason: 'invalid-time', exactAlarmPermission: 'unknown' }
  }

  const notifyAt = new Date(input.restEndsAt)
  if (Number.isNaN(notifyAt.getTime()) || notifyAt.getTime() <= Date.now()) {
    await cancelRestTimerNotification(input.exerciseId)
    return { scheduled: false, reason: 'invalid-time', exactAlarmPermission: 'unknown' }
  }

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) {
    return {
      scheduled: false,
      reason: 'permission-denied',
      exactAlarmPermission: await checkExactAlarmPermission(),
    }
  }

  await ensureRestTimerChannel()
  const exactAlarmPermission = await checkExactAlarmPermission()
  await cancelRestTimerNotification(input.exerciseId)

  await LocalNotifications.schedule({
    notifications: [
      {
        id: getRestTimerNotificationId(input.exerciseId),
        title: '休息结束',
        body: `${input.exerciseName} 可以继续下一组`,
        schedule: {
          at: notifyAt,
          allowWhileIdle: true,
        },
        channelId: REST_TIMER_CHANNEL_ID,
        group: REST_TIMER_NOTIFICATION_GROUP,
        autoCancel: true,
        extra: {
          type: 'exercise-rest-ended',
          exerciseId: input.exerciseId,
          path: `/exercise/${input.exerciseId}`,
        },
      },
    ],
  })

  return { scheduled: true, exactAlarmPermission }
}

export async function scheduleRestTimerTestNotification(): Promise<RestTimerScheduleResult> {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return { scheduled: false, reason: 'plugin-unavailable', exactAlarmPermission: 'unknown' }
  }

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) {
    return {
      scheduled: false,
      reason: 'permission-denied',
      exactAlarmPermission: await checkExactAlarmPermission(),
    }
  }

  await ensureRestTimerChannel()
  const exactAlarmPermission = await checkExactAlarmPermission()
  await LocalNotifications.cancel({
    notifications: [{ id: TEST_REST_TIMER_NOTIFICATION_ID }],
  })

  await LocalNotifications.schedule({
    notifications: [
      {
        id: TEST_REST_TIMER_NOTIFICATION_ID,
        title: '训练提醒测试',
        body: '如果看到这条提醒，休息计时提醒可以显示。',
        schedule: {
          at: new Date(Date.now() + 10_000),
          allowWhileIdle: true,
        },
        channelId: REST_TIMER_CHANNEL_ID,
        group: REST_TIMER_NOTIFICATION_GROUP,
        autoCancel: true,
        extra: {
          type: 'rest-timer-test',
        },
      },
    ],
  })

  return { scheduled: true, exactAlarmPermission }
}
