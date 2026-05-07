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

const LEGACY_REST_TIMER_FOREGROUND_NOTIFICATION_ID = 920001
const QUICK_TIMER_FOREGROUND_NOTIFICATION_ID = 920002
const TIMER_BEEP_VOLUME_STORAGE_KEY = 'trainre:timer-beep-volume'
const REPEAT_FINISH_ALERT_STORAGE_KEY = 'trainre:repeat-finish-alert-in-background'
const DEFAULT_TIMER_BEEP_VOLUME = 0.2
const DEFAULT_REPEAT_FINISH_ALERT_IN_BACKGROUND = true

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
  if (!isTimerForegroundNotificationAvailable()) {
    return false
  }

  const currentPermission = await TrainingTimerNotification.checkDisplayPermission()
  if (currentPermission.display === 'granted') {
    return true
  }

  const requestedPermission = await TrainingTimerNotification.requestDisplayPermission()
  return requestedPermission.display === 'granted'
}

async function checkDisplayPermission(): Promise<PermissionState | 'unknown'> {
  if (!isTimerForegroundNotificationAvailable()) {
    return 'unknown'
  }

  try {
    const permission = await TrainingTimerNotification.checkDisplayPermission()
    return permission.display
  } catch (permissionError) {
    console.warn(permissionError)
    return 'unknown'
  }
}

export async function getLocalReminderStatus(): Promise<LocalReminderStatus> {
  const isNotificationPermissionAvailable = isTimerForegroundNotificationAvailable()

  const [displayPermission, timerForegroundStatus] = await Promise.all([
    checkDisplayPermission(),
    getTimerForegroundStatus(),
  ])

  return {
    isNative: isNativeApp(),
    isNotificationPermissionAvailable,
    displayPermission,
    isDisplayPermissionGranted: displayPermission === 'granted',
    isTimerForegroundServiceAvailable: Boolean(timerForegroundStatus?.available),
    isTimerForegroundChannelReady: Boolean(timerForegroundStatus?.channelReady),
    timerForegroundChannelImportance: timerForegroundStatus?.channelImportance ?? null,
    timerForegroundChannelLockscreenVisibility:
      timerForegroundStatus?.channelLockscreenVisibility ?? null,
    isIgnoringBatteryOptimizations:
      timerForegroundStatus?.isIgnoringBatteryOptimizations ?? null,
    canScheduleExactAlarms: timerForegroundStatus?.canScheduleExactAlarms ?? null,
    isExactAlarmPermissionGranted: timerForegroundStatus?.isExactAlarmPermissionGranted ?? null,
  }
}

export function getRepeatFinishAlertInBackground() {
  if (typeof window === 'undefined') {
    return DEFAULT_REPEAT_FINISH_ALERT_IN_BACKGROUND
  }

  const rawValue = window.localStorage.getItem(REPEAT_FINISH_ALERT_STORAGE_KEY)
  if (rawValue === null) {
    return DEFAULT_REPEAT_FINISH_ALERT_IN_BACKGROUND
  }

  return rawValue === 'true'
}

export function setRepeatFinishAlertInBackground(enabled: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(REPEAT_FINISH_ALERT_STORAGE_KEY, String(enabled))
}

export async function requestLocalReminderPermission() {
  if (!isTimerForegroundNotificationAvailable()) {
    return 'unknown' satisfies PermissionState | 'unknown'
  }

  try {
    const permission = await TrainingTimerNotification.requestDisplayPermission()
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

export async function openExactAlarmSettings() {
  if (!isTimerForegroundNotificationAvailable()) {
    return {
      didOpen: false,
      message: i18n.t('notification.exactAlarmSettingsUnavailable'),
    }
  }

  try {
    const status = await TrainingTimerNotification.status()
    if (status.canScheduleExactAlarms) {
      return {
        didOpen: false,
        message: i18n.t('notification.exactAlarmAlreadyAllowed'),
      }
    }

    await TrainingTimerNotification.openExactAlarmSettings()
    return {
      didOpen: true,
      message: i18n.t('notification.exactAlarmSettingsOpened'),
    }
  } catch (settingsError) {
    console.warn(settingsError)
    return {
      didOpen: false,
      message: i18n.t('notification.exactAlarmSettingsFailed'),
    }
  }
}

export async function openTimerChannelSettings() {
  if (!isTimerForegroundNotificationAvailable()) {
    return {
      didOpen: false,
      message: i18n.t('notification.timerChannelSettingsUnavailable'),
    }
  }

  try {
    await TrainingTimerNotification.openTimerChannelSettings()
    return {
      didOpen: true,
      message: i18n.t('notification.timerChannelSettingsOpened'),
    }
  } catch (settingsError) {
    console.warn(settingsError)
    return {
      didOpen: false,
      message: i18n.t('notification.timerChannelSettingsFailed'),
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
      repeatFinishAlertInBackground: getRepeatFinishAlertInBackground(),
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
      path: input.path ?? '/quick-timer',
      playFinalBeeps: true,
      repeatFinishAlertInBackground: getRepeatFinishAlertInBackground(),
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

