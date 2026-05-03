import { LocalNotifications } from '@capacitor/local-notifications'
import type { PermissionState } from '@capacitor/core'

import i18n from '../i18n'
import { isNativeApp, isNativePluginAvailable } from './capacitor-platform'
import { RestTimerAlarm, type RestTimerAlarmStatus } from './rest-timer-alarm-plugin'
import {
  TrainingTimerNotification,
  type TrainingTimerNotificationStatus,
} from './training-timer-notification-plugin'
import type {
  ExactAlarmPermission,
  LocalReminderStatus,
  QuickTimerNotificationInput,
  RestTimerNotificationInput,
  RestTimerPermissionPrepareResult,
  RestTimerScheduleResult,
} from './training-notification.types'

export type {
  ExactAlarmPermission,
  LocalReminderStatus,
  QuickTimerNotificationInput,
  RestTimerNotificationInput,
  RestTimerPermissionPrepareResult,
  RestTimerScheduleResult,
} from './training-notification.types'

const OLD_REST_TIMER_CHANNEL_ID = 'trainre-rest-timer'
const REST_TIMER_CHANNEL_ID = 'trainre-rest-timer-alarm-v3'
const REST_TIMER_FALLBACK_CHANNEL_ID = 'trainre-rest-timer-local'
const REST_TIMER_NOTIFICATION_GROUP = 'trainre-rest-timers'
const TEST_REST_TIMER_NOTIFICATION_ID = 910001
const LEGACY_REST_TIMER_FOREGROUND_NOTIFICATION_ID = 920001
const QUICK_TIMER_FOREGROUND_NOTIFICATION_ID = 920002

let isChannelReady = false
let hasTriedRestTimerChannel = false

function getRestTimerNotificationId(exerciseId: string) {
  let hash = 0

  for (let index = 0; index < exerciseId.length; index += 1) {
    hash = (hash * 31 + exerciseId.charCodeAt(index)) | 0
  }

  return Math.abs(hash) + 10000
}

function isRestTimerAlarmAvailable() {
  return isNativeApp()
}

async function getStrongReminderStatus(): Promise<RestTimerAlarmStatus | null> {
  if (!isRestTimerAlarmAvailable()) {
    return null
  }

  try {
    return await RestTimerAlarm.status()
  } catch (alarmStatusError) {
    console.warn(alarmStatusError)
    return null
  }
}

function isTimerForegroundNotificationAvailable() {
  return isNativePluginAvailable('TrainingTimerNotification')
}

async function getTimerForegroundStatus(): Promise<TrainingTimerNotificationStatus | null> {
  if (!isTimerForegroundNotificationAvailable()) {
    return null
  }

  try {
    return await TrainingTimerNotification.status()
  } catch (timerStatusError) {
    console.warn(timerStatusError)
    return null
  }
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

  const strongStatus = await getStrongReminderStatus()
  if (strongStatus?.canScheduleExactAlarms === true) {
    return 'granted'
  }
  if (strongStatus?.canScheduleExactAlarms === false) {
    return 'denied'
  }

  return 'unknown'
}

async function ensureRestTimerChannel() {
  if (isChannelReady) {
    return
  }

  hasTriedRestTimerChannel = true
  const strongStatus = await getStrongReminderStatus()
  if (strongStatus?.channelReady) {
    isChannelReady = true
    return
  }

  try {
    try {
      await LocalNotifications.deleteChannel({ id: OLD_REST_TIMER_CHANNEL_ID })
    } catch (deleteOldChannelError) {
      console.warn(deleteOldChannelError)
    }

    await LocalNotifications.createChannel({
      id: REST_TIMER_FALLBACK_CHANNEL_ID,
      name: i18n.t('notification.channelName'),
      description: i18n.t('notification.channelDescription'),
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
    const channel = result.channels.find(
      ({ id }) => id === REST_TIMER_CHANNEL_ID || id === REST_TIMER_FALLBACK_CHANNEL_ID,
    )

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

  const [displayPermission, exactAlarmPermission, channelStatus, strongStatus, timerForegroundStatus] =
    await Promise.all([
    checkDisplayPermission(),
    checkExactAlarmPermission(),
    getRestTimerChannelStatus(),
    getStrongReminderStatus(),
    getTimerForegroundStatus(),
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
    isStrongReminderAvailable: Boolean(strongStatus?.available),
    isStrongReminderChannelReady: Boolean(strongStatus?.channelReady),
    strongReminderCanScheduleExactAlarms: strongStatus?.canScheduleExactAlarms ?? null,
    strongReminderCanUseFullScreenIntent: strongStatus?.canUseFullScreenIntent ?? null,
    strongReminderChannelSound: strongStatus?.channelSound ?? null,
    isTimerForegroundServiceAvailable: Boolean(timerForegroundStatus?.available),
    isTimerForegroundChannelReady: Boolean(timerForegroundStatus?.channelReady),
    timerForegroundChannelImportance: timerForegroundStatus?.channelImportance ?? null,
    isIgnoringBatteryOptimizations:
      timerForegroundStatus?.isIgnoringBatteryOptimizations ?? null,
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
  if (isRestTimerAlarmAvailable()) {
    try {
      await RestTimerAlarm.openExactAlarmSettings()
      return checkExactAlarmPermission()
    } catch (exactAlarmError) {
      console.warn(exactAlarmError)
    }
  }

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

export async function prepareRestTimerReminderPermissions(): Promise<RestTimerPermissionPrepareResult> {
  const displayPermission = await requestLocalReminderPermission()

  return {
    displayPermission,
    exactAlarmPermission: await checkExactAlarmPermission(),
  }
}

export async function openStrongReminderSettings() {
  if (!isRestTimerAlarmAvailable()) {
    return {
      didOpen: false,
      message: i18n.t('notification.strongSettingsUnavailable'),
    }
  }

  try {
    await RestTimerAlarm.openChannelSettings()
    return {
      didOpen: true,
      message: i18n.t('notification.strongSettingsOpened'),
    }
  } catch (settingsError) {
    console.warn(settingsError)
    return {
      didOpen: false,
      message: i18n.t('notification.strongSettingsFailed'),
    }
  }
}

export async function openBatteryOptimizationSettings() {
  if (!isTimerForegroundNotificationAvailable()) {
    return {
      didOpen: false,
      message: i18n.t('notification.batterySettingsUnavailable'),
    }
  }

  try {
    await TrainingTimerNotification.openBatteryOptimizationSettings()
    return {
      didOpen: true,
      message: i18n.t('notification.batterySettingsOpened'),
    }
  } catch (settingsError) {
    console.warn(settingsError)
    return {
      didOpen: false,
      message: i18n.t('notification.batterySettingsFailed'),
    }
  }
}

export async function openAppNotificationSettings() {
  return {
    didOpen: false,
    message: i18n.t('notification.appSettingsUnavailable'),
  }
}

export async function cancelRestTimerNotification(exerciseId: string) {
  const notificationId = getRestTimerNotificationId(exerciseId)

  if (isTimerForegroundNotificationAvailable()) {
    try {
      await TrainingTimerNotification.cancelTimerNotification({
        id: notificationId,
      })
      await TrainingTimerNotification.cancelTimerNotification({
        id: LEGACY_REST_TIMER_FOREGROUND_NOTIFICATION_ID,
      })
    } catch (timerCancelError) {
      console.warn(timerCancelError)
    }
  }

  if (isRestTimerAlarmAvailable()) {
    try {
      await RestTimerAlarm.cancel({ id: notificationId })
      await RestTimerAlarm.cancel({ id: LEGACY_REST_TIMER_FOREGROUND_NOTIFICATION_ID })
    } catch (alarmCancelError) {
      console.warn(alarmCancelError)
    }
  }

  if (isNativePluginAvailable('LocalNotifications')) {
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }, { id: LEGACY_REST_TIMER_FOREGROUND_NOTIFICATION_ID }],
    })
  }
}

export async function cancelRestTimerForegroundNotification() {
  if (!isTimerForegroundNotificationAvailable()) {
    return
  }

  try {
    await TrainingTimerNotification.cancelTimerNotification({
      id: LEGACY_REST_TIMER_FOREGROUND_NOTIFICATION_ID,
    })
  } catch (timerCancelError) {
    console.warn(timerCancelError)
  }
}

async function scheduleStrongRestTimerAlarm({
  id,
  title,
  body,
  notifyAt,
  path,
}: {
  id: number
  title: string
  body: string
  notifyAt: Date
  path?: string
}) {
  if (!isRestTimerAlarmAvailable()) {
    return false
  }

  try {
    const status = await getStrongReminderStatus()
    if (!status?.canScheduleExactAlarms) {
      return false
    }

    const result = await RestTimerAlarm.schedule({
      id,
      title,
      body,
      triggerAt: notifyAt.getTime(),
      path,
    })
    return result.scheduled
  } catch (alarmScheduleError) {
    console.warn(alarmScheduleError)
    return false
  }
}

export async function startRestTimerForegroundNotification(input: RestTimerNotificationInput) {
  if (!isTimerForegroundNotificationAvailable() || !input.restEndsAt) {
    return false
  }

  const endsAt = new Date(input.restEndsAt).getTime()
  if (Number.isNaN(endsAt) || endsAt <= Date.now()) {
    return false
  }

  try {
    const result = await TrainingTimerNotification.startTimerNotification({
      id: getRestTimerNotificationId(input.exerciseId),
      timerType: 'rest',
      title: i18n.t('notification.restTimerRunningTitle'),
      body: i18n.t('notification.restTimerRunningBody', { exerciseName: input.exerciseName }),
      finishedTitle: i18n.t('notification.restEndedTitle'),
      finishedBody: i18n.t('notification.restEndedBody', { exerciseName: input.exerciseName }),
      endsAt,
      path: `/exercise/${input.exerciseId}`,
      playFinalBeeps: true,
    })
    return result.started
  } catch (timerStartError) {
    console.warn(timerStartError)
    return false
  }
}

export async function startQuickTimerForegroundNotification(input: QuickTimerNotificationInput) {
  if (!isTimerForegroundNotificationAvailable() || !input.endsAt) {
    return { scheduled: false, reason: 'plugin-unavailable', exactAlarmPermission: 'unknown' } satisfies RestTimerScheduleResult
  }

  if (input.endsAt <= Date.now()) {
    await cancelQuickTimerForegroundNotification()
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

  try {
    const result = await TrainingTimerNotification.startTimerNotification({
      id: QUICK_TIMER_FOREGROUND_NOTIFICATION_ID,
      timerType: 'quick',
      title: i18n.t('notification.quickTimerRunningTitle'),
      body: i18n.t('notification.quickTimerRunningBody'),
      finishedTitle: i18n.t('notification.quickTimerFinishedTitle'),
      finishedBody: i18n.t('notification.quickTimerFinishedBody'),
      endsAt: input.endsAt,
      path: '/quick-timer',
      playFinalBeeps: true,
    })
    return {
      scheduled: result.started,
      exactAlarmPermission: await checkExactAlarmPermission(),
    }
  } catch (timerStartError) {
    console.warn(timerStartError)
    return { scheduled: false, reason: 'plugin-unavailable', exactAlarmPermission: 'unknown' }
  }
}

export async function cancelQuickTimerForegroundNotification() {
  if (!isTimerForegroundNotificationAvailable()) {
    return
  }

  try {
    await TrainingTimerNotification.cancelTimerNotification({
      id: QUICK_TIMER_FOREGROUND_NOTIFICATION_ID,
    })
  } catch (timerCancelError) {
    console.warn(timerCancelError)
  }
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
  const notificationId = getRestTimerNotificationId(input.exerciseId)
  const title = i18n.t('notification.restEndedTitle')
  const body = i18n.t('notification.restEndedBody', { exerciseName: input.exerciseName })
  const path = `/exercise/${input.exerciseId}`

  const didStartForegroundTimer = await startRestTimerForegroundNotification(input)
  if (didStartForegroundTimer) {
    return { scheduled: true, exactAlarmPermission }
  }

  const didScheduleStrongAlarm = await scheduleStrongRestTimerAlarm({
    id: notificationId,
    title,
    body,
    notifyAt,
    path,
  })
  if (didScheduleStrongAlarm) {
    return { scheduled: true, exactAlarmPermission }
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title,
        body,
        schedule: {
          at: notifyAt,
          ...(exactAlarmPermission === 'granted' ? { allowWhileIdle: true } : {}),
        },
        channelId: REST_TIMER_FALLBACK_CHANNEL_ID,
        group: REST_TIMER_NOTIFICATION_GROUP,
        autoCancel: true,
        extra: {
          type: 'exercise-rest-ended',
          exerciseId: input.exerciseId,
          path,
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
  if (isRestTimerAlarmAvailable()) {
    try {
      await RestTimerAlarm.cancel({ id: TEST_REST_TIMER_NOTIFICATION_ID })
    } catch (alarmCancelError) {
      console.warn(alarmCancelError)
    }
  }

  const notifyAt = new Date(Date.now() + 10_000)
  const didScheduleStrongAlarm = await scheduleStrongRestTimerAlarm({
    id: TEST_REST_TIMER_NOTIFICATION_ID,
    title: i18n.t('notification.testTitle'),
    body: i18n.t('notification.strongTestBody'),
    notifyAt,
  })
  if (didScheduleStrongAlarm) {
    return { scheduled: true, exactAlarmPermission }
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: TEST_REST_TIMER_NOTIFICATION_ID,
        title: i18n.t('notification.testTitle'),
        body: i18n.t('notification.localTestBody'),
        schedule: {
          at: notifyAt,
          ...(exactAlarmPermission === 'granted' ? { allowWhileIdle: true } : {}),
        },
        channelId: REST_TIMER_FALLBACK_CHANNEL_ID,
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
