import { LocalNotifications } from '@capacitor/local-notifications'

import { isNativePluginAvailable } from './capacitor-platform'

const REST_TIMER_CHANNEL_ID = 'trainre-rest-timer'
const REST_TIMER_NOTIFICATION_GROUP = 'trainre-rest-timers'

export type RestTimerNotificationInput = {
  exerciseId: string
  exerciseName: string
  restEndsAt: string | null
}

let isChannelReady = false

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

async function ensureRestTimerChannel() {
  if (isChannelReady) {
    return
  }

  await LocalNotifications.createChannel({
    id: REST_TIMER_CHANNEL_ID,
    name: '训练间歇提醒',
    description: '动作休息结束时提醒继续训练',
    importance: 4,
    visibility: 1,
    vibration: true,
  })

  isChannelReady = true
}

export async function cancelRestTimerNotification(exerciseId: string) {
  if (!isNativePluginAvailable('LocalNotifications')) {
    return
  }

  await LocalNotifications.cancel({
    notifications: [{ id: getRestTimerNotificationId(exerciseId) }],
  })
}

export async function scheduleRestTimerNotification(input: RestTimerNotificationInput) {
  if (!input.restEndsAt) {
    await cancelRestTimerNotification(input.exerciseId)
    return
  }

  const notifyAt = new Date(input.restEndsAt)
  if (Number.isNaN(notifyAt.getTime()) || notifyAt.getTime() <= Date.now()) {
    await cancelRestTimerNotification(input.exerciseId)
    return
  }

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) {
    return
  }

  await ensureRestTimerChannel()
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
}
