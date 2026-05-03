import { LocalNotifications } from '@capacitor/local-notifications'
import type { PermissionState } from '@capacitor/core'

import i18n from '../i18n'
import { isNativeApp, isNativePluginAvailable } from './capacitor-platform'
import {
  TrainingTimerNotification,
  type TrainingTimerNotificationStatus,
} from './training-timer-notification-plugin'
import type {
  LocalReminderStatus,
  QuickTimerNotificationInput,
  RestTimerNotificationInput,
  RestTimerPermissionPrepareResult,
  RestTimerScheduleResult,
} from './training-notification.types'

export type {
  LocalReminderStatus,
  QuickTimerNotificationInput,
  RestTimerNotificationInput,
  RestTimerPermissionPrepareResult,
  RestTimerScheduleResult,
} from './training-notification.types'

const TEST_REST_TIMER_NOTIFICATION_ID = 910001
const LEGACY_REST_TIMER_FOREGROUND_NOTIFICATION_ID = 920001
const QUICK_TIMER_FOREGROUND_NOTIFICATION_ID = 920002
const TIMER_BEEP_VOLUME_STORAGE_KEY = 'trainre:timer-beep-volume'
const DEFAULT_TIMER_BEEP_VOLUME = 0.2

function clampTimerBeepVolume(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function getTrainingTimerBeepVolume() {
  if (typeof window === 'undefined') {
    return DEFAULT_TIMER_BEEP_VOLUME
  }

  const rawValue = window.localStorage.getItem(TIMER_BEEP_VOLUME_STORAGE_KEY)
  if (rawValue === null) {
    return DEFAULT_TIMER_BEEP_VOLUME
  }

  const storedValue = Number(rawValue)
  return Number.isFinite(storedValue) ? clampTimerBeepVolume(storedValue) : DEFAULT_TIMER_BEEP_VOLUME
}

export function setTrainingTimerBeepVolume(volume: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TIMER_BEEP_VOLUME_STORAGE_KEY, String(clampTimerBeepVolume(volume)))
}

function getRestTimerNotificationId(exerciseId: string) {
  let hash = 0

  for (let index = 0; index < exerciseId.length; index += 1) {
    hash = (hash * 31 + exerciseId.charCodeAt(index)) | 0
  }

  return Math.abs(hash) + 10000
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

export async function getLocalReminderStatus(): Promise<LocalReminderStatus> {
  const isLocalNotificationsAvailable = isNativePluginAvailable('LocalNotifications')

  const [displayPermission, timerForegroundStatus] = await Promise.all([
    checkDisplayPermission(),
    getTimerForegroundStatus(),
  ])

  return {
    isNative: isNativeApp(),
    isLocalNotificationsAvailable,
    displayPermission,
    isDisplayPermissionGranted: displayPermission === 'granted',
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

export async function prepareRestTimerReminderPermissions(): Promise<RestTimerPermissionPrepareResult> {
  const displayPermission = await requestLocalReminderPermission()

  return {
    displayPermission,
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
    const batteryStatus = await TrainingTimerNotification.isIgnoringBatteryOptimizations()
    if (batteryStatus.isIgnoringBatteryOptimizations) {
      return {
        didOpen: false,
        message: i18n.t('notification.batteryAlreadyAllowed'),
      }
    }

    await TrainingTimerNotification.requestIgnoreBatteryOptimization()
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

  if (!isTimerForegroundNotificationAvailable()) {
    return
  }

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
      title: input.exerciseName,
      body: i18n.t('notification.restTimerRunningBody'),
      finishedTitle: i18n.t('notification.restEndedTitle'),
      finishedBody: i18n.t('notification.restEndedBody', { exerciseName: input.exerciseName }),
      endsAt,
      path: `/exercise/${input.exerciseId}`,
      playFinalBeeps: true,
      beepVolume: getTrainingTimerBeepVolume(),
    })
    return result.started
  } catch (timerStartError) {
    console.warn(timerStartError)
    return false
  }
}

export async function startQuickTimerForegroundNotification(input: QuickTimerNotificationInput) {
  if (!isTimerForegroundNotificationAvailable() || !input.endsAt) {
    return { scheduled: false, reason: 'plugin-unavailable' } satisfies RestTimerScheduleResult
  }

  if (!input.isPaused && input.endsAt <= Date.now()) {
    await cancelQuickTimerForegroundNotification()
    return { scheduled: false, reason: 'invalid-time' }
  }

  if (input.isPaused && (!input.remainingMs || input.remainingMs <= 0)) {
    await cancelQuickTimerForegroundNotification()
    return { scheduled: false, reason: 'invalid-time' }
  }

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) {
    return {
      scheduled: false,
      reason: 'permission-denied',
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
      beepVolume: getTrainingTimerBeepVolume(),
      isPaused: input.isPaused,
      remainingMs: input.remainingMs,
      totalSeconds: input.totalSeconds,
    })
    return {
      scheduled: result.started,
    }
  } catch (timerStartError) {
    console.warn(timerStartError)
    return { scheduled: false, reason: 'plugin-unavailable' }
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
  if (!isTimerForegroundNotificationAvailable()) {
    return { scheduled: false, reason: 'plugin-unavailable' }
  }

  if (!input.restEndsAt) {
    await cancelRestTimerNotification(input.exerciseId)
    return { scheduled: false, reason: 'invalid-time' }
  }

  const notifyAt = new Date(input.restEndsAt)
  if (Number.isNaN(notifyAt.getTime()) || notifyAt.getTime() <= Date.now()) {
    await cancelRestTimerNotification(input.exerciseId)
    return { scheduled: false, reason: 'invalid-time' }
  }

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) {
    return {
      scheduled: false,
      reason: 'permission-denied',
    }
  }

  const didStartForegroundTimer = await startRestTimerForegroundNotification(input)
  return { scheduled: didStartForegroundTimer }
}

export async function scheduleRestTimerTestNotification(): Promise<RestTimerScheduleResult> {
  if (!isTimerForegroundNotificationAvailable()) {
    return { scheduled: false, reason: 'plugin-unavailable' }
  }

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) {
    return {
      scheduled: false,
      reason: 'permission-denied',
    }
  }

  try {
    await TrainingTimerNotification.cancelTimerNotification({
      id: TEST_REST_TIMER_NOTIFICATION_ID,
    })
    const result = await TrainingTimerNotification.startTimerNotification({
      id: TEST_REST_TIMER_NOTIFICATION_ID,
      timerType: 'rest',
      title: i18n.t('notification.testTitle'),
      body: i18n.t('notification.testRunningBody'),
      finishedTitle: i18n.t('notification.testTitle'),
      finishedBody: i18n.t('notification.testFinishedBody'),
      endsAt: Date.now() + 10_000,
      playFinalBeeps: true,
      beepVolume: getTrainingTimerBeepVolume(),
    })
    return { scheduled: result.started }
  } catch (timerStartError) {
    console.warn(timerStartError)
    return { scheduled: false, reason: 'plugin-unavailable' }
  }
}
